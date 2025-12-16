import cron from "node-cron";
import SocialAccount from "../Models/SocialAccount.js";
import { refreshTokenIfNeeded } from "../Controllers/LinkedInController.js";

/**
 * LinkedIn Token Refresh Job
 * Runs daily to proactively refresh tokens that are expiring soon
 */

let isRunning = false;

async function refreshExpiringTokens() {
  // Prevent overlapping executions
  if (isRunning) {
    console.log("⏭️ Skipping token refresh - previous job still running");
    return;
  }

  isRunning = true;

  try {
    // Find all active LinkedIn accounts that need token refresh
    const accounts = await SocialAccount.find({
      platform: "linkedin",
      isActive: true,
      refreshToken: { $exists: true, $ne: null },
    });

    if (accounts.length === 0) {
      console.log("🔐 No LinkedIn accounts to refresh");
      return;
    }

    console.log(`🔐 Checking ${accounts.length} LinkedIn accounts for token refresh...`);

    let refreshedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const account of accounts) {
      try {
        // Check if token needs refresh (expires in < 24 hours)
        if (!account.needsRefresh()) {
          skippedCount++;
          continue;
        }

        console.log(`🔄 Refreshing token for: ${account.accountEmail}`);

        // Refresh token
        await refreshTokenIfNeeded(account);

        refreshedCount++;
        console.log(`✅ Token refreshed for: ${account.accountEmail}`);

        // Add small delay between API calls
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to refresh token for ${account.accountEmail}:`, error.message);
        failedCount++;

        // If refresh fails multiple times, mark account as inactive
        if (account.errorCount >= 5) {
          account.isActive = false;
          await account.save();
          console.log(`⚠️ Marked account as inactive after ${account.errorCount} failures: ${account.accountEmail}`);
        }
      }
    }

    console.log(
      `✅ Token refresh complete: ${refreshedCount} refreshed, ${skippedCount} skipped, ${failedCount} failed`
    );
  } catch (error) {
    console.error("❌ Error in token refresh job:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the cron job
 * Runs daily at 3 AM: "0 3 * * *"
 */
export function startTokenRefresherCron() {
  console.log("🕒 Starting LinkedIn token refresh job (runs daily at 3 AM)");

  const job = cron.schedule("0 3 * * *", async () => {
    await refreshExpiringTokens();
  });

  // Run once 15 minutes after startup
  setTimeout(() => {
    console.log("🚀 Running initial token refresh check...");
    refreshExpiringTokens();
  }, 15 * 60 * 1000);

  return job;
}

/**
 * Manual trigger for token refresh (for testing)
 */
export async function triggerTokenRefresh() {
  console.log("🔧 Manually triggered token refresh");
  return await refreshExpiringTokens();
}
