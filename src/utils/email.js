








// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';

// dotenv.config();

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // ✅ Send OTP
// export const sendOTP = async (email, otp) => {
//   try {
//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'Your OTP Code',
//       text: `Your OTP is: ${otp}`,
//     };

//     const info = await transporter.sendMail(mailOptions);
//     console.log('✅ OTP email sent:', info.response);
//     return info;
//   } catch (error) {
//     console.error('❌ Failed to send OTP:', error);
//     throw new Error('OTP sending failed via Nodemailer');
//   }
// };

// // ✅ Send Password Reset Email
// export const sendResetEmail = async (email, token) => {
//   try {
//     const resetLink = `http://localhost:5173/reset-password/${token}`;

//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'Password Reset Request',
//       html: `
//         <h3>Reset Your Password</h3>
//         <p>You requested to reset your password. Click the link below to proceed:</p>
//         <a href="${resetLink}" style="background:#4CAF50;color:#fff;padding:10px 15px;text-decoration:none;border-radius:5px;">Reset Password</a>
//         <p>This link will expire in 1 hour.</p>
//       `,
//     };

//     const info = await transporter.sendMail(mailOptions);
//     console.log('✅ Reset email sent:', info.response);
//     return info;
//   } catch (error) {
//     console.error('❌ Failed to send reset email:', error);
//     throw new Error('Password reset email sending failed');
//   }
// };












// utils/mailer.js
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  service: 'gmail', // or your SMTP service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Send OTP
export const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is: ${otp}`,
  };
  const info = await transporter.sendMail(mailOptions);
  console.log('✅ OTP email sent:', info.response);
  return info;
};

// ✅ Send Password Reset Email
export const sendResetEmail = async (email, token) => {
  const resetLink = `https://magicscale.in/reset-password/${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h3>Reset Your Password</h3>
      <p>You requested to reset your password. Click below:</p>
      <a href="${resetLink}" style="background:#4CAF50;color:#fff;padding:10px 15px;text-decoration:none;border-radius:5px;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `,
  };
  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Reset email sent:', info.response);
  return info;
};

// ✅ New: Send Payment Confirmation Email
export const sendPaymentEmails = async ({ name, email, plan, duration, amount, orderId }) => {
  const customerMessage = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🎉 Payment Successful - MagicScale',
    html: `
      <h2>Hi ${name},</h2>
      <p>Thanks for your purchase of the <strong>${plan}</strong> plan.</p>
      <ul>
        <li><strong>Duration:</strong> ${duration} months</li>
        <li><strong>Amount:</strong> ₹${amount}</li>
        <li><strong>Order ID:</strong> ${orderId}</li>
      </ul>
      <p>We’ve started processing your request. Thank you!</p>
      <br/><p>— MagicScale Team</p>
    `,
  };

  const adminMessage = {
    from: process.env.EMAIL_USER,
    to: 'vikasvikas9095@gmail.com', // ✅ Change this to your actual admin email
    subject: `📢 New Purchase: ${name} | ${plan}`,
    html: `
      <h2>New Order Details</h2>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Plan:</strong> ${plan}</li>
        <li><strong>Duration:</strong> ${duration} months</li>
        <li><strong>Amount:</strong> ₹${amount}</li>
        <li><strong>Order ID:</strong> ${orderId}</li>
      </ul>
    `,
  };

  const results = await Promise.all([
    transporter.sendMail(customerMessage),
    transporter.sendMail(adminMessage),
  ]);

  console.log("✅ Payment emails sent:", results.map(r => r.response));
  return results;
};

// ✅ New: Send Newsletter Email for Blog Update
export const sendNewsletterEmail = async (subscribers, blog) => {
  const mailPromises = subscribers.map(subscriber => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: subscriber.email,
      subject: `📚 New Blog Post: ${blog.title} - MagicScale`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background: #4f46e5; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">MagicScale Insights</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #333;">${blog.title}</h2>
            <p style="color: #666; line-height: 1.6;">${blog.summary || blog.content.substring(0, 150) + '...'}</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="https://magicscale.in/blogs/${blog._id}" style="background: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Read Full Article</a>
            </div>
          </div>
          <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #999;">
            <p>You received this because you subscribed to the MagicScale Newsletter.</p>
            <p><a href="http://localhost:5173/unsubscribe?email=${subscriber.email}" style="color: #4f46e5;">Unsubscribe</a></p>
          </div>
        </div>
      `,
    };
    return transporter.sendMail(mailOptions);
  });

  const results = await Promise.allSettled(mailPromises);
  const sentCount = results.filter(r => r.status === 'fulfilled').length;
  console.log(`✅ Newsletter sent to ${sentCount}/${subscribers.length} subscribers`);
  return results;
};
