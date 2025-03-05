import express from 'express';

import kongRoutes from './routeskong/kong.js';
import janeRoutes from './routesJane/test.js';  // ใช้ J ตัวใหญ่
import userRoutes from './routesJane/users.js';  // ใช้ J ตัวใหญ่
import CancleRoutes from './routesJane/cancle.js'; 
import stadiumRoutes from './routesJane/stadium.js'


const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello express');
});

router.use('/jane', janeRoutes);
router.use('/users', userRoutes);  // เพิ่ม route ของ users
router.use('/kong', kongRoutes);
router.use('/cancleAdmin', CancleRoutes);
router.use('/stadium', stadiumRoutes)


export default router;