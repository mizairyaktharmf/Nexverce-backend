import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./Config/MangoDb.js";
import productRoutes from "./Routes/ProductRoutes.js";
import authRoutes from "./Routes/AuthRoutes.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("✅ Nexverce backend running & connected to MongoDB");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Nexverce backend running on port ${PORT}`)
);
