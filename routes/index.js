
import express from "express";
import gibRoutes from "./routesgib/gib.js";



import kongRoutes from './routeskong/kong.js';
import janeRoutes from './routesJane/test.js';  // ใช้ J ตัวใหญ่
import userRoutes from './routesJane/users.js';  // ใช้ J ตัวใหญ่



const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello express");
});


router.use("/api", gibRoutes); // ตรวจสอบว่าใช้ /api เป็น prefix

router.use('/jane', janeRoutes);
router.use('/users', userRoutes);  // เพิ่ม route ของ users
router.use('/kong', kongRoutes);



export default router;