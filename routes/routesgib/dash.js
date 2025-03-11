import express from 'express';
import { getOwnerDashboardData } from '../../Database/dbgib/dash.js';

const router = express.Router();

// กำหนดเส้นทางสำหรับดึงข้อมูลสถิติของเจ้าของ
router.get('/owner-stats', async (req, res) => {
  const { userId, month, year, timeRange } = req.query; // เปลี่ยนจาก ownerId เป็น userId
  console.log('Handling request for owner-stats:', { userId, month, year, timeRange });

  try {
    if (!userId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId)) {
      console.error('Invalid userId:', userId);
      return res.status(400).json({ error: 'Invalid userId format. Please provide a valid UUID.' });
    }

    const data = await getOwnerDashboardData(userId, month, year, timeRange); // ส่ง userId ไป
    console.log('Data returned from getOwnerDashboardData:', data);
    res.json(data);
  } catch (error) {
    console.error('Error in owner-stats route:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;