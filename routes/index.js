

import express from "express";
import gibRoutes from "./routesgib/gib.js";
import booking from './routesmild/Booking.js';
import kongRoutes from './routeskong/kong.js';
import janeRoutes from './routesJane/test.js';  // ใช้ J ตัวใหญ่
import userRoutes from './routesJane/users.js';  // ใช้ J ตัวใหญ่
import stadiumRoutes from './routesJane/stadium.js';
import cashRoutes from './routesJane/cash.js';  // เพิ่มการนำเข้า cash.js
import cashUpdate from './routesJane/cashUpdate.js';



const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello express");
});




router.use("/api", gibRoutes); // ตรวจสอบว่าใช้ /api เป็น prefix

router.use('/booking', booking);
router.use('/jane', janeRoutes);
router.use('/users', userRoutes);  // เพิ่ม route ของ users
router.use('/kong', kongRoutes);
router.use('/cashUpdate', cashUpdate);
router.use('/stadium', stadiumRoutes);
router.use('/cash', cashRoutes);  // เพิ่มเส้นทางใหม่ที่ใช้ cash.js



export default router;

