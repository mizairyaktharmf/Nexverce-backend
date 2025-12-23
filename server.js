// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import connectDB from "./Config/MangoDb.js";

// MODELS
import User from "./Models/User.js";
import Conversation from "./Models/Conversation.js";
import Message from "./Models/Message.js";

// ROUTES
import productRoutes from "./Routes/ProductRoutes.js";
import authRoutes from "./Routes/AuthRoutes.js";
import notificationRoutes from "./Routes/NotificationRoutes.js";
import userRoutes from "./Routes/UserRoutes.js";
import blogRoutes from "./Routes/BlogRoutes.js";
import analyticsRoutes from "./Routes/AnalyticsRoutes.js";
import landingPageRoutes from "./Routes/LandingPageRoutes.js";
import messageRoutes from "./Routes/MessageRoutes.js";
import linkedinRoutes from "./Routes/LinkedInRoutes.js";
import universalPostRoutes from "./Routes/UniversalPostRoutes.js";
import newsletterRoutes from "./Routes/NewsletterRoutes.js";

// CRON JOBS
import { startScheduledPosterCron } from "./Jobs/LinkedInScheduledPoster.js";
import { startAnalyticsSyncCron } from "./Jobs/LinkedInAnalyticsSync.js";
import { startTokenRefresherCron } from "./Jobs/LinkedInTokenRefresher.js";

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ✅ Create HTTP server wrapper (required for socket.io)
const server = http.createServer(app);

// ✅ Common origins list
const allowedOrigins = [
  // LOCAL DEV
  "http://localhost:5173",
  "http://localhost:5174",

  // PRODUCTION
  "https://www.nexverce.com",
  "https://nexverce.com",
  "https://admin.nexverce.com",

  // VERCEL PREVIEW
  "https://nexverce-admin.vercel.app",
  "https://nexverce-client.vercel.app",
];

// ✅ Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

/* ============================================================
   SOCKET.IO MIDDLEWARE – JWT AUTH FOR SOCKETS
============================================================ */
io.use(async (socket, next) => {
  try {
    // token can come from handshake auth OR header
    const authToken =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!authToken) {
      return next(new Error("No token provided"));
    }

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "firstName lastName role profileImage email"
    );

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user; // attach user to socket
    next();
  } catch (err) {
    console.error("Socket auth error:", err);
    next(new Error("Authentication error"));
  }
});

/* ============================================================
   SOCKET.IO EVENTS – REAL-TIME MESSAGING
============================================================ */
io.on("connection", (socket) => {
  const user = socket.user;
  const userId = user._id.toString();

  console.log(`🔥 Socket connected: ${socket.id} (User: ${userId})`);

  // ✅ Join personal room
  socket.join(userId);

  // ✅ Broadcast presence online
  io.emit("presence:update", {
    userId,
    online: true,
  });

  /* -------------------------------------------
     SEND MESSAGE (text / image / task)
     Event: message:send
     Payload: { conversationId, receiverId, type, text, imageUrl }
  ------------------------------------------- */
  socket.on("message:send", async (payload, callback) => {
    try {
      const { conversationId, receiverId, type, text, imageUrl } = payload;
      const senderId = userId;

      // 1) Ensure conversation exists
      const convo = await Conversation.findById(conversationId);

      if (!convo) {
        if (callback) callback({ error: "Conversation not found" });
        return;
      }

      // 2) Create message in DB
      const msg = await Message.create({
        conversationId,
        sender: senderId,
        type: type || "text",
        text: text || "",
        imageUrl: imageUrl || "",
      });

      // 3) Update conversation meta (last message, unread)
      convo.lastMessage =
        type === "text"
          ? text
          : type === "image"
          ? "📸 Image"
          : type === "task"
          ? "📌 Task"
          : "";

      convo.lastSender = senderId;

      convo.members.forEach((member) => {
        const memberId = member.toString();
        if (memberId !== senderId) {
          const current = convo.unread.get(memberId) || 0;
          convo.unread.set(memberId, current + 1);
        }
      });

      await convo.save();

      // 4) Build safe message object for frontend
      const safeMessage = {
        _id: msg._id,
        conversationId: msg.conversationId,
        sender: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          profileImage: user.profileImage,
        },
        type: msg.type,
        text: msg.text,
        imageUrl: msg.imageUrl,
        createdAt: msg.createdAt,
      };

      // 5) Build updated conversation payload
      const convoPayload = {
        _id: convo._id,
        members: convo.members,
        lastMessage: convo.lastMessage,
        lastSender: convo.lastSender,
        unread: Object.fromEntries(convo.unread || []),
        updatedAt: convo.updatedAt,
      };

      // 6) Emit to sender & receiver rooms
      io.to(senderId).emit("message:new", safeMessage);
      if (receiverId) {
        io.to(receiverId).emit("message:new", safeMessage);
        io.to(receiverId).emit("conversation:updated", convoPayload);
      }

      // sender also gets updated conversation (for unread = 0 on their side)
      io.to(senderId).emit("conversation:updated", convoPayload);

      if (callback) callback({ success: true, message: safeMessage });
    } catch (err) {
      console.error("Socket message:send error:", err);
      if (callback) callback({ error: "Failed to send message" });
    }
  });

  /* -------------------------------------------
     MARK CONVERSATION AS READ
     Event: conversation:read
     Payload: { conversationId }
  ------------------------------------------- */
  socket.on("conversation:read", async ({ conversationId }) => {
    try {
      const convo = await Conversation.findById(conversationId);
      if (!convo) return;

      convo.unread.set(userId, 0);
      await convo.save();

      io.to(userId).emit("conversation:updated", {
        _id: convo._id,
        members: convo.members,
        lastMessage: convo.lastMessage,
        lastSender: convo.lastSender,
        unread: Object.fromEntries(convo.unread || []),
        updatedAt: convo.updatedAt,
      });
    } catch (err) {
      console.error("conversation:read error:", err);
    }
  });

  /* -------------------------------------------
     HANDLE DISCONNECT
  ------------------------------------------- */
  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id} (User: ${userId})`);

    io.emit("presence:update", {
      userId,
      online: false,
    });
  });
});

/* ============================================================
   MAKE SOCKET.IO AVAILABLE TO ROUTES/CONTROLLERS
============================================================ */
app.set("io", io);

/* ============================================================
   EXPRESS MIDDLEWARES
============================================================ */
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ============================================================
   REGISTER ROUTES
============================================================ */
// ✅ UNIVERSAL POST ENDPOINT (Must be registered FIRST before specific routes)
app.use("/api/posts", universalPostRoutes);

// Specific endpoints
app.use("/api/products", productRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/landing-pages", landingPageRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/linkedin", linkedinRoutes);
app.use("/api/newsletter", newsletterRoutes);

/* ============================================================
   DEFAULT HOME ROUTE
============================================================ */
app.get("/", (req, res) => {
  res
    .status(200)
    .send("✅ Nexverce backend running with real-time messaging & MongoDB");
});

/* ============================================================
   404 HANDLER
============================================================ */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* ============================================================
   START CRON JOBS
============================================================ */
startScheduledPosterCron(io); // Posts scheduled LinkedIn posts every minute
startAnalyticsSyncCron(); // Syncs LinkedIn analytics every 6 hours
startTokenRefresherCron(); // Refreshes expiring LinkedIn tokens daily

/* ============================================================
   START SERVER
============================================================ */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Nexverce backend running with Socket.io on port ${PORT}`);
  console.log(`✅ LinkedIn routes registered at /api/linkedin`);
  console.log(`✅ LinkedIn cron jobs started`);
});

