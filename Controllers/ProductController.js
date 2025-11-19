// Controllers/ProductController.js
import Product from "../Models/Product.js";
import { createNotification } from "./NotificationController.js";

/* ------------------------------
   CREATE NEW POST
------------------------------ */
export const createPost = async (req, res) => {
  try {
    const newPost = await Product.create(req.body);

    await createNotification(`New post created: ${newPost.title}`, "published");

    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post" });
  }
};

/* ------------------------------
   GET ALL POSTS
------------------------------ */
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Product.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

/* ------------------------------
   GET SINGLE POST
------------------------------ */
export const getPostById = async (req, res) => {
  try {
    const post = await Product.findById(req.params.id);
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

/* ------------------------------
   UPDATE POST
------------------------------ */
export const updatePost = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    await createNotification(`Post updated: ${updated.title}`, "update");

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update post" });
  }
};

/* ------------------------------
   DELETE POST
------------------------------ */
export const deletePost = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);

    await createNotification(`Post deleted: ${deleted.title}`, "delete");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
};

/* ------------------------------
   CHANGE STATUS (publish / draft)
------------------------------ */
export const changeStatus = async (req, res) => {
  try {
    const post = await Product.findById(req.params.id);

    const newStatus =
      post.status === "published" ? "draft" : "published";

    post.status = newStatus;
    await post.save();

    await createNotification(
      `Post ${newStatus}: ${post.title}`,
      newStatus === "published" ? "published" : "draft"
    );

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to change status" });
  }
};

/* ------------------------------
   SCHEDULED POST
------------------------------ */
export const schedulePost = async (req, res) => {
  try {
    const { scheduledTime } = req.body;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        status: "scheduled",
        scheduledTime,
      },
      { new: true }
    );

    await createNotification(
      `Post scheduled: ${updated.title}`,
      "scheduled"
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to schedule post" });
  }
};