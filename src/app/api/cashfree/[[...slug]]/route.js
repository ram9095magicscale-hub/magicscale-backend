import axios from "axios";
import crypto from "crypto";
import User from "@/models/User";
import Payment from "@/models/Payment";
import ShortLink from "@/models/ShortLink";
import { sendPaymentEmails, sendPaymentLinkEmail } from "@/utils/email";
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

      // Cashfree Production requires an HTTPS return URL.
      // We automatically convert http:// to https:// to prevent the API from rejecting the request.
      let safeReturnUrl = return_url || `https://magicscale.in/payment-success?order_id=${orderId}`;
      if (env === "PROD" && safeReturnUrl.startsWith("http://")) {
        safeReturnUrl = safeReturnUrl.replace("http://", "https://");
      }

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
              return_url: safeReturnUrl,
            },
          },
          {
            headers: {
              "x-client-id": appId,
              "x-client-secret": secretKey,
              "x-api-version": "2022-09-01",
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
      const { name, email, phone, amount, totalServicePrice, purpose, return_url } = req.body;
      const finalAmount = parseFloat(amount || totalServicePrice || "0");
      
      console.log(`Creating order for ${email}: ₹${finalAmount} (Env: ${env})`);
      if (!appId || !secretKey) {
        console.error("Cashfree credentials missing!");
        return res.status(500).json({ success: false, message: "Server configuration error (missing API keys)" });
      }

      if (!finalAmount || finalAmount <= 0) {
        return res.status(400).json({ success: false, message: "Valid amount is required" });
      }

      const orderId = "LNK_" + Date.now();
      const normalizedEmail = email?.toLowerCase()?.trim();
      const sanitizedPhone = phone?.replace(/\D/g, "")?.slice(-10);

      // 1. Find or Create User so they show up in Customers list
      console.log(`Checking for user: ${normalizedEmail} / ${sanitizedPhone}`);
      let user = await User.findOne({ 
        $or: [
          { email: normalizedEmail },
          { phone: sanitizedPhone }
        ]
      });

      if (!user) {
        console.log(`Creating new user for: ${normalizedEmail}`);
        try {
          user = await User.create({
            name: name || "Customer",
            email: normalizedEmail,
            phone: sanitizedPhone,
            password: Math.random().toString(36).slice(-8), // Placeholder password
            role: "user",
            isVerified: true
          });
          console.log(`✅ New user created: ${user._id}`);
        } catch (createErr) {
          console.error("❌ User creation failed:", createErr.message);
        }
      } else {
        console.log(`Found existing user: ${user._id}`);
        let updated = false;
        if (!user.phone && sanitizedPhone) { user.phone = sanitizedPhone; updated = true; }
        if (!user.name && name) { user.name = name; updated = true; }
        if (updated) await user.save();
      }

      // User creation was here... moved up to ensure user exists
      // No changes needed here, just ensuring I don't delete the pending record block by accident
      // Actually, I'll remove the old pending record block from here since I moved it down.


      // Cashfree Production requires an HTTPS return URL.
      let safeReturnUrl = return_url || `https://magicscale.in/payment-success?order_id=${orderId}`;
      if (env === "PROD" && safeReturnUrl.startsWith("http://")) {
        safeReturnUrl = safeReturnUrl.replace("http://", "https://");
      }

      const orderUrl =
        env === "PROD"
          ? "https://api.cashfree.com/pg/orders"
          : "https://sandbox.cashfree.com/pg/orders";

      try {
        // We use pg/orders as a fallback because pg/links is often not enabled by default
        const orderResponse = await axios.post(
          orderUrl,
          {
            order_id: orderId,
            order_amount: finalAmount,
            order_currency: "INR",
            customer_details: {
              customer_id: email ? email.replace(/[^a-zA-Z0-9_-]/g, "_") : "guest_" + Date.now(),
              customer_name: name || "Customer",
              customer_email: email || "customer@example.com",
              customer_phone: phone || "9999999999",
            },
            order_meta: {
              return_url: safeReturnUrl,
              total_amount: (parseFloat(totalServicePrice) || finalAmount).toString(),
            },
          },
          {
            headers: {
              "x-client-id": appId,
              "x-client-secret": secretKey,
              "x-api-version": "2022-09-01",
              "Content-Type": "application/json",
            },
          }
        );

        const sessionId = orderResponse.data.payment_session_id;
        
      // 2. Generate the URL (Moved up so we can store it)
      const host = req.headers["host"] || "magicscale.in";
      const origin = env === "PROD" ? "https://magicscale.in" : `http://${host}`;
      const checkoutUrl = `${origin}/api/cashfree/checkout?session_id=${sessionId}&env=${env.toLowerCase()}`;

      // 3. Store a PENDING payment record so it shows up in lookup
      const totalValuation = parseFloat(totalServicePrice) || finalAmount;
      try {
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
          paymentLink: checkoutUrl, // NOW STORED
          status: "pending",
          timestamp: new Date(),
        });
        console.log(`✅ Pending payment record created with Link: ${orderId}`);
        
        // AUTO-SEND EMAIL
        try {
          await sendPaymentLinkEmail({
            name: name || user?.name || "Customer",
            email: normalizedEmail,
            plan: purpose || "Service Payment",
            amount: finalAmount,
            link: checkoutUrl
          });
          console.log(`📧 Auto-email sent to ${normalizedEmail}`);
        } catch (mailErr) {
          console.error("❌ Auto-email failed:", mailErr.message);
        }

      } catch (payErr) {
        console.error("❌ Failed to create pending payment record:", payErr.message);
      }

      console.log(`Generated Link for ${env}: ${checkoutUrl}`);

      // 4. Generate Short Link
      const shortId = crypto.randomBytes(3).toString("hex");
      const shortUrl = `https://magicscale.in/p/${shortId}`;
      console.log(`[DEBUG] Attempting to create short link for ${orderId}: ${shortId}`);

      try {
        const newShortLink = await ShortLink.create({
          shortId,
          originalUrl: checkoutUrl,
          orderId: orderId
        });
        console.log(`✅ [DEBUG] Short link saved to DB: ${shortId} -> ${checkoutUrl}`);
      } catch (shortErr) {
        console.error("❌ [DEBUG] Failed to create short link in DB:", shortErr.message);
      }

      return res.json({
        success: true,
        link_id: orderId,
        link_url: shortUrl, // Return short URL
        payment_session_id: sessionId,
        order_id: orderId,
        message: "Payment link generated successfully with shortener"
      });
      } catch (axiosErr) {
        const errorData = axiosErr.response?.data;
        console.error("Cashfree Order API Error:", JSON.stringify(errorData || axiosErr.message));
        return res.status(axiosErr.response?.status || 500).json({
          success: false,
          message: errorData?.message || axiosErr.message,
          error: errorData
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

        // Fetch user if not provided (for link-based payments)
        const customerEmail = statusResponse.data.customer_details?.customer_email;
        const user = await User.findOne({ email: customerEmail?.toLowerCase() });

        // 3. Update or Create Payment record
        const totalAmountFromMeta = statusResponse.data.order_meta?.total_amount 
           ? parseFloat(statusResponse.data.order_meta.total_amount) 
           : (statusResponse.data.order_amount || amount);

        // Try to update existing pending record if it exists
        let payment = await Payment.findOne({ orderId: order_id });
        
        if (payment) {
          payment.status = "paid";
          payment.amount = statusResponse.data.order_amount || amount;
          payment.totalAmount = totalAmountFromMeta;
          await payment.save();
          console.log(`✅ Updated existing pending payment to PAID: ${order_id}`);
        } else {
          payment = await Payment.create({
            user: userId && userId.includes("guest") ? (user?._id || null) : (userId || user?._id || null),
            name: name || user?.name || statusResponse.data.customer_details?.customer_name,
            email: email || user?.email || statusResponse.data.customer_details?.customer_email,
            phone: phone || user?.phone || statusResponse.data.customer_details?.customer_phone,
            plan: plan || "Payment Link",
            duration: duration || 1,
            amount: statusResponse.data.order_amount || amount,
            totalAmount: totalAmountFromMeta,
            purpose: plan || "Service Payment",
            orderId: order_id,
            status: "paid",
            timestamp: new Date(),
          });
          console.log(`✅ Created new payment record from confirmation: ${order_id}`);
        }

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
    // Note: In production, you should verify signatures using x-cf-signature header
    return handleRequest(req, { params }, async (req, res) => {
      const payload = req.body;
      console.log("🔔 CASHFREE WEBHOOK RECEIVED:", JSON.stringify(payload, null, 2));

      // Standard NextGen Webhook Structure (2022-09-01 onwards)
      // data.order.order_id, data.payment.payment_status, etc.
      const orderData = payload.data?.order;
      const paymentData = payload.data?.payment;
      const customerData = payload.data?.customer_details;

      const order_id = orderData?.order_id;
      const order_amount = orderData?.order_amount;
      const payment_status = paymentData?.payment_status || orderData?.order_status; // Handle variations

      if (payment_status === "SUCCESS" || payment_status === "PAID") {
        console.log(`✅ Webhook: Payment Success for Order ${order_id}`);
        
        const existingPayment = await Payment.findOne({ orderId: order_id });
        if (!existingPayment) {
          console.log(`📝 Recording new payment for Order ${order_id}`);
          await Payment.create({
            name: customerData?.customer_name || "Customer",
            email: customerData?.customer_email || "customer@example.com",
            phone: customerData?.customer_phone || "0000000000",
            plan: "Payment Link Selection",
            duration: 1,
            amount: order_amount,
            orderId: order_id,
            status: "paid",
            timestamp: new Date(),
          });

          try {
            await sendPaymentEmails({
              name: customerData?.customer_name,
              email: customerData?.customer_email,
              plan: "Payment Link",
              amount: order_amount,
              orderId: order_id
            });
            console.log(`📧 Confirmation email sent for Order ${order_id}`);
          } catch (e) {
            console.error("📧 Email sending failed in webhook:", e.message);
          }
        } else {
          console.log(`ℹ️ Payment for Order ${order_id} already exists, skipping.`);
        }
      } else {
        console.log(`⚠️ Webhook: Payment status is ${payment_status} for Order ${order_id}`);
      }

      return res.json({ status: "OK", message: "Webhook processed" });
    });
  }
}

export async function GET(req, { params }) {
  const { slug } = (await params) || { slug: [] };
  const action = slug[0];

  if (action === "webhook") {
    return Response.json({
      status: "active",
      message: "Webhook endpoint is live. Use POST for actual notifications.",
      url: req.url
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

  if (action === "redirect-handler") {
    return handleRequest(req, { params }, async (req, res) => {
      const { shortId } = req.query;
      console.log(`[DEBUG] Incoming redirect request for shortId: ${shortId}`);
      
      if (!shortId) {
        console.log(`[DEBUG] Missing shortId in request`);
        return res.status(400).json({ success: false, message: "Short ID required" });
      }

      try {
        const link = await ShortLink.findOne({ shortId });
        if (!link) {
          console.log(`[DEBUG] No link found in DB for shortId: ${shortId}`);
          return res.json({ success: false, message: "Link not found in database" });
        }

        console.log(`[DEBUG] Found link! Redirecting to: ${link.originalUrl}`);
        
        // Increment visit count
        link.visits = (link.visits || 0) + 1;
        await link.save();

        return res.json({ success: true, url: link.originalUrl });
      } catch (err) {
        console.error(`[DEBUG] Error in redirect-handler:`, err.message);
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
  if (action === "checkout") {
    const env = process.env.CASHFREE_ENV?.trim()?.toUpperCase() || "PROD";
    const url = new URL(req.url, `https://${req.headers["host"] || "magicscale.in"}`);
    const searchParams = url.searchParams;
    const sessionId = searchParams.get("session_id");
    const envParam = searchParams.get("env") || "prod";

    if (!sessionId) {
      return new Response("Missing session_id", { status: 400 });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>MagicScale Secure Checkout</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; }
              .loader { border: 4px solid #f3f3f3; border-top: 4px solid #4f46e5; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin-bottom: 20px; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              .text { color: #1e293b; font-size: 18px; font-weight: 600; }
              .logo { font-size: 24px; font-weight: 900; color: #4f46e5; margin-bottom: 40px; }
          </style>
      </head>
      <body>
          <div class="logo">MagicScale</div>
          <div class="loader"></div>
          <div class="text">Initializing Secure Payment...</div>
          <script>
              try {
                  const cashfree = Cashfree({ mode: "${envParam === 'prod' || envParam === 'PROD' ? 'production' : 'sandbox'}" });
                  cashfree.checkout({ 
                      paymentSessionId: "${sessionId}", 
                      redirectTarget: "_self" 
                  });
              } catch (e) {
                  console.error(e);
                  document.querySelector('.text').innerText = "Error loading payment. Please refresh.";
                  document.querySelector('.loader').style.display = "none";
              }
          </script>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" }
    });
  }

  return Response.json({
    message: "Cashfree API GET endpoint",
    slug,
    status: "ok"
  });
}
