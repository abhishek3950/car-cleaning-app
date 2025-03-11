import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../utils/authService';
import Payment from '../models/payment.model';
import QRCode from '../models/qrCode.model';
import Booking from '../models/booking.model';
import Subscription from '../models/subscription.model';
import User from '../models/user.model';
import { sendPaymentConfirmationEmail } from '../utils/emailService';

// Get active QR code for payment
export const getActiveQRCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const qrCode = await QRCode.findOne({ isActive: true }).sort({ createdAt: -1 });
    
    if (!qrCode) {
      res.status(404).json({ message: 'No active QR code found' });
      return;
    }
    
    res.json(qrCode);
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payment by ID
export const getPaymentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }
    
    // Check if payment belongs to user or user is admin
    if (payment.user.toString() !== req.user.id && !req.user.isAdmin) {
      res.status(403).json({ message: 'Not authorized to access this payment' });
      return;
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify payment (admin only)
export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }
    
    // Check if payment is already verified
    if (payment.status === 'verified') {
      res.status(400).json({ message: 'Payment is already verified' });
      return;
    }
    
    // Update payment status
    payment.status = 'verified';
    payment.verifiedBy = new mongoose.Types.ObjectId(req.user.id);
    payment.verifiedAt = new Date();
    await payment.save();
    
    // Update booking or subscription status
    if (payment.paymentType === 'one-time' && payment.bookingId) {
      await Booking.findByIdAndUpdate(
        payment.bookingId,
        {
          status: 'confirmed',
          paymentStatus: 'completed',
        }
      );
      
      // Send confirmation email
      const booking = await Booking.findById(payment.bookingId).populate('user');
      if (booking && booking.user) {
        const user = await User.findById(booking.user);
        if (user) {
          await sendPaymentConfirmationEmail(
            user.email,
            user.name || 'Valued Customer',
            payment.amount
          );
        }
      }
    } else if (payment.paymentType === 'subscription' && payment.subscriptionId) {
      const subscription = await Subscription.findById(payment.subscriptionId);
      
      if (subscription) {
        // Set subscription to active
        subscription.status = 'active';
        
        // Calculate new period end date (1 month from now)
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
        
        subscription.currentPeriodEnd = currentPeriodEnd;
        subscription.renewalReminderSent = false;
        
        // Add payment to history
        subscription.paymentHistory.push(payment._id);
        
        await subscription.save();
        
        // Send confirmation email
        const user = await User.findById(subscription.user);
        if (user) {
          await sendPaymentConfirmationEmail(
            user.email,
            user.name || 'Valued Customer',
            payment.amount
          );
        }
      }
    }
    
    res.json({
      message: 'Payment verified successfully',
      payment,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject payment (admin only)
export const rejectPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const { reason } = req.body;
    
    if (!reason) {
      res.status(400).json({ message: 'Rejection reason is required' });
      return;
    }
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }
    
    // Check if payment is already verified or rejected
    if (payment.status !== 'pending') {
      res.status(400).json({ message: `Payment is already ${payment.status}` });
      return;
    }
    
    // Update payment status
    payment.status = 'rejected';
    payment.rejectionReason = reason;
    payment.verifiedBy = new mongoose.Types.ObjectId(req.user.id);
    payment.verifiedAt = new Date();
    await payment.save();
    
    // Refund wallet credits if used
    if (payment.walletAmountUsed > 0) {
      await User.findByIdAndUpdate(
        payment.user,
        { $inc: { walletCredit: payment.walletAmountUsed } }
      );
    }
    
    res.json({
      message: 'Payment rejected successfully',
      payment,
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 