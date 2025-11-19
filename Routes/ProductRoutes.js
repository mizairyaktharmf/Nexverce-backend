import express from "express";
import Product from "../Models/ProductModel.js";
import { createNotification } from "../Controllers/NotificationController.js";
import { verifyToken } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

/* ======================================================
   GET ALL PRODUCTS  (PUBLIC)
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
   GET ONE PRODUCT  (PUBLIC)
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
   CREATE NEW PRODUCT  (PROTECTED)
====================================================== */
router.post("/", verifyToken, async (req, res) => {
  try {
    let { contentBlocks, content, ...rest } = req.body;

    if (typeof contentBlocks === "string") {
      try {
        contentBlocks = JSON.parse(contentBlocks);
      } catch {
        contentBlocks = [];
      }
    }
    if (!Array.isArray(contentBlocks)) contentBlocks = [];

    const newProduct = await Product.create({
      ...rest,
      content,
      contentBlocks,
    });

    // PERFORMED BY
    const performedBy = `${req.user.firstName} ${req.user.lastName} (${req.user.role})`;

    await createNotification(
      `New post created: ${newProduct.title}`,
      "published",
      performedBy
    );

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: "Error creating product", error });
  }
});

/* ======================================================
   FULL UPDATE (PUT) (PROTECTED)
====================================================== */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    let { contentBlocks, content, ...rest } = req.body;

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

    const performedBy = `${req.user.firstName} ${req.user.lastName} (${req.user.role})`;

    await createNotification(
      `Post updated: ${updated.title}`,
      "update",
      performedBy
    );

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error updating product", error });
  }
});

/* ======================================================
   PATCH — STATUS, SCHEDULE (PROTECTED)
====================================================== */
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    const performedBy = `${req.user.firstName} ${req.user.lastName} (${req.user.role})`;

    await createNotification(
      `Post status changed: ${updated.title}`,
      updated.status,
      performedBy
    );

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error patching product", error });
  }
});

/* ======================================================
   DELETE PRODUCT (PROTECTED)
====================================================== */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);

    const performedBy = `${req.user.firstName} ${req.user.lastName} (${req.user.role})`;

    await createNotification(
      `Post deleted: ${deleted?.title}`,
      "delete",
      performedBy
    );

    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting", error });
  }
});

export default router;
