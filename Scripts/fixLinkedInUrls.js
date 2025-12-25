/**
 * Script to fix LinkedIn post URLs in database
 * Updates old /post/{id} format to new /blog/{slug} format
 *
 * Run with: node Scripts/fixLinkedInUrls.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import SocialPost from "../Models/SocialPost.js";
import Blog from "../Models/BlogModel.js";
import Product from "../Models/ProductModel.js";
import LandingPage from "../Models/LandingPageModel.js";

dotenv.config();

const fixLinkedInUrls = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all LinkedIn posts
    const socialPosts = await SocialPost.find({ platform: "linkedin" })
      .populate("nexvercePostId");

    console.log(`\n📊 Found ${socialPosts.length} LinkedIn posts to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const socialPost of socialPosts) {
      try {
        const postType = socialPost.nexvercePostType;
        const nexvercePost = socialPost.nexvercePostId;

        if (!nexvercePost) {
          console.log(`⚠️  Skipped: Original post not found for ${socialPost._id}`);
          skippedCount++;
          continue;
        }

        const clientBaseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "https://www.nexverce.com";
        let newUrl;

        // Build correct URL based on post type
        if (postType === "blog") {
          if (!nexvercePost.slug) {
            console.log(`⚠️  Skipped: Blog has no slug ${socialPost._id}`);
            skippedCount++;
            continue;
          }
          newUrl = `${clientBaseUrl}/blog/${nexvercePost.slug}?utm_source=linkedin&utm_medium=social&utm_campaign=linkedin_autopost`;
        } else if (postType === "product") {
          newUrl = `${clientBaseUrl}/post/${nexvercePost._id}?utm_source=linkedin&utm_medium=social&utm_campaign=linkedin_autopost`;
        } else if (postType === "landingpage") {
          if (!nexvercePost.slug) {
            console.log(`⚠️  Skipped: Landing page has no slug ${socialPost._id}`);
            skippedCount++;
            continue;
          }
          newUrl = `${clientBaseUrl}/lp/${nexvercePost.slug}?utm_source=linkedin&utm_medium=social&utm_campaign=linkedin_autopost`;
        } else {
          console.log(`⚠️  Skipped: Unknown post type ${postType}`);
          skippedCount++;
          continue;
        }

        // Update both targetUrl and linkedinPostUrl
        socialPost.targetUrl = newUrl;
        socialPost.linkedinPostUrl = newUrl;
        await socialPost.save();

        console.log(`✅ Updated: ${nexvercePost.title?.substring(0, 50)}...`);
        console.log(`   Old: ${socialPost.linkedinPostUrl || 'N/A'}`);
        console.log(`   New: ${newUrl}\n`);

        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${socialPost._id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total: ${socialPosts.length}`);
    console.log("=".repeat(60) + "\n");

    // Close connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
};

// Run the script
fixLinkedInUrls();
