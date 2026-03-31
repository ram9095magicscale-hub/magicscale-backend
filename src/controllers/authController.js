











// import User from '@/models/User.js';
// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import { sendOTP, sendResetEmail } from '@/utils/email.js';
// import { generateToken } from '@/utils/token.js'; // You need to create this utility

// // // Register User
// // export const register = async (req, res) => {
// //   const { name, email, password } = req.body;

// //   try {
// //     if (!name || !email || !password) {
// //       return res.status(400).json({ message: 'All fields are required' });
// //     }

// //     const userExists = await User.findOne({ email });
// //     if (userExists) {
// //       return res.status(400).json({ message: 'User already exists' });
// //     }

// //     const hashedPassword = await bcrypt.hash(password, 10);
// //     const otp = Math.floor(100000 + Math.random() * 900000).toString();

// //     const newUser = await User.create({
// //       name,
// //       email,
// //       password: hashedPassword,
// //       otp,
// //       otpExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
// //       isVerified: false,
// //     });

// //     try {
// //       await sendOTP(email, otp);
// //     } catch (emailError) {
// //       console.error('OTP sending failed:', emailError.message);
// //       await User.findByIdAndDelete(newUser._id); // Cleanup
// //       return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
// //     }

// //     res.status(201).json({ message: 'OTP sent to email', userId: newUser._id });

// //   } catch (error) {
// //     console.error('Registration error:', error.message);
// //     res.status(500).json({ message: 'Something went wrong during registration' });
// //   }
// // };
// // Register or resend OTP
// export const register = async (req, res) => {
//   const { name, email, password } = req.body;

//   try {
//     if (!name || !email || !password) {
//       return res.status(400).json({ message: 'All fields are required' });
//     }

//     let user = await User.findOne({ email });

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

//     if (user) {
//       if (user.isVerified) {
//         return res.status(400).json({ message: 'User already exists. Please login.' });
//       } else {
//         // ✅ Update OTP and expiry
//         user.otp = otp;
//         user.otpExpiresAt = otpExpiresAt;

//         // Update password in case user forgot
//         user.password = await bcrypt.hash(password, 10);
//         await user.save();

//         await sendOTP(email, otp);
//         return res.status(200).json({ message: 'OTP resent. Please verify your email.', userId: user._id });
//       }
//     }
//      // POST /api/auth/resend-otp
//      export const resendOTP = async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({ message: 'Email is required' });
//   }

//   try {
//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(404).json({ message: 'User not found. Please sign up.' });
//     }

//     if (user.isVerified) {
//       return res.status(400).json({ message: 'Account already verified. Please login.' });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now

//     user.otp = otp;
//     user.otpExpiresAt = otpExpiresAt;
//     await user.save();

//     await sendOTP(user.email, otp);

//     res.status(200).json({ message: 'New OTP sent successfully' });
//   } catch (err) {
//     console.error('Resend OTP error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

//     // ✅ Create new user
//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newUser = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       otp,
//       otpExpiresAt,
//       isVerified: false,
//     });

//     await sendOTP(email, otp);
//     return res.status(201).json({ message: 'OTP sent to email', userId: newUser._id });

//   } catch (error) {
//     console.error('Register error:', error.message);
//     return res.status(500).json({ message: 'Server error during registration' });
//   }
// };
// // Verify OTP
// export const verifyOTP = async (req, res) => {
//   const { email, otp } = req.body;

//   try {
//     if (!email || !otp) {
//       return res.status(400).json({ message: 'Email and OTP are required' });
//     }

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     const isOtpExpired = Date.now() > user.otpExpiry;

//     if (user.otp !== otp || isOtpExpired) {
//       return res.status(400).json({ message: 'Invalid or expired OTP' });
//     }

//     user.isVerified = true;
//     user.otp = null;
//     user.otpExpiry = null;
//     await user.save();

//     res.status(200).json({ message: 'Email verified successfully' });
//   } catch (err) {
//     console.error('OTP verification error:', err.message);
//     res.status(500).json({ message: 'Verification failed' });
//   }
// };

// export const login = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid email or password' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid email or password' });
//     }

//     if (!user.isVerified) {
//       return res.status(403).json({ message: 'Please verify your email first' });
//     }

//     // ✅ Include role in JWT payload
//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '1d' }
//     );

//     res.status(200).json({
//       message: 'Login successful',
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         isVerified: user.isVerified,
//         role: user.role, // ✅ include role in response
//       },
//     });
//   } catch (error) {
//     console.error('Login error:', error.message);
//     res.status(500).json({ message: 'Something went wrong during login' });
//   }
// };


// // Forgot Password
// export const forgotPassword = async (req, res) => {
//   const { email } = req.body;

//   const user = await User.findOne({ email });
//   if (!user) return res.status(404).json({ msg: 'User not found' });

//   const token = generateToken();
//   user.resetPasswordToken = token;
//   user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
//   await user.save();

//   await sendResetEmail(email, token);
//   res.json({ msg: 'Reset link sent' });
// };

// // Reset Password
// export const resetPassword = async (req, res) => {
//   const { token } = req.params;
//   const { password } = req.body;

//   const user = await User.findOne({
//     resetPasswordToken: token,
//     resetPasswordExpires: { $gt: Date.now() },
//   });

//   if (!user) return res.status(400).json({ msg: 'Invalid or expired token' });

//   user.password = await bcrypt.hash(password, 10);
//   user.resetPasswordToken = undefined;
//   user.resetPasswordExpires = undefined;
//   await user.save();

//   res.json({ msg: 'Password reset successful' });
// };













import User from '@/models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendOTP, sendResetEmail } from '@/utils/email.js';
import { generateToken } from '@/utils/token.js';

// Register or resend OTP
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let user = await User.findOne({ email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ message: 'User already exists. Please login.' });
      } else {
        user.otp = otp;
        user.otpExpiresAt = otpExpiresAt;
        user.password = await bcrypt.hash(password, 10);
        await user.save();

        try {
          await sendOTP(email, otp);
        } catch (emailErr) {
          console.error('❌ Email send error (resend):', emailErr.message);
          return res.status(500).json({ message: 'Failed to send OTP email. Check your email configuration.' });
        }

        return res.status(200).json({ message: 'OTP resent. Please verify your email.', userId: user._id });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpiresAt,
      isVerified: false,
    });

    try {
      await sendOTP(email, otp);
    } catch (emailErr) {
      console.error('❌ Email send error (new user):', emailErr.message);
      // Delete user so they can try again
      await User.findByIdAndDelete(newUser._id);
      return res.status(500).json({ message: 'Failed to send OTP email. Check your email configuration.' });
    }

    return res.status(201).json({ message: 'OTP sent to email', userId: newUser._id });
  } catch (error) {
    console.error('❌ Register error:', error.message, error.stack);
    return res.status(500).json({ message: 'Server error during registration: ' + error.message });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found. Please sign up.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account already verified. Please login.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    await sendOTP(user.email, otp);

    res.status(200).json({ message: 'New OTP sent successfully' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isOtpExpired = Date.now() > user.otpExpiresAt;

    if (user.otp !== otp || isOtpExpired) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('OTP verification error:', err.message);
    res.status(500).json({ message: 'Verification failed' });
  }
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Something went wrong during login' });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ msg: 'User not found' });

  const token = generateToken();
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
  await user.save();

  await sendResetEmail(email, token);
  res.json({ msg: 'Reset link sent' });
};

// Reset Password
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ msg: 'Invalid or expired token' });

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ msg: 'Password reset successful' });
};
