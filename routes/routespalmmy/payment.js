// routes/routespalmmy/payment.js
import express from 'express';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';
import _ from 'lodash';

const router = express.Router();

router.post('/generateQR', (req, res) => {
  try {
    const amount = parseFloat(_.get(req, ['body', 'amount']));
    if (isNaN(amount)) {
      return res.status(400).json({ message: 'จำนวนเงินไม่ถูกต้อง' });
    }
    const mobileNumber = _.get(req, ['body', 'mobileNumber']) || '0853186887'; // Default number
    const payload = generatePayload(mobileNumber, { amount });
    const option = {
      color: {
        dark: '#000',
        light: '#fff',
      },
    };
    QRCode.toDataURL(payload, option, (err, url) => {
      if (err) {
        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้าง QR Code' });
      }
      res.status(200).json({ qr: url, amount }); // ส่ง URL และ amount กลับไป
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

export default router;