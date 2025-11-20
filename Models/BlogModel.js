import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    // BASIC
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },

    // SHORT PREVIEW
    excerpt: { type: String, default: "" },

    // CATEGORY & TAGS
    category: { type: String, required: true },
    tags: {
      type: [String],
      default: [],
    },

    // MAIN HERO IMAGE
    featuredImage: { type: String, default: "" },

    // BLOCK EDITOR CONTENT
    contentBlocks: {
      type: Array,
      default: [],
    },

    // TYPE FLAG
    type: {
      type: String,
      enum: ["blog"],
      default: "blog",
    },

    // STATUS
    status: {
      type: String,
      enum: ["draft", "published", "scheduled"],
      default: "draft",
    },

    // SCHEDULED TIME
    scheduledAt: { type: Date },

    // ANALYTICS
    views: { type: Number, default: 0 },
    viewedCountries: { type: [String], default: [] },

    // SEO FIELDS
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    metaKeywords: { type: [String], default: [] },

    // AUTHOR INFO
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
