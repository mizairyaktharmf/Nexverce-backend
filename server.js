import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./Config/MangoDb.js";
import productRoutes from "./Routes/ProductRoutes.js";
import authRoutes from "./Routes/AuthRoutes.js"; // 🆕 import auth routes

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Product API routes
app.use("/api/products", productRoutes);

// ✅ Authentication routes
app.use("/api/auth", authRoutes); // 🆕 signup, login, verifyToken, etc.

// ✅ Default route
app.get("/", (req, res) => {
  res.send("✅ Nexverce backend running and connected to MongoDB");
});

// ✅ Server listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
