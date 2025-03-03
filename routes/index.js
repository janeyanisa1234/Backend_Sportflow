//รวม API ของทุกคน ไว้สร้างเส้นทาง
import express from 'express';
import janeRoutes from './routesJane/test.js';
import kongRoutes from './routeskong/kong.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello express');
});

router.use('/jane', janeRoutes);

router.use('/kong', kongRoutes);

export default router;