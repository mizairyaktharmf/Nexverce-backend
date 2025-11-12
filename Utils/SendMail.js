import nodemailer from "nodemailer";

export const sendMail = async (email, code) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // add in .env
        pass: process.env.EMAIL_PASS  // add in .env
      }
    });

    const message = {
      from: `"Nexverce Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your Nexverce account",
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;">
          <h2>Welcome to Nexverce 🚀</h2>
          <p>Use the following verification code to activate your account:</p>
          <h3 style="color:#3b82f6;letter-spacing:3px;">${code}</h3>
          <p>This code expires in 10 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(message);
    console.log(`📧 Verification email sent to ${email}`);
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
  }
};
