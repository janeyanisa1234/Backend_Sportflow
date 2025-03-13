import express from "express";
import gibRoutes from "./routesgib/gib.js"; // ใช้ gibRoutes ภายใต้ /api
import dashRoutes from "./routesgib/dash.js";
import booking from "./routesmild/Booking.js";
import kongRoutes from "./routeskong/kong.js";
import janeRoutes from "./routesJane/test.js";
import userRoutes from "./routesJane/users.js";
import stadiumRoutes from "./routesJane/stadium.js";
import cashRoutes from "./routesJane/cash.js";
import cashUpdate from "./routesJane/cashUpdate.js";
import dashRouter from "../Database/dbjane/dash.js";
import soxRoutes from "./routessox/sox.js";
import FieldRoutes from "./routessox/field.js";
import paymentQR from "./routespalmmy/payment.js";
import cancleRoutes from "./routesJane/cancle.js";

import reportbookRoute from './routessox/ownerreportbooking.js';

import pingRoutes from './routesping/ping.js';
 
 
import paymentRoutes from './routespalmmy/payment.js';
import historyRoutes from './routespalmmy/booking_history.js';
import cancleRoutesUser from './routespalmmy/cancleroutes.js';
 
import iceRoutes from './routesice/ice.js';
import promotionRoutes from './routesmild/PromotionRoutes.js';

const router = express.Router();
 
router.use("/api", gibRoutes); // ตรวจสอบว่าใช้ /api เป็น prefix
router.use("/api", dashRoutes); // เพิ่ม dash.js ภายใต้ /api
router.use("/users", dashRouter); // จาก dash.js (statistics, revenue, new-today)
router.use("/users", userRoutes); // จาก routesJane/users.js (new-users-today)
router.use("/gib", gibRoutes);


router.use('/reportbooking', reportbookRoute);

router.use("/booking", promotionRoutes); // /booking/sports-categories, /booking/promoted-stadiums
router.use("/booking", booking);// /booking/sports-categories และ /booking/filtered-stadiums


router.use('/jane', janeRoutes);
router.use('/users', userRoutes);  // เพิ่ม route ของ users
router.use('/kong', kongRoutes);
router.use('/sox', soxRoutes);
router.use('/field', FieldRoutes);
 
router.use('/cashUpdate', cashUpdate);
router.use('/stadium', stadiumRoutes);
router.use('/cash', cashRoutes);  // เพิ่มเส้นทางใหม่ที่ใช้ cash.js
 
router.use('/', paymentRoutes);
 
router.use('/history', historyRoutes);
router.use('/', cancleRoutes);
 
router.use("/cancle", cancleRoutesUser);
router.use('/', paymentQR);
router.use('/ice',iceRoutes);
 
router.use('/ping', pingRoutes);
 
 
 
export default router;
 