import express from 'express';
import { authenticateUser, authorizeAdmin } from '../utils/authService';
import * as adminController from '../controllers/admin.controller';

const router = express.Router();

// All admin routes require admin authorization
router.use(authenticateUser, authorizeAdmin);

// Dashboard stats
router.get('/dashboard', adminController.getDashboardStats);

// Manage bookings
router.get('/bookings', adminController.getAllBookings);
router.put('/bookings/:id/status', adminController.updateBookingStatus);

// Manage time slots
router.get('/time-slots', adminController.getTimeSlots);
router.post('/time-slots/block', adminController.blockTimeSlot);
router.put('/time-slots/:id/unblock', adminController.unblockTimeSlot);

// Manage services
router.get('/services', adminController.getAllServices);
router.post('/services', adminController.createService);
router.put('/services/:id', adminController.updateService);
router.put('/services/:id/toggle-active', adminController.toggleServiceActive);

// Manage QR codes
router.get('/qr-codes', adminController.getAllQRCodes);
router.post('/qr-codes', adminController.createQRCode);
router.put('/qr-codes/:id/toggle-active', adminController.toggleQRCodeActive);

// Manage users
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/toggle-admin', adminController.toggleUserAdmin);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

// Manage configurations
router.get('/configurations', adminController.getAllConfigurations);
router.get('/configurations/:key', adminController.getConfigurationByKey);
router.put('/configurations/:key', adminController.updateConfiguration);
router.post('/configurations/reset', adminController.resetConfigurationDefaults);

export default router; 