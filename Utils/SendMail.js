import nodemailer from "nodemailer";

export const sendMail = async (email, code) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const message = {
      from: `"Nexverce Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your Nexverce Account",
      html: `...`,
    };

    await transporter.sendMail(message);
    console.log(`📧 Verification email sent successfully to ${email}`);
  } catch (err) {
    console.error("❌ Email sending failed:", err);
  }
};
