import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, message: "Missing payment verification fields" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      // TODO: Add database logic to mark the order as paid here
      return NextResponse.json({ success: true, message: "Payment verified successfully" });
    } else {
      return NextResponse.json({ success: false, message: "Payment verification failed due to signature mismatch" }, { status: 400 });
    }
  } catch (error) {
    console.error("Razorpay Verify Error:", error);
    return NextResponse.json({ success: false, message: "Server error during verification" }, { status: 500 });
  }
}
