// Routes/NewsletterRoutes.js
import express from "express";
import {
  subscribeNewsletter,
  getAllSubscribers,
  getNewsletterStats,
  unsubscribeNewsletter,
  deleteSubscriber,
  exportSubscribers,
} from "../Controllers/NewsletterController.js";
import { verifyToken } from "../Middlewares/verifyToken.js";
import { allowAdmin } from "../Middlewares/allowAdmin.js";

const router = express.Router();

// PUBLIC ROUTES
router.post("/subscribe", subscribeNewsletter);
router.post("/unsubscribe", unsubscribeNewsletter);

// ADMIN ONLY ROUTES
router.get("/subscribers", verifyToken, allowAdmin, getAllSubscribers);
router.get("/stats", verifyToken, allowAdmin, getNewsletterStats);
router.get("/export", verifyToken, allowAdmin, exportSubscribers);
router.delete("/:id", verifyToken, allowAdmin, deleteSubscriber);

export default router;
