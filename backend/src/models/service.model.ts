import mongoose, { Document, Schema } from 'mongoose';

export interface IService extends Document {
  name: string;
  description: string;
  type: 'one-time' | 'subscription';
  frequency?: 'once' | 'thrice';
  price: number;
  isActive: boolean;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['one-time', 'subscription'],
      required: true,
    },
    frequency: {
      type: String,
      enum: ['once', 'thrice'],
      // Required only for subscription type
    },
    price: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model<IService>('Service', serviceSchema);

export default Service; 