import connectToDatabase from "@/lib/db";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * Bridge function to adapt Express-style controllers to Next.js App Router
 */
export async function handleRequest(req, { params }, controllerFn, options = {}) {
  try {
    console.log("Connecting to database...");
    // ⚡ Add 10s timeout to DB connection to prevent hanging
    await Promise.race([
      connectToDatabase(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database connection timed out")), 10000))
    ]);
    console.log("Database connected successfully");
  } catch (dbErr) {
    console.error("Database connection failed:", dbErr.message);
    return Response.json({ message: "Database connection failed or timed out", error: dbErr.message }, { status: 504 });
  }


  const resolvedParams = await params;
  const slug = resolvedParams?.slug || [];

  // Mock res object
  let statusCode = 200;
  let responseData = null;
  let headers = {
    "Access-Control-Allow-Credentials": "true",
  };

  // 🛠️ Proactively set CORS headers in route-adapter to ensure failure responses have them
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://magicscale-frontend.vercel.app",
    "https://www.magicscale-frontend.vercel.app",
    "https://www.magicscale.in",
    "https://magicscale.in"
  ];
  const origin = req.headers.get("origin");
  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allowedOrigins.some(ao => ao.replace(/\/$/, "") === normalizedOrigin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
  }

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
  let body = {};
  let file = null;

  if (req.method !== "GET" && req.method !== "DELETE") {
    const contentType = req.headers.get("content-type") || "";
    console.log("Request Content-Type:", contentType);
    
    if (contentType.includes("multipart/form-data")) {
      try {
        const formData = await req.formData();
        body = Object.fromEntries(Array.from(formData.entries()).filter(([key, value]) => typeof value === 'string'));
        console.log("Parsed Multipart Body keys:", Object.keys(body));
        
        // Handle file upload (simplified version of multer)
        const fileEntry = formData.get(options.fileField || "image") || formData.get("coverImage") || formData.get("aadharCard") || formData.get("panCard") || formData.get("profilePhoto");
        if (fileEntry && typeof fileEntry !== 'string') {
          try {
            const bytes = await fileEntry.arrayBuffer();
            const buffer = Buffer.from(bytes);
            
            const uploadsDir = path.join(process.cwd(), 'public/uploads');
            await mkdir(uploadsDir, { recursive: true });
            
            const fileName = `${Date.now()}-${fileEntry.name.replace(/\s+/g, '_')}`;
            const filePath = path.join(uploadsDir, fileName);
            await writeFile(filePath, buffer);
            
            file = {
              path: `/uploads/${fileName}`,
              originalname: fileEntry.name,
              filename: fileName,
              mimetype: fileEntry.type,
              size: fileEntry.size
            };
            console.log("File uploaded successfully:", file.path);
          } catch (writeErr) {
            console.error("❌ File System Write Failed (Likely Vercel Read-Only):", writeErr.message);
            // On Vercel, we can't write to public/uploads. 
            // In a real app, this should go to Cloudinary/S3.
            // For now, we'll keep the file entry in memory if needed, 
            // or just log that it failed but let the request continue without the file.
            file = {
              error: "FileSystem is read-only. Persistent storage (Cloudinary/S3) required.",
              originalname: fileEntry.name,
              mimetype: fileEntry.type
            };
          }
        }
      } catch (formErr) {
        console.error("Error parsing multipart form data:", formErr);
      }
    } else {
      try {
        body = await req.json();
        console.log("Parsed JSON Body keys:", Object.keys(body));
      } catch (jsonErr) {
        console.warn("Could not parse JSON body or body is empty:", jsonErr.message);
        body = {};
      }
    }
  }

  const mockReq = {
    body,
    file,
    params: { 
      ...Object.fromEntries(Object.entries(resolvedParams || {})), 
      id: slug[slug.length - 1], 
      token: slug[slug.length - 1] 
    },
    query: Object.fromEntries(new URL(req.url).searchParams),
    headers: Object.fromEntries(req.headers),
    method: req.method,
  };

  try {
    // 🛡️ Middleware execution with safety
    if (options.middlewares && Array.isArray(options.middlewares)) {
      for (const middleware of options.middlewares) {
        if (typeof middleware !== 'function') continue;
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Middleware execution timed out")), 10000);
          
          try {
            middleware(mockReq, res, (err) => {
              clearTimeout(timeout);
              if (err) reject(err);
              else resolve();
            });
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        });
      }
    }

    // 🚀 Controller execution
    console.log("-> Executing Controller:", controllerFn.name || "anonymous");
    await Promise.race([
      controllerFn(mockReq, res),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Controller execution timed out")), 15000))
    ]);

    // Handle cases where controller doesn't send response explicitly
    if (responseData === null && statusCode === 200) {
       console.warn("⚠️ Controller returned without sending response data");
       return Response.json({ message: "No content" }, { status: 204, headers });
    }

    return Response.json(responseData, { status: statusCode, headers });
  } catch (error) {
    console.error("❌ API Execution Error:", error.message);
    return Response.json(
      { 
        message: error.message || "Internal Server Error",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { 
        status: error.message.includes("timed out") ? 504 : 500,
        headers // 👈 Crucial: include gathered headers (CORS) in error response
      }
    );
  }
}
