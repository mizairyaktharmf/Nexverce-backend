import cron from "node-cron";
import SocialPost from "../Models/SocialPost.js";
import SocialAccount from "../Models/SocialAccount.js";
import { syncSinglePostAnalytics } from "../Controllers/LinkedInPostController.js";
import { refreshTokenIfNeeded } from "../Controllers/LinkedInController.js";

/**
 * LinkedIn Analytics Sync Job
 * Runs every 6 hours to sync analytics for all posted LinkedIn posts
 */

let isRunning = false;

async function syncAllLinkedInAnalytics() {
  // Prevent overlapping executions
  if (isRunning) {
    console.log("⏭️ Skipping analytics sync - previous job still running");
    return;
  }

  isRunning = true;

  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    // Find posted LinkedIn posts that haven't been synced in the last 6 hours
    const postsToSync = await SocialPost.find({
      platform: "linkedin",
      status: "posted",
      linkedinPostId: { $exists: true, $ne: null },
      $or: [
        { "analytics.lastSyncedAt": { $exists: false } },
        { "analytics.lastSyncedAt": { $lte: sixHoursAgo } },
        { "analytics.lastSyncedAt": null },
      ],
    })
      .populate("socialAccountId")
      .sort({ postedAt: -1 }) // Newest first
      .limit(50); // Process max 50 per run

    if (postsToSync.length === 0) {
      console.log("📊 No LinkedIn posts need analytics sync");
      return;
    }

    console.log(`📊 Syncing analytics for ${postsToSync.length} LinkedIn posts...`);

    let successCount = 0;
    let failCount = 0;

    for (const post of postsToSync) {
      try {
        // Validate social account
        if (!post.socialAccountId || !post.socialAccountId.isActive) {
          console.log(`⏭️ Skipped post ${post._id} - inactive account`);
          failCount++;
          continue;
        }

        // Refresh token if needed
        await refreshTokenIfNeeded(post.socialAccountId);

        // Sync analytics
        const success = await syncSinglePostAnalytics(post, post.socialAccountId);

        if (success) {
          successCount++;
          console.log(`✅ Synced analytics for post: ${post._id}`);
        } else {
          failCount++;
        }

        // Add small delay between API calls to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to sync analytics for post ${post._id}:`, error.message);
        failCount++;
      }
    }

    console.log(`✅ Analytics sync complete: ${successCount} succeeded, ${failCount} failed`);
  } catch (error) {
    console.error("❌ Error in analytics sync job:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the cron job
 * Runs every 6 hours: "0 */6 * * *" (at minute 0 of every 6th hour)
 */
export function startAnalyticsSyncCron() {
  console.log("🕒 Starting LinkedIn analytics sync job (runs every 6 hours)");

  const job = cron.schedule("0 */6 * * *", async () => {
    await syncAllLinkedInAnalytics();
  });

  // Run once 10 minutes after startup
  setTimeout(() => {
    console.log("🚀 Running initial analytics sync...");
    syncAllLinkedInAnalytics();
  }, 10 * 60 * 1000);

  return job;
}

/**
 * Manual trigger for analytics sync (for testing)
 */
export async function triggerAnalyticsSync() {
  console.log("🔧 Manually triggered analytics sync");
  return await syncAllLinkedInAnalytics();
}
