import express from "express";
import DB from '../../Database/db.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({ storage });

const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err);
    return res.status(400).json({
      error: 'Multer error occurred',
      details: `Expected field: 'bankimges', received field: '${err.field || 'unknown'}'`,
    });
  }
  next(err);
};

router.post('/cancel', async (req, res) => {
  try {
    const { booking_id, reasons } = req.body;

    if (!booking_id || !reasons) {
      return res.status(400).json({ error: "กรุณาส่ง booking_id และ reasons" });
    }

    const { data: booking, error: bookingError } = await DB.from('Booking')
      .select('id_booking, status_booking')
      .eq('id_booking', booking_id)
      .eq('status_booking', 'ยืนยัน')
      .single();

    if (bookingError || !booking) {
      console.error('Booking Error:', bookingError);
      return res.status(404).json({ 
        error: "ไม่พบการจองนี้ในระบบ หรือสถานะไม่ใช่ 'ยืนยัน'" 
      });
    }

    const { data: updateData, error: updateError } = await DB.from('Booking')
      .update({ status_booking: 'รอดำเนินการยกเลิก' })
      .eq('id_booking', booking_id);

    if (updateError) {
      console.error('Update Error:', updateError);
      return res.status(500).json({ 
        error: "ไม่สามารถอัปเดตสถานะการจองได้", 
        details: updateError.message 
      });
    }

    console.log('ส่งคำขอยกเลิกการจองสำเร็จ:', { booking_id, reasons });
    res.status(200).json({
      message: "ส่งคำขอยกเลิกการจองสำเร็จ รอแอดมินดำเนินการ",
      data: { booking_id, reasons }
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

router.post('/refund', upload.single('bankimges'), multerErrorHandler, async (req, res) => {
  try {
    console.log('Received body:', req.body);
    console.log('Received file:', req.file);

    const { bookingId, name, bank, account_number, reasoncancle } = req.body;
    const bookbankImage = req.file;

    if (!bookbankImage) {
      return res.status(400).json({ error: 'No bankimges provided' });
    }
    if (!bookingId || !name || !bank || !account_number || !reasoncancle) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'bookingId, name, bank, account_number, and reasoncancle are required',
        received: req.body,
      });
    }

    if (typeof reasoncancle !== 'string' || reasoncancle.trim() === '') {
      return res.status(400).json({ error: 'reasoncancle must be a non-empty string' });
    }

    if (!/^\d+$/.test(account_number)) {
      return res.status(400).json({ error: 'account_number must contain only numbers' });
    }
    const parsedAccountNumber = parseInt(account_number);

    const { data: booking, error: bookingError } = await DB.from('Booking')
      .select('id_booking, status_booking')
      .eq('id_booking', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking Error:', bookingError);
      return res.status(404).json({ error: "ไม่พบการจองนี้ในระบบ" });
    }

    if (booking.status_booking !== 'รอดำเนินการยกเลิก') {
      const { data: updateData, error: updateError } = await DB.from('Booking')
        .update({ status_booking: 'รอดำเนินการยกเลิก' })
        .eq('id_booking', bookingId);

      if (updateError) {
        console.error('Update Error:', updateError);
        return res.status(500).json({ 
          error: "ไม่สามารถอัปเดตสถานะการจองได้", 
          details: updateError.message 
        });
      }
    }

    const filePath = bookbankImage.path;
    const fileContent = fs.readFileSync(filePath);
    const fileName = `${Date.now()}_${path.basename(bookbankImage.filename)}`;

    const { data: uploadData, error: uploadError } = await DB.storage
      .from('bookbank')
      .upload(fileName, fileContent, {
        contentType: bookbankImage.mimetype,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Error uploading slip to storage:', uploadError);
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: 'Failed to upload bookbank image', details: uploadError.message });
    }

    const { data: publicURL } = DB.storage.from('bookbank').getPublicUrl(fileName);
    const slipImageUrl = publicURL.publicUrl;

    const refundData = {
      id_booking: bookingId,
      name: name,
      bank: bank,
      bank_number: parsedAccountNumber,
      reasoncancle: reasoncancle.trim(),
      bankimges: slipImageUrl,
    };

    console.log('Inserting data into BookBank with schema:', refundData);
    const { data: cancleInsertData, error: cancleInsertDataError } = await DB
      .from('BookBank')
      .insert([refundData])
      .select();

    if (cancleInsertDataError) {
      console.error('Error inserting refund data:', cancleInsertDataError);
      fs.unlinkSync(filePath);
      return res.status(500).json({
        error: 'Failed to insert refund data',
        details: cancleInsertDataError.message,
      });
    }

    console.log('ข้อมูลการคืนเงินสำหรับ admin:', {
      bookingId,
      name,
      bank,
      account_number,
      reasoncancle,
      bank_image_url: slipImageUrl,
    });

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: "ส่งข้อมูลการคืนเงินสำเร็จ รอแอดมินดำเนินการ",
      data: {
        bookingId,
        name,
        bank,
        account_number,
        reasoncancle,
        bankimges: slipImageUrl
      }
    });
  } catch (error) {
    console.error("Server Error:", error.stack);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message || 'Unknown error'
    });
  }
});

export default router;