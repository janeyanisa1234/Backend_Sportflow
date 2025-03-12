import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import getCashUpdate from '../../Database/dbjane/cashUpdate.js';
import DB from '../../Database/db.js';

const router = express.Router();

// กำหนด configuration สำหรับ multer
//ใช้ในการอ่านไฟล์รูปภาพ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // สร้างโฟลเดอร์ถ้ายังไม่มี
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ storage });

// Route สำหรับดึงข้อมูลการคำนวณรายได้
router.get('/update-cash', async (req, res) => {
  try {
    const cashUpdate = await getCashUpdate();
    // เรียงข้อมูลจากล่าสุดไปเก่าสุด
    const sortedCashUpdate = cashUpdate.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(sortedCashUpdate);
  } catch (error) {
    console.error("Error in /update-cash route:", error);
    res.status(500).send('Error fetching cash update');
  }
});

// Route สำหรับบันทึกการโอนเงิน
router.post('/complete-transfer', upload.single('slipImage'), async (req, res) => {
  try {
    const { id_owner, paydate, nameadmin, date } = req.body;
    const slipFile = req.file;
    
    if (!slipFile) {
      return res.status(400).json({ error: 'No slip image uploaded' });
    }
    
    // อัปโหลดไฟล์ไปยัง Supabase Storage
    const filePath = slipFile.path;
    const fileContent = fs.readFileSync(filePath);
    const fileName = `${Date.now()}_${path.basename(slipFile.filename)}`;
    
    // อัปโหลดไฟล์ไปยัง storage bucket 'cashhistory'
    const { data: uploadData, error: uploadError } = await DB.storage
      .from('cashhistory')
      .upload(fileName, fileContent, {
        contentType: slipFile.mimetype,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return res.status(500).json({ error: 'Failed to upload slip image' });
    }
    
    // ดึง URL ของไฟล์ที่อัปโหลด
    const { data: publicURL } = DB.storage
      .from('cashhistory')
      .getPublicUrl(fileName);
    
    // เก็บข้อมูลลงในตาราง cashhistory
    const { data: cashHistoryData, error: cashHistoryError } = await DB
      .from('cashhistory')
      .insert({
        id_owner: id_owner,
        paydate: paydate,
        nameadmin: nameadmin,
        slippay: publicURL.publicUrl,
        date: date
      });
    
    if (cashHistoryError) {
      console.error('Error inserting data into cashhistory:', cashHistoryError);
      return res.status(500).json({ error: 'Failed to save transfer data' });
    }
    
    // อัปเดตสถานะใน cashbooking ให้เป็น "โอนแล้ว"
    const { data: updateData, error: updateError } = await DB
      .from('cashbooking')
      .update({ statuscash: 'โอนแล้ว' })
      .eq('id_owner', id_owner)
      .eq('date', date);
    
    if (updateError) {
      console.error('Error updating cashbooking status:', updateError);
      return res.status(500).json({ error: 'Failed to update transfer status' });
    }
    
    // ลบไฟล์หลังจากอัปโหลดเสร็จแล้ว
    fs.unlinkSync(filePath);
    
    res.status(200).json({ 
      message: 'Transfer completed successfully',
      slipUrl: publicURL.publicUrl
    });
    
  } catch (error) {
    console.error('Error in /complete-transfer route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// เพิ่มในไฟล์ Backend_Sportflow\routes\routesJane\cashUpdate.js

// Route สำหรับดึงรายละเอียดการโอน
router.get('/transfer-details/:id_owner', async (req, res) => {
  try {
    const { id_owner } = req.params;
    const { date } = req.query;

    const { data, error } = await DB.from('cashhistory')
      .select('paydate, nameadmin')
      .eq('id_owner', id_owner)
      .eq('date', date)
      .single();

    if (error) {
      console.error('Error fetching transfer details:', error);
      return res.status(500).json({ error: 'Failed to fetch transfer details' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Transfer details not found' });
    }

    res.json({
      paydate: data.paydate,
      nameadmin: data.nameadmin
    });
  } catch (error) {
    console.error('Error in /transfer-details route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;