

// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//   },

//   email: {
//     type: String,
//     required: true,
//     unique: true,
//   },

//   password: {
//     type: String,
//     required: true,
//   },

//   role: {
//     type: String,
//     enum: ['user', 'seller', 'admin'],
//     default: 'user',
//   },

//   isVerified: {
//     type: Boolean,
//     default: false,
//   },
//   otp: {
//     type: String,
//   },
//   otpExpiry: {
//     type: Date,
//   },
//   verificationToken: {
//     type: String,
//   },

//   resetPasswordToken: {
//     type: String,
//   },
//   resetPasswordExpires: {
//     type: Date,
//   },

//   // ✅ Profile fields
//   profilePhoto: {
//     type: String,
//   },
//   aadharCard: {
//     type: String,
//   },
//   panCard: {
//     type: String,
//   },
// }, { timestamps: true });

// export default mongoose.models.User || mongoose.model('User', userSchema);







import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ['user', 'seller', 'admin'],
    default: 'user',
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  otp: {
    type: String,
  },

  otpExpiresAt: {
    type: Date, // ✅ renamed from otpExpiry
  },

  verificationToken: {
    type: String,
  },

  resetPasswordToken: {
    type: String,
  },

  resetPasswordExpires: {
    type: Date,
  },

  // ✅ Optional profile fields
  phone: {
    type: String,
  },

  profilePhoto: {
    type: String,
  },

  aadharCard: {
    type: String,
  },

  panCard: {
    type: String,
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
