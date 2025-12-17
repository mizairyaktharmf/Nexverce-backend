import dotenv from "dotenv";
dotenv.config();

import { Resend } from "resend";

// Initialize Resend only if API key is available
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn("⚠️ RESEND_API_KEY not configured - email sending disabled");
}

export const sendMail = async (email, code) => {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.warn("⚠️ Email not sent - Resend API key not configured");
      return false;
    }

    await resend.emails.send({
      from: `Nexverce <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Verify your Nexverce account",
      html: `
        <div style="font-family:Arial;padding:20px;">
          <h2>Welcome to Nexverce 🚀</h2>
          <p>Your verification code is:</p>
          <h1 style="color:#3b82f6;letter-spacing:5px;">${code}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });

    console.log("📧 Verification email sent:", email);
    return true;
  } catch (err) {
    console.error("❌ Resend Email Sending Failed:", err);
    return false;
  }
};
