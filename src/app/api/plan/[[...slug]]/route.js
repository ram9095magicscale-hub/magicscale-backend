import * as planController from "@/controllers/planController"; // Assuming planController exists
import { handleRequest } from "@/lib/route-adapter";

// The original route was /api/plan
export async function GET(req, { params }) {
  const resolvedParams = await params;
  return handleRequest(req, { params: resolvedParams }, planController.getPlans || planController.getPlan);
}

export async function POST(req, { params }) {
  const resolvedParams = await params;
  return handleRequest(req, { params: resolvedParams }, planController.createPlan);
}
