import cron from "node-cron";
import SocialPost from "../Models/SocialPost.js";
import SocialAccount from "../Models/SocialAccount.js";
import { postToLinkedInNow } from "../Controllers/LinkedInPostController.js";

/**
 * LinkedIn Scheduled Post Processor
 * Runs every minute to check for scheduled posts that need to be posted
 */

let isRunning = false;

async function processScheduledPosts(io) {
  // Prevent overlapping executions
  if (isRunning) {
    console.log("⏭️ Skipping scheduled post processing - previous job still running");
    return;
  }

  isRunning = true;

  try {
    const now = new Date();

    // Find posts scheduled to be posted now or earlier
    const scheduledPosts = await SocialPost.find({
      platform: "linkedin",
      status: "scheduled",
      scheduledAt: { $lte: now },
    })
      .populate("socialAccountId")
      .sort({ scheduledAt: 1 }) // Oldest first
      .limit(10); // Process max 10 per run to avoid overwhelming the API

    if (scheduledPosts.length === 0) {
      return; // No posts to process
    }

    console.log(`📅 Processing ${scheduledPosts.length} scheduled LinkedIn posts...`);

    for (const post of scheduledPosts) {
      try {
        // Validate social account is still active
        if (!post.socialAccountId || !post.socialAccountId.isActive) {
          await post.markAsFailed("LinkedIn account is no longer active");
          console.log(`❌ Skipped post ${post._id} - inactive account`);
          continue;
        }

        // Mark as posting
        post.status = "posting";
        await post.save();

        // Post to LinkedIn
        console.log(`📤 Posting scheduled post: ${post.caption.substring(0, 50)}...`);
        await postToLinkedInNow(post, post.socialAccountId, io);

        console.log(`✅ Successfully posted scheduled post: ${post._id}`);
      } catch (error) {
        console.error(`❌ Failed to post scheduled post ${post._id}:`, error.message);
        // Error handling is done inside postToLinkedInNow
      }

      // Add small delay between posts to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`✅ Scheduled post processing complete`);
  } catch (error) {
    console.error("❌ Error in scheduled post processor:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the cron job
 * Runs every minute: "* * * * *"
 */
export function startScheduledPosterCron(io) {
  console.log("🕒 Starting LinkedIn scheduled post processor (runs every minute)");

  const job = cron.schedule("* * * * *", async () => {
    await processScheduledPosts(io);
  });

  // Run once immediately on startup to process any overdue posts
  setTimeout(() => {
    console.log("🚀 Running initial scheduled post check...");
    processScheduledPosts(io);
  }, 5000); // Wait 5 seconds after server starts

  return job;
}

/**
 * Manual trigger for scheduled post processing (for testing)
 */
export async function triggerScheduledPostProcessing(io) {
  console.log("🔧 Manually triggered scheduled post processing");
  return await processScheduledPosts(io);
}
