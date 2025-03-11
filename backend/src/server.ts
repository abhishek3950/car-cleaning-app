import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database';
import { initCronJobs } from './utils/cronJobs';
import { initConfigurations } from './utils/configService';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import bookingRoutes from './routes/booking.routes';
import subscriptionRoutes from './routes/subscription.routes';
import paymentRoutes from './routes/payment.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Default route
app.get('/', (req: Request, res: Response) => {
  res.send('Car Cleaning Service API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize configurations
  initConfigurations().then(() => {
    console.log('Configurations initialized');
    
    // Initialize cron jobs
    initCronJobs();
  });
}); 