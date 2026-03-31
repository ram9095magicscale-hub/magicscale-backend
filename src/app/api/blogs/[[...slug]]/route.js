import * as blogController from "@/controllers/blogController";
import { handleRequest } from "@/lib/route-adapter";
import { verifyToken, verifyAdminOrSeller } from "@/middleware/authMiddleware";

export async function GET(req, { params }) {
  return handleRequest(req, { params }, blogController.getBlogs);
}

export async function POST(req, { params }) {
  return handleRequest(req, { params }, blogController.createBlog, {
    middlewares: [verifyToken, verifyAdminOrSeller],
    fileField: "coverImage"
  });
}

export async function PUT(req, { params }) {
  return handleRequest(req, { params }, blogController.updateBlog, {
    middlewares: [verifyToken, verifyAdminOrSeller],
    fileField: "coverImage"
  });
}

export async function DELETE(req, { params }) {
  return handleRequest(req, { params }, blogController.deleteBlog, {
    middlewares: [verifyToken, verifyAdminOrSeller]
  });
}
