import express from 'express';
import MildRoutes from './routesmild/routesmild.js'; 
import Plammy from './routespalmmy/palmmy.js'; 

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello express');
});

router.use('/Mild', MildRoutes);
router.use('/Plam', Plammy);

export default router;