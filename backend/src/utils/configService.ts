import Config from '../models/config.model';
import { IConfig } from '../models/config.model';

// Define a simpler interface for creating configs
interface ConfigData {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  category: 'pricing' | 'scheduling' | 'booking' | 'system';
}

// Default configurations
const defaultConfigs: ConfigData[] = [
  // Pricing configurations
  {
    key: 'pricing.oneTimeCleaning',
    value: 100,
    type: 'number',
    description: 'Price for one-time cleaning service in Baht',
    category: 'pricing',
  },
  {
    key: 'pricing.weeklySubscription',
    value: 300,
    type: 'number',
    description: 'Price for once a week subscription in Baht per month',
    category: 'pricing',
  },
  {
    key: 'pricing.premiumSubscription',
    value: 500,
    type: 'number',
    description: 'Price for thrice a week subscription in Baht per month',
    category: 'pricing',
  },
  
  // Scheduling configurations
  {
    key: 'scheduling.businessHours',
    value: {
      start: '09:00',
      end: '21:00',
    },
    type: 'object',
    description: 'Business hours for cleaning services',
    category: 'scheduling',
  },
  {
    key: 'scheduling.saturdayCutoffHour',
    value: 18,
    type: 'number',
    description: 'Hour after which bookings are not allowed on Saturday (24-hour format)',
    category: 'scheduling',
  },
  {
    key: 'scheduling.minBookingHoursAhead',
    value: 6,
    type: 'number',
    description: 'Minimum hours ahead required for a booking',
    category: 'scheduling',
  },
  {
    key: 'scheduling.slotDuration',
    value: 30,
    type: 'number',
    description: 'Duration of each time slot in minutes',
    category: 'scheduling',
  },
  {
    key: 'scheduling.sundayBookings',
    value: false,
    type: 'boolean',
    description: 'Whether bookings are allowed on Sundays',
    category: 'scheduling',
  },
  
  // Booking configurations
  {
    key: 'booking.subscriptionRenewalReminderDays',
    value: 5,
    type: 'number',
    description: 'Days before subscription end when renewal reminder is sent',
    category: 'booking',
  },
  
  // System configurations
  {
    key: 'system.emailVerificationRequired',
    value: true,
    type: 'boolean',
    description: 'Whether email verification is required for new accounts',
    category: 'system',
  },
  {
    key: 'system.otpExpiryMinutes',
    value: 10,
    type: 'number',
    description: 'OTP expiry time in minutes',
    category: 'system',
  },
  {
    key: 'system.otpRateLimitMinutes',
    value: 1,
    type: 'number',
    description: 'Rate limit for OTP requests in minutes',
    category: 'system',
  },
];

// Initialize configurations
export const initConfigurations = async (): Promise<void> => {
  try {
    // Check if configurations exist
    const configCount = await Config.countDocuments();
    
    if (configCount > 0) {
      console.log('Configurations already exist');
      return;
    }
    
    // Insert default configurations
    await Config.insertMany(defaultConfigs);
    
    console.log(`${defaultConfigs.length} default configurations created`);
  } catch (error) {
    console.error('Error initializing configurations:', error);
  }
};

// Get a specific configuration value
export const getConfig = async <T>(key: string, defaultValue?: T): Promise<T> => {
  try {
    const value = await Config.getByKey(key);
    return value !== null ? value : (defaultValue as T);
  } catch (error) {
    console.error(`Error getting configuration for key ${key}:`, error);
    return defaultValue as T;
  }
};

// Get all configurations in a category
export const getCategoryConfigs = async (category: string): Promise<Record<string, any>> => {
  try {
    return await Config.getByCategory(category);
  } catch (error) {
    console.error(`Error getting configurations for category ${category}:`, error);
    return {};
  }
};

// Update a configuration
export const updateConfig = async (
  key: string,
  value: any,
  updatedBy?: string
): Promise<IConfig | null> => {
  try {
    return await Config.updateByKey(key, value, updatedBy);
  } catch (error) {
    console.error(`Error updating configuration for key ${key}:`, error);
    return null;
  }
};

// Get the pricing configurations
export const getPricingConfigs = async (): Promise<Record<string, number>> => {
  return await getCategoryConfigs('pricing') as Record<string, number>;
};

// Get the scheduling configurations
export const getSchedulingConfigs = async (): Promise<{
  businessHours: { start: string; end: string };
  saturdayCutoffHour: number;
  minBookingHoursAhead: number;
  slotDuration: number;
  sundayBookings: boolean;
}> => {
  const defaults = {
    businessHours: { start: '09:00', end: '21:00' },
    saturdayCutoffHour: 18,
    minBookingHoursAhead: 6,
    slotDuration: 30,
    sundayBookings: false,
  };
  
  const configs = await getCategoryConfigs('scheduling');
  
  return {
    businessHours: configs['scheduling.businessHours'] || defaults.businessHours,
    saturdayCutoffHour: configs['scheduling.saturdayCutoffHour'] || defaults.saturdayCutoffHour,
    minBookingHoursAhead: configs['scheduling.minBookingHoursAhead'] || defaults.minBookingHoursAhead,
    slotDuration: configs['scheduling.slotDuration'] || defaults.slotDuration,
    sundayBookings: configs['scheduling.sundayBookings'] || defaults.sundayBookings,
  };
}; 