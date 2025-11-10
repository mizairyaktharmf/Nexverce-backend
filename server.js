import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./Config/MangoDb.js";
import productRoutes from "./Routes/ProductRoutes.js";  

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Product API route
app.use("/api/products", productRoutes);

app.get("/", (req, res) => {
  res.send("✅ Nexverce backend running and connected to MongoDB");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
