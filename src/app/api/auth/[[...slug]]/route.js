import * as authController from "@/controllers/authController";
import connectToDatabase from "@/lib/db";

async function runMiddleware(req, res, next) {
  // Simple mock of express next()
  return next();
}

/**
 * Bridge function to adapt Express-style controllers to Next.js App Router
 */
async function handleRequest(req, { params }, controllerFn, isProtected = false) {
  await connectToDatabase();
  const awaitedParams = await params;
  const { slug } = awaitedParams;

  // Mock res object
  let statusCode = 200;
  let responseData = null;
  let headers = {};

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    setHeader: (name, value) => {
      headers[name] = value;
      return res;
    }
  };

  // Mock req object
  const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};
  const mockReq = {
    body,
    params: { token: slug?.[1] }, // For reset-password/:token
    headers: Object.fromEntries(req.headers),
    method: req.method,
  };

  try {
    await controllerFn(mockReq, res);
    return Response.json(responseData, { status: statusCode, headers });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const awaitedParams = await params;
  const { slug } = awaitedParams;
  const action = slug ? slug[0] : null;

  switch (action) {
    case "register":
      return handleRequest(req, { params }, authController.register);
    case "login":
      return handleRequest(req, { params }, authController.login);
    case "verify-otp":
      return handleRequest(req, { params }, authController.verifyOTP);
    case "forgot-password":
      return handleRequest(req, { params }, authController.forgotPassword);
    case "reset-password":
      return handleRequest(req, { params }, authController.resetPassword);
    case "resend-otp":
      return handleRequest(req, { params }, authController.resendOTP);
    default:
      return Response.json({ message: "Not Found" }, { status: 404 });
  }
}

export async function GET(req, { params }) {
  const awaitedParams = await params;
  const { slug } = awaitedParams;
  const action = slug ? slug[0] : null;

  if (action === "check-token") {
    return handleRequest(req, { params }, authController["checkToken"] || (async (req, res) => {
      const { verifyToken } = await import("@/middleware/authMiddleware");
      
      return new Promise((resolve) => {
        // Intercept res.json to resolve the promise if middleware sends response
        const originalJson = res.json;
        res.json = (data) => {
          originalJson(data);
          resolve();
          return res;
        };

        verifyToken(req, res, () => {
          res.json({ valid: true, message: 'Token is valid ✅', user: req.user });
          // resolve is called by the intercepted res.json above
        });
      });
    }));
  }

  return Response.json({ message: "Not Found" }, { status: 404 });
}
