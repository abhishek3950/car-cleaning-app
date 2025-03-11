import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../utils/authService';
import User from '../models/user.model';
import Booking from '../models/booking.model';
import Service from '../models/service.model';
import TimeSlot from '../models/timeSlot.model';
import QRCode from '../models/qrCode.model';
import AuditLog from '../models/auditLog.model';
import Subscription from '../models/subscription.model';
import Payment from '../models/payment.model';
import Config from '../models/config.model';
import { sendBookingConfirmationEmail } from '../utils/emailService';
import * as configService from '../utils/configService';

// Get dashboard stats
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get counts
    const userCount = await User.countDocuments();
    const bookingCount = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    
    // Get recent bookings
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email')
      .populate('service', 'name price');
    
    // Get upcoming bookings for today
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    const todayBookings = await Booking.find({
      date: {
        $gte: todayStart,
        $lte: todayEnd,
      },
      status: 'confirmed',
    })
      .sort({ date: 1 })
      .populate('user', 'name email phone')
      .populate('service', 'name');
    
    res.json({
      stats: {
        userCount,
        bookingCount,
        pendingBookings,
        pendingPayments,
        activeSubscriptions,
      },
      recentBookings,
      todayBookings,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all bookings
export const getAllBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, startDate, endDate } = req.query;
    
    // Build filter
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }
    
    const bookings = await Booking.find(filter)
      .sort({ date: -1 })
      .populate('user', 'name email phone')
      .populate('service', 'name price')
      .populate('paymentId');
    
    res.json(bookings);
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update booking status
export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const { status, notes } = req.body;
    
    if (!status) {
      res.status(400).json({ message: 'Status is required' });
      return;
    }
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    
    // Save previous state for audit log
    const previousState = { ...booking.toObject() };
    
    // Update booking
    booking.status = status;
    if (notes) booking.notes = notes;
    
    await booking.save();
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: 'update_booking_status',
      entityType: 'booking',
      entityId: booking._id,
      previousState,
      newState: booking.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    // If status changed to confirmed, send confirmation email
    if (status === 'confirmed' && previousState.status !== 'confirmed') {
      const user = await User.findById(booking.user);
      if (user) {
        const formattedDate = new Date(booking.date).toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        
        const formattedTime = booking.timeSlots[0].startTime;
        
        await sendBookingConfirmationEmail(
          user.email,
          user.name || 'Valued Customer',
          formattedDate,
          formattedTime
        );
      }
    }
    
    res.json({
      message: 'Booking status updated successfully',
      booking,
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get time slots
export const getTimeSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.query;
    
    if (!date) {
      res.status(400).json({ message: 'Date is required' });
      return;
    }
    
    const selectedDate = new Date(date as string);
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
    
    const timeSlots = await TimeSlot.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate('bookedBy', 'name email')
      .populate('blockedBy', 'name email')
      .populate('bookingId');
    
    res.json(timeSlots);
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Block time slot
export const blockTimeSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const { date, startTime, endTime, reason } = req.body;
    
    if (!date || !startTime || !endTime) {
      res.status(400).json({ message: 'Date, start time, and end time are required' });
      return;
    }
    
    // Check if slot is already booked
    const existingSlot = await TimeSlot.findOne({
      date: new Date(date),
      startTime,
    });
    
    if (existingSlot && existingSlot.bookedBy) {
      res.status(400).json({ message: 'Time slot is already booked' });
      return;
    }
    
    // Create or update time slot
    const timeSlot = await TimeSlot.findOneAndUpdate(
      {
        date: new Date(date),
        startTime,
      },
      {
        date: new Date(date),
        startTime,
        endTime,
        isBlocked: true,
        blockedBy: new mongoose.Types.ObjectId(req.user.id),
        blockReason: reason,
      },
      { upsert: true, new: true }
    );
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: 'block_time_slot',
      entityType: 'timeSlot',
      entityId: timeSlot._id,
      newState: timeSlot.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      message: 'Time slot blocked successfully',
      timeSlot,
    });
  } catch (error) {
    console.error('Block time slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Unblock time slot
export const unblockTimeSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const timeSlot = await TimeSlot.findById(req.params.id);
    
    if (!timeSlot) {
      res.status(404).json({ message: 'Time slot not found' });
      return;
    }
    
    if (!timeSlot.isBlocked) {
      res.status(400).json({ message: 'Time slot is not blocked' });
      return;
    }
    
    // Save previous state for audit log
    const previousState = { ...timeSlot.toObject() };
    
    // Unblock time slot
    timeSlot.isBlocked = false;
    timeSlot.blockedBy = undefined;
    timeSlot.blockReason = undefined;
    
    await timeSlot.save();
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: 'unblock_time_slot',
      entityType: 'timeSlot',
      entityId: timeSlot._id,
      previousState,
      newState: timeSlot.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      message: 'Time slot unblocked successfully',
      timeSlot,
    });
  } catch (error) {
    console.error('Unblock time slot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all services
export const getAllServices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const services = await Service.find().sort({ type: 1, price: 1 });
    res.json(services);
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create service
export const createService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const { name, description, type, frequency, price } = req.body;
    
    if (!name || !description || !type || !price) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }
    
    // Validate service type
    if (type === 'subscription' && !frequency) {
      res.status(400).json({ message: 'Frequency is required for subscription services' });
      return;
    }
    
    // Create service
    const service = await Service.create({
      name,
      description,
      type,
      frequency: type === 'subscription' ? frequency : undefined,
      price,
      isActive: true,
    });
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: 'create_service',
      entityType: 'service',
      entityId: service._id,
      newState: service.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(201).json({
      message: 'Service created successfully',
      service,
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update service
export const updateService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const { name, description, price } = req.body;
    
    if (!name || !description || !price) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }
    
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }
    
    // Save previous state for audit log
    const previousState = { ...service.toObject() };
    
    // Update service (only allow updating name, description, and price)
    service.name = name;
    service.description = description;
    service.price = price;
    
    await service.save();
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: 'update_service',
      entityType: 'service',
      entityId: service._id,
      previousState,
      newState: service.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      message: 'Service updated successfully',
      service,
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle service active status
export const toggleServiceActive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }
    
    // Save previous state for audit log
    const previousState = { ...service.toObject() };
    
    // Toggle active status
    service.isActive = !service.isActive;
    
    await service.save();
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: `${service.isActive ? 'activate' : 'deactivate'}_service`,
      entityType: 'service',
      entityId: service._id,
      previousState,
      newState: service.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      message: `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`,
      service,
    });
  } catch (error) {
    console.error('Toggle service active error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all QR codes
export const getAllQRCodes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const qrCodes = await QRCode.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    res.json(qrCodes);
  } catch (error) {
    console.error('Get all QR codes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create QR code
export const createQRCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const { image, paymentInstructions } = req.body;
    
    if (!image || !paymentInstructions) {
      res.status(400).json({ message: 'Image and payment instructions are required' });
      return;
    }
    
    // Create QR code
    const qrCode = await QRCode.create({
      image,
      paymentInstructions,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(req.user.id),
    });
    
    // Deactivate other QR codes
    await QRCode.updateMany(
      { _id: { $ne: qrCode._id } },
      { isActive: false, updatedBy: new mongoose.Types.ObjectId(req.user.id) }
    );
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: 'create_qr_code',
      entityType: 'qrCode',
      entityId: qrCode._id,
      newState: qrCode.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(201).json({
      message: 'QR code created successfully',
      qrCode,
    });
  } catch (error) {
    console.error('Create QR code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle QR code active status
export const toggleQRCodeActive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const qrCode = await QRCode.findById(req.params.id);
    
    if (!qrCode) {
      res.status(404).json({ message: 'QR code not found' });
      return;
    }
    
    // Save previous state for audit log
    const previousState = { ...qrCode.toObject() };
    
    // Toggle active status
    qrCode.isActive = !qrCode.isActive;
    qrCode.updatedBy = new mongoose.Types.ObjectId(req.user.id);
    
    await qrCode.save();
    
    // If activating, deactivate other QR codes
    if (qrCode.isActive) {
      await QRCode.updateMany(
        { _id: { $ne: qrCode._id } },
        { isActive: false, updatedBy: new mongoose.Types.ObjectId(req.user.id) }
      );
    }
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: `${qrCode.isActive ? 'activate' : 'deactivate'}_qr_code`,
      entityType: 'qrCode',
      entityId: qrCode._id,
      previousState,
      newState: qrCode.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      message: `QR code ${qrCode.isActive ? 'activated' : 'deactivated'} successfully`,
      qrCode,
    });
  } catch (error) {
    console.error('Toggle QR code active error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find()
      .select('-password -otpCode -otpExpiry')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle user admin status
export const toggleUserAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Prevent self-demotion
    if (user._id.toString() === req.user.id) {
      res.status(400).json({ message: 'You cannot change your own admin status' });
      return;
    }
    
    // Save previous state for audit log
    const previousState = { ...user.toObject() };
    
    // Toggle admin status
    user.isAdmin = !user.isAdmin;
    
    await user.save();
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: `${user.isAdmin ? 'promote' : 'demote'}_user`,
      entityType: 'user',
      entityId: user._id,
      previousState,
      newState: user.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      message: `User ${user.isAdmin ? 'promoted to' : 'demoted from'} admin successfully`,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Toggle user admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get audit logs
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, startDate, endDate, limit = 50 } = req.query;
    
    // Build filter
    const filter: any = {};
    
    if (entityType) {
      filter.entityType = entityType;
    }
    
    if (entityId) {
      filter.entityId = entityId;
    }
    
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }
    
    const auditLogs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('user', 'name email');
    
    res.json(auditLogs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all configurations
export const getAllConfigurations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    
    let configs;
    if (category) {
      configs = await Config.find({ category: category as string }).sort({ key: 1 });
    } else {
      configs = await Config.find().sort({ category: 1, key: 1 });
    }
    
    res.json(configs);
  } catch (error) {
    console.error('Get all configurations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get configuration by key
export const getConfigurationByKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    
    const config = await Config.findOne({ key });
    
    if (!config) {
      res.status(404).json({ message: 'Configuration not found' });
      return;
    }
    
    res.json(config);
  } catch (error) {
    console.error('Get configuration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update configuration
export const updateConfiguration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      res.status(400).json({ message: 'Value is required' });
      return;
    }
    
    const config = await Config.findOne({ key });
    
    if (!config) {
      res.status(404).json({ message: 'Configuration not found' });
      return;
    }
    
    // Save previous state for audit log
    const previousState = { ...config.toObject() };
    
    // Update configuration
    const updatedConfig = await configService.updateConfig(key, value, req.user.id);
    
    if (!updatedConfig) {
      res.status(500).json({ message: 'Failed to update configuration' });
      return;
    }
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: 'update_configuration',
      entityType: 'config',
      entityId: config._id,
      previousState,
      newState: updatedConfig.toObject(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      message: 'Configuration updated successfully',
      config: updatedConfig,
    });
  } catch (error) {
    console.error('Update configuration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset configuration to default
export const resetConfigurationDefaults = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    
    // Delete all existing configurations
    await Config.deleteMany({});
    
    // Re-initialize with defaults
    await configService.initConfigurations();
    
    // Create audit log
    await AuditLog.create({
      user: new mongoose.Types.ObjectId(req.user.id),
      action: 'reset_configurations',
      entityType: 'config',
      entityId: new mongoose.Types.ObjectId(),
      newState: { message: 'All configurations reset to defaults' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({ message: 'All configurations reset to defaults' });
  } catch (error) {
    console.error('Reset configurations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 