import { NextResponse } from "next/server";

export function middleware(request) {
  // Get the origin from the request headers
  const origin = request.headers.get("origin") || "";

  // Define allowed origins
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://magicscale-frontend.vercel.app",
    "https://www.magicscale-frontend.vercel.app",
    "https://www.magicscale.in",
    "https://magicscale.in"
  ];

  // Check if the request origin is in the allowed list
  // Normalize origin for comparison (remove trailing slash if any)
  const normalizedOrigin = origin.replace(/\/$/, "");
  const isAllowedOrigin = allowedOrigins.some(ao => ao.replace(/\/$/, "") === normalizedOrigin);

  // Handle preflight (OPTIONS) requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });

    if (isAllowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    
    return response;
  }

  // Handle regular requests
  const response = NextResponse.next();

  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version");

  return response;
}

// Match all API routes
export const config = {
  matcher: "/api/:path*",
};
