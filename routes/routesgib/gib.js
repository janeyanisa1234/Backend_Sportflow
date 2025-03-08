import express from "express";
import {
  getAllPromotions,
  getPromotionById, // เพิ่มฟังก์ชันนี้
  addPromotion,
  updatePromotionStatus,
  deletePromotion,
  getAllSports,
  getAllStadiums,
  updatePromotion,
} from "../../Database/dbgib/gib.js";

const router = express.Router();

router.get("/promotions", async (req, res) => {
  try {
    const promotions = await getAllPromotions();
    res.json(promotions);
  } catch (error) {
    console.error("Error fetching promotions:", error);
    res.status(500).json({ error: "Failed to fetch promotions: " + error.message });
  }
});

router.get("/promotions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID is required" });
    const promotion = await getPromotionById(id);
    if (!promotion) return res.status(404).json({ error: "Promotion not found" });
    res.json(promotion);
  } catch (error) {
    console.error("Error fetching promotion:", error);
    res.status(500).json({ error: "Failed to fetch promotion: " + error.message });
  }
});

// routes อื่น ๆ คงไว้ตามเดิม
router.post("/promotions", async (req, res) => {
  try {
    const newPromotion = req.body;
    const result = await addPromotion(newPromotion);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error adding promotion:", error);
    res.status(400).json({ error: error.message });
  }
});

router.put("/promotions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPromotion = req.body;
    const result = await updatePromotion(id, updatedPromotion);
    if (!result) return res.status(404).json({ error: "Promotion not found" });
    res.json(result);
  } catch (error) {
    console.error("Error updating promotion:", error);
    res.status(500).json({ error: "Failed to update promotion: " + error.message });
  }
});

router.delete("/promotions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deletePromotion(id);
    if (!success) return res.status(404).json({ error: "Promotion not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    res.status(500).json({ error: "Failed to delete promotion" });
  }
});

router.get("/sports", async (req, res) => {
  try {
    const stadiumId = req.query.stadiumId;
    const sports = await getAllSports(stadiumId);
    res.json(sports);
  } catch (error) {
    console.error("Error fetching sports:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/stadiums", async (req, res) => {
  try {
    const stadiums = await getAllStadiums();
    res.json(stadiums);
  } catch (error) {
    console.error("Error fetching stadiums:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;