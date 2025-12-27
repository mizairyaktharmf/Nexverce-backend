import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    // BASIC
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },

    // SHORT PREVIEW TEXT
    excerpt: { type: String, default: "" },

    // CATEGORY & TAG
    category: { type: String, required: true },
    tag: { type: String },

    // HERO IMAGE
    image: { type: String, default: "" },

    // TELEGRAM LINK (for Telegram-tagged posts)
    telegramLink: { type: String },

    // BLOCK EDITOR CONTENT
    contentBlocks: {
      type: Array,
      default: [],
    },

    // READING TIME
    readingTime: { type: String, default: "" },

    // TYPE
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
