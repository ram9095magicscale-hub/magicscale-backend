import * as userController from "@/controllers/userController";
import { handleRequest } from "@/lib/route-adapter";
import { verifyToken } from "@/middleware/authMiddleware";

export async function GET(req, { params }) {
  const { slug } = (await params) || { slug: [] };
  const action = slug[0];
  
  if (action === "profile") {
    return handleRequest(req, { params }, userController.getUserProfile, { middlewares: [verifyToken] });
  }
  if (action === "subscriptions") {
    return handleRequest(req, { params }, userController.getUserSubscriptions, { middlewares: [verifyToken] });
  }
  if (action === "orders") {
    return handleRequest(req, { params }, userController.getUserOrders, { middlewares: [verifyToken] });
  }
  return handleRequest(req, { params }, userController.getAllUsers, { middlewares: [verifyToken] });
}

export async function PUT(req, { params }) {
  return handleRequest(req, { params }, userController.updateUserProfile, { 
    middlewares: [verifyToken],
    fileField: "profilePhoto"
  });
}
