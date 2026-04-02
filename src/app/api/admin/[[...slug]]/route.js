import * as userController from "@/controllers/userController";
import * as adminController from "@/controllers/adminController";
import AuthConfig from "@/models/AuthConfig";

import { handleRequest } from "@/lib/route-adapter";
import { verifyAdminOrSeller } from "@/middleware/authMiddleware";

/**
 * Handles /api/admin/*
 */
export async function GET(req, { params }) {
  const { slug } = (await params) || { slug: [] };
  const action = slug[0];

  if (action === "auth-provider") {
    return handleRequest(req, { params }, async (req, res) => {
      let config = await AuthConfig.findOne({ key: 'authProvider' });
      if (!config) {
        config = await AuthConfig.create({ provider: 'otp-less' });
      }
      res.json({ provider: config.provider });
    });
  }

  if (action === "users") {
    return handleRequest(req, { params }, userController.getAllUsers, { middlewares: [verifyAdminOrSeller] });
  }

  if (action === "transactions") {
    return handleRequest(req, { params }, adminController.getAllTransactions, { middlewares: [verifyAdminOrSeller] });
  }

  if (action === "stats") {
    return handleRequest(req, { params }, adminController.getAdminStats, { middlewares: [verifyAdminOrSeller] });
  }

  return Response.json({ message: "Not Found" }, { status: 404 });
}

export async function PUT(req, { params }) {
  const { slug } = (await params) || { slug: [] };
  const action = slug[0];

  if (action === "auth-provider") {
    return handleRequest(req, { params }, async (req, res) => {
      const { provider } = req.body;
      if (!['otp-less', 'firebase'].includes(provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
      }
      let config = await AuthConfig.findOneAndUpdate(
        { key: 'authProvider' },
        { provider },
        { new: true, upsert: true }
      );
      res.json({ message: 'Auth provider updated', provider: config.provider });
    });
  }

  return Response.json({ message: "Not Found" }, { status: 404 });
}
