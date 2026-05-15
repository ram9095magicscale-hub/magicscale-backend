import { NextResponse } from "next/server";
import { checkAndSendPaymentReminders } from "@/utils/reminders";

// This route can be called by an external cron job (like Vercel Cron, GitHub Actions, or a simple curl command)
export async function GET(request) {
  // Optional: Add a secret key check to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const result = await checkAndSendPaymentReminders();

  if (result.success) {
    return NextResponse.json({ 
      message: "Reminders processed successfully", 
      count: result.processedCount 
    });
  } else {
    return NextResponse.json({ 
      error: "Failed to process reminders", 
      details: result.error 
    }, { status: 500 });
  }
}
