import express from "express";
import { signup, login, verifyEmail } from "../Controllers/AuthController.js";
import { verifyToken } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

// 🧾 Authentication Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify", verifyEmail); // ✅ new route for email verification

// 🔒 Example protected route (to test token validity)
router.get("/me", verifyToken, (req, res) => {
  res.json({ message: "Token valid", user: req.user });
});

export default router;
