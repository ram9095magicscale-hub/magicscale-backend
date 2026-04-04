// models/Payment.js

import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String }, // Store guest name
  email: { type: String }, // Store for guest linking
  phone: { type: String }, // Store for guest linking
  plan: { type: String, required: true },
  duration: { type: Number, required: true },
  amount: { type: Number, required: true },
  orderId: { type: String, required: true },
  status: { type: String, default: "paid" },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
