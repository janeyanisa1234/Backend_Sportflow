import express from 'express';
import jwt from 'jsonwebtoken';
import dbsox from '../../Database/dbsox/sox.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Test route
router.get('/', (req, res) => {
  res.send("test test");
});

// Add stadium route with multer middleware
router.post('/add_stadium', upload.single('stadium_image'), async (req, res) => {
    try {
      // Extensive logging of all request details
      console.log("Full Request Headers:", req.headers);
      console.log("Full Request Body:", req.body);
      console.log("File:", req.file);
      
      // Extract form data
      const { stadium_name, stadium_address, owner_id } = req.body;
      const stadium_image = req.file ? req.file.path : null;
      
      console.log("Extracted Data:", {
        stadium_name,
        stadium_address,
        owner_id,
        stadium_image
      });
  
      // Detailed logging for authentication debugging
      console.log("Authorization Header:", req.headers.authorization);
      console.log("JWT Secret:", process.env.JWT_SECRET ? 'Set' : 'Not Set');
  
      // If owner_id is directly provided in the request, use it
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
      
      // Comprehensive user ID extraction attempt
      let userId = null;
      
      // Check various possible sources
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          console.log("Extracted Token:", token);
          
          if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            console.log("Decoded Token:", decoded);
            userId = decoded.userId || decoded.id;
          }
        } catch (tokenError) {
          console.error("Token Verification Error:", tokenError);
        }
      }
      
      // Additional fallback checks
      if (!userId) userId = req.body.userId;
      if (!userId) userId = req.query.userId;
      if (!userId) userId = req.user?.id;
  
      // If still no user ID, return detailed error
      if (!userId) {
        console.error("Authentication Failure Details:", {
          hasAuthHeader: !!req.headers.authorization,
          bodyKeys: Object.keys(req.body),
          queryKeys: Object.keys(req.query),
          hasUserObject: !!req.user
        });
        
        return res.status(401).json({ 
          error: "Authentication Failed", 
          details: "No user ID could be extracted from the request" 
        });
      }
  
      try {
        // Proceed with stadium addition
        const { ownerId } = await dbsox.getOwnerIdByUserId(userId);
        
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
    
    // Attempt to get owner ID
    try {
      const { ownerId, error: ownerError } = await dbsox.getOwnerIdByUserId(userId);
      
      if (ownerError || !ownerId) {
        console.error("Error finding owner ID:", ownerError);
        return res.status(404).json({ 
          error: "ไม่พบข้อมูลเจ้าของสนาม", 
          details: "ไม่พบข้อมูลผู้ใช้เป็นเจ้าของสนาม กรุณาลงทะเบียนเจ้าของสนามก่อน"
        });
      }
      
      console.log(`Found owner ID: ${ownerId} for user: ${userId}`);
      
      // Get stadiums using owner ID
      const { data, error } = await dbsox.getadd_stadiumByUserId(userId);

      if (error) {
        console.error("Database error when fetching stadiums:", error);
        throw error;
      }

      // Return empty array if no stadiums found
      res.status(200).json({ data: data || [] });
    } catch (ownerError) {
      console.error("Error getting owner ID:", ownerError);
      res.status(404).json({ 
        error: "ไม่พบข้อมูลเจ้าของสนาม", 
        details: ownerError.message || "No owner found for this user ID"
      });
    }
  } catch (error) {
    console.error("Error fetching stadiums:", error.message);
    res.status(500).json({ 
      error: "Failed to fetch stadiums", 
      details: error.message 
    });
  }
});

export default router;