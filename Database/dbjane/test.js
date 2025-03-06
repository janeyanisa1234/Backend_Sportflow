import DB from '../db.js';  // แก้ไขการนำเข้าให้ถูกต้อง

async function getCashData() {
    try {
        const { data, error } = await DB
            .from('cash')
            .select('*');

        // ตรวจสอบว่ามีข้อผิดพลาดเกิดขึ้นหรือไม่
        if (error) {
            throw error;  // ถ้ามีข้อผิดพลาดจะ throw ไปที่ catch block
        }

        // ถ้าไม่มีข้อผิดพลาด แสดงผลข้อมูล
        console.log(data);  // แสดงข้อมูลที่ได้จากฐานข้อมูล
    } catch (error) {
        // จัดการกับข้อผิดพลาดที่เกิดขึ้น
        console.error('Error fetching cash data:', error.message);
    }
}

//test

getCashData();