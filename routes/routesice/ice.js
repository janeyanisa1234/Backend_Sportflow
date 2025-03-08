import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import dbice from '../../Database/dbice/ice.js';

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
export default router;
