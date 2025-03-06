import express from 'express';
import { getStadium } from '../../Database/dbmild/Booking.js';

const router = express.Router();

// ✅ ดึงข้อมูลจากตาราง Booking (สนามกีฬา)
router.get('/stadium', async (req, res) => {
  try {
    const stadiums = await getStadium();
    res.json(stadiums);
  } catch (error) {
    console.error('Error fetching stadiums:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
export default router;
