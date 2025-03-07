import express from 'express';
import multer from 'multer';
import { Payment, uploadSlip } from '../../Database/dbpalmmy/palmmy.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/Payment', async (req, res) => {
    try {
        const { data, error } = await Payment();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching payment data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/uploadSlip', upload.single('slip'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { userId, amount, date, time } = req.body;
        const { publicURL, error: uploadError } = await uploadSlip(req.file);
        if (uploadError) throw uploadError;

        const { data, error: paymentError } = await Payment(amount, date, time, publicURL);
        if (paymentError) throw paymentError;

        res.json({ message: 'อัปโหลดสำเร็จ!', data });
    } catch (error) {
        console.error('Error uploading slip:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
