import express from 'express';
import DB from '../../Database/db.js';

const router = express.Router();


router.get('/', async (req, res) => {
    try {
        // ดึงข้อมูลทั้งหมดจากตาราง 'cash'
        const { data, error } = await DB.from('cash').select('*');

        if (error) {
            throw error;
        }

        res.json(data);  // ส่งข้อมูลทั้งหมดกลับ
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
