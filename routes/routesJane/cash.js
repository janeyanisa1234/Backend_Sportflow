import express from 'express';
import { generateMonthlyCash } from '../../Database/dbjane/cash.js';

const router = express.Router();

// สร้าง route สำหรับ trigger การคำนวณยอดเงิน
router.get('/generate-cash', async (req, res) => {
    try {
        const result = await generateMonthlyCash();
        res.status(200).json({ message: result.message, data: result.data || null }); // เพิ่ม data ถ้ามี
    } catch (error) {
        console.error('Error in generate-cash route:', error); // Log error เพื่อ debug
        res.status(500).json({ message: 'Failed to generate monthly cash summary', error: error.message });
    }
});

export default router;