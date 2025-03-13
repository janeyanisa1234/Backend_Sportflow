import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import DB from '../../Database/db.js';

const router = express.Router();

// ตั้งค่า Multer สำหรับอัปโหลดรูปภาพคอร์ท
const fieldImageStorage = multer.diskStorage({
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
  }
});

const fieldUpload = multer({ storage: fieldImageStorage });

// เส้นทางสำหรับเพิ่มคอร์ทในสนาม
router.post('/add_field', fieldUpload.single('fieldImage'), async (req, res) => {
  try {
    const { stadium_id, court_type, court_quantity, court_price, time_slots } = req.body;
    const uploadedFile = req.file;
    
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No field image uploaded' });
    }

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!stadium_id || !court_type || !court_quantity || !court_price) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'All fields (stadium_id, court_type, court_quantity, court_price) are required'
      });
    }

    // อัปโหลดรูปภาพไปยัง Supabase Storage
    const filePath = uploadedFile.path;
    const fileContent = fs.readFileSync(filePath);
    const fileName = `field_${Date.now()}_${path.basename(uploadedFile.filename)}`;
    
    const { data: uploadData, error: uploadError } = await DB.storage
      .from('staduim')
      .upload(fileName, fileContent, {
        contentType: uploadedFile.mimetype,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return res.status(500).json({ error: 'Failed to upload field image' });
    }
    
    const { data: publicURL } = DB.storage
      .from('staduim')
      .getPublicUrl(fileName);
    
    const court_image = publicURL.publicUrl;
    
    fs.unlinkSync(filePath); // ลบไฟล์ชั่วคราวหลังอัปโหลดสำเร็จ

    // บันทึกข้อมูลคอร์ทลงตาราง add_court
    const { data: courtData, error: courtError } = await DB
      .from('add_court')
      .insert([{ 
        stadium_id,
        court_type,
        court_quantity: parseInt(court_quantity),
        court_price: parseInt(court_price),
        court_image
      }])
      .select();
    
    if (courtError) {
      console.error("Database Error for add_court:", courtError);
      return res.status(500).json({ 
        error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลสนาม", 
        details: courtError.message 
      });
    }

    const court_id = courtData[0].id;

    // บันทึกข้อมูลช่วงเวลาลงตาราง court_time
    const timeSlots = JSON.parse(time_slots);
    const timeSlotInserts = timeSlots.map(slot => ({
      court_id,
      time_start: slot.start,
      time_end: slot.end
    }));

    const { data: timeData, error: timeError } = await DB
      .from('court_time')
      .insert(timeSlotInserts)
      .select();

    if (timeError) {
      console.error("Database Error for court_time:", timeError);
      return res.status(500).json({ 
        error: "เกิดข้อผิดพลาดในการบันทึกช่วงเวลา", 
        details: timeError.message 
      });
    }

    res.status(201).json({ 
      message: "เพิ่มสนามกีฬาสำเร็จ", 
      data: { court: courtData, time_slots: timeData }
    });
    
  } catch (error) {
    console.error("Critical Error:", error);
    res.status(500).json({ 
      error: "เกิดข้อผิดพลาด กรุณาลองใหม่", 
      details: error.message 
    });
  }
});

export default router;