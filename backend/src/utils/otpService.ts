import User from '../models/user.model';
import { sendOTPEmail } from './emailService';
import * as configService from './configService';

// Default values
const DEFAULT_OTP_EXPIRY_MINUTES = 10;
const DEFAULT_OTP_RATE_LIMIT_MINUTES = 1;
const DEFAULT_EMAIL_VERIFICATION_REQUIRED = true;

// Generate a random 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check if user can request a new OTP (rate limiting)
export const canRequestNewOTP = async (userId: string): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return false;
    }
    
    if (!user.lastOtpSent) {
      return true;
    }
    
    // Get configured rate limit from database or use default
    const otpRateLimitMinutes = await configService.getConfig<number>(
      'system.otpRateLimitMinutes',
      DEFAULT_OTP_RATE_LIMIT_MINUTES
    );
    
    const lastOtpTime = new Date(user.lastOtpSent).getTime();
    const currentTime = new Date().getTime();
    
    // Allow new OTP only if rate limit period has passed
    const rateLimitInMs = otpRateLimitMinutes * 60 * 1000;
    return currentTime - lastOtpTime > rateLimitInMs;
  } catch (error) {
    console.error('Error checking OTP request limit:', error);
    return false;
  }
};

// Generate and send OTP to user's email
export const sendOTP = async (userId: string, email: string): Promise<boolean> => {
  try {
    // Check rate limiting
    const canRequest = await canRequestNewOTP(userId);
    if (!canRequest) {
      return false;
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Get configured OTP expiry from database or use default
    const otpExpiryMinutes = await configService.getConfig<number>(
      'system.otpExpiryMinutes',
      DEFAULT_OTP_EXPIRY_MINUTES
    );
    
    // Set OTP expiry based on configured minutes
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + otpExpiryMinutes);
    
    // Update user with new OTP and expiry
    await User.findByIdAndUpdate(userId, {
      otpCode: otp,
      otpExpiry,
      lastOtpSent: new Date(),
    });
    
    // Send OTP via email
    return sendOTPEmail(email, otp);
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
};

// Verify OTP entered by user
export const verifyOTP = async (userId: string, otp: string): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.otpCode || !user.otpExpiry) {
      return false;
    }
    
    // Check if OTP has expired
    const expiry = new Date(user.otpExpiry).getTime();
    const currentTime = new Date().getTime();
    
    if (currentTime > expiry) {
      return false;
    }
    
    // Check if OTP matches
    if (user.otpCode !== otp) {
      return false;
    }
    
    // Check if email verification is required
    const emailVerificationRequired = await configService.getConfig<boolean>(
      'system.emailVerificationRequired',
      DEFAULT_EMAIL_VERIFICATION_REQUIRED
    );
    
    // Clear OTP fields after successful verification
    await User.findByIdAndUpdate(userId, {
      otpCode: null,
      otpExpiry: null,
      isVerified: emailVerificationRequired ? true : user.isVerified,
    });
    
    return true;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
}; 