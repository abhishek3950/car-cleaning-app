import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeSlot {
  day: string;
  startTime: string;
  endTime: string;
}

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  isSubscription: boolean;
  subscriptionId?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  carNumber: string;
  parkingLocation: string;
  carImage: string;
  date: Date;
  timeSlots: ITimeSlot[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentId?: mongoose.Types.ObjectId;
  paymentStatus: 'pending' | 'completed' | 'refunded';
  paymentSlip?: string;
  cancellationReason?: string;
  notes?: string;
}

const bookingSchema = new Schema<IBooking>(
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
    isSubscription: {
      type: Boolean,
      default: false,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
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
    date: {
      type: Date,
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
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'pending',
    },
    paymentSlip: {
      type: String,
    },
    cancellationReason: {
      type: String,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking; 