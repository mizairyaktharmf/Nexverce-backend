import express from "express";
import { signup, login } from "../Controllers/AuthController.js";
import { verifyToken } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// Example protected route (admin dashboard ping)
router.get("/me", verifyToken, (req, res) => {
  res.json({ message: "Token valid", user: req.user });
});

export default router;
