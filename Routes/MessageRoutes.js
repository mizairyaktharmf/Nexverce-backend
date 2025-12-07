import express from "express";
import { protect } from "../Middleware/AuthMiddleware.js";

import {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead
} from "../Controllers/MessageController.js";

const router = express.Router();

// Start or get chat
router.post("/start", protect, getOrCreateConversation);

// Get all chats
router.get("/conversations", protect, getMyConversations);

// Get messages inside a chat
router.get("/:conversationId", protect, getMessages);

// Send message
router.post("/send", protect, sendMessage);

// Mark messages as read
router.post("/mark-read", protect, markAsRead);

export default router;
