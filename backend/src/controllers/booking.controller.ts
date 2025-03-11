import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../utils/authService';
import Booking from '../models/booking.model';
import TimeSlot from '../models/timeSlot.model';
import User from '../models/user.model';
import Service from '../models/service.model';
import Payment from '../models/payment.model';
import { 
  generateTimeSlots, 
  isValidBookingDate, 
  formatDisplayDate, 
  formatDisplayTime 
} from '../utils/dateTimeService';
import { sendBookingConfirmationEmail, sendBookingCancellationEmail } from '../utils/emailService';

// Get available time slots
export const getAvailableTimeSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.query;
    
    if (!date) {
      res.status(400).json({ message: 'Date is required' });
      return;
    }
    
    const selectedDate = new Date(date as string);
    
    // Validate date
    if (!isValidBookingDate(selectedDate)) {
      res.status(400).json({ message: 'Invalid booking date' });
      return;
    }
    
    // Generate all possible time slots for the date
    const allTimeSlots = generateTimeSlots(selectedDate);
    
    // Get booked or blocked slots from database
    const bookedSlots = await TimeSlot.find({
      date: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999)),
      },
    });
    
    // Filter out booked or blocked slots
    const availableSlots = allTimeSlots.filter(slot => {
      return !bookedSlots.some(
        bookedSlot => 
          bookedSlot.startTime === slot.startTime && 
          (bookedSlot.isBlocked || bookedSlot.bookedBy)
      );
    });
    
    res.json(availableSlots);
  } catch (error) {
    console.error('Get available time slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new booking
export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
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
      date, 
      timeSlot 
    } = req.body;
    
    if (!serviceId || !name || !phone || !carNumber || !parkingLocation || !carImage || !date || !timeSlot) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }
    
    // Validate service
    const service = await Service.findById(serviceId);
    if (!service) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }
    
    // Validate date and time
    const bookingDate = new Date(date);
    if (!isValidBookingDate(bookingDate)) {
      res.status(400).json({ message: 'Invalid booking date' });
      return;
    }
    
    // Check if time slot is available
    const existingSlot = await TimeSlot.findOne({
      date: {
        $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
        $lt: new Date(bookingDate.setHours(23, 59, 59, 999)),
      },
      startTime: timeSlot.startTime,
    });
    
    if (existingSlot && (existingSlot.isBlocked || existingSlot.bookedBy)) {
      res.status(400).json({ message: 'Time slot is not available' });
      return;
    }
    
    // Create booking
    const booking = await Booking.create({
      user: req.user.id,
      service: serviceId,
      isSubscription: false,
      name,
      phone,
      carNumber,
      parkingLocation,
      carImage,
      date: bookingDate,
      timeSlots: [
        {
          day: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
        },
      ],
      status: 'pending',
      paymentStatus: 'pending',
    });
    
    // Reserve the time slot
    await TimeSlot.findOneAndUpdate(
      {
        date: {
          $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
          $lt: new Date(bookingDate.setHours(23, 59, 59, 999)),
        },
        startTime: timeSlot.startTime,
      },
      {
        date: bookingDate,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        bookedBy: req.user.id,
        bookingId: booking._id,
      },
      { upsert: true, new: true }
    );
    
    res.status(201).json({
      booking,
      message: 'Booking created successfully. Please complete payment.',
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's bookings
export const getUserBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const bookings = await Booking.find({ user: req.user.id })
      .sort({ date: -1 })
      .populate('service', 'name price');
    
    res.json(bookings);
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get booking by ID
export const getBookingById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const booking = await Booking.findById(req.params.id)
      .populate('service', 'name price')
      .populate('paymentId');
    
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    
    // Check if booking belongs to user or user is admin
    if (booking.user.toString() !== req.user.id && !req.user.isAdmin) {
      res.status(403).json({ message: 'Not authorized to access this booking' });
      return;
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel booking
export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const { reason } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    
    // Check if booking belongs to user
    if (booking.user.toString() !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to cancel this booking' });
      return;
    }
    
    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      res.status(400).json({ message: 'Booking is already cancelled' });
      return;
    }
    
    if (booking.status === 'completed') {
      res.status(400).json({ message: 'Completed bookings cannot be cancelled' });
      return;
    }
    
    // Update booking status
    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    await booking.save();
    
    // Release the time slot
    await TimeSlot.findOneAndUpdate(
      {
        bookingId: booking._id,
      },
      {
        $unset: { bookedBy: 1, bookingId: 1 },
      }
    );
    
    // Add credit to user's wallet if payment was completed
    if (booking.paymentStatus === 'completed') {
      await User.findByIdAndUpdate(
        req.user.id,
        { $inc: { walletCredit: 1 } }
      );
    }
    
    // Send cancellation email
    const user = await User.findById(req.user.id);
    if (user) {
      const formattedDate = formatDisplayDate(booking.date);
      const formattedTime = formatDisplayTime(booking.timeSlots[0].startTime);
      
      await sendBookingCancellationEmail(
        user.email,
        user.name || 'Valued Customer',
        formattedDate,
        formattedTime
      );
    }
    
    res.json({
      message: 'Booking cancelled successfully',
      walletCreditAdded: booking.paymentStatus === 'completed',
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit payment for booking
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
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    
    // Check if booking belongs to user
    if (booking.user.toString() !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to submit payment for this booking' });
      return;
    }
    
    // Check if payment is already completed
    if (booking.paymentStatus === 'completed') {
      res.status(400).json({ message: 'Payment is already completed' });
      return;
    }
    
    // Get service price
    const service = await Service.findById(booking.service);
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
      bookingId: booking._id,
      amount: service.price,
      walletAmountUsed,
      slipImage,
      status: 'pending',
      paymentType: 'one-time',
    });
    
    // Update booking with payment info
    booking.paymentId = payment._id;
    booking.paymentSlip = slipImage;
    await booking.save();
    
    res.json({
      message: 'Payment submitted successfully. Awaiting verification.',
      payment,
      walletAmountUsed,
      amountPaid: amountToPay,
    });
  } catch (error) {
    console.error('Submit payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 