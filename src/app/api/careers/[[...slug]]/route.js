import JobApplication from "@/models/JobApplication";
import { handleRequest } from "@/lib/route-adapter";

/**
 * Handles /api/careers/*
 */
export async function GET(req, { params }) {
  const { slug } = (await params) || { slug: [] };
  const action = slug[0];

  if (action === "applications") {
    return handleRequest(req, { params }, async (req, res) => {
      const applications = await JobApplication.find().sort({ appliedAt: -1 });
      res.status(200).json(applications);
    });
  }

  return Response.json({ message: "Not Found" }, { status: 404 });
}

export async function POST(req, { params }) {
  const { slug } = (await params) || { slug: [] };
  const action = slug[0];

  if (action === "apply") {
    return handleRequest(req, { params }, async (req, res) => {
      const { fullName, email, phone, experience, jobTitle, jobId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "Resume is required" });
      }

      const newApplication = new JobApplication({
        fullName,
        email,
        phone,
        experience,
        jobTitle,
        jobId,
        resumePath: req.file.path,
      });

      await newApplication.save();
      res.status(201).json({ message: "Application submitted successfully!" });
    }, { fileField: "resume" });
  }

  return Response.json({ message: "Not Found" }, { status: 404 });
}
