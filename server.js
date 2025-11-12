import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./Config/MangoDb.js";
import productRoutes from "./Routes/ProductRoutes.js";
import authRoutes from "./Routes/AuthRoutes.js";
import { sendMail } from "./Utils/SendMail.js"; // ✅ for testing email

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Product API routes
app.use("/api/products", productRoutes);

// ✅ Authentication routes (signup, login, verify)
app.use("/api/auth", authRoutes);

// ✅ Default route
app.get("/", (req, res) => {
  res.send("✅ Nexverce backend running and connected to MongoDB");
});

// ✅ Test email route — temporary for debugging
app.get("/test-email", async (req, res) => {
  try {
    await sendMail("yourpersonalemail@gmail.com", "123456"); // change to your test email
    res.send("✅ Test email sent successfully!");
  } catch (err) {
    console.error("❌ Email test failed:", err);
    res.status(500).send("❌ Email test failed: " + err.message);
  }
});

// ✅ Server listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
