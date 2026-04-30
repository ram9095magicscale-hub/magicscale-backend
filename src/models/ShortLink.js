import mongoose from "mongoose";

const shortLinkSchema = new mongoose.Schema({
  shortId: { type: String, required: true, unique: true },
  originalUrl: { type: String, required: true },
  orderId: { type: String },
  visits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // 7 days
});

export default mongoose.models.ShortLink || mongoose.model("ShortLink", shortLinkSchema);
