import express from "express";
import Product from "../Models/ProductModel.js";
import Blog from "../Models/BlogModel.js";
import LandingPage from "../Models/LandingPageModel.js";

const router = express.Router();

/* ======================================================
   UNIVERSAL POST ENDPOINT - Auto-detect post type by ID
   GET /api/posts/:id

   Usage: Client can fetch any post (blog/product/landingpage)
   without knowing the type in advance.
====================================================== */

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find the post in each collection
    let post = null;
    let postType = null;

    // 1. Check Products
    post = await Product.findById(id);
    if (post) {
      postType = "product";
    }

    // 2. Check Blogs (if not found in products)
    if (!post) {
      post = await Blog.findById(id);
      if (post) {
        postType = "blog";
      }
    }

    // 3. Check Landing Pages (if still not found)
    if (!post) {
      post = await LandingPage.findById(id);
      if (post) {
        postType = "landingpage";
      }
    }

    // 4. Not found in any collection
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // 5. Return post with type metadata
    return res.status(200).json({
      ...post.toObject(),
      _postType: postType, // Add type metadata for client
    });
  } catch (error) {
    console.error("❌ Error fetching universal post:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch post",
      error: error.message,
    });
  }
});

/* ======================================================
   GET ALL POSTS (Combined from all collections)
   GET /api/posts

   Returns all published posts from all types
====================================================== */

router.get("/", async (req, res) => {
  try {
    // Fetch all published posts from each collection
    const products = await Product.find({ status: "published" }).lean();
    const blogs = await Blog.find({ status: "published" }).lean();
    const landingPages = await LandingPage.find({ status: "active" }).lean();

    // Add type metadata to each
    const allPosts = [
      ...products.map((p) => ({ ...p, _postType: "product" })),
      ...blogs.map((b) => ({ ...b, _postType: "blog" })),
      ...landingPages.map((lp) => ({ ...lp, _postType: "landingpage" })),
    ];

    // Sort by creation date (newest first)
    allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json(allPosts);
  } catch (error) {
    console.error("❌ Error fetching all posts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch posts",
      error: error.message,
    });
  }
});

export default router;
