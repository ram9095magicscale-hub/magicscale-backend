import * as contactController from "@/controllers/contactController";
import { handleRequest } from "@/lib/route-adapter";

export async function POST(req) {
  return handleRequest(req, {}, contactController.submitContactForm);
}

// Optional: GET to list contacts (might be useful for admin later)
export async function GET(req) {
  return handleRequest(req, {}, contactController.getContacts);
}
