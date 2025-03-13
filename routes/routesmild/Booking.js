import express from 'express';
import { getStadiumsWithCourtsAndTimes } from '../../Database/dbmild/booking.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import DB from '../../Database/db.js';

import axios from 'axios';
import FormData from 'form-data';


const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.stat(uploadDir).catch(async () => {
        await fs.mkdir(uploadDir, { recursive: true });
      });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
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
const EXPECTED_ACCOUNT = "ณัฐฐา ";
const SLIPOK_API_URL = 'https://api.slipok.com/api/line/apikey/40730';
const SLIPOK_API_KEY = 'SLIPOK41AJXKE';


// Get all stadiums
router.get('/stadiums', async (req, res) => {
  try {
    console.time('fetchStadiums');
    console.log('Fetching stadiums from database...');
    const stadiumData = await getStadiumsWithCourtsAndTimes();
    console.log('Stadium data:', stadiumData);
    console.timeEnd('fetchStadiums');
    if (!stadiumData || stadiumData.length === 0) {
      return res.status(404).json({ error: 'No stadiums found' });
    }
    res.json(stadiumData);
  } catch (error) {
    console.error('Error fetching stadiums:', error.stack);
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
        status_timebooking: false, // ตั้งค่าเริ่มต้นเป็น false
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


router.get('/confirm/booked-slots', async (req, res) => {
  try {
    const { stadiumName, date } = req.query;
    console.log('Received request for booked slots:', { stadiumName, date });

    if (!stadiumName || !date) {
      return res.status(400).json({ error: 'Missing stadiumName or date' });
    }

    const { data: stadium, error: stadiumError } = await DB.from('add_stadium')
      .select('id')
      .eq('stadium_name', stadiumName)
      .single();

    if (stadiumError || !stadium) {
      console.error('Stadium not found:', stadiumError?.message || 'No stadium data');
      return res.status(404).json({ error: 'Stadium not found' });
    }

    const { data, error } = await DB.from('Booking')
      .select('court, time_slot, status_booking, status_timebooking')
      .eq('id_stadium', stadium.id)
      .eq('date_play', date);

    if (error) {
      console.error('Error fetching booked slots from DB:', error.message);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    console.log('Booked slots data:', data);
    res.json(data || []);
  } catch (error) {
    console.error('Error in /confirm/booked-slots route:', error.stack);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Confirm booking with slip and insert into Booking table

router.post('/confirm', upload.single('slipImage'), multerErrorHandler, async (req, res) => {
  let imagePath;
  try {
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const {
      user_id,
      bookingId,
      date,
      time,
      id_stadium,
      id_court,
      court_number,
      date_play,
      time_slot,
      totalPrice,
    } = req.body;
    const uploadedFile = req.file;

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

    // แปลง time_slot เป็น array เพื่อตรวจสอบการทับซ้อน
    const requestedSlots = time_slot.split(',');

    // ตรวจสอบการทับซ้อนกับการจองที่มีอยู่
    const { data: existingBookings, error: existingError } = await DB
      .from('Booking')
      .select('time_slot, date_play, court')
      .eq('id_stadium', id_stadium)
      .eq('id_court', id_court)
      .eq('date_play', date_play)
      .eq('status_timebooking', true);

    if (existingError) {
      console.error('Error checking existing bookings:', existingError);
      throw new Error(`Failed to check existing bookings: ${existingError.message}`);
    }

    const existingSlots = existingBookings.flatMap((booking) => booking.time_slot.split(','));
    const overlappingSlots = requestedSlots.filter((slot) => existingSlots.includes(slot));

    if (overlappingSlots.length > 0) {
      return res.status(400).json({
        error: 'Time slot conflict',
        details: `The following slots are already booked: ${overlappingSlots.join(', ')}`,
      });
    }

    const EXPECTED_AMOUNT = Number(totalPrice).toFixed(2);
    imagePath = uploadedFile.path;

    // ตรวจสอบว่าไฟล์มีอยู่จริง
    if (!(await fs.stat(imagePath).catch(() => false))) {
      throw new Error(`File not found at path: ${imagePath}`);
    }

    // อ่านไฟล์เป็น Buffer
    const fileBuffer = await fs.readFile(imagePath);

    // สร้าง FormData สำหรับ SlipOK API
    const slipFormData = new FormData();
    slipFormData.append('files', fileBuffer, {
      filename: uploadedFile.originalname,
      contentType: uploadedFile.mimetype,
    });
    slipFormData.append('amount', EXPECTED_AMOUNT);
    slipFormData.append('log', 'true');

    console.log('Sending to SlipOK:', { url: SLIPOK_API_URL, amount: EXPECTED_AMOUNT });

    // ส่งคำขอไปยัง SlipOK API
    let slipResponse;
    try {
      slipResponse = await axios.post(SLIPOK_API_URL, slipFormData, {
        headers: {
          'x-authorization': SLIPOK_API_KEY,
          ...slipFormData.getHeaders(),
        },
        timeout: 10000,
      });
    } catch (apiError) {
      console.error('SlipOK API Error:', {
        status: apiError.response?.status,
        data: apiError.response?.data,
        message: apiError.message,
        errors: apiError.response?.data?.errors ? JSON.stringify(apiError.response.data.errors, null, 2) : 'No detailed errors provided',
      });
      throw apiError;
    }

    const slipData = slipResponse.data;
    console.log('SlipOK Response:', slipData);

    // ตรวจสอบข้อมูลจาก SlipOK
    if (!slipData || !slipData.success) {
      throw new Error(`สลิปไม่ถูกต้องหรือตรวจสอบไม่สำเร็จ: ${slipData?.message || 'Unknown error'}`);
    }

    // ตรวจสอบจำนวนเงินจาก slipData.data.amount
    const receivedAmount = slipData.data?.amount ? String(slipData.data.amount.toFixed(2)) : null;
    if (!receivedAmount || receivedAmount !== EXPECTED_AMOUNT) {
      throw new Error(`จำนวนเงินในสลิป (${receivedAmount || 'ไม่พบ'}) ไม่ตรงกับที่คาดหวัง (${EXPECTED_AMOUNT})`);
    }

    // ตรวจสอบชื่อบัญชีปลายทางจาก slipData.data.receiver.displayName
    const toAccountName = slipData.data?.receiver?.displayName || '';
    if (!toAccountName.includes(EXPECTED_ACCOUNT)) {
      throw new Error(`ชื่อบัญชีปลายทาง (${toAccountName || 'ไม่พบ'}) ไม่ตรงกับ "${EXPECTED_ACCOUNT}"`);
    }

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
      status_timebooking: true,
      SlipPayment: '',
      date: date || new Date().toISOString().split("T")[0],
      time: time || new Date().toTimeString().split(" ")[0],
    };

    // อัปโหลดสลิปไปยัง Supabase Storage
    const fileContent = fileBuffer;
    const fileName = `${Date.now()}_${path.basename(uploadedFile.originalname)}`;

    const { data: uploadData, error: uploadError } = await DB.storage
      .from('payment_slips')
      .upload(fileName, fileContent, {
        contentType: uploadedFile.mimetype,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Error uploading slip to storage:', uploadError);
      throw new Error(`Failed to upload slip image: ${uploadError.message}`);
    }

    const { data: publicURL } = DB.storage.from('payment_slips').getPublicUrl(fileName);
    const slipImageUrl = publicURL.publicUrl;
    bookingData.SlipPayment = slipImageUrl;

    // บันทึกข้อมูลการจองลง Supabase
    const { data: bookingInsertData, error: bookingInsertError } = await DB
      .from('Booking')
      .insert([bookingData])
      .select();

    if (bookingInsertError) {
      console.error('Error inserting booking data:', bookingInsertError);
      throw new Error(`Failed to insert booking: ${bookingInsertError.message}`);
    }

    // ดึง Time Slot ที่จองแล้วทั้งหมดสำหรับวันที่นั้น
    const { data: bookedSlotsData, error: slotsError } = await DB
      .from('Booking')
      .select('time_slot, date_play, court')
      .eq('id_stadium', id_stadium)
      .eq('id_court', id_court)
      .eq('date_play', date_play)
      .eq('status_timebooking', true);

    let bookedSlots = [];
    if (slotsError) {
      console.error('Error fetching booked slots:', slotsError);
      // ถ้ามี error ในการดึง booked slots ให้ส่ง response โดยไม่มี bookedSlots
      bookedSlots = [];
    } else {
      bookedSlots = bookedSlotsData ? bookedSlotsData.flatMap((slot) => slot.time_slot.split(',')) : [];
    }

    // ส่ง response ก่อนลบไฟล์
    res.status(200).json({
      message: 'Booking confirmed and created successfully',
      booking: bookingInsertData[0],
      slipImage: slipImageUrl,
      bookedSlots,
    });

    // ลบไฟล์ชั่วคราวหลังจากส่ง response
    if (imagePath && (await fs.stat(imagePath).catch(() => false))) {
      await fs.unlink(imagePath).catch(err => console.error('Failed to delete file:', err));
    }
  } catch (error) {
    console.error('Error in /confirm route:', error.stack);

    if (imagePath && (await fs.stat(imagePath).catch(() => false))) {
      await fs.unlink(imagePath).catch(err => console.error('Error deleting temporary file:', err));
    }

    let statusCode = 500;
    let errorMessage = 'Internal Server Error';
    let errorDetails = error.message || 'Unknown error';

    if (error.response) {
      statusCode = error.response.status;
      errorMessage = `SlipOK API error: ${error.response.status} - ${error.response.data?.message || 'Unknown'}`;
      errorDetails = error.response.data || error.message;
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'SlipOK API connection timed out';
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: errorDetails,
    });
  }
});

export default router;