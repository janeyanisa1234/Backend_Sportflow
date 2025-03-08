import express from 'express';
import jwt from 'jsonwebtoken';
import dbsox from '../../Database/dbsox/sox.js';
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
  }
});

const upload = multer({ storage });

// Test route
router.get('/', (req, res) => {
  res.send("test test");
});

// Add stadium route
router.post('/add_stadium', upload.single('slipImage'), async (req, res) => {
  try {
    const { stadium_name, stadium_address, owner_id } = req.body;
    const uploadedFile = req.file;
    
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No stadium image uploaded' });
    }

    const filePath = uploadedFile.path;
    const fileContent = fs.readFileSync(filePath);
    const fileName = `${Date.now()}_${path.basename(uploadedFile.filename)}`;
    
    const { data: uploadData, error: uploadError } = await DB.storage
      .from('staduim')
      .upload(fileName, fileContent, {
        contentType: uploadedFile.mimetype,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return res.status(500).json({ error: 'Failed to upload stadium image' });
    }
    
    const { data: publicURL } = DB.storage
      .from('staduim')
      .getPublicUrl(fileName);
    
    const stadium_image = publicURL.publicUrl;
    
    console.log("Extracted Data:", {
      stadium_name,
      stadium_address,
      owner_id,
      stadium_image
    });

    fs.unlinkSync(filePath);

    if (owner_id) {
      console.log("Using provided owner_id:", owner_id);
      
      const { data, error } = await dbsox.addStadium({
        owner_id,
        stadium_name,
        stadium_image,
        stadium_address,
        stadium_status: 'รออนุมัติ'
      });
  
      if (error) {
        console.error("Database Error:", error);
        throw error;
      }
  
      return res.status(201).json({ message: "บันทึกข้อมูลสำเร็จ", data });
    }
    
    let userId = null;
    
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
          userId = decoded.userId || decoded.id || decoded.user_id;
        }
      } catch (tokenError) {
        console.error("Token Verification Error:", tokenError);
      }
    }
    
    if (!userId) userId = req.body.userId || req.body.user_id;
    if (!userId) userId = req.query.userId || req.query.user_id;
    if (!userId) userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        error: "Authentication Failed", 
        details: "No user ID could be extracted from the request" 
      });
    }

    try {
      const { ownerId, error: ownerError } = await dbsox.getOwnerIdByUserId(userId);
      
      if (ownerError || !ownerId) {
        return res.status(400).json({ 
          error: "ไม่พบข้อมูลเจ้าของสนาม", 
          details: "กรุณาลงทะเบียนเป็นเจ้าของสนามก่อนเพิ่มสนาม" 
        });
      }
      
      const { data, error } = await dbsox.addStadium({
        owner_id: ownerId,
        stadium_name,
        stadium_image,
        stadium_address,
        stadium_status: 'รออนุมัติ'
      });
  
      if (error) {
        console.error("Database Error:", error);
        throw error;
      }
  
      res.status(201).json({ message: "บันทึกข้อมูลสำเร็จ", data });
    } catch (ownerError) {
      console.error("Owner ID Error:", ownerError);
      res.status(400).json({ 
        error: "ไม่พบข้อมูลเจ้าของสนาม", 
        details: "กรุณาลงทะเบียนเป็นเจ้าของสนามก่อนเพิ่มสนาม" 
      });
    }
  } catch (error) {
    console.error("Critical Error:", error);
    res.status(500).json({ 
      error: "เกิดข้อผิดพลาด กรุณาลองใหม่", 
      details: error.message 
    });
  }
});

// Get stadiums for a user
router.get('/stadiums/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`Received request to fetch stadiums for userId: ${userId}`);
    
    if (!userId) {
      return res.status(400).json({ 
        error: "ไม่พบข้อมูลผู้ใช้", 
        details: "User ID is required but was not provided"
      });
    }
    
    let parsedUserId = userId;
    try {
      if (typeof userId === 'string' && (userId.startsWith('{') || userId.startsWith('['))) {
        const parsed = JSON.parse(userId);
        parsedUserId = parsed.id || parsed.user_id || parsed.userId || parsed;
        console.log(`Parsed user ID from JSON string: ${parsedUserId}`);
      }
    } catch (parseError) {
      console.log("userId is not a JSON string, continuing with original value");
    }
    
    const { ownerId, error: ownerError } = await dbsox.getOwnerIdByUserId(parsedUserId);
    
    if (ownerError || !ownerId) {
      console.error("Error finding owner ID:", ownerError);
      return res.status(404).json({ 
        error: "ไม่พบข้อมูลเจ้าของสนาม", 
        details: "ไม่พบข้อมูลผู้ใช้เป็นเจ้าของสนาม กรุณาลงทะเบียนเจ้าของสนามก่อน"
      });
    }
    
    console.log(`Found owner ID: ${ownerId} for user: ${parsedUserId}`);
    
    const { data, error } = await dbsox.getStadiumsByOwnerId(ownerId);
    
    if (error) {
      console.error("Database error when fetching stadiums:", error);
      throw error;
    }
    
    // Debug log to confirm sports types data
    data.forEach(stadium => {
      console.log(`Stadium ${stadium.stadium_name} sports types:`, stadium.sports_types);
    });
    
    return res.status(200).json({ data: data || [] });
  } catch (error) {
    console.error("Error fetching stadiums:", error.message);
    res.status(500).json({ 
      error: "Failed to fetch stadiums", 
      details: error.message 
    });
  }
});

export default router;