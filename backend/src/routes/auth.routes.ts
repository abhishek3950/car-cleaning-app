import express from 'express';
import { authenticateUser } from '../utils/authService';
import * as authController from '../controllers/auth.controller';

const router = express.Router();

// Register a new user
router.post('/register', authController.registerUser);

// Login user
router.post('/login', authController.loginUser);

// Verify OTP
router.post('/verify-otp', authController.verifyOTP);

// Resend OTP
router.post('/resend-otp', authenticateUser, authController.resendOTP);

// Update email
router.put('/update-email', authenticateUser, authController.updateEmail);

export default router; 