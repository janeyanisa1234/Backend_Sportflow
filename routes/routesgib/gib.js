import express from "express";
import jwt from "jsonwebtoken";
import {
  getAllPromotions,      // ดึงโปรโมชันทั้งหมด
  getPromotionById,      // ดึงโปรโมชันตาม ID
  addPromotion,          // เพิ่มโปรโมชันใหม่
  updatePromotion,       // อัปเดตโปรโมชัน
  deletePromotion,       // ลบโปรโมชัน
  getAllStadiums,        // ดึงรายการสนาม
  getAllSports,          // ดึงรายการกีฬา
} from "../../Database/dbgib/gib.js";

const router = express.Router();

// Middleware ตรวจสอบ JWT Token 
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]; // ดึง Header Authorization
  const token = authHeader && authHeader.split(" ")[1]; // แยก Token ออกมา
  if (!token) return res.status(401).json({ error: "Access denied" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => { // ตรวจสอบ Token
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user; // เก็บข้อมูลผู้ใช้ (เช่น userId)
    next();
  });
}

// API Endpoints

// GET /promotions: ดึงโปรโมชันทั้งหมด
router.get("/promotions", authenticateToken, async (req, res) => {
  const ownerId = req.user.userId; // ดึง userId จาก Token
  const promotions = await getAllPromotions(ownerId); // ดึงข้อมูลโปรโมชัน
  res.json(promotions); // ส่งกลับเป็น JSON
});

// ดึงโปรโมชันตาม ID
router.get("/promotions/:id", authenticateToken, async (req, res) => {
  const { id } = req.params; // ดึง ID จาก URL
  const ownerId = req.user.userId; // ดึง userId จาก Token
  const promotion = await getPromotionById(id); // ดึงข้อมูลโปรโมชัน
  if (promotion.owner_id !== ownerId) return res.status(403).json({ error: "Unauthorized" });
  res.json(promotion); // ส่งข้อมูลกลับ
});

// ดึงรายการสนาม
router.get("/stadiums", authenticateToken, async (req, res) => {
  const ownerId = req.user.userId; // ดึง userId จาก Token
  const stadiums = await getAllStadiums(ownerId); // ดึงข้อมูลสนาม
  res.json(stadiums); // ส่งกลับ
});

// ดึงรายการกีฬา
router.get("/sports", authenticateToken, async (req, res) => {
  const stadiumId = req.query.stadiumId; // ดึง stadiumId จาก Query
  const sports = await getAllSports(stadiumId); // ดึงข้อมูลกีฬา
  res.json(sports); // ส่งกลับ
});

// เพิ่มโปรโมชันใหม่
router.post("/promotions", authenticateToken, async (req, res) => {
  const newPromotion = { ...req.body, owner_id: req.user.userId }; // รับข้อมูล + เพิ่ม owner_id
  const result = await addPromotion(newPromotion); // บันทึกโปรโมชัน
  res.status(201).json(result); // ส่งข้อมูลที่เพิ่มกลับ
});

// อัปเดตโปรโมชัน
router.put("/promotions/:id", authenticateToken, async (req, res) => {
  const { id } = req.params; // ดึง ID จาก URL
  const ownerId = req.user.userId; // ดึง userId จาก Token
  const updatedPromotion = req.body; // รับข้อมูลใหม่
  const promotion = await getPromotionById(id); // ดึงข้อมูลเดิม
  if (promotion.owner_id !== ownerId) return res.status(403).json({ error: "Unauthorized" });
  const result = await updatePromotion(id, updatedPromotion); // อัปเดตข้อมูล
  res.json(result); // ส่งข้อมูลที่อัปเดตกลับ
});

// ลบโปรโมชัน
router.delete("/promotions/:id", authenticateToken, async (req, res) => {
  const { id } = req.params; // ดึง ID จาก URL
  const ownerId = req.user.userId; // ดึง userId จาก Token
  const promotion = await getPromotionById(id); // ดึงข้อมูลโปรโมชัน
  if (promotion.owner_id !== ownerId) return res.status(403).json({ error: "Unauthorized" });
  await deletePromotion(id); // ลบโปรโมชัน
  res.json({ success: true }); // ส่งผลลัพธ์สำเร็จ
});


export default router; 