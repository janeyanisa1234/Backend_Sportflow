//รวม API ของทุกคน ไว้สร้างเส้นทาง
import express from 'express';
import janeRoutes from './routesJane/test.js';  // ต้องใส่ `.js` เต็ม

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello express');
});

router.use('/jane', janeRoutes);

export default router;  
