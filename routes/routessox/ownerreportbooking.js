import express from 'express';
import supabase from '../../Database/db.js'; 

const router = express.Router();

router.get('/api/reportbooking', async (req, res) => {
    try {
        const { userId } = req.query;

        // ตรวจสอบว่ามี userId ส่งมาหรือไม่ ถ้าไม่มีส่งข้อผิดพลาด 400
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // ดึงข้อมูลการจองทั้งหมดจากตาราง Booking พร้อมข้อมูลที่เกี่ยวข้องจากตารางอื่น
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
                    stadium_status,
                    owner_id
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

        // กรองข้อมูลการจอง เฉพาะที่ owner_id ตรงกับ userId หรือไม่มีข้อมูล add_stadium
        const filteredBookings = bookings.filter(booking => 
            !booking.add_stadium || // รวมกรณีที่ไม่มีข้อมูล add_stadium
            booking.add_stadium.owner_id === userId // รวมกรณีที่ owner_id ตรงกับ userId
        );

        // จัดรูปแบบข้อมูลให้เหมาะสมสำหรับส่งไปยัง frontend
        const formattedBookings = filteredBookings.map(booking => ({
            date: booking.date || 'N/A', 
            time: booking.time || 'N/A', 
            sportType: booking.add_court?.court_type || 'N/A', 
            stadiumName: booking.add_stadium?.stadium_name || 'N/A', 
            customer: booking.BookBank?.name || 'N/A', 
            price: booking.totalPrice ? `฿${booking.totalPrice.toFixed(2)}` : '฿0.00', 
            status: booking.status || 'N/A', 
        }));

        // ส่งข้อมูลที่จัดรูปแบบแล้วกลับไปยังผู้เรียกใช้
        res.json(formattedBookings);
    } catch (error) {
        console.error('Error fetching bookings from Supabase:', error.message);
        // ถ้ามีข้อผิดพลาด ส่ง array ว่างกลับไป
        res.status(500).json([]);
    }
});

export default router;