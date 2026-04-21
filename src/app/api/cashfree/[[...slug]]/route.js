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

  // Automatically trim credentials to prevent 401 errors from accidental whitespace
  const appId = process.env.CASHFREE_APP_ID?.trim();
  const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
  const env = process.env.CASHFREE_ENV?.trim()?.toUpperCase();

  if (action === "initiate-payment") {
    return handleRequest(req, { params }, async (req, res) => {
      let { name, email, phone, amount, return_url } = req.body;
      const orderId = "ORD_" + Date.now();

      // Sanitize phone: Cashfree expects a valid 10-digit number or prefixed with country code
      // Removing any spaces or special characters
      if (phone) {
        phone = phone.replace(/[^\d+]/g, ''); 
        if (phone.length > 10 && phone.startsWith('0')) {
          phone = phone.substring(1); // Remove leading 0 if present in international format
        }
      }

      console.log("Initiating payment for:", { name, email, amount, phone, orderId });

      const orderUrl =
        env === "PROD"
          ? "https://api.cashfree.com/pg/orders"
          : "https://sandbox.cashfree.com/pg/orders";

      try {
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
              "x-client-id": appId,
              "x-client-secret": secretKey,
              "x-api-version": "2023-08-01",
              "Content-Type": "application/json",
            },
          }
        );

        return res.json({
          success: true,
          order_id: orderId,
          payment_session_id: orderResponse.data.payment_session_id,
        });
      } catch (axiosErr) {
        console.error("Cashfree API Error:", axiosErr.response?.data || axiosErr.message);
        return res.status(axiosErr.response?.status || 400).json({
          success: false,
          message: axiosErr.response?.data?.message || axiosErr.message,
          error: axiosErr.response?.data
        });
      }
    });
  }

  if (action === "create-link") {
    return handleRequest(req, { params }, async (req, res) => {
      const { name, email, phone, amount, purpose } = req.body;
      const linkId = "LNK_" + Date.now();

      const linkUrl =
        env === "PROD"
          ? "https://api.cashfree.com/pg/links"
          : "https://sandbox.cashfree.com/pg/links";

      try {
        const linkResponse = await axios.post(
          linkUrl,
          {
            link_id: linkId,
            link_amount: amount,
            link_currency: "INR",
            link_purpose: purpose || "Purchase at MagicScale",
            customer_details: {
              customer_phone: phone,
              customer_email: email,
              customer_name: name,
            },
            link_notify: {
              send_sms: true,
              send_email: true,
            },
          },
          {
            headers: {
              "x-client-id": appId,
              "x-client-secret": secretKey,
              "x-api-version": "2023-08-01",
              "Content-Type": "application/json",
            },
          }
        );

        return res.json({
          success: true,
          link_id: linkId,
          link_url: linkResponse.data.link_url,
          link_status: linkResponse.data.link_status,
        });
      } catch (axiosErr) {
        console.error("Cashfree Link API Error:", axiosErr.response?.data || axiosErr.message);
        return res.status(axiosErr.response?.status || 400).json({
          success: false,
          message: axiosErr.response?.data?.message || axiosErr.message,
          error: axiosErr.response?.data
        });
      }
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
        const statusUrl = env === "PROD"
          ? `https://api.cashfree.com/pg/orders/${order_id}`
          : `https://sandbox.cashfree.com/pg/orders/${order_id}`;

        const statusResponse = await axios.get(statusUrl, {
          headers: {
            "x-client-id": appId,
            "x-client-secret": secretKey,
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

  if (action === "webhook") {
    // Note: In production, verify signatures here
    return handleRequest(req, { params }, async (req, res) => {
      const data = req.body;
      const { order_id, order_amount, payment_status, customer_details } = data.data?.order || {};

      if (payment_status === "PAID") {
        const existingPayment = await Payment.findOne({ orderId: order_id });
        if (!existingPayment) {
          await Payment.create({
            name: customer_details?.customer_name,
            email: customer_details?.customer_email,
            phone: customer_details?.customer_phone,
            plan: "Payment Link Selection",
            duration: 1,
            amount: order_amount,
            orderId: order_id,
            status: "paid",
            timestamp: new Date(),
          });
          
          try {
            await sendPaymentEmails({ 
              name: customer_details?.customer_name, 
              email: customer_details?.customer_email, 
              plan: "Payment Link", 
              amount: order_amount, 
              orderId: order_id 
            });
          } catch (e) {}
        }
      }
      return res.json({ status: "received" });
    });
  }

  if (action === "user-details") {
    return handleRequest(req, { params }, async (req, res) => {
      const { identifier } = req.query; // email or phone
      if (!identifier) return res.status(400).json({ success: false, message: "Identifier required" });

      try {
        const user = await User.findOne({
          $or: [{ email: identifier }, { phone: identifier }]
        }).select('name email phone');

        const lastPayment = await Payment.findOne({
          $or: [{ email: identifier }, { phone: identifier }]
        }).sort({ timestamp: -1 });

        return res.json({
          success: true,
          user: user || (lastPayment ? { name: lastPayment.name, email: lastPayment.email, phone: lastPayment.phone } : null),
          lastPayment
        });
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    });
  }

  return Response.json({ 
    message: `Cashfree Action '${action}' not found`,
    slug: slug,
    status: "error"
  }, { status: 404 });
}
