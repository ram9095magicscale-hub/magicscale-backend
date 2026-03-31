import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  experience: { type: String, required: true },
  resumePath: { type: String, required: true },
  jobTitle: { type: String, required: true },
  jobId: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now },
});

export default mongoose.models.JobApplication || mongoose.model("JobApplication", jobApplicationSchema);
