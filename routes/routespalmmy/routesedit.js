import express from 'express';
import DB from '../../Database/db.js';


const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { data, error } = await DB
            .from('add_stadium')
            .select('stadium_name');

        if (error) {
            console.error('Error fetching data:', error);
            return res.status(500).json({ error: 'Error fetching booking data' });
        }

        console.log('Fetched Data:', data);
        res.json(data);

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
