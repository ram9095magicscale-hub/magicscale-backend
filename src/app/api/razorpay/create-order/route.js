import Razorpay from "razorpay";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const body = await req.json();
    const { amount, currency, receipt } = body;

    if (!amount || amount < 100) {
      return NextResponse.json({ success: false, message: "Amount must be at least 100 paise" }, { status: 400 });
    }

    const options = {
      amount: amount,
      currency: currency || "INR",
      receipt: receipt || `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    
    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Something went wrong" }, { status: 500 });
  }
}
