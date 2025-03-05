// routesJane.js
import express from 'express';
import { getBookings } from '../../Database/dbjane/cancle.js';

const router = express.Router();

// Example route to fetch bookings
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await getBookings();  // Call the function from cancle.js to get the bookings
    res.json(bookings);  // Send the bookings as the response
  } catch (error) {
    res.status(500).json({ error: error.message });  // Handle errors and send a response
  }
});

export default router;
