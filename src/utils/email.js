








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

// ✅ New: Send Welcome Email for Newsletter
export const sendWelcomeEmail = async (email) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🎉 Welcome to MagicScale Insights!',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eef2f6; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">MagicScale</h1>
          <p style="margin-top: 10px; opacity: 0.9; font-size: 16px;">Empowering India's Foodpreneurs</p>
        </div>
        <div style="padding: 40px; background: white;">
          <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 20px;">You're officially on the list! 🚀</h2>
          <p style="color: #475569; line-height: 1.7; font-size: 16px;">
            Hi there,<br/><br/>
            Thanks for joining the MagicScale community! You've just taken a great step toward staying ahead in the food tech industry.
          </p>
          <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6;">
              <strong>What to expect?</strong><br/>
              Expert tips on Swiggy/Zomato growth, legal compliance guides, and exclusive insights from top Indian food business owners.
            </p>
          </div>
          <div style="text-align: center;">
            <a href="https://magicscale.in/services" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; transition: all 0.3s ease;">Explore Our Services</a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 25px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin-bottom: 10px;">© 2024 MagicScale. All rights reserved.</p>
          <p>You received this because you subscribed to the MagicScale Newsletter.</p>
          <p><a href="https://magicscale.in/unsubscribe?email=${email}" style="color: #4f46e5; font-weight: 600;">Unsubscribe</a></p>
        </div>
      </div>
    `,
  };
  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Welcome email sent:', info.response);
  return info;
};

// ✅ Refined: Send Newsletter Email for Blog Update
export const sendNewsletterEmail = async (subscribers, blog) => {
  const mailPromises = subscribers.map(subscriber => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: subscriber.email,
      subject: `📚 New Insight: ${blog.title} - MagicScale`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eef2f6; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">MagicScale Insights</h1>
          </div>
          <div style="padding: 40px; background: white;">
            <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 15px; line-height: 1.3;">${blog.title}</h2>
            <p style="color: #475569; line-height: 1.7; font-size: 16px; margin-bottom: 25px;">
              ${blog.summary || (blog.content && blog.content.substring(0, 150)) || 'Check out our latest update for foodpreneurs...'}
            </p>
            <div style="text-align: center; margin-top: 35px;">
              <a href="https://magicscale.in/blogs/${blog._id}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 35px; text-decoration: none; border-radius: 10px; font-weight: bold; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">Read Full Article</a>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 25px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin-bottom: 10px;">Stay ahead of the competition. Follow the data.</p>
            <p>You received this because you subscribed to the MagicScale Newsletter.</p>
            <p><a href="https://magicscale.in/unsubscribe?email=${subscriber.email}" style="color: #4f46e5; font-weight: 600;">Unsubscribe</a></p>
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
