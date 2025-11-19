// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./Config/MangoDb.js";

// ROUTES
import productRoutes from "./Routes/ProductRoutes.js";
import authRoutes from "./Routes/AuthRoutes.js";
import notificationRoutes from "./Routes/NotificationRoutes.js";

dotenv.config();

// Connect to MongoDB
connectDB();

// Debug key (optional)
console.log("RESEND KEY Loaded:", !!process.env.RESEND_API_KEY);

// Initialize Express app
const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ===========================================
   REGISTER ROUTES
=========================================== */
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);

/* ===========================================
   DEFAULT HOME ROUTE
=========================================== */
app.get("/", (req, res) => {
  res.status(200).send("✅ Nexverce backend running & connected to MongoDB");
});

/* ===========================================
   ERROR HANDLER (PROTECTS SERVER)
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
