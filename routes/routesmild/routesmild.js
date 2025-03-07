import express from 'express';
import { ShowPlace, Booking } from '../../Database/dbmild/mild.js';

const router = express.Router();

// ดึงข้อมูลสนามจาก Supabase
router.get('/ShowPlace', async (req, res) => {
    try {
        const { data, error } = await ShowPlace();

        if (error) {
            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error });
        }
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    }
});

// บันทึกข้อมูลการจอง
router.post('/Booking', async (req, res) => {
    try {
        const { stadium_id, date, timeslots, user } = req.body;

        const { data, error } = await Booking(stadium_id, date, timeslots, user);
        
        if (error) {
            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error });
        }
        
        res.json({ success: true, message: 'การจองสำเร็จ!', data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    }
});



export default router;
