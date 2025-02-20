import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// โหลดตัวแปรแวดล้อมจากไฟล์ .env
dotenv.config();

// ตรวจสอบค่า SUPABASE_KEY
console.log("Supabase Key Loaded:", process.env.SUPABASE_KEY ? "Yes" : "No");

const supabaseUrl = 'https://kwszcrucycfuzgboakuq.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

// เช็คว่าตัวแปร `supabaseKey` ถูกโหลดมาหรือไม่
if (!supabaseKey) {
    throw new Error("SUPABASE_KEY is missing! Please check your .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();

app.get('/', (req, res) => {
    res.send('Hello, express!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
