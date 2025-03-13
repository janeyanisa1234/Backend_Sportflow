import express from 'express';
import { getStadiumsWithCourtsAndTimes } from '../../Database/dbmild/booking.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import DB from '../../Database/db.js';

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

// Get all stadiums
router.get('/stadiums', async (req, res) => {
  try {
    console.time('fetchStadiums');
    const stadiumData = await getStadiumsWithCourtsAndTimes();
    console.timeEnd('fetchStadiums');
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
      return res.status(500).json({ error: 'Failed to check existing bookings', details: existingError.message });
    }

    const existingSlots = existingBookings.flatMap((booking) => booking.time_slot.split(','));
    const overlappingSlots = requestedSlots.filter((slot) => existingSlots.includes(slot));

    if (overlappingSlots.length > 0) {
      return res.status(400).json({
        error: 'Time slot conflict',
        details: `The following slots are already booked: ${overlappingSlots.join(', ')}`,
      });
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
      status_booking: 'ยืนยัน', // อัปเดตสถานะเป็น "ยืนยัน"
      status_timebooking: true, // อัปเดตเป็น true เมื่อการจองสำเร็จ
      SlipPayment: '',
      date: date || new Date().toISOString().split("T")[0],
      time: time || new Date().toTimeString().split(" ")[0],
    };

    const filePath = uploadedFile.path;
    const fileContent = fs.readFileSync(filePath);
    const fileName = `${Date.now()}_${path.basename(uploadedFile.filename)}`;

    const { data: uploadData, error: uploadError } = await DB.storage
      .from('payment_slips')
      .upload(fileName, fileContent, {
        contentType: uploadedFile.mimetype,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Error uploading slip to storage:', uploadError);
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: 'Failed to upload slip image', details: uploadError.message });
    }

    const { data: publicURL } = DB.storage.from('payment_slips').getPublicUrl(fileName);
    const slipImageUrl = publicURL.publicUrl;
    bookingData.SlipPayment = slipImageUrl;

    const { data: bookingInsertData, error: bookingInsertError } = await DB
      .from('Booking')
      .insert([bookingData])
      .select();

    if (bookingInsertError) {
      console.error('Error inserting booking data:', bookingInsertError);
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: 'Failed to insert booking', details: bookingInsertError.message });
    }

    // ดึง Time Slot ที่จองแล้วทั้งหมดสำหรับวันที่นั้น
    const { data: bookedSlotsData, error: slotsError } = await DB
      .from('Booking')
      .select('time_slot, date_play, court')
      .eq('id_stadium', id_stadium)
      .eq('id_court', id_court)
      .eq('date_play', date_play)
      .eq('status_timebooking', true);

    if (slotsError) {
      console.error('Error fetching booked slots:', slotsError);
    }

    const bookedSlots = bookedSlotsData ? bookedSlotsData.map((slot) => slot.time_slot.split(',')).flat() : [];

    fs.unlinkSync(filePath);

    res.status(200).json({
      message: 'Booking confirmed and created successfully',
      booking: bookingInsertData[0],
      slipImage: slipImageUrl,
      bookedSlots, // ส่ง Time Slot ที่จองแล้วกลับไป
    });
  } catch (error) {
    console.error('Error in /confirm route:', error.stack);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

export default router;