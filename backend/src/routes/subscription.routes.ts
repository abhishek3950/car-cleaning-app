import express from 'express';
import { authenticateUser, authorizeVerified } from '../utils/authService';
import * as subscriptionController from '../controllers/subscription.controller';

const router = express.Router();

// Create a new subscription
router.post('/', authenticateUser, authorizeVerified, subscriptionController.createSubscription);

// Get user's subscriptions
router.get('/', authenticateUser, authorizeVerified, subscriptionController.getUserSubscriptions);

// Get subscription by ID
router.get('/:id', authenticateUser, authorizeVerified, subscriptionController.getSubscriptionById);

// Cancel subscription
router.put('/:id/cancel', authenticateUser, authorizeVerified, subscriptionController.cancelSubscription);

// Renew subscription
router.post('/:id/renew', authenticateUser, authorizeVerified, subscriptionController.renewSubscription);

// Submit payment for subscription
router.post('/:id/payment', authenticateUser, authorizeVerified, subscriptionController.submitPayment);

export default router; 