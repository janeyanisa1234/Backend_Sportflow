import express from 'express';
import pingService from '../../Database/dbping/ping.js'; // Import the service file with the DB functions
 
const router = express.Router();
 
// Test route
router.get('/', (req, res) => {
    res.send("API is running");
});
 
// ดึงข้อมูลสรุปรายเดือน
router.get("/summary", async (req, res) => {
  try {
    const { month, year, ownerId } = req.query;
   
    if (!month || !year || !ownerId) {
      return res.status(400).json({ error: "กรุณาระบุเดือน, ปี และ ownerId" });
    }
 
    // ใช้ getSummaryData พร้อม ownerId
    const { data, error } = await pingService.getSummaryData(month, year, ownerId);
 
    if (error) {
      console.error("Summary fetch error:", error);
      return res.status(500).json({ error: error.message });
    }
 
    res.json(data);
  } catch (error) {
    console.error("Unexpected error in summary endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});
 
// ดึงข้อมูลสถานะการชำระเงิน
router.get("/payment-status", async (req, res) => {
  try {
    const { ownerId } = req.query;
   
    if (!ownerId) {
      return res.status(400).json({ error: "กรุณาระบุ ownerId" });
    }
   
    // Use the getPaymentStatus function from the service
    const { data, error } = await pingService.getPaymentStatus(ownerId);
 
    if (error) {
      console.error('Payment status fetch error:', error);
      return res.status(500).json({ error: error.message });
    }
 
    res.json(data);
  } catch (error) {
    console.error("Unexpected error in payment-status endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});
 
// ดึงข้อมูลการจองสนามตามเจ้าของ
router.get("/stadiums/:owner_id", async (req, res) => {
  try {
    const { owner_id } = req.params;
 
    if (!owner_id) {
      return res.status(400).json({ error: "กรุณาระบุ owner_id" });
    }
 
    // Use the getStadiumBookingsByOwner function from the service
    const { data, error } = await pingService.getStadiumBookingsByOwner(owner_id);
   
    if (error) {
      console.error('Owner stadiums fetch error:', error);
      return res.status(500).json({ error: error.message });
    }
   
    res.json(data);
  } catch (error) {
    console.error("Unexpected error in stadiums endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});
 
// สร้างรายการจองใหม่
router.post("/booking", async (req, res) => {
  try {
    const bookingData = req.body;
   
    if (!bookingData.id_owner || !bookingData.id_stadium || !bookingData.totalcash || !bookingData.date) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน กรุณาระบุ id_owner, id_stadium, totalcash และ date" });
    }
   
    const { data, error } = await pingService.createCashbooking(bookingData);
   
    if (error) {
      console.error('Create booking error:', error);
      return res.status(500).json({ error: error.message });
    }
   
    res.status(201).json(data);
  } catch (error) {
    console.error("Unexpected error in booking creation endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});
 
// อัปเดตสถานะการชำระเงิน
router.patch("/payment-status/:booking_id", async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { status } = req.body;
   
    if (!booking_id) {
      return res.status(400).json({ error: "กรุณาระบุ booking_id" });
    }
   
    if (!status || !['โอนแล้ว', 'ยังไม่จ่าย'].includes(status)) {
      return res.status(400).json({ error: "กรุณาระบุสถานะที่ถูกต้อง (โอนแล้ว หรือ ยังไม่จ่าย)" });
    }
   
    const { data, error } = await pingService.updatePaymentStatus(booking_id, status);
   
    if (error) {
      console.error('Update payment status error:', error);
      return res.status(500).json({ error: error.message });
    }
   
    res.json(data);
  } catch (error) {
    console.error("Unexpected error in payment status update endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});
 
export default router;