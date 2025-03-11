import express from "express";
import {
  getAllPromotions,
  getPromotionById,
  addPromotion,
  updatePromotionStatus,
  deletePromotion,
  getAllSports,
  getAllStadiums,
  updatePromotion,
} from "../../Database/dbgib/gib.js";
import jwt from "jsonwebtoken"; // import JWT สำหรับการตรวจสอบ token

const router = express.Router(); // สร้าง router instance

// Middleware สำหรับตรวจสอบ JWT
function authenticateToken(req, res, next) { // ตรวจสอบ token
  const authHeader = req.headers["authorization"]; // ดึง header Authorization
  const token = authHeader && authHeader.split(" ")[1]; // แยก token ออกจาก "Bearer"

  if (!token) return res.status(401).json({ error: "Access denied" }); // ถ้าไม่มี token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => { // ตรวจสอบ token
    if (err) return res.status(403).json({ error: "Invalid or expired token" }); // ถ้า token ไม่ถูกต้อง
    req.user = user; // เก็บข้อมูล user ใน request
    next(); // ดำเนินการต่อ
  });
}

// Routes สำหรับโปรโมชัน
router.get("/promotions", authenticateToken, async (req, res) => { // ดึงโปรโมชันทั้งหมด
  try {
    const ownerId = req.user.userId; // ดึง ownerId จาก token
    const promotions = await getAllPromotions(ownerId); // ดึงข้อมูลโปรโมชัน
    res.json(promotions); // ส่งข้อมูลกลับ
  } catch (error) {
    console.error("Error fetching promotions:", error); 
    res.status(500).json({ error: "Failed to fetch promotions: " + error.message }); 
  }
});

router.get("/promotions/:id", authenticateToken, async (req, res) => { // ดึงโปรโมชันตาม ID
  try {
    const { id } = req.params; // ดึง ID จากพารามิเตอร์
    const ownerId = req.user.userId; // ดึง ownerId จาก token
    if (!id) return res.status(400).json({ error: "ID is required" }); // ตรวจสอบ ID

    const promotion = await getPromotionById(id); // ดึงข้อมูลโปรโมชัน
    if (!promotion) return res.status(404).json({ error: "Promotion not found" }); // ถ้าไม่พบ
    if (promotion.owner_id !== ownerId) { // ตรวจสอบสิทธิ์
      return res.status(403).json({ error: "Unauthorized access to this promotion" });
    }
    res.json(promotion); // ส่งข้อมูลกลับ
  } catch (error) {
    console.error("Error fetching promotion:", error); 
    res.status(500).json({ error: "Failed to fetch promotion: " + error.message }); 
  }
});

router.post("/promotions", authenticateToken, async (req, res) => { // เพิ่มโปรโมชันใหม่
  try {
    const newPromotion = { ...req.body, owner_id: req.user.userId }; // เพิ่ม owner_id จาก token
    const result = await addPromotion(newPromotion); // บันทึกโปรโมชัน
    res.status(201).json(result); // ส่งข้อมูลที่เพิ่มกลับ
  } catch (error) {
    console.error("Error adding promotion:", error); 
    res.status(400).json({ error: error.message }); 
  }
});

router.put("/promotions/:id", authenticateToken, async (req, res) => { // อัปเดตโปรโมชัน
  try {
    const { id } = req.params; // ดึง ID จากพารามิเตอร์
    const ownerId = req.user.userId; // ดึง ownerId จาก token
    const updatedPromotion = req.body; // ข้อมูลที่อัปเดต

    const promotion = await getPromotionById(id); // ดึงข้อมูลโปรโมชัน
    if (!promotion) return res.status(404).json({ error: "Promotion not found" }); // ถ้าไม่พบ
    if (promotion.owner_id !== ownerId) { // ตรวจสอบสิทธิ์
      return res.status(403).json({ error: "Unauthorized access to this promotion" });
    }

    const result = await updatePromotion(id, updatedPromotion); // อัปเดตโปรโมชัน
    if (!result) return res.status(404).json({ error: "Promotion not found" }); // ถ้าไม่พบ
    res.json(result); // ส่งข้อมูลที่อัปเดตกลับ
  } catch (error) {
    console.error("Error updating promotion:", error); 
    res.status(500).json({ error: "Failed to update promotion: " + error.message }); 
  }
});

router.delete("/promotions/:id", authenticateToken, async (req, res) => { // ลบโปรโมชัน
  try {
    const { id } = req.params; // ดึง ID จากพารามิเตอร์
    const ownerId = req.user.userId; // ดึง ownerId จาก token

    const promotion = await getPromotionById(id); // ดึงข้อมูลโปรโมชัน
    if (!promotion) return res.status(404).json({ error: "Promotion not found" }); // ถ้าไม่พบ
    if (promotion.owner_id !== ownerId) { // ตรวจสอบสิทธิ์
      return res.status(403).json({ error: "Unauthorized access to this promotion" });
    }

    const success = await deletePromotion(id); // ลบโปรโมชัน
    if (!success) return res.status(404).json({ error: "Promotion not found" }); // ถ้าไม่สำเร็จ
    res.json({ success: true }); // ส่งผลลัพธ์สำเร็จ
  } catch (error) {
    console.error("Error deleting promotion:", error); 
    res.status(500).json({ error: "Failed to delete promotion" }); 
  }
});

// Routes สำหรับข้อมูลอื่นๆ
router.get("/stadiums", authenticateToken, async (req, res) => { // ดึงสนามทั้งหมด
  try {
    const ownerId = req.user.userId; // ดึง ownerId จาก token
    const stadiums = await getAllStadiums(ownerId); // ดึงข้อมูลสนาม
    res.json(stadiums); // ส่งข้อมูลกลับ
  } catch (error) {
    console.error("Error fetching stadiums:", error); 
    res.status(500).json({ error: error.message }); 
  }
});

router.get("/sports", authenticateToken, async (req, res) => { // ดึงกีฬาทั้งหมด
  try {
    const stadiumId = req.query.stadiumId; // ดึง stadiumId จาก query
    const sports = await getAllSports(stadiumId); // ดึงข้อมูลกีฬา
    res.json(sports); // ส่งข้อมูลกลับ
  } catch (error) {
    console.error("Error fetching sports:", error); 
    res.status(500).json({ error: error.message }); 
  }
});

export default router; // ส่งออก router