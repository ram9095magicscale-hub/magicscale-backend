import * as galleryController from "@/controllers/galleryController";
import { handleRequest } from "@/lib/route-adapter";
import { verifyToken, verifyAdminOrSeller } from "@/middleware/authMiddleware";

export async function GET(req, { params }) {
  return handleRequest(req, { params }, galleryController.getGalleryItems);
}

export async function POST(req, { params }) {
  return handleRequest(req, { params }, galleryController.createGalleryItem, {
    middlewares: [verifyToken, verifyAdminOrSeller],
    fileField: "image"
  });
}

export async function PUT(req, { params }) {
  return handleRequest(req, { params }, galleryController.updateGalleryItem, {
    middlewares: [verifyToken, verifyAdminOrSeller],
    fileField: "image"
  });
}

export async function DELETE(req, { params }) {
  return handleRequest(req, { params }, galleryController.deleteGalleryItem, {
    middlewares: [verifyToken, verifyAdminOrSeller]
  });
}
