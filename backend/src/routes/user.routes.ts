import express from 'express';
import { authenticateUser, authorizeVerified } from '../utils/authService';
import * as userController from '../controllers/user.controller';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateUser, userController.getUserProfile);

// Update user profile
router.put('/profile', authenticateUser, userController.updateUserProfile);

// Get wallet balance
router.get('/wallet', authenticateUser, authorizeVerified, userController.getWalletBalance);

export default router; 