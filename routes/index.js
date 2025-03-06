//รวม API ของทุกคน ไว้สร้างเส้นทาง
import express from 'express';
import historyRoutes from './routespalmmy/booking_history.js';
import edit from './routespalmmy/routesedit.js';
import cancleBook from './routespalmmy/cancleroutes.js';
import booking from './routesmild/Booking.js';



const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello express');
});

router.use('/history', historyRoutes);
router.use('/edit', edit);
router.use('/cancleBooking', cancleBook);
router.use('/booking', booking);




export default router;  
