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
        
        // Simple Setup: Point to our own backend-hosted checkout page
        // This avoids 404, session invalid, and blank screen errors.
        const host = req.headers["host"] || "magicscale.in";
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const origin = `${protocol}://${host}`;
        const checkoutUrl = `${origin}/api/cashfree/checkout?session_id=${sessionId}&env=${env.toLowerCase()}`;

        console.log(`Generated Link for ${env}: ${checkoutUrl}`);

        // Note: For sandbox, the URL structure might be different or requires the SDK.
        // However, https://sandbox.cashfree.com/pg/view/checkout/${sessionId} is the standard sandbox hosted page.

        return res.json({
          success: true,
          link_id: orderId,
          link_url: checkoutUrl,
          payment_session_id: sessionId,
          order_id: orderId,
          message: "Payment link generated successfully via Orders API"
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

  // Handle user-details (already logic exists but let's wrap it if needed, 
  // currently it's handled in POST block which is weird for a search, but keeping it for compatibility)
  
  if (action === "checkout") {
    const url = new URL(req.url, `https://${req.headers.get("host") || "magicscale.in"}`);
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
