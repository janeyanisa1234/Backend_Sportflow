import express from 'express';
import DB from '../../Database/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
        try{
            const {data: historyBooking, error: historyBookingError} = await DB
            .from('booking_history')
            .select('stadium_name,type,date,Price');

            if (historyBookingError) {
                console.error('Error fetching data:', historyBookingError);
                return res.status(500).json({ error: 'Error fetching booking data' });
            }
    
            console.log('Fetched Data:', historyBooking);
            res.json(historyBooking);

            }catch(historyBookingError){
                console.error('Error fetching data:', historyBookingError);
                res.status(500).json({ error: 'Internal Server Error' });
        }
    }
)

export default router;
