import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import Product from "./Models/ProductModel.js";

dotenv.config();

const productsData = JSON.parse(fs.readFileSync("./productsData.json", "utf-8"));

const importData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Product.deleteMany(); // optional
    await Product.insertMany(productsData.products);
    console.log("✅ Data imported successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
};

importData();
