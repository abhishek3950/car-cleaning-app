import express from 'express';
import { authenticateUser, authorizeVerified, authorizeAdmin } from '../utils/authService';
import * as paymentController from '../controllers/payment.controller';

const router = express.Router();

// Get QR code for payment
router.get('/qr-code', authenticateUser, authorizeVerified, paymentController.getActiveQRCode);

// Get payment by ID
router.get('/:id', authenticateUser, authorizeVerified, paymentController.getPaymentById);

// Admin routes
// Verify payment
router.put('/:id/verify', authenticateUser, authorizeAdmin, paymentController.verifyPayment);

// Reject payment
router.put('/:id/reject', authenticateUser, authorizeAdmin, paymentController.rejectPayment);

export default router; 