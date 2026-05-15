import dbConnect from "../lib/db.js";
import Payment from "../models/Payment.js";
import { sendPaymentLinkEmail } from "./email.js";
import { sendWhatsAppTemplate } from "./whatsapp.js";

/**
 * Checks for pending payments and sends reminders if they are older than 24 hours.
 */
export const checkAndSendPaymentReminders = async () => {
  try {
    await dbConnect();

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find payments that:
    // 1. Are still pending
    // 2. Were created more than 24 hours ago
    // 3. Haven't had a reminder in the last 24 hours (or ever)
    const pendingPayments = await Payment.find({
      status: "pending",
      timestamp: { $lte: twentyFourHoursAgo },
      $or: [
        { lastReminderAt: { $exists: false } },
        { lastReminderAt: { $lte: twentyFourHoursAgo } }
      ]
    });

    console.log(`[Cron] Found ${pendingPayments.length} pending payments for reminders.`);

    for (const payment of pendingPayments) {
      const { name, email, phone, plan, amount, paymentLink } = payment;

      // 1. Send Email Reminder
      try {
        await sendPaymentLinkEmail({
          name,
          email,
          plan,
          amount,
          link: paymentLink,
          isReminder: true // We can use this flag in email.js to change subject
        });
        console.log(`[Cron] Email reminder sent to ${email}`);
      } catch (err) {
        console.error(`[Cron] Failed to send email reminder to ${email}:`, err.message);
      }

      // 2. Send WhatsApp Reminder
      if (phone) {
        try {
          // campaignName should be configured in AiSensy
          // Parameters: {{1}} Name, {{2}} Plan, {{3}} Amount, {{4}} Link
          await sendWhatsAppTemplate(
            phone,
            process.env.WHATSAPP_REMINDER_CAMPAIGN || "payment_reminder_v2",
            name,
            [name, plan, amount.toString(), paymentLink]
          );
          console.log(`[Cron] WhatsApp reminder sent to ${phone}`);
        } catch (err) {
          console.error(`[Cron] Failed to send WhatsApp reminder to ${phone}:`, err.message);
        }
      }

      // Update lastReminderAt
      payment.lastReminderAt = new Date();
      await payment.save();
    }

    return { success: true, processedCount: pendingPayments.length };
  } catch (error) {
    console.error("[Cron] Error in checkAndSendPaymentReminders:", error);
    return { success: false, error: error.message };
  }
};
