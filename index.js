import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js'; // ต้องใส่ `.js` เต็ม

import bodyParser from 'body-parser';

import setupCronJob from './cron/monthlyCashCron.js'; // นำเข้า Cron Job


dotenv.config();

const app = express();



// เพิ่ม middleware
app.use(cors()); // เพิ่ม cors middleware
app.use(express.json()); // เพิ่ม middleware สำหรับ parsing JSON
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true}))
app.use(routes);

app.use('/api', routes);
// เริ่ม Cron Job
setupCronJob();



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {

    console.log(`Server running at http://localhost:${PORT}`);
});

