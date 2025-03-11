import mongoose, { Document, Schema } from 'mongoose';

export interface IConfig extends Document {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  category: 'pricing' | 'scheduling' | 'booking' | 'system';
  updatedBy?: mongoose.Types.ObjectId;
}

const configSchema = new Schema<IConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'object', 'array'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['pricing', 'scheduling', 'booking', 'system'],
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

// Helper method to get config by key
configSchema.statics.getByKey = async function(key: string) {
  const config = await this.findOne({ key });
  return config ? config.value : null;
};

// Helper method to get configs by category
configSchema.statics.getByCategory = async function(category: string) {
  const configs = await this.find({ category });
  return configs.reduce((acc, config) => {
    acc[config.key] = config.value;
    return acc;
  }, {} as Record<string, any>);
};

// Helper method to update config
configSchema.statics.updateByKey = async function(key: string, value: any, updatedBy?: string) {
  const update: any = { value };
  if (updatedBy) {
    update.updatedBy = updatedBy;
  }
  
  return this.findOneAndUpdate(
    { key },
    update,
    { new: true }
  );
};

interface ConfigModel extends mongoose.Model<IConfig> {
  getByKey(key: string): Promise<any>;
  getByCategory(category: string): Promise<Record<string, any>>;
  updateByKey(key: string, value: any, updatedBy?: string): Promise<IConfig | null>;
}

const Config = mongoose.model<IConfig, ConfigModel>('Config', configSchema);

export default Config; 