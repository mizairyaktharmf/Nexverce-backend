import Blog from "../Models/BlogModel.js";
import { createNotification } from "./NotificationController.js";

/* -------------------------------------------------------
   HELPER: GENERATE UNIQUE SLUG
------------------------------------------------------- */
const generateSlug = async (title) => {
  let base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = base;
  let counter = 1;

  while (await Blog.findOne({ slug })) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
};

/* -------------------------------------------------------
   CREATE BLOG
------------------------------------------------------- */
export const createBlog = async (req, res) => {
  try {
    const data = req.body;

    if (!data.title || !data.category)
      return res.status(400).json({ error: "Title and category are required" });

    // parse editor blocks
    let { contentBlocks } = data;
    if (typeof contentBlocks === "string") {
      try {
        contentBlocks = JSON.parse(contentBlocks);
      } catch {
        contentBlocks = [];
      }
    }
    if (!Array.isArray(contentBlocks)) contentBlocks = [];

    // generate slug
    const slug = await generateSlug(data.title);

    const blog = await Blog.create({
      ...data,
      contentBlocks,
      slug,
      image: data.image || data.featuredImage || "",
      createdBy: req.user._id,
    });

    await createNotification({
      message: `New blog created`,
      type: blog.status,
      performedBy: req.user,
      target: {
        id: blog._id,
        title: blog.title,
        model: "Blog",
      },
    });

    res.status(201).json(blog);
  } catch (err) {
    console.error("Create Blog Error:", err);
    res.status(500).json({ error: "Failed to create blog" });
  }
};

/* -------------------------------------------------------
   GET ALL BLOGS
------------------------------------------------------- */
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
};

/* -------------------------------------------------------
   GET SINGLE BLOG BY ID
------------------------------------------------------- */
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blog" });
  }
};

/* -------------------------------------------------------
   UPDATE BLOG
------------------------------------------------------- */
export const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    // allow staff to edit only their own
    if (
      req.user.role === "staff" &&
      blog.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not allowed to edit this blog" });
    }

    let { contentBlocks, ...rest } = req.body;

    // block parsing
    if (typeof contentBlocks === "string") {
      try {
        contentBlocks = JSON.parse(contentBlocks);
      } catch {
        contentBlocks = [];
      }
    }
    if (!Array.isArray(contentBlocks)) contentBlocks = [];

    // regenerate slug only if: title changed AND no custom slug provided
    if (rest.title && !rest.slug) {
      rest.slug = await generateSlug(rest.title);
    }

    // save update user
    rest.updatedBy = req.user._id;

    const updated = await Blog.findByIdAndUpdate(
      req.params.id,
      { ...rest, contentBlocks },
      { new: true }
    );

    await createNotification({
      message: `Blog updated`,
      type: "update",
      performedBy: req.user,
      target: {
        id: updated._id,
        title: updated.title,
        model: "Blog",
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update Blog Error:", err);
    res.status(500).json({ error: "Failed to update blog" });
  }
};

/* -------------------------------------------------------
   DELETE BLOG
------------------------------------------------------- */
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    // allow staff to delete only their own
    if (
      req.user.role === "staff" &&
      blog.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not allowed to delete this blog" });
    }

    await blog.deleteOne();

    await createNotification({
      message: `Blog deleted`,
      type: "delete",
      performedBy: req.user,
      target: {
        id: blog._id,
        title: blog.title,
        model: "Blog",
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete Blog Error:", err);
    res.status(500).json({ error: "Failed to delete blog" });
  }
};

/* -------------------------------------------------------
   CHANGE BLOG STATUS (PUBLISH / DRAFT)
------------------------------------------------------- */
export const changeBlogStatus = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    if (
      req.user.role === "staff" &&
      blog.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not allowed to change status" });
    }

    blog.status =
      blog.status === "published" ? "draft" : "published";

    blog.updatedBy = req.user._id;

    await blog.save();

    await createNotification({
      message: `Blog marked as ${blog.status}`,
      type: blog.status,
      performedBy: req.user,
      target: {
        id: blog._id,
        title: blog.title,
        model: "Blog",
      },
    });

    res.json(blog);
  } catch (err) {
    console.error("Change Blog Status Error:", err);
    res.status(500).json({ error: "Failed to change blog status" });
  }
};

/* -------------------------------------------------------
   SCHEDULE BLOG
------------------------------------------------------- */
export const scheduleBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    if (
      req.user.role === "staff" &&
      blog.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not allowed to schedule this blog" });
    }

    if (!req.body.scheduledAt)
      return res.status(400).json({ error: "scheduledAt is required" });

    blog.status = "scheduled";
    blog.scheduledAt = req.body.scheduledAt;
    blog.updatedBy = req.user._id;

    await blog.save();

    await createNotification({
      message: `Blog scheduled`,
      type: "scheduled",
      performedBy: req.user,
      target: {
        id: blog._id,
        title: blog.title,
        model: "Blog",
      },
    });

    res.json(blog);
  } catch (err) {
    console.error("Schedule Blog Error:", err);
    res.status(500).json({ error: "Failed to schedule blog" });
  }
};
