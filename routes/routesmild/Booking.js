// routes/bookingRoutes.js
import express from 'express';
import { getCourts,getStadium } from '../../Database/dbmild/booking';

const router = express.Router();

// ✅ ดึงข้อมูลจากตาราง Booking (สนามกีฬา)
router.get('/stadium', async (req, res) => {
  try {
    const searchQuery = req.query.search;
    const stadiums = await getStadiums(searchQuery);
    res.json(stadiums);
  } catch (error) {
    console.error('Error fetching stadiums:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ ดึงข้อมูลสนามและประเภทของสนามพร้อมเวลา
router.get('/court', async (req, res) => {
  try {
    const courts = await getCourts();
    res.json(courts);
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
