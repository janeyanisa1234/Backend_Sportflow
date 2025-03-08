import express from 'express';
import DB from '../../Database/db.js';

const router = express.Router();

// ✅ GET: ดึงข้อมูลจากตาราง Booking
router.get('/', async (req, res) => {
    try {
        const { data: stadium, error: stadiumError } = await DB
            .from('add_stadium')
            .select('stadium_name'); // ดึงชื่อสนาม

        const { data, error } = await DB
            .from('Booking')
            .select('Price, Sports_type, Time, date,Court'); // ดึงแค่ข้อมูลที่ต้องการ

        if (error) {
            console.error('Error fetching data:', error);
            return res.status(500).json({ error: 'Error fetching booking data' });
        }

        console.log('Fetched Data:', data);
        res.json(data);

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ✅ POST: เพิ่มข้อมูลลง booking_history
router.post('/', async (req, res) => {
    try {
        const { Price, Sports_type, Time, date } = req.body;

        if (!Price || !Sports_type || !Time || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 📌 1) เพิ่มข้อมูลลง booking_history
        const { error: historyError } = await DB
            .from('booking_history')
            .insert([{ Price, Sports_type, Time, date }]); // เพิ่มแค่ข้อมูลที่ต้องการ

        if (historyError) {
            console.error('Error inserting data into booking_history:', historyError);
            return res.status(500).json({ error: 'Failed to insert data into booking_history' });
        }

        res.json({ message: 'Data successfully inserted into booking_history' });

    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
