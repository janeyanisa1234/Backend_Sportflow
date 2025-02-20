import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Jane API is working');
});

export default router;
