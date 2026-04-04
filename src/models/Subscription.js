// models/Subscription.js
import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for guest checkout
  },
  name: { type: String }, // Store guest name
  email: { type: String }, // Store for guest linking
  phone: { type: String }, // Store for guest linking
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  planName: String, // store for quick reference even if Plan gets deleted
  amount: Number,
  duration: Number, // in months
  status: {
    type: String,
    enum: ['Active', 'Cancelled', 'Expired'],
    default: 'Active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  }
}, { timestamps: true });

export default mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
