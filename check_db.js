import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const paymentSchema = new mongoose.Schema({
  orderId: { type: String },
  gateway: { type: String },
  paymentLink: { type: String },
  status: { type: String }
}, { strict: false });

const Payment = mongoose.model("Payment", paymentSchema);

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");
  const razorpayLinks = await Payment.find({ orderId: { $regex: /^LNK_/ }, gateway: "razorpay" }).sort({ timestamp: -1 }).limit(5);
  console.log("Links with gateway=razorpay:");
  console.log(razorpayLinks);
  
  const allLinks = await Payment.find({ orderId: { $regex: /^LNK_/ } }).sort({ timestamp: -1 }).limit(5);
  console.log("All Links:");
  console.log(allLinks.map(l => ({ orderId: l.orderId, gateway: l.gateway, date: l.timestamp })));
  
  process.exit(0);
}
check();
