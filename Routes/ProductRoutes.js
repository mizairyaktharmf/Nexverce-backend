import express from "express";
import Product from "../Models/ProductModel.js";
import { createNotification } from "../Controllers/NotificationController.js";

const router = express.Router();

// GET ALL
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error });
  }
});

// GET ONE
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error });
  }
});

// CREATE NEW PRODUCT
router.post("/", async (req, res) => {
  try {
    const newProduct = await Product.create(req.body);

    await createNotification(
      `New post created: ${newProduct.title}`,
      "published"
    );

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: "Error creating product", error });
  }
});

// FULL UPDATE
router.put("/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    await createNotification(`Post updated: ${updated.title}`, "update");

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error updating product", error });
  }
});

// PATCH (status / schedule / partial updates)
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

// DELETE
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