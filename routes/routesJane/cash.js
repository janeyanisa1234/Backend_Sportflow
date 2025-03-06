import express from 'express';
import { generateMonthlyCash } from '../../Database/dbjane/cash.js';

const router = express.Router();

// สร้าง route สำหรับ trigger การคำนวณยอดเงิน
router.get('/generate-cash', async (req, res) => {
    try {
        const result = await generateMonthlyCash();
        res.status(200).json({ message: result.message });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
