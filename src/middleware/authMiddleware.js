// middlewares/authMiddleware.js
import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing or malformed" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const verifySeller = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "seller") {
      return res.status(403).json({ message: "Sellers only" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
};

// export const verifyAdmin = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) return res.status(401).json({ message: "No token" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     if (decoded.role !== "admin") {
//       return res.status(403).json({ message: "Admins only" });
//     }
//     req.user = decoded;
//     next();
//   } catch (err) {
//     res.status(403).json({ message: "Invalid token" });
//   }
// };




export const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admins only' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};



// Allow both admins and sellers
export const verifyAdminOrSeller = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'seller') {
      return res.status(403).json({ message: 'Access denied: Admins or Sellers only' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};



























// Let's break down the provided JavaScript code and explain the 
// terminal messages or code output, focusing on the authentication and token-based processes:

// Code Overview
// The code snippet is a part of a Node.js application that handles user registration,
//  login, and JWT (JSON Web Token) authentication. It uses bcryptjs for password hashing
//  and jsonwebtoken for token generation and verification.

// 1. User Registration
// Function: register
// Purpose: Registers a new user by hashing their password and storing their details in the database.
// Process:
// Extracts name, email, and password from the request body.
// Checks if a user with the given email already exists.
// If the user exists, it returns a 400 status with a message indicating the user already exists.
// If not, it hashes the password using bcrypt and creates a new user in the database.
// Returns a 201 status with a success message and the new user details.
// 2. User Login
// Function: login
// Purpose: Authenticates a user and returns a JWT token.
// Process:
// Extracts email and password from the request body.
// Finds the user by email.
// If the user is not found, it returns a 400 status with an invalid credentials message.
// Compares the provided password with the stored hashed password.
// If the passwords do not match, it returns a 400 status with an invalid credentials message.
// If successful, generates a JWT token with the user's ID and a secret key, setting an expiration of 1 day.
// Returns a 200 status with the token and user details (excluding the password).
// 3. JWT Verification Middleware
// Function: verifyToken
// Purpose: Middleware to verify the JWT token sent in the Authorization header.
// Process:
// Checks for the presence of an Authorization header and verifies its format (Bearer <token>).
// If the header is missing or malformed, it returns a 401 status with an appropriate message.
// Extracts the token from the header.
// Verifies the token using the secret key.
// If verification fails, it returns a 401 status with an invalid or expired token message.
// If successful, attaches the decoded token (user info) to the request object and calls next() to proceed to the next middleware or route handler.
// Potential Issues and Actions
// Environment Variables:

// Ensure process.env.JWT_SECRET is set in your environment variables. This secret is crucial for signing and verifying JWT tokens.
// Error Handling:

// The code catches errors and returns a 500 status with a generic error 
// message. Consider logging the error details for debugging purposes.
// Security:

// Ensure that the JWT secret is strong and kept confidential.
// Consider implementing additional security measures, such as rate limiting 
// and account lockout after multiple failed login attempts.
// Token Expiry:

// Tokens are set to expire in 1 day. Ensure your application handles token
// expiration properly and provide appropriate user feedback for token 
 //expiration scenarios.
// Token Revocation:renewal or re-authentication as needed.
// User Object Handling:

// When returning user details, ensure sensitive information (like passwords) is
//  excluded from the response.
// By following these insights and addressing potential issues, you can maintain
//  a secure and efficient authentication system in your application.






// authMiddl