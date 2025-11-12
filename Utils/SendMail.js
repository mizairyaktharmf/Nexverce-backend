import nodemailer from "nodemailer";

export const sendMail = async (email, code) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const message = {
      from: `"Nexverce Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your Nexverce Account",
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;background:#f9fafb;border-radius:10px;">
          <h2 style="color:#111827;">Welcome to <span style="color:#3b82f6;">Nexverce</span> 🚀</h2>
          <p style="font-size:15px;color:#334155;">Use the verification code below to activate your account:</p>
          <h1 style="color:#3b82f6;text-align:center;letter-spacing:5px;">${code}</h1>
          <p style="font-size:13px;color:#64748b;">This code will expire in <strong>10 minutes</strong>.</p>
        </div>
      `,
    };

    await transporter.sendMail(message);
    console.log(`📧 Verification email sent successfully to ${email}`);
  } catch (err) {
    console.error("❌ Email sending failed:", err);
  }
};
