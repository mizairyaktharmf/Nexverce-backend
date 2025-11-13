import dotenv from "dotenv";
dotenv.config();

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMail = async (email, code) => {
  try {
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
  } catch (err) {
    console.error("❌ Resend Email Sending Failed:", err);
  }
};
