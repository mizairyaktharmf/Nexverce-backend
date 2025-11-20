import jwt from "jsonwebtoken";
import User from "../Models/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided. Access denied.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB
    const user = await User.findById(decoded.id).select("-password -verificationCode");

    if (!user) {
      return res.status(401).json({
        message: "User not found or removed.",
      });
    }

    // Check if user is verified
    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your email before accessing this.",
      });
    }

    // Attach user to request object
    req.user = {
      _id: user._id,    
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      email: user.email,
      profileImage: user.profileImage,
      mobile: user.mobile,
      bio: user.bio,
    };

    next();
  } catch (err) {
    console.error("❌ Token verification error:", err);

    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};