import express from "express";
import {
  signup,
  login,
  verifyEmail,
} from "../Controllers/AuthController.js";

import {
  updateProfile,
  changePassword,
} from "../Controllers/ProfileController.js";

import { verifyToken } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

/* ---------------------------------------------
   🔐 Authentication Routes
---------------------------------------------- */

// Signup new user
router.post("/signup", signup);

// Login
router.post("/login", login);

// Verify account using email OTP
router.post("/verify", verifyEmail);

/* ---------------------------------------------
   🔒 Protected Routes
---------------------------------------------- */

// Validate token & return user
router.get("/me", verifyToken, (req, res) => {
  res.json({ message: "Token valid", user: req.user });
});

// Update profile (firstName, lastName, mobile, bio, profileImage)
router.put("/update-profile", verifyToken, updateProfile);

// Change password
router.post("/change-password", verifyToken, changePassword);

export default router;
