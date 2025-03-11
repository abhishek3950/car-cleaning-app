import mongoose, { Document, Schema } from 'mongoose';

export interface IAvailableSlot extends Document {
  date: Date;
  startTime: string;
  endTime: string;
  isBlocked: boolean;
  blockedBy?: mongoose.Types.ObjectId;
  blockReason?: string;
  bookedBy?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
}

const timeSlotSchema = new Schema<IAvailableSlot>(
  {
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    blockReason: {
      type: String,
    },
    bookedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of date and time
timeSlotSchema.index({ date: 1, startTime: 1 }, { unique: true });

const TimeSlot = mongoose.model<IAvailableSlot>('TimeSlot', timeSlotSchema);

export default TimeSlot; 