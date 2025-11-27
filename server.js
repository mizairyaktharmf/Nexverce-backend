// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./Config/MangoDb.js";

// ROUTES
import productRoutes from "./Routes/ProductRoutes.js";
import authRoutes from "./Routes/AuthRoutes.js";
import notificationRoutes from "./Routes/NotificationRoutes.js";
import userRoutes from "./Routes/UserRoutes.js";
import blogRoutes from "./Routes/BlogRoutes.js";   // ⭐ ADDED FOR BLOG SYSTEM

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

/* ===========================================
   GLOBAL MIDDLEWARES
=========================================== */

// CORS — allow your admin & client domains
app.use(
  cors({
    origin: [
      // LOCAL DEV
      "http://localhost:5173", // Admin (local)
      "http://localhost:5174", // Client (local)

      // PRODUCTION DOMAINS
      "https://www.nexverce.com",   // Client (main website)
      "https://nexverce.com",       // (non-www redirect support)

      "https://admin.nexverce.com", // Admin panel

      // VERCEL PREVIEW DEPLOYMENTS (optional but recommended)
      "https://nexverce-admin.vercel.app",
      "https://nexverce-client.vercel.app",
    ],
    credentials: true,
  })
);

// Security headers
app.use(helmet());

// Parse JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ===========================================
   REGISTER ROUTES
=========================================== */
app.use("/api/products", productRoutes);
app.use("/api/blogs", blogRoutes);              // ⭐ BLOG ROUTES ADDED
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);

/* ===========================================
   DEFAULT HOME ROUTE
=========================================== */
app.get("/", (req, res) => {
  res.status(200).send("✅ Nexverce backend running & connected to MongoDB");
});

/* ===========================================
   HANDLE 404 — Route Not Found
=========================================== */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ===========================================
   GLOBAL ERROR HANDLER
=========================================== */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* ===========================================
   START SERVER
=========================================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Nexverce backend running on port ${PORT}`);
});
