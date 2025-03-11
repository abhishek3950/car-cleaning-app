# Car Cleaning Service Application

A mobile-first web application for scheduling and managing car cleaning services. This application features user registration/login, service selection (one-time or subscription), scheduling, booking management, payment verification, subscription renewal, and admin functionality.

## Features

### User Authentication & Registration
- Email/password registration with OTP verification
- Rate limiting on OTP requests
- Email verification for account activation
- Secure credential storage

### Service Options
- One-Time Cleaning
- Monthly Subscription Plans:
  - Once a week
  - Thrice a week
- Dynamic pricing from database (configurable via admin panel)

### Scheduling & Time Preferences
- Configurable business hours
- Configurable booking restrictions
- Configurable time slot duration
- Calendar view with unavailable slots

### Booking & Payment Process
- Collect user and car details
- QR code payment system
- Wallet credit system
- Payment verification via admin

### Subscription Management
- Renewal reminders (configurable reminder days)
- Cancellation handling
- Multi-subscription support

### Admin Dashboard
- Booking management
- Payment verification
- Schedule blocking
- Dynamic configuration management
  - Pricing configuration
  - Scheduling parameters
  - Booking rules
  - System settings

## Dynamic Configuration System

The application includes a robust configuration system that allows administrators to modify pricing, scheduling, and system settings without changing code. For details on how to use and extend this system, see the [Configuration Guide](CONFIGURATION_GUIDE.md).

## Tech Stack

### Backend
- Node.js with Express
- TypeScript
- MongoDB with Mongoose
- JWT Authentication
- Nodemailer for email notifications

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Mobile-first responsive design

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/car-cleaning-app.git
cd car-cleaning-app
```

2. Install dependencies
```
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables
```
# Backend (.env file in backend directory)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/car_cleaning_app
JWT_SECRET=your_jwt_secret_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
CLIENT_URL=http://localhost:3000

# Frontend (.env.local file in frontend directory)
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. Seed the database
```
# Seed the database with initial data
cd backend
npm run seed
```

5. Start the development servers
```
# Start backend server
cd backend
npm run dev

# Start frontend server
cd ../frontend
npm run dev
```

6. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/resend-otp` - Resend OTP
- `PUT /api/auth/update-email` - Update email

### User
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/wallet` - Get wallet balance

### Bookings
- `GET /api/bookings/time-slots` - Get available time slots
- `POST /api/bookings` - Create a new booking
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get booking by ID
- `PUT /api/bookings/:id/cancel` - Cancel booking
- `POST /api/bookings/:id/payment` - Submit payment for booking

### Subscriptions
- `POST /api/subscriptions` - Create a new subscription
- `GET /api/subscriptions` - Get user's subscriptions
- `GET /api/subscriptions/:id` - Get subscription by ID
- `PUT /api/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/subscriptions/:id/renew` - Renew subscription
- `POST /api/subscriptions/:id/payment` - Submit payment for subscription

### Payments
- `GET /api/payments/qr-code` - Get QR code for payment
- `GET /api/payments/:id` - Get payment by ID

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats
- `GET /api/admin/bookings` - Get all bookings
- `PUT /api/admin/bookings/:id/status` - Update booking status
- `GET /api/admin/time-slots` - Get time slots
- `POST /api/admin/time-slots/block` - Block time slot
- `PUT /api/admin/time-slots/:id/unblock` - Unblock time slot
- `GET /api/admin/services` - Get all services
- `POST /api/admin/services` - Create service
- `PUT /api/admin/services/:id` - Update service
- `PUT /api/admin/services/:id/toggle-active` - Toggle service active status
- `GET /api/admin/qr-codes` - Get all QR codes
- `POST /api/admin/qr-codes` - Create QR code
- `PUT /api/admin/qr-codes/:id/toggle-active` - Toggle QR code active status
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/toggle-admin` - Toggle user admin status
- `GET /api/admin/audit-logs` - Get audit logs
- `GET /api/admin/configurations` - Get all configurations
- `GET /api/admin/configurations/:key` - Get configuration by key
- `PUT /api/admin/configurations/:key` - Update configuration
- `POST /api/admin/configurations/reset` - Reset configurations to defaults

## Configurations

The application has the following configurable settings:

### Pricing
- `pricing.oneTimeCleaning` - Price for one-time cleaning service (default: 100 Baht)
- `pricing.weeklySubscription` - Price for once a week subscription (default: 300 Baht per month)
- `pricing.premiumSubscription` - Price for thrice a week subscription (default: 500 Baht per month)

### Scheduling
- `scheduling.businessHours` - Business hours for cleaning services (default: 09:00 to 21:00)
- `scheduling.saturdayCutoffHour` - Hour after which bookings are not allowed on Saturday (default: 18)
- `scheduling.minBookingHoursAhead` - Minimum hours ahead required for a booking (default: 6)
- `scheduling.slotDuration` - Duration of each time slot in minutes (default: 30)
- `scheduling.sundayBookings` - Whether bookings are allowed on Sundays (default: false)

### Booking
- `booking.subscriptionRenewalReminderDays` - Days before subscription end when renewal reminder is sent (default: 5)

### System
- `system.emailVerificationRequired` - Whether email verification is required for new accounts (default: true)
- `system.otpExpiryMinutes` - OTP expiry time in minutes (default: 10)
- `system.otpRateLimitMinutes` - Rate limit for OTP requests in minutes (default: 1)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 