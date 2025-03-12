import express from 'express';
import { getStadiumsWithCourtsAndTimes } from '../../Database/dbmild/booking.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import DB from '../../Database/db.js';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

const router = express.Router();

// Configure multer for file uploads
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

// Middleware to handle Multer errors
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err);
    return res.status(400).json({
      error: 'Multer error occurred',
      details: `Expected field: 'slipImage', received field: '${err.field || 'unknown'}'`,
    });
  }
  next(err);
};

// ข้อมูลที่ต้องตรวจสอบ
const EXPECTED_ACCOUNT = "ณัฐฐา นามเมือง";

// Get all stadiums
router.get('/stadiums', async (req, res) => {
  try {
    const stadiumData = await getStadiumsWithCourtsAndTimes();
    if (!stadiumData || stadiumData.length === 0) {
      return res.status(404).json({ error: 'No stadiums found' });
    }
    res.json(stadiumData);
  } catch (error) {
    console.error('Error fetching stadiums:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// POST /stadiums - Create temporary booking request (no DB insert)
router.post('/stadiums', async (req, res) => {
  try {
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);

    const {
      userId,
      stadiumId,
      courtId,
      stadiumName,
      sportType,
      courtNumber,
      date,
      timeSlots,
      price,
    } = req.body;

    if (!userId || !stadiumId || !courtId || !date || !timeSlots || !price) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'userId, stadiumId, courtId, date, timeSlots, and price are required',
        received: req.body,
      });
    }

    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({ error: 'timeSlots must be a non-empty array' });
    }
    if (isNaN(parseInt(price)) || parseInt(price) <= 0) {
      return res.status(400).json({ error: 'price must be a positive number' });
    }

    const id_booking = uuidv4();

    res.status(201).json({
      message: 'Booking request received successfully',
      bookingId: id_booking,
      stadiumName,
      sportType,
      bookingDetails: {
        user_id: userId,
        id_stadium: stadiumId,
        id_court: courtId,
        court_number: String(courtNumber),
        date_play: date,
        time_slot: timeSlots.join(','),
        totalPrice: parseInt(price),
      },
    });
  } catch (error) {
    console.error('Error in /stadiums route:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message || 'Unknown error',
    });
  }
});

// Get booking details by ID
router.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { data, error } = await DB.from('Booking')
      .select('*')
      .eq('id_booking', bookingId);

    if (error) {
      console.error('Error fetching booking:', error.message);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching booking:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Confirm booking with slip and insert into Booking table
router.post('/confirm', upload.single('slipImage'), multerErrorHandler, async (req, res) => {
  try {
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const {
      user_id,
      bookingId,
      date, // วันที่โอน
      time, // เวลาที่โอน
      id_stadium,
      id_court,
      court_number,
      date_play,
      time_slot,
      totalPrice,
    } = req.body;
    const uploadedFile = req.file;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No slipImage provided' });
    }
    if (!user_id || !bookingId || !id_stadium || !id_court || !court_number || !date_play || !time_slot || !totalPrice) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'user_id, bookingId, id_stadium, id_court, court_number, date_play, time_slot, and totalPrice are required',
        received: req.body,
      });
    }

    // แปลง totalPrice เป็น string และเพิ่มทศนิยม 2 ตำแหน่ง
    const EXPECTED_AMOUNT = Number(totalPrice).toFixed(2);
    console.log('Total Price ที่คาดหวัง:', EXPECTED_AMOUNT);

    const imagePath = uploadedFile.path;
    const processedImagePath = path.join(process.cwd(), 'uploads', `processed-${uploadedFile.filename}`);

    // OCR และตรวจสอบสลิป
    try {
      // ใช้ Sharp แปลงเป็นขาวดำ + ปรับค่า Threshold
      await sharp(imagePath)
        .greyscale()
        .threshold(150)
        .toFile(processedImagePath);

      // ใช้ OCR อ่านข้อมูลจากภาพที่ปรับแต่งแล้ว
      const { data: { text } } = await Tesseract.recognize(processedImagePath, 'tha+eng');
      console.log('OCR Text:', text);

      // ตรวจสอบชื่อบัญชี
      const accountMatch = text.match(EXPECTED_ACCOUNT);
      const extractedAccount = accountMatch ? EXPECTED_ACCOUNT : null;

      // ตรวจสอบจำนวนเงิน
      const amountMatch = text.match(/\d{1,3}(,\d{3})*\.\d{2}/);
      const extractedAmount = amountMatch ? amountMatch[0].replace(/,/g, '') : null;

      // ตรวจสอบว่าข้อมูลตรงไหม
      if (extractedAccount !== EXPECTED_ACCOUNT || extractedAmount !== EXPECTED_AMOUNT) {
        fs.unlinkSync(imagePath);
        fs.unlinkSync(processedImagePath);
        return res.status(400).json({
          error: 'การตรวจสอบสลิปไม่ผ่าน',
          details: {
            expectedAccount: EXPECTED_ACCOUNT,
            extractedAccount,
            expectedAmount: EXPECTED_AMOUNT,
            extractedAmount,
          },
        });
      }

      // ลบไฟล์ชั่วคราวหลัง OCR
      fs.unlinkSync(processedImagePath);
    } catch (error) {
      console.error('OCR Error:', error);
      fs.unlinkSync(imagePath);
      if (fs.existsSync(processedImagePath)) fs.unlinkSync(processedImagePath);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอ่านสลิป', details: error.message });
    }

    // เตรียมข้อมูลสำหรับ insert
    const bookingData = {
      id_booking: bookingId,
      user_id,
      id_stadium,
      id_court,
      court: court_number,
      date_play,
      time_slot,
      totalPrice: parseInt(totalPrice),
      payment: 'slip',
      status_booking: 'ยืนยัน',
      status_timebooking: false,
      SlipPayment: '',
      date: date || null, // วันที่โอน
      time: time || null, // เวลาที่โอน
    };

    // อัปโหลดสลิปไปยัง Supabase Storage
    const fileContent = fs.readFileSync(imagePath);
    const fileName = `${Date.now()}_${path.basename(uploadedFile.filename)}`;

    const { data: uploadData, error: uploadError } = await DB.storage
      .from('payment_slips')
      .upload(fileName, fileContent, {
        contentType: uploadedFile.mimetype,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Error uploading slip to storage:', uploadError);
      fs.unlinkSync(imagePath);
      return res.status(500).json({ error: 'Failed to upload slip image', details: uploadError.message });
    }

    const { data: publicURL } = DB.storage.from('payment_slips').getPublicUrl(fileName);
    const slipImageUrl = publicURL.publicUrl;
    bookingData.SlipPayment = slipImageUrl;

    // Insert ข้อมูลลงในตาราง Booking
    const { data: bookingInsertData, error: bookingInsertError } = await DB
      .from('Booking')
      .insert([bookingData])
      .select();

    if (bookingInsertError) {
      console.error('Error inserting booking data:', bookingInsertError);
      fs.unlinkSync(imagePath);
      return res.status(500).json({
        error: 'Failed to insert booking',
        details: bookingInsertError.message,
      });
    }

    fs.unlinkSync(imagePath); // ลบไฟล์ชั่วคราวหลังสำเร็จ

    res.status(200).json({
      message: 'Booking confirmed and created successfully',
      booking: bookingInsertData[0],
      slipImage: slipImageUrl,
    });
  } catch (error) {
    console.error('Error in /confirm route:', error.stack);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message || 'Unknown error'
    });
  }
});

export default router;