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
import jwt from "jsonwebtoken"; // เพิ่มการ import jwt

const router = express.Router();

// JWT middleware (ย้ายมาจาก kong.js)
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

router.get("/promotions", authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.userId; // ดึง ownerId จาก token
    const promotions = await getAllPromotions(ownerId);
    res.json(promotions);
  } catch (error) {
    console.error("Error fetching promotions:", error);
    res.status(500).json({ error: "Failed to fetch promotions: " + error.message });
  }
});

router.get("/stadiums", authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.userId; // ดึง ownerId จาก token
    const stadiums = await getAllStadiums(ownerId);
    res.json(stadiums);
  } catch (error) {
    console.error("Error fetching stadiums:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/promotions/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId; // ดึง ownerId จาก token แทน query
    if (!id) return res.status(400).json({ error: "ID is required" });
    const promotion = await getPromotionById(id);
    if (!promotion) return res.status(404).json({ error: "Promotion not found" });
    if (promotion.owner_id !== ownerId) {
      return res.status(403).json({ error: "Unauthorized access to this promotion" });
    }
    res.json(promotion);
  } catch (error) {
    console.error("Error fetching promotion:", error);
    res.status(500).json({ error: "Failed to fetch promotion: " + error.message });
  }
});

// routes อื่น ๆ เพิ่ม authenticateToken เพื่อความปลอดภัย
router.post("/promotions", authenticateToken, async (req, res) => {
  try {
    const newPromotion = { ...req.body, owner_id: req.user.userId }; // เพิ่ม owner_id จาก token
    const result = await addPromotion(newPromotion);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error adding promotion:", error);
    res.status(400).json({ error: error.message });
  }
});

router.put("/promotions/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId;
    const updatedPromotion = req.body;
    const promotion = await getPromotionById(id);
    if (!promotion) return res.status(404).json({ error: "Promotion not found" });
    if (promotion.owner_id !== ownerId) {
      return res.status(403).json({ error: "Unauthorized access to this promotion" });
    }
    const result = await updatePromotion(id, updatedPromotion);
    if (!result) return res.status(404).json({ error: "Promotion not found" });
    res.json(result);
  } catch (error) {
    console.error("Error updating promotion:", error);
    res.status(500).json({ error: "Failed to update promotion: " + error.message });
  }
});

router.delete("/promotions/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId;
    const promotion = await getPromotionById(id);
    if (!promotion) return res.status(404).json({ error: "Promotion not found" });
    if (promotion.owner_id !== ownerId) {
      return res.status(403).json({ error: "Unauthorized access to this promotion" });
    }
    const success = await deletePromotion(id);
    if (!success) return res.status(404).json({ error: "Promotion not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    res.status(500).json({ error: "Failed to delete promotion" });
  }
});

router.get("/sports", authenticateToken, async (req, res) => {
  try {
    const stadiumId = req.query.stadiumId;
    const sports = await getAllSports(stadiumId);
    res.json(sports);
  } catch (error) {
    console.error("Error fetching sports:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;