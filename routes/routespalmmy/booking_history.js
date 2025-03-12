import express from "express";
import DB from "../../Database/db.js";

const router = express.Router();

// GET: ดึงประวัติการจองจากตาราง Booking โดยใช้ userId จาก query params
router.get("/", async (req, res) => {
  try {
    const userId = req.query.user_id; // รับ userId จาก query params
    if (!userId) {
      return res.status(400).json({ error: "Missing user_id parameter" });
    }

    console.log(`Fetching bookings for user_id: ${userId}`);

    const query = DB.from("Booking")
      .select(
        `
        id_booking,
        court,
        date_play,
        time_slot,
        totalPrice,
        date,
        time,
        status_booking,
        stadiums:id_stadium (stadium_name),
        courts:id_court (court_type)
        `
      )
      .eq("user_id", userId);

    console.log("Generated Query:", query);

    const { data, error } = await query;

    if (error) {
      console.error("Database Error:", error);
      return res.status(500).json({ error: "Error fetching booking data", details: error.message });
    }

    if (!data || data.length === 0) {
      console.log("No bookings found.");
      return res.status(200).json([]); // คืน array ว่างถ้าไม่มีข้อมูล
    }

    console.log("Fetched Data:", data);

    // แปลงข้อมูลให้เป็นรูปแบบที่ต้องการ
    const formattedBookings = data.map((booking) => ({
      id_booking: booking.id_booking,
      Stadium_name: booking.stadiums?.stadium_name,
      Sports_type: booking.courts?.court_type,
      Court: booking.court,
      date_play: booking.date_play,
      time_slot: booking.time_slot,
      totalPrice: booking.totalPrice,
      date: booking.date,
      Time: booking.time,
      status_booking: booking.status_booking,
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;