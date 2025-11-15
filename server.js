// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./Config/MangoDb.js";

import productRoutes from "./Routes/ProductRoutes.js";
import authRoutes from "./Routes/AuthRoutes.js";
import notificationRoutes from "./Routes/NotificationRoutes.js"; 

dotenv.config();

// Connect MongoDB
connectDB();

console.log("RESEND KEY:", process.env.RESEND_API_KEY);

// Initialize Express
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =============================
      ROUTES
============================= */
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);

/* =============================
      HEALTH CHECK ROUTE
============================= */
app.get("/", (req, res) => {
  res.send("✅ Nexverce backend running & connected to MongoDB");
});

/* =============================
      SERVER START
============================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Nexverce backend running on port ${PORT}`);
});