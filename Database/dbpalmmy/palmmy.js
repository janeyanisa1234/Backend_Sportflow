import DB from '../db.js';  // แก้ไขการนำเข้าให้ถูกต้อง

// ฟังก์ชันบันทึกข้อมูลการชำระเงินลงในตาราง 'Booking'
async function Payment( date, time, imageUrl) {
    try {
        const { data, error } = await DB
            .from('Booking')  // ชื่อตารางใน Supabase
            .insert([{ 
                                date: date,  // วันที่โอน
                time: time,  // เวลาที่โอน
                image: imageUrl,  // URL ของสลิปโอนเงิน
            }])
            .select(); // คืนค่าข้อมูลที่ถูกบันทึก

        if (error) throw error;
        console.log('✅ Payment recorded:', data);
        return { data, error: null };
    } catch (error) {
        console.error('❌ Error inserting payment data:', error.message);
        return { data: null, error: error.message };
    }
}

// ฟังก์ชันอัปโหลดสลิปการโอนเงินไปยัง Supabase Storage
async function uploadSlip(file) {
    try {
        const fileName = `slips/${Date.now()}_${file.originalname}`; // ตั้งชื่อไฟล์ให้ไม่ซ้ำกัน

        // อัปโหลดไฟล์ไปที่ Bucket "payment_slips"
        const { data, error } = await DB.storage
            .from('payment_slips') // ใส่ชื่อ Bucket ของ Supabase Storage
            .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (error) throw error;

        // รับ Public URL ของไฟล์ที่อัปโหลด
        const { data: publicData } = await DB.storage
            .from('payment_slips')
            .getPublicUrl(fileName);

        if (!publicData) throw new Error("Failed to get public URL");

        return { publicURL: publicData.publicUrl, error: null };
    } catch (error) {
        console.error('❌ Upload error:', error.message);
        return { publicURL: null, error: error.message };
    }
}

export { Payment, uploadSlip };
