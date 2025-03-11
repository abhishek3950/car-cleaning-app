import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../utils/authService';
import Subscription from '../models/subscription.model';
import Service from '../models/service.model';
import User from '../models/user.model';
import Payment from '../models/payment.model';
import TimeSlot from '../models/timeSlot.model';
import { formatDisplayDate } from '../utils/dateTimeService';
import { sendSubscriptionRenewalEmail } from '../utils/emailService';

// Create a new subscription
export const createSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const { 
      serviceId, 
      name, 
      phone, 
      carNumber, 
      parkingLocation, 
      carImage, 
      timeSlots 
    } = req.body;
    
    if (!serviceId || !name || !phone || !carNumber || !parkingLocation || !carImage || !timeSlots || !timeSlots.length) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }
    
    // Validate service
    const service = await Service.findById(serviceId);
    if (!service) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }
    
    // Validate service type
    if (service.type !== 'subscription') {
      res.status(400).json({ message: 'Service is not a subscription type' });
      return;
    }
    
    // Validate time slots based on frequency
    if (service.frequency === 'once' && timeSlots.length !== 1) {
      res.status(400).json({ message: 'Once a week subscription requires exactly 1 time slot' });
      return;
    }
    
    if (service.frequency === 'thrice' && timeSlots.length !== 3) {
      res.status(400).json({ message: 'Thrice a week subscription requires exactly 3 time slots' });
      return;
    }
    
    // Calculate subscription dates
    const startDate = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    
    // Create subscription
    const subscription = await Subscription.create({
      user: req.user.id,
      service: serviceId,
      name,
      phone,
      carNumber,
      parkingLocation,
      carImage,
      timeSlots,
      startDate,
      currentPeriodEnd,
      renewalReminderSent: false,
      status: 'pending',
      paymentHistory: [],
    });
    
    res.status(201).json({
      subscription,
      message: 'Subscription created successfully. Please complete payment.',
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's subscriptions
export const getUserSubscriptions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const subscriptions = await Subscription.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('service', 'name price frequency');
    
    res.json(subscriptions);
  } catch (error) {
    console.error('Get user subscriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get subscription by ID
export const getSubscriptionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const subscription = await Subscription.findById(req.params.id)
      .populate('service', 'name price frequency')
      .populate('paymentHistory');
    
    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }
    
    // Check if subscription belongs to user or user is admin
    if (subscription.user.toString() !== req.user.id && !req.user.isAdmin) {
      res.status(403).json({ message: 'Not authorized to access this subscription' });
      return;
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Get subscription by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel subscription
export const cancelSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }
    
    // Check if subscription belongs to user
    if (subscription.user.toString() !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to cancel this subscription' });
      return;
    }
    
    // Check if subscription can be cancelled
    if (subscription.status === 'cancelled') {
      res.status(400).json({ message: 'Subscription is already cancelled' });
      return;
    }
    
    if (subscription.status === 'expired') {
      res.status(400).json({ message: 'Subscription is already expired' });
      return;
    }
    
    // Update subscription status
    subscription.status = 'cancelled';
    subscription.endDate = new Date();
    await subscription.save();
    
    res.json({
      message: 'Subscription cancelled successfully',
      subscription,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Renew subscription
export const renewSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const subscription = await Subscription.findById(req.params.id).populate('service');
    
    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }
    
    // Check if subscription belongs to user
    if (subscription.user.toString() !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to renew this subscription' });
      return;
    }
    
    // Check if subscription can be renewed
    if (subscription.status === 'cancelled') {
      res.status(400).json({ message: 'Cancelled subscriptions cannot be renewed. Please create a new subscription.' });
      return;
    }
    
    // If subscription is expired, update status to pending
    if (subscription.status === 'expired') {
      subscription.status = 'pending';
    }
    
    // Reset renewal reminder flag
    subscription.renewalReminderSent = false;
    
    await subscription.save();
    
    res.json({
      message: 'Subscription ready for renewal. Please complete payment.',
      subscription,
    });
  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit payment for subscription
export const submitPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const { slipImage, useWalletCredit } = req.body;
    
    if (!slipImage) {
      res.status(400).json({ message: 'Payment slip is required' });
      return;
    }
    
    const subscription = await Subscription.findById(req.params.id).populate('service');
    
    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }
    
    // Check if subscription belongs to user
    if (subscription.user.toString() !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to submit payment for this subscription' });
      return;
    }
    
    // Get service price
    const service = subscription.service;
    if (!service) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }
    
    // Get user wallet balance
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    let walletAmountUsed = 0;
    let amountToPay = service.price;
    
    // Apply wallet credit if requested and available
    if (useWalletCredit && user.walletCredit > 0) {
      // Use entire wallet balance
      walletAmountUsed = user.walletCredit;
      
      // If wallet has enough to cover the entire payment
      if (walletAmountUsed >= service.price) {
        walletAmountUsed = service.price;
        amountToPay = 0;
      } else {
        amountToPay = service.price - walletAmountUsed;
      }
      
      // Update user's wallet balance
      await User.findByIdAndUpdate(
        req.user.id,
        { $inc: { walletCredit: -walletAmountUsed } }
      );
    }
    
    // Create payment record
    const payment = await Payment.create({
      user: req.user.id,
      subscriptionId: subscription._id,
      amount: service.price,
      walletAmountUsed,
      slipImage,
      status: 'pending',
      paymentType: 'subscription',
    });
    
    // Update subscription payment history
    await Subscription.findByIdAndUpdate(
      subscription._id,
      { $push: { paymentHistory: payment._id } }
    );
    
    res.json({
      message: 'Payment submitted successfully. Awaiting verification.',
      payment,
      walletAmountUsed,
      amountPaid: amountToPay,
    });
  } catch (error) {
    console.error('Submit subscription payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 