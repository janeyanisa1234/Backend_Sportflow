import DB from '../db.js';
 
async function ShowPlace() {
    try {
        const { data: ShowPlace, error: ShowPlaceError } = await DB
            .from('add_stadium')
            .select('*');
 
        if (ShowPlaceError) {
            console.error('Error fetching ShowPlace data:', ShowPlaceError);
            return;
        }
 
        console.log('Fetched ShowPlace Data:', ShowPlace);
     
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}


async function Booking(stadium_name) {
    try {
        if (!stadium_name) {
            throw new Error("ต้องระบุ stadium_name");
        }
 
        // ดึงข้อมูลสนามที่เลือกจากตาราง `add_field`
        const { data: stadiums, error: stadiumError } = await DB
            .from('add_field')
            .select('stadium_name, stadium_location')
            .eq('stadium_name', stadium_name); // กรองเฉพาะสนามที่ถูกเลือก
 
        if (stadiumError) throw stadiumError;
        if (!stadiums || stadiums.length === 0) {
            throw new Error("ไม่พบข้อมูลสนามที่เลือก");
        }
 
        // เตรียมข้อมูลการจอง
        const bookings = stadiums.map(stadium => ({
            stadium_name: stadium.stadium_name,
            stadium_location: stadium.stadium_location,
            status: "active"
        }));
 
        // บันทึกข้อมูลการจองไปยังตาราง `Booking`
        const { data: insertedData, error: insertError } = await DB
            .from('Booking')
            .insert(bookings);
 
        if (insertError) throw insertError;
 
        console.log("Booking data inserted:", insertedData);
        return { data: insertedData, error: null };
    } catch (error) {
        console.error('🔥 เกิดข้อผิดพลาดในการจอง:', error.message);
        return { data: null, error: error.message };
    }
}

async function checkUserExists(userId) {
    try {
        const { data, error } = await DB
            .from('users')
            .select('*')
            .eq('id', userId);

        if (error) {
            throw error;
        }

        return { exists: data.length > 0, error: null };
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการตรวจสอบผู้ใช้:', error);
        return { exists: false, error: error.message };
    }
}

export { ShowPlace, Booking };