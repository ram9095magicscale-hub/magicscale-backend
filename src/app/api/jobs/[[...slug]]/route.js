import * as jobController from "@/controllers/jobController";
import { handleRequest } from "@/lib/route-adapter";
import { verifyToken, verifyAdminOrSeller } from "@/middleware/authMiddleware";

export async function GET(req, { params }) {
  return handleRequest(req, { params }, jobController.getJobs);
}

export async function POST(req, { params }) {
  return handleRequest(req, { params }, jobController.createJob, {
    middlewares: [verifyToken, verifyAdminOrSeller]
  });
}

export async function PUT(req, { params }) {
  return handleRequest(req, { params }, jobController.updateJob, {
    middlewares: [verifyToken, verifyAdminOrSeller]
  });
}

export async function DELETE(req, { params }) {
  return handleRequest(req, { params }, jobController.deleteJob, {
    middlewares: [verifyToken, verifyAdminOrSeller]
  });
}
