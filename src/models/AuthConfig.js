// models/AuthConfig.js
import mongoose from 'mongoose';

const authConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'authProvider' },
  provider: { type: String, enum: ['otp-less', 'firebase'], default: 'otp-less' },
});

export default mongoose.models.AuthConfig || mongoose.model('AuthConfig', authConfigSchema);
