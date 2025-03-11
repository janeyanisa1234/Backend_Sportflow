import express from 'express';
import {getBookingData, processRefund} from '../../Database/dbjane/cancle.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/cancle-booking', async (req, res) => {
  try {
    const bookingData = await getBookingData();
    res.status(200).json({ message: 'Successfully fetched booking data', data: bookingData || null });
  } catch (error) {
    console.error('Error in cancle-booking route:', error);
    res.status(500).json({ message: 'Failed to fetch booking data', error: error.message });
  }
});

router.post('/process-refund', upload.single('slipImage'), async (req, res) => {
    try {
      const { id_booking, date, name } = req.body;
      const slipImage = req.file;
  
      await processRefund({
        id_booking,
        date,
        name,
        slipImage: slipImage.buffer
      });
  
      res.status(200).json({ message: 'Refund processed successfully' });
    } catch (error) {
      console.error('Error in process-refund route:', error);
      res.status(500).json({ message: 'Failed to process refund', error: error.message });
    }
  });

export default router;