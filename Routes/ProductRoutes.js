import express from "express";
import Product from "../Models/ProductModel.js";
import { createNotification } from "../Controllers/NotificationController.js";

const router = express.Router();

/* ======================================================
   GET ALL PRODUCTS
====================================================== */
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error });
  }
});

/* ======================================================
   GET ONE PRODUCT BY ID
====================================================== */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error });
  }
});

/* ======================================================
   CREATE NEW PRODUCT — SUPPORT BLOCKS + HTML
====================================================== */
router.post("/", async (req, res) => {
  try {
    let { contentBlocks, content, ...rest } = req.body;

    // 🔥 Parse blocks if received as a STRING
    if (typeof contentBlocks === "string") {
      try {
        contentBlocks = JSON.parse(contentBlocks);
      } catch {
        contentBlocks = [];
      }
    }

    // Ensure blocks exist
    if (!Array.isArray(contentBlocks)) contentBlocks = [];

    const newProduct = await Product.create({
      ...rest,
      content,
      contentBlocks,
    });

    // Create admin notification
    await createNotification(
      `New post created: ${newProduct.title}`,
      "published"
    );

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: "Error creating product", error });
  }
});

/* ======================================================
   FULL UPDATE (PUT) — SUPPORT BLOCKS
====================================================== */
router.put("/:id", async (req, res) => {
  try {
    let { contentBlocks, content, ...rest } = req.body;

    // Parse blocks if needed
    if (typeof contentBlocks === "string") {
      try {
        contentBlocks = JSON.parse(contentBlocks);
      } catch {
        contentBlocks = [];
      }
    }

    if (!Array.isArray(contentBlocks)) contentBlocks = [];

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...rest,
        content,
        contentBlocks,
      },
      { new: true }
    );

    await createNotification(`Post updated: ${updated.title}`, "update");

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error updating product", error });
  }
});

/* ======================================================
   PATCH — STATUS, SCHEDULE
====================================================== */
router.patch("/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    await createNotification(
      `Post status changed: ${updated.title}`,
      updated.status
    );

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error patching product", error });
  }
});

/* ======================================================
   DELETE PRODUCT
====================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);

    await createNotification(`Post deleted: ${deleted?.title}`, "delete");

    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting", error });
  }
});

export default router;