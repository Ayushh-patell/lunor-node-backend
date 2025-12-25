// routes/sendEmail.js
// URL: BACKEND_URL/sendEmail

const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

// Allowed origins for CORS (same list as your code)
const allowedOrigins = ["http://localhost:3000", "https://your-production-domain.com"];

router.post("/sendEmail", async (req, res) => {
  try {
    // Optional: simple origin check (keeps backward behavior without adding features)
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ message: "Origin not allowed" });
    }

    // Parse incoming JSON data
    const { to, subject, message, name, order } = req.body;

    // Validate input fields
    if (!to || !subject || !message || !name || !order) {
      return res.status(400).json({
        message: "Required data not found",
        data: { to, subject, message, name, order }
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.dreamhost.com",
      port: 465, // Port for secure SSL/TLS
      secure: true, // Use SSL/TLS
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });

    // Verify SMTP connection
    transporter.verify((error, success) => {
      if (error) {
        console.log("Error connecting to SMTP server:", error);
      } else {
        console.log("SMTP server is ready to send emails:", success);
      }
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #01BEFE; text-align: center;">Order Update</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We wanted to update you regarding your order:</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #ffffff; border: 1px solid #ccc; border-radius: 5px;">
          <p style="margin: 5px 0;">${order}</p>
        </div>
        <p>${message}</p>
        <p style="margin-top: 20px; font-style: italic;">Thank you for ordering with us!</p>
        <p style="margin-top: 20px; text-align: center; font-size: 0.9em; color: #888;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;

    // Configure the email options
    const mailOptions = {
      from: process.env.EMAIL,
      to,
      subject,
      text: `Hi ${name},\n\nYour order: ${order}\n\n${message}\n\nThank you for ordering!`,
      html: htmlContent
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "Email sent successfully", info });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error sending email", error: error.message });
  }
});

module.exports = router;
