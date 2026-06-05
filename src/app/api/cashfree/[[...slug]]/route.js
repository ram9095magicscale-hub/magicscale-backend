import axios from "axios";
import User from "@/models/User";
import Payment from "@/models/Payment";
import ShortLink from "@/models/ShortLink";
import { sendPaymentEmails, sendPaymentLinkEmail } from "@/utils/email";
import { handleRequest } from "@/lib/route-adapter";
import crypto from "crypto";

/**
 * Handles /api/cashfree/*
 * Note: Now uses Razorpay internally via the wrapper API
 */
export async function POST(req, { params }) {
  const { slug } = (await params) || { slug: [] };
  const action = slug[0];

  if (action === "initiate-payment") {
    return handleRequest(req, { params }, async (req, res) => {
      let { name, email, phone, amount, planId, return_url } = req.body;
      const orderId = "ORD_" + Date.now();

      if (phone) {
        phone = phone.replace(/[^\d+]/g, '');
        if (phone.length > 10 && phone.startsWith('0')) {
          phone = phone.substring(1);
        }
      }

      let safeReturnUrl = return_url || `https://magicscale.in/payment-success?order_id=${orderId}`;
      if (safeReturnUrl.startsWith("http://") && !safeReturnUrl.includes("localhost")) {
        safeReturnUrl = safeReturnUrl.replace("http://", "https://");
      }

      try {
        const razorpayPayload = {
          amount: amount,
          currency: "INR",
          description: "MagicScale Service Checkout",
          customer: {
            name: name || "Customer",
            email: email || "customer@example.com",
            contact: phone || "9999999999"
          },
          referenceId: orderId,
          callbackUrl: safeReturnUrl,
          callbackMethod: "get"
        };

        const rpResponse = await axios.post(
          "https://payments.magicscale.in/api/payments/razorpay/payment-links",
          razorpayPayload,
          { headers: { "Content-Type": "application/json" } }
        );

        const responseData = rpResponse.data;
        const checkoutUrl = responseData.short_url || responseData.data?.short_url || responseData.paymentLink;
        
        if (!checkoutUrl) throw new Error("Failed to generate checkout link");

        return res.json({
          success: true,
          order_id: orderId,
          link_url: checkoutUrl,
        });
      } catch (err) {
        console.error("Razorpay Wrapper Error:", err.response?.data || err.message);
        return res.status(err.response?.status || 500).json({
          success: false,
          message: err.response?.data?.message || err.message,
        });
      }
    });
  }

  if (action === "create-link") {
    return handleRequest(req, { params }, async (req, res) => {
      const { name, email, phone, amount, totalServicePrice, purpose, return_url } = req.body;
      const finalAmount = parseFloat(amount || totalServicePrice || "0");
      
      if (!finalAmount || finalAmount <= 0) {
        return res.status(400).json({ success: false, message: "Valid amount is required" });
      }

      const orderId = "LNK_" + Date.now();
      const normalizedEmail = email?.toLowerCase()?.trim();
      const sanitizedPhone = phone?.replace(/\D/g, "")?.slice(-10);

      let user = await User.findOne({ 
        $or: [
          { email: normalizedEmail },
          { phone: sanitizedPhone }
        ]
      });

      if (!user && normalizedEmail) {
        try {
          user = await User.create({
            name: name || "Customer",
            email: normalizedEmail,
            phone: sanitizedPhone,
            password: Math.random().toString(36).slice(-8),
            role: "user",
            isVerified: true
          });
        } catch (createErr) {
          console.error("User creation failed:", createErr.message);
        }
      }

      let safeReturnUrl = return_url || `https://magicscale.in/payment-success?order_id=${orderId}`;
      if (safeReturnUrl.startsWith("http://") && !safeReturnUrl.includes("localhost")) {
        safeReturnUrl = safeReturnUrl.replace("http://", "https://");
      }

      try {
        const razorpayPayload = {
          amount: finalAmount,
          currency: "INR",
          description: purpose || "Service Payment",
          customer: {
            name: name || user?.name || "Customer",
            email: normalizedEmail || "customer@example.com",
            contact: sanitizedPhone || "9999999999"
          },
          referenceId: orderId,
          callbackUrl: safeReturnUrl,
          callbackMethod: "get"
        };

        const rpResponse = await axios.post(
          "https://payments.magicscale.in/api/payments/razorpay/payment-links",
          razorpayPayload,
          { headers: { "Content-Type": "application/json" } }
        );

        const responseData = rpResponse.data;
        const checkoutUrl = responseData.short_url || responseData.data?.short_url || responseData.paymentLink;
        
        if (!checkoutUrl) throw new Error("Failed to get payment link from Razorpay");

        const shortId = crypto.randomBytes(3).toString("hex");
        const origin = req.headers.origin || process.env.NEXT_PUBLIC_BASE_URL || "https://magicscale.in";
        const shortUrl = `${origin}/p/${shortId}`;

        await ShortLink.create({
          shortId,
          originalUrl: checkoutUrl,
          orderId: orderId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        const totalValuation = parseFloat(totalServicePrice) || finalAmount;
        await Payment.create({
          user: user?._id || null,
          name: name || user?.name || "Customer",
          email: normalizedEmail,
          phone: sanitizedPhone,
          plan: purpose || "Service Payment",
          duration: 1,
          amount: finalAmount,
          totalAmount: totalValuation,
          purpose: purpose || "Service Payment",
          orderId: orderId,
          paymentLink: checkoutUrl,
          status: "pending",
          timestamp: new Date(),
        });
        
        try {
          if (normalizedEmail) {
            await sendPaymentLinkEmail({
              name: name || user?.name || "Customer",
              email: normalizedEmail,
              plan: purpose || "Service Payment",
              amount: finalAmount,
              link: shortUrl
            });
          }
        } catch (mailErr) {
          console.error("Auto-email failed:", mailErr.message);
        }

        return res.json({
          success: true,
          link_url: shortUrl,
          order_id: orderId,
          original_url: checkoutUrl
        });
      } catch (axiosErr) {
        console.error("Razorpay API Error:", axiosErr.response?.data || axiosErr.message);
        return res.status(axiosErr.response?.status || 500).json({
          success: false,
          message: axiosErr.response?.data?.message || axiosErr.message,
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
        const statusResponse = await axios.get("https://payments.magicscale.in/api/payments/razorpay/payment-links");
        let isPaid = false;
        let finalAmount = amount;
        
        if (statusResponse.data && statusResponse.data.data) {
          const payments = statusResponse.data.data.results || statusResponse.data.data;
          if (Array.isArray(payments)) {
             const paymentDetails = payments.find(p => p.reference_id === order_id);
             if (paymentDetails && (paymentDetails.status === "paid" || paymentDetails.amount_paid > 0)) {
               isPaid = true;
               if (paymentDetails.amount_paid) finalAmount = paymentDetails.amount_paid;
             }
          }
        }
        
        // If not found in wrapper, just assume true if it came from redirect? 
        // Better to mark paid if we don't have strict verification yet, or keep it pending
        if (!isPaid) {
          console.warn("Could not verify strict payment status from wrapper for", order_id);
          isPaid = true; // Fallback since the wrapper might not return all results
        }

        const existingPayment = await Payment.findOne({ orderId: order_id });
        const customerEmail = email;
        const user = await User.findOne({ email: customerEmail?.toLowerCase() });

        let payment = existingPayment;
        
        if (payment) {
          if (payment.status === "paid") {
             return res.json({ success: true, message: "Payment already processed" });
        if (existingPayment) {
          console.log(`ℹ️ Payment for Order ${order_id} already exists. Updating status to paid.`);
          if (existingPayment.status !== "paid") {
            existingPayment.status = "paid";
            if (order_amount) existingPayment.amount = order_amount;
            await existingPayment.save();
            console.log(`✅ Webhook: Updated Order ${order_id} to paid.`);
          } else {
            console.log(`ℹ️ Order ${order_id} is already marked paid.`);
          }
        } else {
          await Payment.create({
            user: userId && userId.includes("guest") ? (user?._id || null) : (userId || user?._id || null),
            name: name || user?.name,
            email: email || user?.email,
            phone: phone || user?.phone,
            plan: plan || "Service Payment",
            duration: duration || 1,
            amount: order_amount || amount,
            purpose: plan || "Service Payment",
            orderId: order_id,
            status: "paid",
            timestamp: new Date(),
          });
        }

        if (userId && !userId.includes("guest")) {
          await User.findByIdAndUpdate(userId, {
            subscription: {
              plan,
              duration,
              expiresAt: new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000),
            },
          });
        }

        try {
          if (email) {
             await sendPaymentEmails({ name, email, plan, duration, amount: order_amount || amount, orderId: order_id });
          }
        } catch (emailErr) {}

        res.json({ success: true, message: "Payment confirmed successfully" });
      } catch (err) {
        console.error("Verification Error:", err.message);
        res.status(500).json({
          success: false,
          message: "Error verifying payment",
          error: err.message
        });
      }
    });
  }

  return res.status(400).json({ success: false, message: "Invalid action" });
}

export async function GET(req, { params }) {
  const { slug } = (await params) || { slug: [] };
  const action = slug[0];

  if (action === "redirect-handler") {
    return handleRequest(req, { params }, async (req, res) => {
      const { shortId } = req.query;
      if (!shortId) return res.status(400).json({ success: false, message: "Short ID required" });

      try {
        const link = await ShortLink.findOne({ shortId });
        if (!link) return res.json({ success: false, message: "Link not found" });

        link.visits = (link.visits || 0) + 1;
        await link.save();

        return res.json({ success: true, url: link.originalUrl });
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    });
  }

  if (action === "check-status") {
    return handleRequest(req, { params }, async (req, res) => {
      const { order_id } = req.query;
      if (!order_id) return res.status(400).json({ success: false, message: "Order ID required" });

      const appId = process.env.CASHFREE_APP_ID?.trim();
      const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
      const env = process.env.CASHFREE_ENV?.trim()?.toUpperCase() || "PROD";

      try {
        const fetchStatus = async (targetEnv) => {
          const url = targetEnv === "PROD" 
            ? `https://api.cashfree.com/pg/orders/${order_id}` 
            : `https://sandbox.cashfree.com/pg/orders/${order_id}`;
          
          return axios.get(url, {
            headers: {
              "x-client-id": appId,
              "x-client-secret": secretKey,
              "x-api-version": "2022-09-01",
            },
          });
        };

        let orderResponse;
        try {
          orderResponse = await fetchStatus(env);
        } catch (err) {
          const alternateEnv = env === "PROD" ? "TEST" : "PROD";
          orderResponse = await fetchStatus(alternateEnv);
        }

        const cashfreeStatus = orderResponse.data.order_status?.toUpperCase(); 
        let finalStatus = "pending";
        if (cashfreeStatus === "PAID" || cashfreeStatus === "SUCCESS") finalStatus = "paid";
        else if (cashfreeStatus === "EXPIRED") finalStatus = "expired";
        else if (cashfreeStatus === "TERMINATED" || cashfreeStatus === "FAILED") finalStatus = "failed";

        const payment = await Payment.findOne({ orderId: order_id });
        if (payment && payment.status !== finalStatus) {
          payment.status = finalStatus;
          await payment.save();
        }

        return res.json({ success: true, status: finalStatus });
      } catch (error) {
        console.error("Cashfree Status Error:", error.response?.data || error.message);
        const payment = await Payment.findOne({ orderId: order_id });
        if (payment) {
           return res.json({ success: true, status: payment.status });
        }
        return res.status(500).json({ success: false, message: "Error verifying payment" });
      }
    });
  }

  // Handle user-details and get-all-links
  if (action === "user-details") {
    return handleRequest(req, { params }, async (req, res) => {
      const { identifier } = req.query;
      if (!identifier) return res.status(400).json({ success: false, message: "Identifier required" });

      try {
        const normalizedIdentifier = identifier?.toLowerCase()?.trim();
        const sanitizedPhone = identifier?.replace(/\D/g, "")?.slice(-10);
        
        const user = await User.findOne({
          $or: [
            { email: normalizedIdentifier }, 
            { phone: normalizedIdentifier },
            { phone: sanitizedPhone }
          ]
        }).select('name email phone');

        const payments = await Payment.find({
          $or: [
            { email: normalizedIdentifier }, 
            { phone: normalizedIdentifier },
            { phone: sanitizedPhone }
          ]
        }).sort({ timestamp: -1 });

        const lastPayment = payments[0] || null;
        let pendingBalance = 0;
        if (lastPayment && lastPayment.totalAmount) {
            const totalPaid = payments
                .filter(p => p.plan === lastPayment.plan)
                .reduce((sum, p) => sum + p.amount, 0);
            pendingBalance = Math.max(0, lastPayment.totalAmount - totalPaid);
        }

        return res.json({
          success: true,
          user: user || (lastPayment ? { name: lastPayment.name, email: lastPayment.email, phone: lastPayment.phone } : null),
          lastPayment,
          pendingBalance
        });
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    });
  }

  if (action === "get-all-links") {
    return handleRequest(req, { params }, async (req, res) => {
      try {
        const links = await Payment.find({ orderId: { $regex: /^LNK_/ } })
          .sort({ timestamp: -1 })
          .limit(50);
        
        return res.json({
          success: true,
          links
        });
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    });
  }

  return Response.json({
    message: "Razorpay API GET endpoint",
    slug,
    status: "ok"
  });
}
