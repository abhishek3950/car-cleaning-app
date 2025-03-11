import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email templates
const templates = {
  otp: (otp: string) => `
    <h1>Email Verification</h1>
    <p>Thank you for registering with Car Cleaning Service. Please use the following OTP to verify your email:</p>
    <h2>${otp}</h2>
    <p>This OTP is valid for 10 minutes only.</p>
  `,
  
  bookingConfirmation: (name: string, date: string, time: string) => `
    <h1>Booking Confirmation</h1>
    <p>Hello ${name},</p>
    <p>Your booking has been confirmed for ${date} at ${time}.</p>
    <p>Thank you for choosing our Car Cleaning Service.</p>
  `,
  
  paymentConfirmation: (name: string, amount: number) => `
    <h1>Payment Confirmation</h1>
    <p>Hello ${name},</p>
    <p>Your payment of ${amount} Bhat has been verified.</p>
    <p>Thank you for your payment.</p>
  `,
  
  subscriptionRenewal: (name: string, endDate: string, amount: number) => `
    <h1>Subscription Renewal Reminder</h1>
    <p>Hello ${name},</p>
    <p>Your subscription will end on ${endDate}. Please renew your subscription to continue enjoying our services.</p>
    <p>Renewal amount: ${amount} Bhat</p>
    <p>Thank you for choosing our Car Cleaning Service.</p>
  `,
  
  bookingCancellation: (name: string, date: string, time: string) => `
    <h1>Booking Cancellation Confirmation</h1>
    <p>Hello ${name},</p>
    <p>Your booking for ${date} at ${time} has been cancelled.</p>
    <p>A cleaning credit has been added to your wallet.</p>
  `,
};

// Email sending functions
export const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification - Car Cleaning Service',
      html: templates.otp(otp),
    });
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

export const sendBookingConfirmationEmail = async (
  email: string,
  name: string,
  date: string,
  time: string
): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Booking Confirmation - Car Cleaning Service',
      html: templates.bookingConfirmation(name, date, time),
    });
    return true;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return false;
  }
};

export const sendPaymentConfirmationEmail = async (
  email: string,
  name: string,
  amount: number
): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Payment Confirmation - Car Cleaning Service',
      html: templates.paymentConfirmation(name, amount),
    });
    return true;
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return false;
  }
};

export const sendSubscriptionRenewalEmail = async (
  email: string,
  name: string,
  endDate: string,
  amount: number
): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Subscription Renewal Reminder - Car Cleaning Service',
      html: templates.subscriptionRenewal(name, endDate, amount),
    });
    return true;
  } catch (error) {
    console.error('Error sending subscription renewal email:', error);
    return false;
  }
};

export const sendBookingCancellationEmail = async (
  email: string,
  name: string,
  date: string,
  time: string
): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Booking Cancellation - Car Cleaning Service',
      html: templates.bookingCancellation(name, date, time),
    });
    return true;
  } catch (error) {
    console.error('Error sending booking cancellation email:', error);
    return false;
  }
}; 