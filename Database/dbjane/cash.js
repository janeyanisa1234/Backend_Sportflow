import DB from '../db.js';  // เชื่อมต่อกับฐานข้อมูล Supabase หรือฐานข้อมูลที่ใช้

// ฟังก์ชั่นเพื่อหาวันสุดท้ายของเดือนที่ผ่านมา
const getLastDayOfPreviousMonth = () => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0); // วันสุดท้ายของเดือนที่ผ่านมา
    return lastDay;
};

// ฟังก์ชั่นในการดึงยอดรวมสำหรับแต่ละสนามในเดือนที่ผ่านมา
export const generateMonthlyCash = async () => {
    const lastDayOfPreviousMonth = getLastDayOfPreviousMonth();
    const firstDayOfPreviousMonth = new Date(lastDayOfPreviousMonth.getFullYear(), lastDayOfPreviousMonth.getMonth(), 1); // วันที่ 1 ของเดือนที่ผ่านมา

    try {
        // ขั้นตอนที่ 1: ดึงข้อมูลจากตาราง Booking โดยกรองเฉพาะ status_booking = "ยืนยัน"
        const { data: bookings, error: bookingError } = await DB
            .from('Booking')
            .select('id_stadium, totalPrice, status_booking, date')  // แก้ไขจาก 'booking_date' เป็น 'date'
            .gte('date', firstDayOfPreviousMonth.toISOString())  // กรองตั้งแต่วันที่ 1 ของเดือนที่ผ่านมา
            .lte('date', lastDayOfPreviousMonth.toISOString())   // กรองถึงวันที่สุดท้ายของเดือนที่ผ่านมา
            .eq('status_booking', 'ยืนยัน');  // เฉพาะการจองที่ยืนยันแล้ว

        if (bookingError) {
            throw new Error(bookingError.message);
        }

        // ขั้นตอนที่ 2: คำนวณยอดรวม per id_stadium
        const stadiumTotals = bookings.reduce((acc, booking) => {
            if (!acc[booking.id_stadium]) {
                acc[booking.id_stadium] = 0;
            }
            acc[booking.id_stadium] += booking.totalPrice;
            return acc;
        }, {});

        // ขั้นตอนที่ 3: ตรวจสอบว่า id_stadium มีในตาราง add_stadium หรือไม่
        const { data: stadiums, error: stadiumError } = await DB
            .from('add_stadium')
            .select('id, owner_id');

        if (stadiumError) {
            throw new Error(stadiumError.message);
        }

        // สร้างแผนที่สำหรับการค้นหา id_owner ตาม id_stadium
        const stadiumOwners = stadiums.reduce((acc, stadium) => {
            acc[stadium.id] = stadium.owner_id;
            return acc;
        }, {});

        // ขั้นตอนที่ 4: ใส่ข้อมูลลงในตาราง cashBooking
        for (let id_stadium in stadiumTotals) {
            const totalCash = stadiumTotals[id_stadium];
            const id_owner = stadiumOwners[id_stadium];

            if (id_owner) {
                // ใส่ข้อมูลลงในตาราง cashBooking
                const { error: insertError } = await DB
                    .from('cashBooking')
                    .insert([{
                        id_owner,
                        id_stadium,
                        Totalcash: totalCash,
                        statusCash: 'รอโอน', // สถานะเริ่มต้นคือ 'รอโอน'
                        date: lastDayOfPreviousMonth.toISOString(),  // วันที่คือวันสุดท้ายของเดือนที่ผ่านมา
                    }]);

                if (insertError) {
                    throw new Error(insertError.message);
                }
            }
        }

        return { message: 'การตัดยอดเงินเดือนนี้สำเร็จแล้ว' };
    } catch (error) {
        console.error(error.message);
        throw error;
    }
};
