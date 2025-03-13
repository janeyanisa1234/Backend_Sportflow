import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import dbKong from '../../Database/dbkong/kong.js';
import DB from '../../Database/db.js';

const router = express.Router();

// Configure multer for file uploads (keeping this as it might be needed elsewhere)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Normal user registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }

    // Validate phone number (Thai format)
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นเบอร์โทรศัพท์ไทย 10 หลัก)' });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร' });
    }

    // Check if user already exists
    const { data: existingUser } = await dbKong.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'มีผู้ใช้อีเมลนี้แล้ว' });
    }

    // Create new user
    const { data: newUser, error: userError } = await dbKong.createUser({
      name,
      email,
      phone,
      password
    });

    if (userError) {
      return res.status(500).json({ error: 'การลงทะเบียนล้มเหลว กรุณาลองอีกครั้ง' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUser[0].id,
        email: newUser[0].email,
        isOwner: false,
        isAdmin: false
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send response
    res.status(201).json({
      message: 'ลงทะเบียนสำเร็จ',
      token,
      user: {
        id: newUser[0].id,
        name: newUser[0].name,
        email: newUser[0].email,
        phone: newUser[0].phone,
        isOwner: false,
        isAdmin: false
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์' });
  }
});

// Keep your existing owner registration endpoint
router.post('/register-owner', upload.fields([
  { name: 'idCardImage', maxCount: 1 },
  { name: 'bankBookImage', maxCount: 1 }
]), async (req, res) => {
  // ... existing owner registration code ...
});

// Keep your existing login endpoint
router.post('/login', async (req, res) => {
  // ... existing login code ...
});

// Keep your existing forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  // ... existing forgot password code ...
});

// Keep your existing reset password endpoint
router.post('/reset-password', async (req, res) => {
  // ... existing reset password code ...
});

// Keep your existing profile endpoint
router.get('/profile', authenticateToken, async (req, res) => {
  // ... existing profile code ...
});

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Admin route and middleware
router.get('/admin/dashboard', authenticateToken, authorizeAdmin, (req, res) => {
  res.json({ message: 'Admin dashboard access granted', adminId: req.user.userId });
});

function authorizeAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

// Multer error handler
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: 'Unexpected field in file upload', 
        details: `Expected fields: identity_card_image, bank_acc_image. Got: ${err.field}` 
      });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  next(err);
};

export default router;