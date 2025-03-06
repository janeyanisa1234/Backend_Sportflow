import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
 
dotenv.config();
 
// อ่านค่า Service Role Key จาก .env
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
 
// ฟังก์ชันสร้าง JWT Token
export function jwt() {
    const payload = {
        role: 'authenticated',  // กำหนด role ให้ Supabase รู้ว่าเป็น user ที่รับรองแล้ว
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // หมดอายุใน 1 ชั่วโมง
    };
 
    // สร้าง JWT ด้วย Service Role Key
    return jwt.sign(payload, SERVICE_ROLE_KEY, { algorithm: 'HS256' });
}


 