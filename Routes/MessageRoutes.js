import express from "express";
import { protect } from "../Middleware/AuthMiddleware.js";

import {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead,
  updateTaskStatus
} from "../Controllers/MessageController.js";

const router = express.Router();

// Start or get chat
router.post("/start", protect, getOrCreateConversation);
router.post("/get-or-create", protect, getOrCreateConversation);

// Get all chats
router.get("/conversations", protect, getMyConversations);

// Get messages inside a chat
router.get("/:conversationId", protect, getMessages);

// Send message
router.post("/send", protect, sendMessage);

// Mark messages as read
router.post("/mark-read", protect, markAsRead);

// Update task status
router.patch("/task/:messageId/status", protect, updateTaskStatus);

export default router;
