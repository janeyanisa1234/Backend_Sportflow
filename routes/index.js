import express from 'express';
import janeRoutes from './routesJane/test.js';  // ใช้ J ตัวใหญ่
import userRoutes from './routesJane/users.js';  // ใช้ J ตัวใหญ่

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello express');
});

router.use('/jane', janeRoutes);
router.use('/users', userRoutes);  // เพิ่ม route ของ users

export default router;