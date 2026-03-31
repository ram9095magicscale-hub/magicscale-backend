import * as newsletterController from "@/controllers/newsletterController";
import { handleRequest } from "@/lib/route-adapter";

export async function POST(req) {
  return handleRequest(req, {}, newsletterController.subscribe);
}

export async function GET(req) {
  return handleRequest(req, {}, newsletterController.unsubscribe);
}
