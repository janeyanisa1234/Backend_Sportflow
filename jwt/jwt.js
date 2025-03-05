import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function generateJWT() { // เปลี่ยนชื่อฟังก์ชันให้ชัดเจน
  const payload = {
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // หมดอายุใน 1 ชั่วโมง
  };

  return jwt.sign(payload, SERVICE_ROLE_KEY, { algorithm: 'HS256' });
}