import axios from "axios";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { sendPaymentEmails } from "@/utils/email";
import { handleRequest } from "@/lib/route-adapter";

/**
 * Handles /api/cashfree/*
 */
export async function POST(req, { params }) {
  const { slug } = (await params) || { slug: [] };
  const action = slug[0];

  if (action === "initiate-payment") {
    return handleRequest(req, { params }, async (req, res) => {
      const { name, email, phone, amount, return_url } = req.body;
      const orderId = "ORD_" + Date.now();

      const orderUrl =
        process.env.CASHFREE_ENV === "PROD"
          ? "https://api.cashfree.com/pg/orders"
          : "https://sandbox.cashfree.com/pg/orders";

      const orderResponse = await axios.post(
        orderUrl,
        {
          order_id: orderId,
          order_amount: amount,
          order_currency: "INR",
          customer_details: {
            customer_id: email.replace(/[^a-zA-Z0-9_-]/g, "_"),
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
          },
          order_meta: {
            return_url: return_url || `https://magicscale.in/payment-success?order_id=${orderId}`,
          },
        },
        {
          headers: {
            "x-client-id": process.env.CASHFREE_APP_ID,
            "x-client-secret": process.env.CASHFREE_SECRET_KEY,
            "x-api-version": "2022-09-01",
            "Content-Type": "application/json",
          },
        }
      );

      res.json({
        success: true,
        order_id: orderId,
        payment_session_id: orderResponse.data.payment_session_id,
      });
    });
  }

  if (action === "confirm-payment") {
    return handleRequest(req, { params }, async (req, res) => {
      const { order_id, userId, plan, duration, amount, email, name, phone } = req.body;

      if (!order_id) {
        return res.status(400).json({ success: false, message: "Order ID is required" });
      }

      try {
        // 1. Verify payment status with Cashfree
        const statusUrl = process.env.CASHFREE_ENV === "PROD"
          ? `https://api.cashfree.com/pg/orders/${order_id}`
          : `https://sandbox.cashfree.com/pg/orders/${order_id}`;

        const statusResponse = await axios.get(statusUrl, {
          headers: {
            "x-client-id": process.env.CASHFREE_APP_ID,
            "x-client-secret": process.env.CASHFREE_SECRET_KEY,
            "x-api-version": "2022-09-01",
          },
        });

        if (statusResponse.data.order_status !== "PAID") {
          return res.status(400).json({ 
            success: false, 
            message: `Payment not verified (Status: ${statusResponse.data.order_status})` 
          });
        }

        // 2. Check if payment already recorded to avoid duplicates
        const existingPayment = await Payment.findOne({ orderId: order_id });
        if (existingPayment) {
          return res.json({ success: true, message: "Payment already processed" });
        }

        // 3. Create Payment record
        await Payment.create({
          user: userId && userId.includes("guest") ? null : userId,
          name: name,
          email: email,
          phone: phone,
          plan,
          duration,
          amount: statusResponse.data.order_amount || amount,
          orderId: order_id,
          status: "paid",
          timestamp: new Date(),
        });

        // 4. Update User subscription if user exists
        if (userId && !userId.includes("guest")) {
          await User.findByIdAndUpdate(userId, {
            subscription: {
              plan,
              duration,
              expiresAt: new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000),
            },
          });
        }

        // 5. Send confirmation emails
        try {
          await sendPaymentEmails({ name, email, plan, duration, amount, orderId: order_id });
        } catch (emailErr) {
          console.error("Error sending payment emails:", emailErr);
          // Don't fail the whole request if email fails
        }

        res.json({ success: true, message: "Payment confirmed successfully" });
      } catch (err) {
        console.error("Cashfree Verification Error:", err.response?.data || err.message);
        res.status(500).json({ 
          success: false, 
          message: "Error verifying payment", 
          error: err.response?.data || err.message 
        });
      }
    });
  }

  return Response.json({ 
    message: `Cashfree Action '${action}' not found`,
    slug: slug,
    status: "error"
  }, { status: 404 });
}
