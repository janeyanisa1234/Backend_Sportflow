import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';  // ✅ เพิ่มการนำเข้า CORS
import routes from './routes/index.js';

dotenv.config();

const app = express();

app.use(cors()); // ✅ เปิดใช้งาน CORS
// หรือกำหนดให้อนุญาตเฉพาะ `localhost:3000` เท่านั้น
// app.use(cors({ origin: "http://localhost:3000" }));

app.use(express.json()); // ✅ รองรับ JSON Body
app.use('/api', routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
