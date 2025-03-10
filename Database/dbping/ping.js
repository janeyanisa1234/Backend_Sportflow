import DB from '../db.js'; // Import ฐานข้อมูล (Supabase หรืออื่น ๆ)

// ฟังก์ชันแปลงวันที่เป็น "วัน เดือน ปี" หรือ "เดือน ปี"
const formatDateWithPeriod = (dateString, type = "full") => {
  if (!dateString || dateString === "null") return "-"; // ถ้าไม่มีวันที่ ให้คืนค่า "-"

  try {
    let date = new Date(dateString);

    // ถ้าเป็น timestamp (ตัวเลข) ให้แปลงเป็น Date
    if (!isNaN(Number(dateString))) {
      date = new Date(Number(dateString));
    }

    if (isNaN(date.getTime())) {
      console.warn("Invalid date:", dateString);
      return "-";
    }

    if (type === "period") {
      const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
      const month = date.toLocaleString("th-TH", { month: "long" });
      return `${month} ${year}`;
    }

    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "-";
  }
};

// ดึงข้อมูลสรุปของเดือนและปีที่เลือก
export const getSummaryData = async (month, year, ownerId) => {
    try {
      // Format the month with leading zero if needed
      const formattedMonth = String(month).padStart(2, '0');
      
      // For text date column, we need to use LIKE queries instead of date comparisons
      const startPattern = `${year}-${formattedMonth}%`;
      
      const { data, error } = await DB
        .from("cashbooking")
        .select("totalcash")
        .eq("id_owner", ownerId)
        .like("date", startPattern);
  
      if (error) {
        console.error("Summary fetch error:", error);
        throw new Error("Failed to fetch summary: " + error.message);
      }
  
      const totalAmount = data.reduce((sum, item) => sum + (Number(item.totalcash) || 0), 0);
      const serviceFee = totalAmount * 0.1;
      const netAmount = totalAmount - serviceFee;
  
      return { 
        data: { 
          totalAmount, 
          serviceFee, 
          netAmount 
        }, 
        error: null 
      };
    } catch (error) {
      return { data: null, error };
    }
  };

// ฟังก์ชันปรับรูปแบบวันที่ใหม่ที่รองรับทุกกรณี
const formatDateString = (dateStr) => {
  if (!dateStr || dateStr === "null" || dateStr === "undefined") return "-";
  
  try {
    // กรณีเป็นตัวเลข (timestamp)
    if (!isNaN(Number(dateStr))) {
      const timestamp = Number(dateStr);
      // ตรวจสอบว่าเป็น unix timestamp (วินาที) หรือ javascript timestamp (มิลลิวินาที)
      const dateObj = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
    
    // กรณีเป็น string รูปแบบวันที่
    if (typeof dateStr === 'string') {
      // รูปแบบ YYYY-MM-DD
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
      }
      
      // รูปแบบวันที่อื่นๆ
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
    
    // กรณีที่ไม่สามารถแปลงเป็น Date object ได้ ให้คืนค่าเดิม
    return dateStr;
  } catch (e) {
    console.error("Error formatting date:", e, "Date value:", dateStr);
    return String(dateStr || "-");
  }
};

// ฟังก์ชันปรับรูปแบบช่วงเวลา (period) จากวันที่
const formatPeriodFromDate = (dateStr) => {
  try {
    if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
      const dateParts = dateStr.split('-');
      if (dateParts.length >= 2) {
        // แสดงเป็น MM/YYYY
        return `${dateParts[1]}/${dateParts[0]}`;
      }
    } else if (!isNaN(Number(dateStr))) {
      // ถ้าเป็น timestamp
      const timestamp = Number(dateStr);
      const dateObj = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
      if (!isNaN(dateObj.getTime())) {
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${month}/${year}`;
      }
    }
    return "1-15 ของทุกเดือน";
  } catch (e) {
    console.error("Error parsing date for period:", e);
    return "1-15 ของทุกเดือน";
  }
};
  
// ดึงข้อมูลสถานะการชำระเงินตาม ownerId จาก cashbooking และ cashhistory
export const getPaymentStatus = async (ownerId) => {
  try {
    // 1. ดึงข้อมูลจาก cashbooking ตาม ownerId
    const { data: bookingData, error: bookingError } = await DB
      .from("cashbooking")
      .select("id_owner, id_stadium, totalcash, date, statuscash")
      .eq("id_owner", ownerId)
      .order("date", { ascending: false });

    if (bookingError) {
      console.error("Cashbooking fetch error:", bookingError);
      throw new Error("Failed to fetch cashbooking data: " + bookingError.message);
    }

    // 2. ดึงข้อมูลจาก cashhistory ตาม ownerId
    const { data: historyData, error: historyError } = await DB
      .from("cashhistory")
      .select("id_owner, date, nameadmin, slippay, paydate")
      .eq("id_owner", ownerId)
      .order("date", { ascending: false });

    if (historyError) {
      console.error("Cashhistory fetch error:", historyError);
      throw new Error("Failed to fetch cashhistory data: " + historyError.message);
    }

    // 3. แปลงข้อมูล cashbooking
    const formattedBookingData = bookingData.map((item) => {
      // จัดรูปแบบวันที่ด้วยฟังก์ชันใหม่
      const formattedDate = formatDateString(item.date);
      
      // กำหนดรูปแบบ period จากวันที่ด้วยฟังก์ชันใหม่
      const period = formatPeriodFromDate(item.date);

      // คำนวณราคาหลังหัก 10%
      const totalBeforeFee = parseFloat(item.totalcash) || 0;
      
      return {
        id: item.id,
        id_owner: item.id_owner,
        period: period,
        totalBeforeFee: totalBeforeFee,
        totalAfterFee: totalBeforeFee * 0.9, // Apply 10% fee reduction
        updatedAt: formattedDate,
        status: item.statuscash || "ยังไม่จ่าย",
        source: "cashbooking"
      };
    });

    // 4. แปลงข้อมูล cashhistory
    const formattedHistoryData = historyData.map((item) => {
      // จัดรูปแบบวันที่จ่ายเงินด้วยฟังก์ชันใหม่
      const formattedPaydate = formatDateString(item.paydate);
      
      // กำหนดรูปแบบ period จากวันที่ด้วยฟังก์ชันใหม่
      const period = formatPeriodFromDate(item.date);

      // พิจารณาสถานะจากการมีวันที่จ่ายเงิน
      const status = item.paydate ? "โอนแล้ว" : "ยังไม่จ่าย";
      const totalBeforeFee = parseFloat(item.slippay) || 0;
      
      return {
        id: item.id,
        id_owner: item.id_owner,
        period: period,
        totalBeforeFee: totalBeforeFee,
        totalAfterFee: totalBeforeFee * 0.9, // Apply 10% fee reduction
        updatedAt: formattedPaydate,
        status: status,
        adminName: item.nameadmin || "-",
        source: "cashhistory"
      };
    });

    // 5. รวมข้อมูลจากทั้งสองตาราง
    const combinedData = [...formattedBookingData, ...formattedHistoryData];
    
    // 6. กรองรายการที่ซ้ำซ้อนโดยดูจาก period
    const uniquePeriods = new Set();
    const filteredData = combinedData.filter(item => {
      // ถ้ายังไม่มี period นี้ใน Set ให้เพิ่มและเก็บข้อมูล
      if (!uniquePeriods.has(item.period)) {
        uniquePeriods.add(item.period);
        return true;
      }
      return false;
    });
    
    return { data: filteredData, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// สร้างรายการจองใหม่
export const createCashbooking = async (bookingData) => {
  const { id_owner, id_stadium, totalcash, date } = bookingData;

  try {
    const { data, error } = await DB.from("cashbooking")
      .insert([
        {
          id_owner,
          id_stadium,
          totalcash,
          date,
          statuscash: "ยังไม่จ่าย",
        },
      ])
      .select();

    if (error) {
      console.error("Cashbooking create error:", error);
      throw new Error("Failed to create cashbooking: " + error.message);
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// อัปเดตสถานะการชำระเงิน
export const updatePaymentStatus = async (bookingId, status) => {
  try {
    const { data, error } = await DB.from("cashbooking")
      .update({ statuscash: status })
      .eq("id", bookingId)
      .select();

    if (error) {
      console.error("Payment status update error:", error);
      throw new Error("Failed to update payment status: " + error.message);
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// ดึงข้อมูลการจองของเจ้าของสนาม
export const getStadiumBookingsByOwner = async (ownerId) => {
  try {
    const { data, error } = await DB.from("cashbooking")
      .select(`
        id,
        totalcash,
        date,
        statuscash,
        id_stadium,
        add_stadium(stadium_name)
      `)
      .eq("id_owner", ownerId);

    if (error) {
      console.error("Owner bookings fetch error:", error);
      throw new Error("Failed to fetch owner bookings: " + error.message);
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// ดึงข้อมูลสรุปรายเดือนของเจ้าของสนาม
export const getOwnerMonthlySummary = async (ownerId, month, year) => {
  try {
    const { data, error } = await DB.from("cashbooking")
      .select("totalcash")
      .eq("id_owner", ownerId)
      .gte("date", `${year}-${month}-01`)
      .lte("date", `${year}-${month}-31`);

    if (error) {
      console.error("Owner summary fetch error:", error);
      throw new Error("Failed to fetch owner summary: " + error.message);
    }

    const totalAmount = data.reduce((sum, item) => sum + item.totalcash, 0);
    const serviceFee = totalAmount * 0.1;
    const netAmount = totalAmount - serviceFee;

    return {
      data: { totalAmount, serviceFee, netAmount },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
};
const fetchSummaryData = async (month, year, ownerId) => {
    try {
        const { data, error } = await DB
            .from("cashbooking")
            .select("totalcash")
            .eq("id_owner", ownerId)
            .like("date", `${year}-${month}%`);
        
        console.log("📌 Data from DB:", data); // <<-- Log ดูค่าที่ดึงได้

        if (error) throw error;

        const totalAmount = data.reduce((sum, item) => sum + (Number(item.totalcash) || 0), 0);
        const serviceFee = totalAmount * 0.1;
        const netAmount = totalAmount - serviceFee;

        console.log("📌 Calculated summary:", { totalAmount, serviceFee, netAmount }); // <<-- Log ค่าที่คำนวณได้

        return { data: { totalAmount, serviceFee, netAmount }, error: null };
    } catch (error) {
        console.error("Error in getSummaryData:", error);
        return { data: null, error: error.message };
    }
};


// Export ฟังก์ชันทั้งหมด
export default {
  getSummaryData,
  getPaymentStatus,
  createCashbooking,
  updatePaymentStatus,
  getStadiumBookingsByOwner,
  getOwnerMonthlySummary,
};