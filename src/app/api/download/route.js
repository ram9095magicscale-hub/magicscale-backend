import path from "path";
import fs from "fs";
import { handleRequest } from "@/lib/route-adapter";

/**
 * Handles /api/download?path=filename.jpg
 */
export async function GET(req, { params }) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get("path");

  if (!fileName) {
    return Response.json({ message: "No file path provided" }, { status: 400 });
  }

  // Next.js static files are in public/uploads
  const filePath = path.resolve(process.cwd(), "public/uploads", fileName);

  if (!fs.existsSync(filePath)) {
    return Response.json({ message: "File not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const response = new Response(fileBuffer);

  response.headers.set("Content-Type", "application/octet-stream");
  response.headers.set("Content-Disposition", `attachment; filename="${fileName}"`);

  return response;
}
