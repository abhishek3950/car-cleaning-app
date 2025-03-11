import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/user.model';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Define interfaces
export interface TokenPayload {
  id: string;
  isAdmin: boolean;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

// Generate JWT token
export const generateToken = (user: IUser): string => {
  const payload: TokenPayload = {
    id: user._id.toString(),
    isAdmin: user.isAdmin,
  };

  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });
};

// Authentication middleware to verify JWT token
export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Not authorized, token missing' });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Not authorized, token missing' });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
      req.user = decoded;
      next();
    } catch (error) {
      console.error('JWT verification failed', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } catch (error) {
    console.error('Authentication error', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin authorization middleware
export const authorizeAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

// Verified user middleware
export const authorizeVerified = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user || !user.isVerified) {
      res.status(403).json({ message: 'Email not verified' });
      return;
    }

    next();
  } catch (error) {
    console.error('Verification check error', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 