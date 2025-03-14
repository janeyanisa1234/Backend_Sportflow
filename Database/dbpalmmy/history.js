import DB from "../db.js"; 
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import _ from "lodash";

// ฟังก์ชันสำหรับสร้าง QR Code
export async function paymentQR(amount, mobileNumber = "0853186887") {
  try {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      throw new Error("จำนวนเงินไม่ถูกต้อง");
    }

    const payload = generatePayload(mobileNumber, { amount: parsedAmount });
    console.log("Generated Payload:", payload);

    const option = {
      color: {
        dark: "#000",
        light: "#fff",
      },
    };

    return new Promise((resolve, reject) => {
      QRCode.toDataURL(payload, option, (err, url) => {
        if (err) {
          console.error("QR Code Error:", err);
          reject(new Error("เกิดข้อผิดพลาดในการสร้าง QR Code"));
        } else {
          console.log("Generated QR URL:", url);
          resolve({ qr: url, amount: parsedAmount });
        }
      });
    });
  } catch (error) {
    console.error("PaymentQR Error:", error);
    throw error;
  }
}