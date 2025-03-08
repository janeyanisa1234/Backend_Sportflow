import cron from 'node-cron';
import { generateMonthlyCash } from '../Database/dbjane/cash.js';

// ตั้งค่า Cron Job ให้ทำงานทุกวันที่ 1 ของเดือน เวลา 00:00 (เที่ยงคืน)
const setupCronJob = () => {
    cron.schedule('0 0 1 * *', async () => {
        try {
            console.log('เริ่มตัดยอดประจำเดือน...');
            const result = await generateMonthlyCash();
            console.log(result.message);
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการตัดยอด:', error.message);
        }
    }, {
        timezone: 'Asia/Bangkok' // ตั้ง timezone เป็นประเทศไทย
    });

    console.log('Cron Job สำหรับตัดยอดประจำเดือนเริ่มทำงานแล้ว');
};

export default setupCronJob;