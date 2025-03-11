import mongoose, { Document, Schema } from 'mongoose';

export interface IQRCode extends Document {
  image: string;
  paymentInstructions: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const qrCodeSchema = new Schema<IQRCode>(
  {
    image: {
      type: String,
      required: true,
    },
    paymentInstructions: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const QRCode = mongoose.model<IQRCode>('QRCode', qrCodeSchema);

export default QRCode; 