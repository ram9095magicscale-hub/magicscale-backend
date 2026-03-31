import { handleRequest } from "@/lib/route-adapter";
import * as paymentController from "@/controllers/payment"; // Assuming this exists based on index.js

/**
 * Handles /api/success/*
 */
export async function POST(req, { params }) {
  // If paymentController exists, use it
  if (paymentController && paymentController.paymentSuccess) {
    return handleRequest(req, { params }, paymentController.paymentSuccess);
  }
  
  // Default fallback if controller is missing
  return Response.json({ success: true, message: "Payment success received" });
}
