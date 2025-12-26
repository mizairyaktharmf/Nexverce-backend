import express from "express";
import { protect } from "../Middleware/AuthMiddleware.js";

import {
  createReferralRequest,
  getReferralRequests,
  respondToReferralRequest,
  deleteReferralRequest,
} from "../Controllers/ReferralRequestController.js";

const router = express.Router();

// Create referral request (Any authenticated user)
router.post("/create", protect, createReferralRequest);

// Get all referral requests
router.get("/", protect, getReferralRequests);

// Respond to referral request (Admin only)
router.patch("/:requestId/respond", protect, respondToReferralRequest);

// Delete referral request
router.delete("/:requestId", protect, deleteReferralRequest);

export default router;
