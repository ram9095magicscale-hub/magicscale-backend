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
      const { name, email, phone, amount } = req.body;
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
            return_url: `https://magicscale.in/payment-success?order_id=${orderId}`,
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
      const { order_id, userId, plan, duration, amount, email, name } = req.body;

      await Payment.create({
        user: userId,
        plan,
        duration,
        amount,
        orderId: order_id,
        status: "paid",
        timestamp: new Date(),
      });

      await User.findByIdAndUpdate(userId, {
        subscription: {
          plan,
          duration,
          expiresAt: new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Use the correct export from email.js
      await sendPaymentEmails({ name, email, plan, duration, amount, orderId: order_id });

      res.json({ success: true });
    });
  }

  return Response.json({ 
    message: `Cashfree Action '${action}' not found`,
    slug: slug,
    status: "error"
  }, { status: 404 });
}
