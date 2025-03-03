import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/index.js'; // ต้องใส่ `.js` เต็ม
import cors from 'cors'; // เพิ่ม import cors

dotenv.config();

const app = express();

// เพิ่ม middleware
app.use(cors()); // เพิ่ม cors middleware
app.use(express.json()); // เพิ่ม middleware สำหรับ parsing JSON

app.use('/api', routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
