import Razorpay from "razorpay";
import crypto from "crypto";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { sendPaymentEmails } from "@/utils/email";
import { handleRequest } from "@/lib/route-adapter";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "razorpay_secret_placeholder",
});

console.log("Razorpay Initialized with Key ID prefix:", (process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder").substring(0, 8));

/**
 * Handles /api/razorpay/*
 */
export async function POST(req, { params }) {
  const { slug } = (await params) || { slug: [] };
  const action = slug[0];

  console.log("Razorpay API Action:", action);

  if (action === "create-order") {
    return handleRequest(req, { params }, async (req, res) => {
      const { amount, currency = "INR", receipt = "receipt_" + Date.now() } = req.body;

      console.log("Razorpay Create Order Request:", { amount, currency, receipt });

      if (amount === undefined || amount === null || isNaN(amount)) {
        console.error("Razorpay Error: Invalid amount provided", amount);
        return res.status(400).json({ message: "Invalid amount provided" });
      }

      try {
        const options = {
          amount: Math.round(amount * 100), // Razorpay expects amount in paise
          currency,
          receipt,
        };

        console.log("Razorpay Order Options:", options);

        const order = await razorpay.orders.create(options);
        
        console.log("Razorpay Order Created Successfully:", order.id);

        res.json({
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID,
        });
      } catch (error) {
        console.error("Razorpay Order Creation Error (Full):", error);
        res.status(500).json({ 
          message: "Failed to create order", 
          error: error.message,
          code: error.code,
          description: error.description
        });
      }
    });
  }

  if (action === "verify-payment") {
    return handleRequest(req, { params }, async (req, res) => {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        userId,
        plan,
        duration,
        amount,
        email,
        name
      } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "razorpay_secret_placeholder")
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        try {
          // 1. Create Payment Record
          await Payment.create({
            user: userId,
            plan,
            duration,
            amount,
            orderId: razorpay_order_id,
            status: "paid",
            timestamp: new Date(),
          });

          // 2. Update User Subscription
          if (userId) {
            await User.findByIdAndUpdate(userId, {
              subscription: {
                plan,
                duration,
                expiresAt: new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000),
              },
            });
          }

          // 3. Send Success Emails
          await sendPaymentEmails({ name, email, plan, duration, amount, orderId: razorpay_order_id });

          res.json({ success: true, message: "Payment verified successfully" });
        } catch (dbError) {
          console.error("Database Update Error after payment:", dbError);
          res.status(500).json({ success: false, message: "Payment verified but database update failed" });
        }
      } else {
        res.status(400).json({ success: false, message: "Invalid signature" });
      }
    });
  }

  return Response.json({ message: "Not Found" }, { status: 404 });
}
