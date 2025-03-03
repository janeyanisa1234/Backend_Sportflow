import express from 'express';
import { getAllUsers, getRegularUsers, getOwnerUsers, deleteUser, checkUserExists } from '../../Database/dbjane/users.js';

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

export default router;
