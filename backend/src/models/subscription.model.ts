import mongoose, { Document, Schema } from 'mongoose';
import { ITimeSlot } from './booking.model';

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  carNumber: string;
  parkingLocation: string;
  carImage: string;
  timeSlots: ITimeSlot[];
  startDate: Date;
  endDate: Date;
  currentPeriodEnd: Date;
  renewalReminderSent: boolean;
  status: 'active' | 'pending' | 'cancelled' | 'expired';
  paymentHistory: mongoose.Types.ObjectId[];
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    carNumber: {
      type: String,
      required: true,
    },
    parkingLocation: {
      type: String,
      required: true,
    },
    carImage: {
      type: String,
      required: true,
    },
    timeSlots: [
      {
        day: {
          type: String,
          required: true,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    renewalReminderSent: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'cancelled', 'expired'],
      default: 'pending',
    },
    paymentHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Payment',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);

export default Subscription; 