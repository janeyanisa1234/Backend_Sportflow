import express from "express";
import gibRoutes from "./routesgib/gib.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello express");
});

router.use("/api", gibRoutes); // ตรวจสอบว่าใช้ /api เป็น prefix

export default router;