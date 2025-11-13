import jwt from "jsonwebtoken";
import User from "../Models/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    // Extract bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access denied. Token missing." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch full user (IMPORTANT)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found or deleted." });
    }

    // Attach user object to request
    req.user = user;

    next();
  } catch (err) {
    console.error("❌ Token verification error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
