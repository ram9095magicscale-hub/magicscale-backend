// utils/authProvider.js
import AuthConfig from '@/models/AuthConfig.js';

export const getAuthProvider = async () => {
  const config = await AuthConfig.findOne({ key: 'authProvider' });
  return config?.provider || 'otp-less';
};
