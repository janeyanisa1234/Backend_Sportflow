import express from 'express';
import { getStadiumsWithCourtsAndTimes } from "../../Database/dbmild/booking.js";
 
const router = express.Router();
 
router.get('/stadiums', async (req, res) => {
  try {
    const stadiumData = await getStadiumsWithCourtsAndTimes();
    res.json(stadiumData);
  } catch (error) {
    console.error('Error fetching stadiums:', error.message);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});
 
router.post('/bookings', async (req, res) => {
  try {
    const bookingData = req.body;
    console.log("Received booking data:", bookingData); // แค่ log ข้อมูล
    res.status(200).json({ message: "Booking data received successfully" });
  } catch (error) {
    console.error('Error in /bookings route:', error.message);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});
 
export default router;