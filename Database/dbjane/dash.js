import { createClient } from "@supabase/supabase-js";
import express from "express";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const thaiMonths = {
  "มกราคม": 1,
  "กุมภาพันธ์": 2,
  "มีนาคม": 3,
  "เมษายน": 4,
  "พฤษภาคม": 5,
  "มิถุนายน": 6,
  "กรกฎาคม": 7,
  "สิงหาคม": 8,
  "กันยายน": 9,
  "ตุลาคม": 10,
  "พฤศจิกายน": 11,
  "ธันวาคม": 12,
};

async function getUserStatistics(month, year) {
  try {
    console.log("Fetching user statistics with filters:", { month, year });
    let query = supabase.from("users").select("id, created_at");

    if (month || year) {
      const { data: users, error } = await query;
      if (error) throw new Error("Error fetching users: " + error.message);

      const filteredUsers = users.filter((user) => {
        const createdDate = new Date(user.created_at);
        const userMonth = createdDate.getMonth() + 1;
        const userYear = createdDate.getFullYear();
        return (!month || userMonth === parseInt(month)) && (!year || userYear === parseInt(year));
      });

      const userIds = filteredUsers.map((u) => u.id);
      const { data: owners, error: ownerError } = await supabase
        .from("owners")
        .select("user_id")
        .in("user_id", userIds);

      if (ownerError) throw new Error("Error fetching owners: " + ownerError.message);

      const totalCount = filteredUsers.length;
      const ownerCount = owners.length;
      const regularCount = totalCount - ownerCount;

      return {
        totalCount,
        ownerCount,
        regularCount,
        ownerPercentage: totalCount > 0 ? (ownerCount / totalCount) * 100 : 0,
        regularPercentage: totalCount > 0 ? (regularCount / totalCount) * 100 : 0,
        totalPercentage: 100,
      };
    } else {
      const { data: users, error: userError } = await query;
      if (userError) throw new Error("Error fetching users: " + userError.message);

      const { data: owners, error: ownerError } = await supabase.from("owners").select("user_id");
      if (ownerError) throw new Error("Error fetching owners: " + ownerError.message);

      const totalCount = users.length;
      const ownerCount = owners.length;
      const regularCount = totalCount - ownerCount;

      return {
        totalCount,
        ownerCount,
        regularCount,
        ownerPercentage: totalCount > 0 ? (ownerCount / totalCount) * 100 : 0,
        regularPercentage: totalCount > 0 ? (regularCount / totalCount) * 100 : 0,
        totalPercentage: 100,
      };
    }
  } catch (error) {
    console.error("Error in getUserStatistics:", error);
    throw error;
  }
}

async function getRevenue(month, year) {
  try {
    console.log("Fetching revenue with filters:", { month, year });
    const { data, error } = await supabase.from("cashbooking").select("totalcash, date, id_owner, id_stadium");
    if (error) {
      console.error("Revenue fetch error:", error);
      throw new Error("Error fetching revenue: " + error.message);
    }
    if (!data || data.length === 0) {
      console.log("No data found in cashbooking");
      return {
        totalRevenue: 0,
        platformFee: 0,
        netRevenue: 0,
        revenueByOwner: {},
      };
    }

    console.log("Raw cashbooking data:", data);

    // กรองข้อมูลตามเดือนและปี
    const filteredData = data.filter((item) => {
      try {
        const dateStr = item.date.trim();
        const parts = dateStr.split(" ");
        if (parts.length !== 3) {
          console.error(`Invalid date format for: ${dateStr}`);
          return false;
        }

        const [day, monthText, yearText] = parts;
        const monthNum = thaiMonths[monthText];
        const yearNum = parseInt(yearText) - 543; // แปลง พ.ศ. เป็น ค.ศ.

        if (!monthNum || isNaN(yearNum)) {
          console.error(`Failed to parse date: ${dateStr} -> Month: ${monthText}, Year: ${yearText}`);
          return false;
        }

        console.log(`Processing date: ${dateStr} -> Month: ${monthNum}, Year: ${yearNum}`);

        const monthMatch = !month || monthNum === parseInt(month);
        const yearMatch = !year || yearNum === parseInt(year);
        return monthMatch && yearMatch;
      } catch (parseError) {
        console.error(`Error parsing date for item: ${JSON.stringify(item)}`, parseError);
        return false;
      }
    });

    console.log("Filtered cashbooking data:", filteredData);

    const totalRevenue = filteredData.reduce((sum, item) => sum + (item.totalcash || 0), 0);
    const platformFee = totalRevenue * 0.1;
    const netRevenue = totalRevenue - platformFee;

    const revenueByOwner = filteredData.reduce((acc, item) => {
      acc[item.id_owner] = (acc[item.id_owner] || 0) + (item.totalcash || 0);
      return acc;
    }, {});

    return {
      totalRevenue,
      platformFee,
      netRevenue,
      revenueByOwner,
    };
  } catch (error) {
    console.error("Error in getRevenue:", error);
    throw error;
  }
}

async function getNewUsersToday(month, year) {
  try {
    console.log("Fetching new users with filters:", { month, year });
    let query = supabase.from("users").select("id, created_at");

    if (month || year) {
      const { data: users, error } = await query;
      if (error) throw new Error("Error fetching new users: " + error.message);

      const filteredUsers = users.filter((user) => {
        const createdDate = new Date(user.created_at);
        const userMonth = createdDate.getMonth() + 1;
        const userYear = createdDate.getFullYear();
        return (!month || userMonth === parseInt(month)) && (!year || userYear === parseInt(year));
      });

      const userIds = filteredUsers.map((u) => u.id);
      const { data: owners, error: ownerError } = await supabase
        .from("owners")
        .select("user_id")
        .in("user_id", userIds);

      if (ownerError) throw new Error("Error fetching new owners: " + ownerError.message);

      const total = filteredUsers.length;
      const ownersCount = owners.length;
      const regular = total - ownersCount;

      return {
        total,
        owners: ownersCount,
        regular,
      };
    } else {
      const today = new Date().toISOString().split("T")[0];
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, created_at")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (userError) throw new Error("Error fetching new users: " + userError.message);

      const { data: owners, error: ownerError } = await supabase
        .from("owners")
        .select("user_id")
        .in("user_id", users.map((u) => u.id));

      if (ownerError) throw new Error("Error fetching new owners: " + ownerError.message);

      const total = users.length;
      const ownersCount = owners.length;
      const regular = total - ownersCount;

      return {
        total,
        owners: ownersCount,
        regular,
      };
    }
  } catch (error) {
    console.error("Error in getNewUsersToday:", error);
    throw error;
  }
}

const router = express.Router();

router.get("/statistics", async (req, res) => {
  const { month, year } = req.query;
  try {
    const statistics = await getUserStatistics(month, year);
    res.json(statistics);
  } catch (error) {
    console.error("Route /statistics error:", error.message);
    res.status(500).json({ error: "Failed to fetch statistics", details: error.message });
  }
});

router.get("/revenue", async (req, res) => {
  const { month, year } = req.query;
  try {
    const revenue = await getRevenue(month, year);
    res.json(revenue);
  } catch (error) {
    console.error("Route /revenue error:", error.message);
    res.status(500).json({ error: "Failed to fetch revenue", details: error.message });
  }
});

router.get("/new-today", async (req, res) => {
  const { month, year } = req.query;
  try {
    const newUsers = await getNewUsersToday(month, year);
    res.json({ data: newUsers });
  } catch (error) {
    console.error("Route /new-today error:", error.message);
    res.status(500).json({ error: "Failed to fetch new users", details: error.message });
  }
});

// ดึงข้อมูลแนวโน้มผู้ใช้ใหม่ (7 วันล่าสุด)
async function getNewUsersTrend(month, year) {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
  
      const { data: users, error } = await supabase
        .from("users")
        .select("created_at")
        .gte("created_at", sevenDaysAgo.toISOString())
        .lte("created_at", today.toISOString());
  
      if (error) throw new Error("Error fetching users: " + error.message);
  
      const trendData = [];
      for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const dailyUsers = users.filter((user) => user.created_at.startsWith(dateStr)).length;
        trendData.push({ date: dateStr, total: dailyUsers });
      }
  
      return trendData;
    } catch (error) {
      console.error("Error in getNewUsersTrend:", error);
      throw error;
    }
  }
  
  
  
  async function getBookingSummary(month, year) {
    try {
      console.log("Fetching booking summary with filters:", { month, year });
      const { data, error } = await supabase.from("Booking").select("date, status_booking");
      if (error) {
        console.error("Booking fetch error:", error);
        throw new Error("Error fetching booking summary: " + error.message);
      }
      if (!data || data.length === 0) {
        console.log("No data found in Booking table");
        return {
          confirmed: 0,
          cancelled: 0,
          pendingCancel: 0,
          totalBookings: 0,
        };
      }
  
      console.log("Raw booking data:", data);
  
      const filteredData = data.filter((item) => {
        const bookingDate = new Date(item.date);
        const monthNum = bookingDate.getMonth() + 1;
        const yearNum = bookingDate.getFullYear();
        return (!month || monthNum === parseInt(month)) && (!year || yearNum === parseInt(year));
      });
  
      console.log("Filtered booking data:", filteredData);
  
      const confirmed = filteredData.filter(item => item.status_booking === "ยืนยัน").length;
      const cancelled = filteredData.filter(item => item.status_booking === "ยกเลิกแล้ว").length;
      const pendingCancel = filteredData.filter(item => item.status_booking === "รอดำเนินการยกเลิก").length;
      const totalBookings = confirmed + cancelled + pendingCancel;
  
      console.log("Booking summary counts:", { confirmed, cancelled, pendingCancel, totalBookings });
  
      return {
        confirmed,
        cancelled,
        pendingCancel,
        totalBookings,
      };
    } catch (error) {
      console.error("Error in getBookingSummary:", error);
      throw error;
    }
  }
  
  // เพิ่ม route ใหม่ใน router
  router.get("/new-users-trend", async (req, res) => {
    const { month, year } = req.query;
    try {
      const trend = await getNewUsersTrend(month, year);
      res.json(trend);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch new users trend", details: error.message });
    }
  });
  


  router.get("/booking-summary", async (req, res) => {
    const { month, year } = req.query;
    try {
      const summary = await getBookingSummary(month, year);
      res.json(summary);
    } catch (error) {
      console.error("Route /booking-summary error:", error.message);
      res.status(500).json({ error: "Failed to fetch booking summary", details: error.message });
    }
  });

export default router;