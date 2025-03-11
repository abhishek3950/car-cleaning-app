import Subscription from '../models/subscription.model';
import { ISubscription } from '../models/subscription.model';
import Service, { IService } from '../models/service.model';
import User, { IUser } from '../models/user.model';
import { sendSubscriptionRenewalEmail } from './emailService';
import { formatDisplayDate } from './dateTimeService';
import * as configService from './configService';

// Default values
const DEFAULT_RENEWAL_REMINDER_DAYS = 5;

// Interface for populated subscription
interface PopulatedSubscription extends Omit<ISubscription, 'user' | 'service'> {
  user: IUser;
  service: IService;
}

// Send subscription renewal reminders
export const sendRenewalReminders = async (): Promise<void> => {
  try {
    // Get configured renewal reminder days from database or use default
    const renewalReminderDays = await configService.getConfig<number>(
      'booking.subscriptionRenewalReminderDays',
      DEFAULT_RENEWAL_REMINDER_DAYS
    );
    
    // Get active subscriptions that are about to expire in X days and haven't had a reminder sent
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + renewalReminderDays);
    
    const startOfDay = new Date(reminderDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(reminderDate.setHours(23, 59, 59, 999));
    
    const subscriptions = await Subscription.find({
      status: 'active',
      currentPeriodEnd: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      renewalReminderSent: false,
    }).populate('user').populate('service');
    
    console.log(`Found ${subscriptions.length} subscriptions due for renewal reminders`);
    
    // Send reminders
    for (const subscription of subscriptions) {
      // Check if subscription is properly populated
      const populatedSub = subscription as unknown as PopulatedSubscription;
      
      if (populatedSub.user && populatedSub.service) {
        const formattedDate = formatDisplayDate(populatedSub.currentPeriodEnd);
        
        await sendSubscriptionRenewalEmail(
          populatedSub.user.email,
          populatedSub.user.name || 'Valued Customer',
          formattedDate,
          populatedSub.service.price
        );
        
        // Update subscription to mark reminder as sent
        await Subscription.findByIdAndUpdate(
          populatedSub._id,
          { renewalReminderSent: true }
        );
        
        console.log(`Sent renewal reminder for subscription ${populatedSub._id} to ${populatedSub.user.email}`);
      }
    }
  } catch (error) {
    console.error('Error sending renewal reminders:', error);
  }
};

// Check for expired subscriptions
export const checkExpiredSubscriptions = async (): Promise<void> => {
  try {
    // Get active subscriptions that have expired
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    
    const subscriptions = await Subscription.find({
      status: 'active',
      currentPeriodEnd: { $lt: startOfDay },
    });
    
    console.log(`Found ${subscriptions.length} expired subscriptions`);
    
    // Mark as expired
    for (const subscription of subscriptions) {
      await Subscription.findByIdAndUpdate(
        subscription._id,
        {
          status: 'expired',
          endDate: new Date(),
        }
      );
      
      console.log(`Marked subscription ${subscription._id} as expired`);
    }
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
  }
};

// Initialize cron jobs
export const initCronJobs = (): void => {
  // Run once a day at midnight
  const runDailyJobs = async (): Promise<void> => {
    console.log('Running daily cron jobs...');
    await sendRenewalReminders();
    await checkExpiredSubscriptions();
  };
  
  // Schedule daily jobs
  const scheduleNextRun = (): void => {
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // tomorrow
      0, // midnight
      0,
      0
    );
    
    const timeToMidnight = night.getTime() - now.getTime();
    
    setTimeout(() => {
      runDailyJobs().catch(console.error);
      scheduleNextRun(); // Schedule next run after this one completes
    }, timeToMidnight);
    
    console.log(`Next cron job scheduled in ${Math.floor(timeToMidnight / 1000 / 60)} minutes`);
  };
  
  // Run immediately on startup and then schedule
  runDailyJobs().catch(console.error);
  scheduleNextRun();
}; 