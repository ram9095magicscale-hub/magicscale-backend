// models/Payment.js

import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  plan: { type: String, required: true },
  duration: { type: Number, required: true },
  amount: { type: Number, required: true },
  orderId: { type: String, required: true },
  status: { type: String, default: "paid" },
  timestamp: { type: Date, default: Date.now },
});

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
