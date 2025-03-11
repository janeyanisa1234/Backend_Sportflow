import express from "express";
import gibRoutes from "./routesgib/gib.js";
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

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello express");
});

router.use("/api/users", dashRouter); // จาก dash.js (statistics, revenue, new-today)
router.use("/api/users", userRoutes); // จาก routesJane/users.js (new-users-today)
router.use("/api/gib", gibRoutes);
router.use("/api/booking", booking);
router.use("/api/jane", janeRoutes);
router.use("/api/kong", kongRoutes);
router.use("/api/sox", soxRoutes);
router.use("/api/field", FieldRoutes);
router.use("/api/cashUpdate", cashUpdate);
router.use("/api/stadium", stadiumRoutes);
router.use("/api/cash", cashRoutes);
router.use("/api/cancle", cancleRoutes);
router.use("/api/payment", paymentQR);

export default router;