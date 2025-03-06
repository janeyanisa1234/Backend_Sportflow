import express from "express";
import {
  getAllPromotions,
  addPromotion,
  updatePromotionStatus,
  deletePromotion,
  getAllSports,
  getAllStadiums,
  updatePromotion,
} from "../../Database/dbgib/gib.js";

const router = express.Router();

// ดึงข้อมูลโปรโมชั่นทั้งหมด
router.get("/promotions", async (req, res) => {
  try {
    const promotions = await getAllPromotions();
    res.json(promotions);
  } catch (error) {
    console.error("Error fetching promotions in route:", error);
    res.status(500).json({ error: error.message });
  }
});

// ดึงข้อมูลโปรโมชั่นตาม ID
router.get("/promotions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching promotion with ID:", id); // Debug ID
    if (!id || id === "undefined") {
      return res.status(400).json({ error: "ID is required or invalid" });
    }
    // ตรวจสอบการเชื่อมต่อ Supabase
    if (!DB) {
      console.error("DB is not initialized");
      return res.status(500).json({ error: "Supabase client not initialized" });
    }
    const { data, error } = await DB.from("sports_promotions").select("*").eq("id", id);
    if (error) {
      console.error("Supabase error details:", {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
      });
      return res.status(500).json({ error: "Supabase error: " + error.message });
    }
    if (data.length === 0) {
      console.log("No data found for ID:", id); // Debug ถ้าไม่มีข้อมูล
      return res.status(404).json({ error: "Promotion not found" });
    }
    console.log("Promotion data fetched:", data); // Debug ข้อมูลที่ได้
    res.json(data);
  } catch (error) {
    console.error("Error in GET /:id:", error.message, error.stack);
    res.status(500).json({ error: "Failed to fetch promotion details: " + error.message });
  }
});



// เพิ่มโปรโมชั่นใหม่
router.post("/promotions", async (req, res) => {
  try {
    const newPromotion = req.body;
    const result = await addPromotion(newPromotion);
    res.status(201).json(result); // ส่ง array กลับมา
  } catch (error) {
    console.error("Error adding promotion:", error);
    res.status(400).json({ error: error.message });
  }
});

// อัปเดตโปรโมชั่นทั้งหมด
router.put("/promotions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { promotion_name, start_datetime, end_datetime, discount_percentage, discount_limit, location, sports } = req.body;
    if (!promotion_name || !start_datetime || !end_datetime || !discount_percentage || !location || !sports) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }
    const result = await updatePromotion(id, { promotion_name, start_datetime, end_datetime, discount_percentage, discount_limit, location, sports });
    if (!result) {
      return res.status(404).json({ error: "Promotion not found" });
    }
    res.json(result);
  } catch (error) {
    console.error("Error in PUT /:id:", error);
    res.status(500).json({ error: "Failed to update promotion" });
  }
});

// อัปเดตสถานะโปรโมชั่น (ถ้าต้องการแยก)
router.put("/promotions/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await updatePromotionStatus(id, status);
    if (!result) {
      return res.status(404).json({ error: "Promotion not found" });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update promotion status" });
  }
});

// ลบโปรโมชั่น
router.delete("/promotions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deletePromotion(id);
    if (!success) {
      return res.status(404).json({ error: "Promotion not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete promotion" });
  }
});

// ดึงข้อมูลกีฬา
router.get("/sports", async (req, res) => {
  try {
    const stadiumId = req.query.stadiumId; // รับ stadiumId จาก query parameter
    const sports = await getAllSports(stadiumId);
    res.json(sports);
  } catch (error) {
    console.error("Error fetching sports in route:", error);
    res.status(500).json({ error: error.message });
  }
});

// ดึงข้อมูลสนาม
router.get("/stadiums", async (req, res) => {
  try {
    const stadiums = await getAllStadiums();
    res.json(stadiums);
  } catch (error) {
    console.error("Error fetching stadiums in route:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;