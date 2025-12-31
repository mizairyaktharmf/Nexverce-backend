// Controllers/ProductController.js
import Product from "../Models/ProductModel.js";
import { createNotification } from "./NotificationController.js";

/* ----------------------------------------------------
   FUNCTION: generate unique slug
---------------------------------------------------- */
const generateSlug = async (title) => {
  let base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = base;
  let counter = 1;

  while (await Product.findOne({ slug })) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
};

/* ----------------------------------------------------
   CREATE PRODUCT
---------------------------------------------------- */
export const createPost = async (req, res) => {
  try {
    const data = req.body;

    // generate slug
    const slug = await generateSlug(data.title);

    const newPost = await Product.create({
      ...data,
      slug,
      createdBy: req.user._id,
    });

    await createNotification({
      message: `created product "${newPost.title}" as ${newPost.status}`,
      type: newPost.status,
      performedBy: req.user,
      target: {
        id: newPost._id,
        title: newPost.title,
        model: "Product",
      },
      io: req.app.get("io"),
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create product" });
  }
};

/* ----------------------------------------------------
   GET ALL PRODUCTS
---------------------------------------------------- */
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Product.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

/* ----------------------------------------------------
   GET SINGLE PRODUCT
---------------------------------------------------- */
export const getPostById = async (req, res) => {
  try {
    const post = await Product.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Product not found" });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

/* ----------------------------------------------------
   UPDATE PRODUCT
---------------------------------------------------- */
export const updatePost = async (req, res) => {
  try {
    const post = await Product.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Product not found" });

    // staff can only edit own posts
    if (
      req.user.role === "staff" &&
      post.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // assign updatedBy
    req.body.updatedBy = req.user._id;

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    await createNotification({
      message: `updated product "${updated.title}"`,
      type: "update",
      performedBy: req.user,
      target: {
        id: updated._id,
        title: updated.title,
        model: "Product",
      },
      io: req.app.get("io"),
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
};

/* ----------------------------------------------------
   DELETE PRODUCT
---------------------------------------------------- */
export const deletePost = async (req, res) => {
  try {
    const post = await Product.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found" });

    // staff can only delete own posts
    if (
      req.user.role === "staff" &&
      post.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await post.deleteOne();

    await createNotification({
      message: `deleted product "${post.title}"`,
      type: "delete",
      performedBy: req.user,
      target: {
        id: post._id,
        title: post.title,
        model: "Product",
      },
      io: req.app.get("io"),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
};

/* ----------------------------------------------------
   PUBLISH / DRAFT TOGGLE
---------------------------------------------------- */
export const changeStatus = async (req, res) => {
  try {
    const post = await Product.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found" });

    // staff can't change status of other users' posts
    if (
      req.user.role === "staff" &&
      post.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // If status is provided in request body, use it; otherwise toggle
    if (req.body.status) {
      post.status = req.body.status;
    } else {
      post.status = post.status === "published" ? "draft" : "published";
    }

    post.updatedBy = req.user._id;
    await post.save();

    await createNotification({
      message: `marked product "${post.title}" as ${post.status}`,
      type: post.status,
      performedBy: req.user,
      target: {
        id: post._id,
        title: post.title,
        model: "Product",
      },
      io: req.app.get("io"),
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to change status" });
  }
};

/* ----------------------------------------------------
   SCHEDULE PRODUCT
---------------------------------------------------- */
export const schedulePost = async (req, res) => {
  try {
    const post = await Product.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found" });

    // staff cannot schedule other staff's post
    if (
      req.user.role === "staff" &&
      post.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    post.status = "scheduled";
    post.scheduledAt = req.body.scheduledAt;
    post.updatedBy = req.user._id;
    await post.save();

    await createNotification({
      message: `scheduled product "${post.title}" for ${new Date(post.scheduledAt).toLocaleString()}`,
      type: "scheduled",
      performedBy: req.user,
      target: {
        id: post._id,
        title: post.title,
        model: "Product",
      },
      io: req.app.get("io"),
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to schedule product" });
  }
};

/* ----------------------------------------------------
   QUIZ MATCH - Get products matching quiz answers
---------------------------------------------------- */
export const getQuizMatches = async (req, res) => {
  try {
    const {
      category,
      problem,
      experience,
      budget,
      priority,
      timeframe,
      support,
      userType,
      integration,
    } = req.body;

    console.log("🎯 Quiz Match Request:", req.body);

    // Find all published products
    const allProducts = await Product.find({ status: "published" });

    // Calculate match score for each product
    const productsWithScores = allProducts.map((product) => {
      let score = 0;
      const matchDetails = {
        category: false,
        experience: false,
        budget: false,
        priority: 0,
        timeframe: false,
        support: false,
        userType: false,
        integration: false,
      };

      // Category match (40 points - most important)
      if (
        product.quizCategory &&
        product.quizCategory.includes(category)
      ) {
        score += 40;
        matchDetails.category = true;
      }

      // Experience level match (20 points)
      if (
        product.experienceLevel &&
        product.experienceLevel.includes(experience)
      ) {
        score += 20;
        matchDetails.experience = true;
      }

      // Budget match (20 points)
      if (
        product.budgetRange &&
        product.budgetRange.includes(budget)
      ) {
        score += 20;
        matchDetails.budget = true;
      }

      // Priority match (15 points - partial matching)
      if (product.priorities && priority && priority.length > 0) {
        const priorityMatches = priority.filter((p) =>
          product.priorities.includes(p)
        );
        const priorityScore = (priorityMatches.length / priority.length) * 15;
        score += priorityScore;
        matchDetails.priority = priorityMatches.length;
      }

      // Timeframe match (3 points)
      if (
        product.targetTimeframe &&
        product.targetTimeframe.includes(timeframe)
      ) {
        score += 3;
        matchDetails.timeframe = true;
      }

      // Support level match (2 points)
      if (
        product.supportLevel &&
        product.supportLevel.includes(support)
      ) {
        score += 2;
        matchDetails.support = true;
      }

      // User type match (5 points)
      if (
        product.userType &&
        product.userType.includes(userType)
      ) {
        score += 5;
        matchDetails.userType = true;
      }

      // Integration needs match (3 points)
      if (
        product.integrationNeeds &&
        product.integrationNeeds.includes(integration)
      ) {
        score += 3;
        matchDetails.integration = true;
      }

      return {
        ...product.toObject(),
        matchScore: Math.round(score),
        matchDetails,
      };
    });

    // Filter products with at least 30% match (30 points)
    const matchedProducts = productsWithScores.filter(
      (p) => p.matchScore >= 30
    );

    // Sort by match score (highest first)
    matchedProducts.sort((a, b) => b.matchScore - a.matchScore);

    // Limit to top 10 results
    const topMatches = matchedProducts.slice(0, 10);

    console.log(`✅ Found ${topMatches.length} matching products`);

    res.json({
      success: true,
      count: topMatches.length,
      posts: topMatches,
    });
  } catch (err) {
    console.error("❌ Quiz match error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to find matching products",
      posts: []
    });
  }
};