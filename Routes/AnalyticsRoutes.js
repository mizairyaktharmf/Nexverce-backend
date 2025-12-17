import express from "express";
const router = express.Router();
import {
  getDashboardStats,
  trackView,
  trackClick,
  getPostAnalytics,
  getTrendingPosts,
} from "../Controllers/AnalyticsController.js";
import { verifyToken } from "../Middleware/AuthMiddleware.js";

/* ===================================================================
   📊 ANALYTICS ROUTES
   - Dashboard statistics (protected)
   - Track views and clicks (public for client site)
   - Post analytics (protected)
   - Trending posts (protected)
=================================================================== */

// 📈 GET DASHBOARD STATS (Protected - Admin only)
router.get("/dashboard", verifyToken, getDashboardStats);

// 👁️ TRACK POST VIEW (Public - anyone can track views)
router.post("/view", trackView);

// 🖱️ TRACK AFFILIATE CLICK (Public - anyone can track clicks)
router.post("/click", trackClick);

// 📊 GET POST ANALYTICS (Protected - Admin only)
router.get("/post/:postId", verifyToken, getPostAnalytics);

// 🔥 GET TRENDING POSTS (Protected - admin only)
router.get("/trending", verifyToken, getTrendingPosts);

export default router;
