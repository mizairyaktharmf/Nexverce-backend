// Controllers/ProductController.js

import Product from "../Models/ProductModel.js";   // ✅ FIXED IMPORT
import { createNotification } from "./NotificationController.js";

/* ----------------------------------------------------
   CREATE NEW PRODUCT OR BLOG POST
---------------------------------------------------- */
export const createPost = async (req, res) => {
  try {
    const data = req.body;

    // Auto-generate slug if missing
    const finalSlug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const newPost = await Product.create({
      ...data,
      slug: finalSlug,
    });

    await createNotification({
      message: `Created new ${newPost.type}`,
      type: newPost.status === "published" ? "published" : "draft",
      performedBy: req.user,
      target: {
        id: newPost._id,
        title: newPost.title,
        model: "Product",
      },
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create post" });
  }
};

/* ----------------------------------------------------
   GET ALL POSTS
---------------------------------------------------- */
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Product.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

/* ----------------------------------------------------
   GET SINGLE POST
---------------------------------------------------- */
export const getPostById = async (req, res) => {
  try {
    const post = await Product.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

/* ----------------------------------------------------
   UPDATE POST
---------------------------------------------------- */
export const updatePost = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ error: "Post not found" });

    await createNotification({
      message: `${updated.type} updated`,
      type: "update",
      performedBy: req.user,
      target: {
        id: updated._id,
        title: updated.title,
        model: "Product",
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update post" });
  }
};

/* ----------------------------------------------------
   DELETE POST
---------------------------------------------------- */
export const deletePost = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({ error: "Post not found" });

    await createNotification({
      message: `${deleted.type} deleted`,
      type: "delete",
      performedBy: req.user,
      target: {
        id: deleted._id,
        title: deleted.title,
        model: "Product",
      },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
};

/* ----------------------------------------------------
   TOGGLE STATUS (publish <-> draft)
---------------------------------------------------- */
export const changeStatus = async (req, res) => {
  try {
    const post = await Product.findById(req.params.id);

    if (!post)
      return res.status(404).json({ error: "Post not found" });

    const newStatus =
      post.status === "published" ? "draft" : "published";

    post.status = newStatus;
    await post.save();

    await createNotification({
      message: `${post.type} marked as ${newStatus}`,
      type: newStatus,
      performedBy: req.user,
      target: {
        id: post._id,
        title: post.title,
        model: "Product",
      },
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to change status" });
  }
};

/* ----------------------------------------------------
   SCHEDULE A POST
---------------------------------------------------- */
export const schedulePost = async (req, res) => {
  try {
    const { scheduledAt } = req.body;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        status: "scheduled",
        scheduledAt,
      },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ error: "Post not found" });

    await createNotification({
      message: `${updated.type} scheduled`,
      type: "scheduled",
      performedBy: req.user,
      target: {
        id: updated._id,
        title: updated.title,
        model: "Product",
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to schedule post" });
  }
};