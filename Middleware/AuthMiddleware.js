import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import UserActivity from "../Models/UserActivity.js";


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

    // Fetch user
    const user = await User.findById(decoded.id)
      .select("-password -verificationCode");

    if (!user) {
      return res.status(401).json({
        message: "User not found or removed.",
      });
    }

    // User must be verified to access protected routes
    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your email before accessing this.",
      });
    }

    // ⭐ Attach user to request (IMPORTANT)
    req.user = {
      _id: user._id,
      id: user._id,
      role: user.role,       // ⭐ Critical for role control
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
      mobile: user.mobile,
      bio: user.bio,
    };

      await UserActivity.findOneAndUpdate(
    { userId: user._id, online: true },
    { lastSeen: new Date() }
  );

    next();
  } catch (err) {
    console.error("❌ Token verification error:", err);

    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};
