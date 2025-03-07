import express from 'express';
import { getStadiumsWithCourtsAndTimes } from  "../../Database/dbmild/Booking.js"; 


const router = express.Router();

// ✅ ดึงข้อมูลสนามกีฬา + ประเภทสนามกีฬา + เวลาเปิด-ปิด
router.get('/stadiums', async (req, res) => {
  try {
    const stadiumData = await getStadiumsWithCourtsAndTimes();
    res.json(stadiumData);
  } catch (error) {
    console.error('Error fetching stadiums:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
