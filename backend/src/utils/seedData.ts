import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model';
import Service from '../models/service.model';
import QRCode from '../models/qrCode.model';
import connectDB from '../config/database';
import { initConfigurations, getConfig } from './configService';

dotenv.config();

// Seed admin user
const seedAdminUser = async (): Promise<void> => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create admin user
    const admin = await User.create({
      email: 'admin@example.com',
      password: 'Admin@123',
      name: 'Admin User',
      isVerified: true,
      isAdmin: true,
      walletCredit: 0,
    });
    
    console.log(`Admin user created with ID: ${admin._id}`);
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};

// Seed services
const seedServices = async (): Promise<void> => {
  try {
    // Check if services already exist
    const servicesCount = await Service.countDocuments();
    
    if (servicesCount > 0) {
      console.log('Services already exist');
      return;
    }
    
    // Initialize configurations first to ensure we have them
    await initConfigurations();
    
    // Get pricing from configurations
    const oneTimePrice = await getConfig<number>('pricing.oneTimeCleaning', 100);
    const weeklySubscriptionPrice = await getConfig<number>('pricing.weeklySubscription', 300);
    const premiumSubscriptionPrice = await getConfig<number>('pricing.premiumSubscription', 500);
    
    // Create services with dynamic pricing
    const services = await Service.insertMany([
      {
        name: 'One-Time Cleaning',
        description: 'A single car cleaning service.',
        type: 'one-time',
        price: oneTimePrice,
        isActive: true,
      },
      {
        name: 'Weekly Subscription',
        description: 'Car cleaning once a week for a month.',
        type: 'subscription',
        frequency: 'once',
        price: weeklySubscriptionPrice,
        isActive: true,
      },
      {
        name: 'Premium Subscription',
        description: 'Car cleaning thrice a week for a month.',
        type: 'subscription',
        frequency: 'thrice',
        price: premiumSubscriptionPrice,
        isActive: true,
      },
    ]);
    
    console.log(`${services.length} services created`);
  } catch (error) {
    console.error('Error seeding services:', error);
  }
};

// Seed QR code
const seedQRCode = async (): Promise<void> => {
  try {
    // Check if QR code already exists
    const qrCodeExists = await QRCode.findOne({ isActive: true });
    
    if (qrCodeExists) {
      console.log('QR code already exists');
      return;
    }
    
    // Get admin user
    const admin = await User.findOne({ isAdmin: true });
    
    if (!admin) {
      console.error('Admin user not found. Please seed admin user first.');
      return;
    }
    
    // Create QR code
    const qrCode = await QRCode.create({
      image: 'https://example.com/qr-code.png', // Replace with actual QR code image
      paymentInstructions: 'Scan this QR code to make payment. After payment, take a screenshot of the payment confirmation and upload it.',
      isActive: true,
      createdBy: admin._id,
    });
    
    console.log(`QR code created with ID: ${qrCode._id}`);
  } catch (error) {
    console.error('Error seeding QR code:', error);
  }
};

// Seed configurations
const seedConfigurations = async (): Promise<void> => {
  try {
    console.log('Seeding configurations...');
    await initConfigurations();
    console.log('Configurations seeded successfully');
  } catch (error) {
    console.error('Error seeding configurations:', error);
  }
};

// Main seed function
const seedDatabase = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    console.log('Seeding database...');
    
    // Seed data
    await seedAdminUser();
    await seedServices();
    await seedQRCode();
    await seedConfigurations();
    
    console.log('Database seeding completed');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed function
seedDatabase();

// Export for testing
export { seedAdminUser, seedServices, seedQRCode, seedConfigurations }; 