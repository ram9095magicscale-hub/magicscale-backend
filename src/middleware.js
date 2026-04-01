import { NextResponse } from "next/server";

export function middleware(request) {
  // Get the origin from the request headers
  const origin = request.headers.get("origin");

  // Define allowed origins
  const allowedOrigins = [
    "http://localhost:5173",
    "https://magicscale-frontend.vercel.app",
    "https://www.magicscale-frontend.vercel.app"
  ];

  // Check if the request origin is in the allowed list
  const isAllowedOrigin = allowedOrigins.includes(origin);

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
  } else if (!origin) {
    // If no origin (e.g. same-origin or non-browser request), still allow
    // But don't set Allow-Origin * here as we want to be safe
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
