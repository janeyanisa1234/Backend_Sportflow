import express from "express";
import { paymentQR } from "../../Database/dbpalmmy/payment.js"; // ใช้ { paymentQR } เพราะเป็น named export

const router = express.Router();

router.post("/generateQR", async (req, res) => {
  try {
    console.log("Received Request Body:", req.body);
    const amount = req.body.amount;
    const mobileNumber = req.body.mobileNumber;

    const result = await paymentQR(amount, mobileNumber);
    res.status(200).json(result);
  } catch (error) {
    console.error("Server Error:", error.message);
    res.status(400).json({ message: error.message || "เกิดข้อผิดพลาดในระบบ" });
  }
});

export default router;