import express from 'express';
import jwt from 'jsonwebtoken';
import dbsox from '../../Database/dbsox/sox.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import DB from '../../Database/db.js';

const router = express.Router();

// Test route
router.get('/', (req, res) => {
  res.send("test test");
});

// Configure multer for field image uploads
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

// Add field to stadium route
router.post('/add_field', fieldUpload.single('fieldImage'), async (req, res) => {
  
  try {
    // Extract form data
    const { stadium_id, court_type, court_quantity, court_price, time_slots } = req.body;
    const uploadedFile = req.file;
    
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No field image uploaded' });
    }

    // Validate required fields
    if (!stadium_id || !court_type || !court_quantity || !court_price) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'All fields (stadium_id, court_type, court_quantity, court_price) are required'
      });
    }

    // Upload file to Supabase Storage
    const filePath = uploadedFile.path;
    const fileContent = fs.readFileSync(filePath);
    const fileName = `field_${Date.now()}_${path.basename(uploadedFile.filename)}`;
    
    // Upload file to 'staduim' bucket (note: this appears to be the correct bucket name from the code)
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
    
    // Get the public URL of the uploaded file - corrected to use 'staduim' bucket
    const { data: publicURL } = DB.storage
      .from('staduim')
      .getPublicUrl(fileName);
    
    // Use the public URL for court_image
    const court_image = publicURL.publicUrl;
    
    // Delete the local file after successful upload
    fs.unlinkSync(filePath);

    // Add the court WITHOUT time slots for now
    const { data, error } = await DB
      .from('add_court')
      .insert([{ 
        stadium_id,
        court_type,
        court_quantity: parseInt(court_quantity),
        court_price: parseInt(court_price),
        court_image  // Ensure this field name matches your database schema
      }])
      .select();
    
    if (error) {
      console.error("Database Error:", error);
      return res.status(500).json({ 
        error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล", 
        details: error.message 
      });
    }
    
    res.status(201).json({ 
      message: "เพิ่มสนามกีฬาสำเร็จ", 
      data
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