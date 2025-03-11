import express from 'express';
import { authenticateUser, authorizeVerified } from '../utils/authService';
import * as bookingController from '../controllers/booking.controller';

const router = express.Router();

// Get available time slots
router.get('/time-slots', authenticateUser, authorizeVerified, bookingController.getAvailableTimeSlots);

// Create a new booking
router.post('/', authenticateUser, authorizeVerified, bookingController.createBooking);

// Get user's bookings
router.get('/', authenticateUser, authorizeVerified, bookingController.getUserBookings);

// Get booking by ID
router.get('/:id', authenticateUser, authorizeVerified, bookingController.getBookingById);

// Cancel booking
router.put('/:id/cancel', authenticateUser, authorizeVerified, bookingController.cancelBooking);

// Submit payment for booking
router.post('/:id/payment', authenticateUser, authorizeVerified, bookingController.submitPayment);

export default router; 