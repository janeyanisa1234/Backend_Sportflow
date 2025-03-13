import express from 'express';
import path from 'path';
import supabase from '../../Database/db.js'; // Import the Supabase client
 
const router = express.Router();
 
// Test route
router.get('/', (req, res) => {
    res.send("test tes");
});
 
// Route for booking report
router.get('/api/reportbooking', async (req, res) => {
    try {
        // Fetch data from Supabase with joins
        const { data: bookings, error } = await supabase
            .from('Booking')
            .select(`
                date,
                time,
                totalPrice,
                status:status_booking,
                payment,
                date_play,
                add_stadium (
                    stadium_name,
                    stadium_address,
                    stadium_status
                ),
                add_court (
                    court_type,
                    court_quantity,
                    court_price,
                    court_image
                ),
                BookBank (
                    name,
                    bank,
                    bank_number
                )
            `);
 
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
 
        // Log the raw bookings data for debugging
        console.log('Raw bookings from Supabase:', bookings);
 
        // Ensure bookings is an array
        if (!Array.isArray(bookings)) {
            console.warn('Bookings data is not an array:', bookings);
            return res.status(500).json([]);
        }
 
        // Flatten the nested data for the frontend
        const formattedBookings = bookings.map(booking => ({
            date: booking.date || 'N/A',
            time: booking.time || 'N/A',
            sportType: booking.add_court?.court_type || 'N/A',
            stadiumName: booking.add_stadium?.stadium_name || 'N/A',
            stadiumAddress: booking.add_stadium?.stadium_address || 'N/A',
            customer: booking.BookBank?.name || 'N/A',
            bank: booking.BookBank?.bank || 'N/A',
            bankNumber: booking.BookBank?.bank_number || 'N/A',
            price: booking.totalPrice ? `฿${booking.totalPrice.toFixed(2)}` : '฿0.00',
            status: booking.status || 'N/A',
            payment: booking.payment || 'N/A',
            datePlay: booking.date_play || 'N/A',
            courtSlip: booking.courtSlipPayment || 'N/A',
            courtQuantity: booking.add_court?.court_quantity || 'N/A',
            courtPrice: booking.add_court?.court_price ? `฿${booking.add_court.court_price.toFixed(2)}` : '฿0.00',
            reasonCancel: booking.BookBank?.reasoncancel || 'N/A',
            bankings: booking.BookBank?.bankings || 'N/A'
        }));
 
        // Log the formatted data for debugging
        console.log('Formatted bookings:', formattedBookings);
 
        res.json(formattedBookings);
    } catch (error) {
        console.error('Error fetching bookings from Supabase:', error.message);
        res.status(500).json([]); // Return an empty array on error
    }
});
 
export default router;