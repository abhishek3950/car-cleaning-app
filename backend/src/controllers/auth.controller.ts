import { Request, Response } from 'express';
import User from '../models/user.model';
import { generateToken, AuthRequest } from '../utils/authService';
import { sendOTP, verifyOTP as verifyUserOTP } from '../utils/otpService';

// Register a new user
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      phone,
      isVerified: false,
      walletCredit: 0,
      isAdmin: false,
    });

    // Generate and send OTP
    const otpSent = await sendOTP(user._id.toString(), email);

    if (!otpSent) {
      res.status(500).json({ message: 'Failed to send OTP' });
      return;
    }

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      _id: user._id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      token,
      message: 'OTP sent to your email for verification',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      _id: user._id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      walletCredit: user.walletCredit,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify OTP
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      res.status(400).json({ message: 'User ID and OTP are required' });
      return;
    }

    const verified = await verifyUserOTP(userId, otp);

    if (!verified) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      _id: user._id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend OTP
export const resendOTP = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // If already verified, no need to send OTP
    if (user.isVerified) {
      res.status(400).json({ message: 'Email already verified' });
      return;
    }

    const otpSent = await sendOTP(userId, user.email);

    if (!otpSent) {
      res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
      return;
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update email
export const updateEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { email } = req.body;
    const userId = req.user.id;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    // Check if email is already in use
    const emailExists = await User.findOne({ email, _id: { $ne: userId } });
    if (emailExists) {
      res.status(400).json({ message: 'Email already in use' });
      return;
    }

    // Update email and set isVerified to false
    const user = await User.findByIdAndUpdate(
      userId,
      { email, isVerified: false },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Send OTP to new email
    const otpSent = await sendOTP(userId, email);

    if (!otpSent) {
      res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
      return;
    }

    res.json({
      _id: user._id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      message: 'Email updated. OTP sent for verification.',
    });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 