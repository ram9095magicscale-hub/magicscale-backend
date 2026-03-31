import { handleRequest } from "@/lib/route-adapter";

/**
 * Handles /api/success/*
 */
export async function POST(req, { params }) {
  // Simple fallback since the payment controller is not implemented
  return Response.json({ success: true, message: "Payment success received" });
}

export async function GET(req, { params }) {
  return Response.json({ success: true, message: "Payment success service is active" });
}
