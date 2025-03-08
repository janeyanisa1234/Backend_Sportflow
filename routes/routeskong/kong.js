import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dbKong from '../../Database/dbkong/kong.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Kong API is working');
});

// Registration endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    
    // Validate input
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const { data: existingUser } = await dbKong.findUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Insert user into database
    const { data: newUser } = await dbKong.createUser({ name, email, phone, password });

    // Create JWT token
    const token = jwt.sign(
      { userId: newUser[0].id, email: newUser[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: {
        id: newUser[0].id,
        name: newUser[0].name,
        email: newUser[0].email
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Owner registration endpoint
router.post('/register-owner', async (req, res) => {
  try {
    const { name, email, phone, password, identity_card, bank_name, bank_acc_id } = req.body;

    if (!name || !email || !phone || !password || !identity_card || !bank_name || !bank_acc_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const { data: existingUser } = await dbKong.findUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    // Create user
    const { data: newUser } = await dbKong.createUser({ name, email, phone, password });
    const userId = newUser[0].id;

    // Create owner
    await dbKong.createOwner({ 
      user_id: userId, 
      identity_card, 
      bank_name, 
      bank_acc_id 
    });

    res.status(201).json({ message: 'Owner registered successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});
// Login endpoint with owner and admin check
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Try to find user in users table
    const { data: user, error: userError } = await dbKong.findUserByEmail(email);
    
    // Try to find admin in admins table
    const { data: admin, error: adminError } = await dbKong.findAdminByEmail(email);
    
    // Log the results for debugging
    console.log('User lookup:', { user, userError });
    console.log('Admin lookup:', { admin, adminError });
    
    // If neither exists, return invalid credentials
    if (!user && !admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Handle potential errors first
    if (userError && userError.code !== 'PGRST116' || adminError && adminError.code !== 'PGRST116') {
      console.error('Database error:', userError || adminError);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    
    // Handle admin login
    if (admin) {
      // Compare admin password
      const adminPasswordMatch = await bcrypt.compare(password, admin.password);
      if (!adminPasswordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Create JWT token for admin
      const token = jwt.sign(
        { 
          userId: admin.id, 
          email: admin.email,
          isOwner: false,
          isAdmin: true
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({ 
        message: 'Admin login successful',
        token,
        user: {
          id: admin.id,
          name: admin.name || admin.username || 'Admin',
          email: admin.email,
          isOwner: false,
          isAdmin: true
        }
      });
    }
    
    // Regular user login flow - we know user exists from earlier check
    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is an owner
    const { data: ownerData } = await dbKong.findOwnerByUserId(user.id);
    const isOwner = ownerData ? true : false;

    // Create JWT token with role information
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        isOwner: isOwner,
        isAdmin: false
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isOwner: isOwner,
        isAdmin: false
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Forgot Password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const { data: user } = await dbKong.findUserByEmail(email);

    // If no user found, don't reveal this for security (still return success)
    if (!user) {
      return res.json({ message: 'If this email exists in our system, a reset link has been sent' });
    }

    // Generate reset token (random bytes converted to hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Delete any existing tokens for this user
    await dbKong.deleteExistingResetTokens(user.id);

    // Insert new token
    await dbKong.createPasswordResetToken(user.id, resetToken, resetTokenExpiry);

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/Login/reset-password?token=${resetToken}`;

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
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

    res.json({ message: 'If this email exists in our system, a reset link has been sent' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Reset Password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate input
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Find token
    const { data: resetData, error: resetError } = await dbKong.findResetToken(token);

    if (resetError || !resetData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token has expired
    const expiryDate = new Date(resetData.expires_at);
    if (expiryDate < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password
    await dbKong.updateUserPassword(resetData.user_id, hashedPassword);

    // Delete the used token
    await dbKong.deleteResetToken(token);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Protected route
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await dbKong.getUserProfile(req.user.userId);

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is owner
    const { data: ownerData } = await dbKong.findOwnerByUserId(req.user.userId);
    const isOwner = ownerData ? true : false;

    res.json({ 
      user: {
        ...user,
        isOwner: isOwner
      } 
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
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
// Add a protected admin route to verify admin access
router.get('/admin/dashboard', authenticateToken, authorizeAdmin, (req, res) => {
  res.json({ message: 'Admin dashboard access granted', adminId: req.user.userId });
});

// Admin authorization middleware
function authorizeAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}
export default router;