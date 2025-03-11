import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import dbice from '../../Database/dbice/ice.js';
import crypto from "crypto";
import nodemailer from "nodemailer";
import dbKong from '../../Database/dbkong/kong.js';
dotenv.config();
const router = express.Router();

// Middleware ตรวจสอบ JWT
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ message: "Access Denied" });

  try {
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

// ดึงข้อมูลผู้ใช้จาก Supabase
router.get("/user", authenticateToken, async (req, res) => {
  try {
    const user = await dbice.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

router.get("/owner", authenticateToken, async (req, res) => {
    try {
      const user = await dbice.getOwnerById(req.user.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  });

  router.get("/user", authenticateToken, async (req, res) => {
    try {
      const user = await dbice.getUserById(req.user.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  });

  // Change password after login endpoint
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Check if passwords match
    if (!confirmPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation password do not match' });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get user
    const { data: user, error } = await dbKong.getUserById(userId);
    
    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password
    await dbKong.updateUserPassword(userId, hashedPassword);

    res.json({ message: 'Password has been changed successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Send reset password email after login
router.post('/send-reset-password-email', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const email = req.user.email;

    // Generate reset token (random bytes converted to hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Delete any existing tokens for this user
    await dbKong.deleteExistingResetTokens(userId);

    // Insert new token
    await dbKong.createPasswordResetToken(userId, resetToken, resetTokenExpiry);

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/Info/Infochange/EmailInput/ChangePassword?token=${resetToken}`;

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'รีเซ็ตรหัสผ่านของคุณ',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>รีเซ็ตรหัสผ่าน</h2>
          <p>คุณได้ร้องขอการรีเซ็ตรหัสผ่าน คลิกที่ลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; margin: 20px 0; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">รีเซ็ตรหัสผ่าน</a>
          <p>ลิงก์นี้จะหมดอายุในอีก 30 นาที</p>
          <p>หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่าน โปรดละเลยอีเมลนี้</p>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ message: 'Password reset link has been sent to your email' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

router.post('/changepassword', authenticateToken, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Check if passwords match
    if (!confirmPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation password do not match' });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get user
    const { data: user, error } = await dbKong.getUserById(userId);
    
    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password
    await dbKong.updateUserPassword(userId, hashedPassword);

    res.json({ message: 'Password has been changed successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Send reset password email after login
router.post('/send-reset', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const email = req.user.email;

    // Generate reset token (random bytes converted to hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Delete any existing tokens for this user
    await dbKong.deleteExistingResetTokens(userId);

    // Insert new token
    await dbKong.createPasswordResetToken(userId, resetToken, resetTokenExpiry);

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/ownerProfile/Email/ChangePass?token=${resetToken}`;

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'รีเซ็ตรหัสผ่านของคุณ',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>รีเซ็ตรหัสผ่าน</h2>
          <p>คุณได้ร้องขอการรีเซ็ตรหัสผ่าน คลิกที่ลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; margin: 20px 0; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">รีเซ็ตรหัสผ่าน</a>
          <p>ลิงก์นี้จะหมดอายุในอีก 30 นาที</p>
          <p>หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่าน โปรดละเลยอีเมลนี้</p>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ message: 'Password reset link has been sent to your email' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

router.put('/update-name', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;  // รับ ID ของผู้ใช้จาก JWT
    const { newName } = req.body;  // รับค่าชื่อใหม่จาก Request

    if (!newName) {
      return res.status(400).json({ error: "New name is required" });
    }

    // อัปเดตชื่อในฐานข้อมูล
    const { error } = await dbice.updateUserName(userId, newName);
    
    if (error) {
      return res.status(500).json({ error: "Failed to update name" });
    }

    res.json({ message: "Name updated successfully" });
  } catch (error) {
    console.error("Error updating name:", error);
    res.status(500).json({ error: "Server error" });
  }
});



export default router;
