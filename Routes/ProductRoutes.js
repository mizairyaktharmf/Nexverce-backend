import express from "express";
import Product from "../Models/ProductModel.js";
import { createNotification } from "../Controllers/NotificationController.js";

const router = express.Router();

/* =====================================================
   1. GET ALL PRODUCTS
===================================================== */
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error });
  }
});

/* =====================================================
   2. GET SINGLE PRODUCT
===================================================== */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error });
  }
});

/* =====================================================
   3. CREATE PRODUCT (Send Notification)
===================================================== */
router.post("/", async (req, res) => {
  try {
    const newProduct = await Product.create(req.body);

    // 🔔 Notification
    await createNotification(`New post created: ${newProduct.title}`, "published");

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: "Error creating product", error });
  }
});

/* =====================================================
   4. UPDATE FULL PRODUCT (PUT)
===================================================== */
router.put("/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    // 🔔 Notification
    await createNotification(`Post updated: ${updated.title}`, "update");

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error updating product", error });
  }
});

/* =====================================================
   5. PARTIAL UPDATE (PATCH)
      - status change (publish/unpublish)
      - schedule update
===================================================== */
router.patch("/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Product not found" });

    // 🔍 Check for special updates
    if (req.body.status) {
      const statusType =
        req.body.status === "published" ? "published" :
        req.body.status === "draft" ? "draft" : "update";

      await createNotification(`Post ${req.body.status}: ${updated.title}`, statusType);
    }

    if (req.body.scheduledAt) {
      await createNotification(`Post scheduled: ${updated.title}`, "scheduled");
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error patching product", error });
  }
});

/* =====================================================
   6. DELETE PRODUCT (Send Notification)
===================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);

    if (deleted) {
      // 🔔 Notification
      await createNotification(`Post deleted: ${deleted.title}`, "delete");
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting product", error });
  }
});

export default router;