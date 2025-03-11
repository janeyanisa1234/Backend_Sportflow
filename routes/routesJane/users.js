import express from 'express';
import { getAllUsers, getRegularUsers, getOwnerUsers, deleteUser, checkUserExists, countUsers, countOwnerUsers,countRegularUsers, getNewUsersToday } from '../../Database/dbjane/users.js';

const router = express.Router();

// ดึงข้อมูลผู้ใช้ทั้งหมด
router.get('/', async (req, res) => {
    try {
        const { data, error } = await getAllUsers();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาด: ' + error
            });
        }
        
        res.json(data);
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาด: ' + error.message
        });
    }
});

// ดึงข้อมูลเฉพาะผู้ใช้ทั่วไป (ไม่ใช่ผู้ประกอบการ)
router.get('/regular', async (req, res) => {
    try {
        const { data, error } = await getRegularUsers();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาด: ' + error
            });
        }
        
        res.json(data);
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ทั่วไป:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาด: ' + error.message
        });
    }
});

// ดึงข้อมูลเฉพาะผู้ประกอบการ
router.get('/owners', async (req, res) => {
    try {
        const { data, error } = await getOwnerUsers();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาด: ' + error
            });
        }
        
        res.json(data);
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ประกอบการ:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาด: ' + error.message
        });
    }
});  

// ตรวจสอบว่าผู้ใช้มีอยู่จริงหรือไม่
router.get('/:id/exists', async (req, res) => {
    try {
        const userId = req.params.id;
        const { exists, error } = await checkUserExists(userId);
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการตรวจสอบ: ' + error
            });
        }
        
        res.json({ exists });
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการตรวจสอบผู้ใช้:', error);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการตรวจสอบ: ' + error.message 
        });
    }
});

// ลบผู้ใช้โดย ID
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        console.log(`ได้รับคำขอลบผู้ใช้ ID: ${userId}`);
        
        // ตรวจสอบว่าผู้ใช้มีอยู่จริงหรือไม่ก่อนลบ
        const { exists, error: existsError } = await checkUserExists(userId);
        
        if (existsError) {
            return res.status(500).json({ 
                success: false, 
                message: `เกิดข้อผิดพลาดในการตรวจสอบผู้ใช้: ${existsError}` 
            });
        }
        
        if (!exists) {
            return res.status(404).json({ 
                success: false, 
                message: `ไม่พบผู้ใช้ที่มี ID: ${userId}` 
            });
        }
        
        // ลบผู้ใช้
        const { success, error } = await deleteUser(userId);
        
        if (!success) {
            console.error(`การลบผิดพลาด: ${error}`);
            return res.status(500).json({ 
                success: false, 
                message: `ไม่สามารถลบผู้ใช้ได้: ${error}` 
            });
        }
        
        console.log(`ลบผู้ใช้ ID: ${userId} สำเร็จ`);
        res.json({ 
            success: true, 
            message: 'ลบผู้ใช้เรียบร้อยแล้ว' 
        });
    } catch (error) {
        console.error(`เกิดข้อผิดพลาดในการลบผู้ใช้: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการลบผู้ใช้: ' + error.message 
        });
    }
});
// นับจำนวนผู้ใช้ทั้งหมด
router.get('/count', async (req, res) => {
    try {
        const { count, error } = await countUsers();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการนับจำนวนผู้ใช้: ' + error
            });
        }
        
        res.json({ count });
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการนับจำนวนผู้ใช้:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการนับจำนวนผู้ใช้: ' + error.message
        });
    }
});

// นับจำนวนผู้ประกอบการ
router.get('/owners/count', async (req, res) => {
    try {
        const { count, error } = await countOwnerUsers();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการนับจำนวนผู้ประกอบการ: ' + error
            });
        }
        
        res.json({ count });
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการนับจำนวนผู้ประกอบการ:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการนับจำนวนผู้ประกอบการ: ' + error.message
        });
    }
});

// นับจำนวนผู้ใช้ทั่วไป (ไม่รวมผู้ประกอบการ)
router.get('/regular/count', async (req, res) => {
    try {
        const { count, error } = await countRegularUsers();  // เรียกฟังก์ชันที่เพิ่มมา
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการนับจำนวนผู้ใช้ทั่วไป: ' + error
            });
        }
        
        res.json({ count });
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการนับจำนวนผู้ใช้ทั่วไป:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการนับจำนวนผู้ใช้ทั่วไป: ' + error.message
        });
    }
});

// เพิ่ม API ที่ดึงข้อมูลสถิติของผู้ใช้
router.get('/statistics', async (req, res) => {
    try {
        // ดึงข้อมูลจำนวนผู้ใช้ทั้งหมด
        const { count, error } = await countUsers();  // countUsers() จะเป็นฟังก์ชันที่ดึงจำนวนผู้ใช้ทั้งหมด

        // ดึงข้อมูลจำนวนผู้ประกอบการ
        const { count: ownerCount, error: ownerError } = await countOwnerUsers();  // countOwnerUsers() ดึงจำนวนผู้ประกอบการ

        // ดึงข้อมูลจำนวนผู้ใช้ทั่วไป
        const { count: regularCount, error: regularError } = await countRegularUsers();  // countRegularUsers() ดึงจำนวนผู้ใช้ทั่วไป

        // หากเกิดข้อผิดพลาดในการดึงข้อมูล
        if (error || ownerError || regularError) {
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ'
            });
        }

        // คำนวณเปอร์เซ็นต์
        const totalCount = count;  // จำนวนผู้ใช้ทั้งหมด
        const ownerPercentage = totalCount > 0 ? (ownerCount / totalCount) * 100 : 0;  // เปอร์เซ็นต์ของผู้ประกอบการ
        const regularPercentage = totalCount > 0 ? (regularCount / totalCount) * 100 : 0;  // เปอร์เซ็นต์ของผู้ใช้ทั่วไป
        const totalPercentage = 100;  // เปอร์เซ็นต์ของผู้ใช้ทั้งหมดจะเป็น 100%

        // ส่งผลลัพธ์ทั้งหมดกลับไปที่ frontend
        res.json({
            totalCount,        // จำนวนผู้ใช้งานทั้งหมด
            ownerCount,        // จำนวนผู้ประกอบการ
            regularCount,      // จำนวนผู้ใช้ทั่วไป
            ownerPercentage,   // เปอร์เซ็นต์ของผู้ประกอบการ
            regularPercentage, // เปอร์เซ็นต์ของผู้ใช้ทั่วไป
            totalPercentage    // เปอร์เซ็นต์ของผู้ใช้ทั้งหมด (100%)
        });
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการคำนวณสถิติผู้ใช้:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการคำนวณสถิติผู้ใช้: ' + error.message
        });
    }
});

// ดึงข้อมูลผู้ใช้ใหม่วันนี้ (เปลี่ยนเป็น /new-users-today)
router.get("/new-users-today", async (req, res) => {
    try {
      const { data, error } = await getNewUsersToday();
  
      if (error) {
        return res.status(500).json({
          success: false,
          message: "เกิดข้อผิดพลาด: " + error,
        });
      }
  
      res.json(data);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ใหม่วันนี้:", error);
      res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาด: " + error.message,
      });
    }
  });


export default router;
