import DB from "../db.js"; 

// ฟังก์ชันสำหรับจัดการโปรโมชัน
export async function getAllPromotions(ownerId) { // ดึงโปรโมชันทั้งหมด
  console.log(`Fetching promotions for owner_id: ${ownerId || "all"}...`);
  const supabase = DB;

  try {
    let query = supabase.from("sports_promotions").select("*"); // สร้าง query ดึงโปรโมชัน
    if (ownerId) query = query.eq("owner_id", ownerId); // กรองตาม ownerId ถ้ามี

    const { data: promotionsData, error: promotionsError } = await query; // ดึงข้อมูลโปรโมชัน
    if (promotionsError) {
      console.error("Supabase error:", promotionsError); // log ข้อผิดพลาด
      throw new Error("Failed to fetch promotions: " + promotionsError.message);
    }
    if (!promotionsData || promotionsData.length === 0) {
      console.warn(`No promotions found for owner_id: ${ownerId || "all"}`); // log ถ้าไม่มีข้อมูล
      return [];
    }

    console.log("Raw promotions data:", promotionsData); // log ข้อมูลดิบ

    const { data: stadiumsData, error: stadiumsError } = await supabase // ดึงข้อมูลสนาม
      .from("add_stadium")
      .select("id, stadium_name");
    if (stadiumsError) {
      console.error("Supabase error fetching stadiums:", stadiumsError); 
      throw new Error("Failed to fetch stadiums: " + stadiumsError.message);
    }

    const stadiumMap = stadiumsData.reduce((acc, stadium) => { // สร้าง map ชื่อสนาม
      acc[stadium.id] = stadium.stadium_name || "ไม่ระบุ";
      return acc;
    }, {});

    const currentDate = new Date(); // วันที่ปัจจุบัน
    const updatedPromotions = await Promise.all(promotionsData.map(async (promo) => { // อัปเดตข้อมูลโปรโมชัน
      let sportsArray = [];
      if (typeof promo.sports === "string") { // แปลง sports จาก string
        try {
          sportsArray = JSON.parse(promo.sports);
        } catch (e) {
          console.warn(`Invalid JSON in sports for promotion ${promo.id}:`, promo.sports); // log ถ้า JSON ผิด
          sportsArray = [];
        }
      } else if (Array.isArray(promo.sports)) sportsArray = promo.sports; // ใช้ array เดิมถ้ามี

      const mappedStadiumName = stadiumMap[promo.location] || "ไม่พบชื่อสนาม (ID: " + promo.location + ")"; // ชื่อสนาม
      const endDate = new Date(promo.end_datetime); // วันที่สิ้นสุด
      const calculatedStatus = endDate > currentDate ? "กำลังดำเนินการ" : "หมดอายุแล้ว"; // คำนวณสถานะ

      if (promo.promotion_status !== calculatedStatus || promo.promotion_status == null) { // อัปเดตสถานะถ้าต่าง
        await updatePromotionStatus(promo.id, calculatedStatus);
      }

      return {
        id: promo.id, // ID โปรโมชัน
        promotion_name: promo.promotion_name, // ชื่อ
        start_datetime: promo.start_datetime, // วันที่เริ่ม
        end_datetime: promo.end_datetime, // วันที่สิ้นสุด
        discount_percentage: promo.discount_percentage, // ส่วนลด
        promotion_status: calculatedStatus, // สถานะ
        location: promo.location || "ไม่ระบุ", // สถานที่
        stadium_name: mappedStadiumName, // ชื่อสนาม
        sports: sportsArray, // รายการกีฬา
        owner_id: promo.owner_id, // ID เจ้าของ
      };
    }));

    return updatedPromotions; // คืนค่าโปรโมชันที่อัปเดต
  } catch (error) {
    console.error("Unexpected error in getAllPromotions:", error); 
    throw error;
  }
}

export async function getPromotionById(id) { // ดึงโปรโมชันตาม ID
  console.log(`Fetching promotion with id ${id}...`);
  const supabase = DB;

  try {
    if (!supabase) throw new Error("Supabase client is not initialized"); // ตรวจสอบ Supabase

    const parsedId = parseInt(id, 10); // แปลง ID เป็น integer
    if (isNaN(parsedId)) throw new Error("Invalid ID format: ID must be a valid integer"); // ตรวจสอบ ID

    const { data, error } = await supabase // ดึงข้อมูลโปรโมชัน
      .from("sports_promotions")
      .select("*")
      .eq("id", parsedId)
      .single();
    if (error) {
      console.error("Supabase error:", error);
      throw new Error("Failed to fetch promotion: " + error.message);
    }
    if (!data) {
      console.warn(`No promotion found with id ${parsedId}`); // log ถ้าไม่พบ
      throw new Error("Promotion not found");
    }

    console.log("Raw promotion data:", data); // log ข้อมูลดิบ
    const promo = data;

    let stadiumName = "ไม่ระบุ"; // ค่าเริ่มต้นชื่อสนาม
    if (promo.location) { // ดึงชื่อสนาม
      const { data: stadiumData, error: stadiumError } = await supabase
        .from("add_stadium")
        .select("stadium_name")
        .eq("id", promo.location)
        .single();
      if (stadiumError) console.error("Supabase error fetching stadium:", stadiumError); 
      else if (stadiumData) stadiumName = stadiumData.stadium_name || "ไม่ระบุ";
    }

    let sportsArray = []; // แปลง sports
    if (typeof promo.sports === "string") {
      try {
        sportsArray = JSON.parse(promo.sports);
      } catch (e) {
        console.warn(`Invalid JSON in sports for promotion ${promo.id}:`, promo.sports); // log ถ้า JSON ผิด
        sportsArray = [];
      }
    } else if (Array.isArray(promo.sports)) sportsArray = promo.sports;

    const currentDate = new Date(); // วันที่ปัจจุบัน
    const endDate = new Date(promo.end_datetime); // วันที่สิ้นสุด
    const calculatedStatus = endDate > currentDate ? "กำลังดำเนินการ" : "หมดอายุแล้ว"; // คำนวณสถานะ

    if (promo.promotion_status !== calculatedStatus || promo.promotion_status == null) { // อัปเดตสถานะ
      try {
        await updatePromotionStatus(promo.id, calculatedStatus);
        console.log(`Updated status for promotion ${promo.id} to ${calculatedStatus}`);
      } catch (error) {
        console.error(`Failed to update status for promotion ${promo.id}:`, error); 
      }
    }

    return { // คืนค่าข้อมูลโปรโมชัน
      id: promo.id,
      promotion_name: promo.promotion_name,
      start_datetime: promo.start_datetime,
      end_datetime: promo.end_datetime,
      discount_percentage: promo.discount_percentage,
      promotion_status: calculatedStatus,
      location: promo.location || "ไม่ระบุ",
      stadium_name: stadiumName,
      sports: sportsArray,
      owner_id: promo.owner_id,
    };
  } catch (error) {
    console.error("Unexpected error in getPromotionById:", error); 
    throw error;
  }
}

export async function updatePromotionStatus(id, status) { // อัปเดตสถานะโปรโมชัน
  const supabase = DB;
  console.log(`Updating promotion status for id ${id} to ${status}`);
  const { data, error } = await supabase // อัปเดตข้อมูล
    .from("sports_promotions")
    .update({ promotion_status: status })
    .eq("id", id)
    .select();
  if (error) {
    console.error("Supabase error:", error); 
    throw error;
  }
  console.log("Updated promotion:", data[0]); 
  return data[0];
}

export async function updatePromotion(id, updates) { // อัปเดตข้อมูลโปรโมชัน
  const supabase = DB;
  console.log(`Updating promotion with id ${id}:`, updates);
  const { data, error } = await supabase // อัปเดตข้อมูล
    .from("sports_promotions")
    .update({
      promotion_name: updates.promotion_name,
      start_datetime: updates.start_datetime,
      end_datetime: updates.end_datetime,
      discount_percentage: updates.discount_percentage,
    })
    .eq("id", id)
    .select();
  if (error) {
    console.error("Supabase error:", error); 
    throw error;
  }
  if (data.length === 0) return null; // ถ้าไม่มีข้อมูล
  console.log("Updated promotion:", data[0]); // log ข้อมูลที่อัปเดต
  return data[0];
}

export async function addPromotion(promotion) { // เพิ่มโปรโมชันใหม่
  const supabase = DB;
  const { promotion_name, start_date, start_time, end_date, end_time, discount, location, sports, owner_id } = promotion;

  if (!promotion_name || !start_date || !start_time || !end_date || !end_time || !discount || !location || !sports || !owner_id) { // ตรวจสอบข้อมูล
    throw new Error("All required fields including owner_id and location must be provided");
  }

  const validSports = Array.isArray(sports) && sports.length > 0 // แปลง sports
    ? sports.map(sport => ({
        name: sport.name || "Unknown",
        price: Number(sport.price) || 0,
        discountPrice: Number(sport.discountPrice) || 0,
      }))
    : [];
  const sportsList = validSports.map(sport => `${sport.name}:${sport.discountPrice}`).join(", "); // รายการกีฬาแบบ string

  try {
    const { data, error } = await supabase // เพิ่มข้อมูล
      .from("sports_promotions")
      .insert([{
        promotion_name,
        start_datetime: `${start_date} ${start_time}`,
        end_datetime: `${end_date} ${end_time}`,
        discount_percentage: parseFloat(discount),
        location,
        promotion_status: "active",
        sports: validSports,
        sports_list: sportsList,
        owner_id,
      }])
      .select();
    if (error) {
      console.error("Supabase error:", error); 
      throw error;
    }
    console.log("Added promotion:", data); // log ข้อมูลที่เพิ่ม
    return data;
  } catch (error) {
    console.error("Unexpected error in addPromotion:", error); 
    throw error;
  }
}

export async function deletePromotion(id) { // ลบโปรโมชัน
  const supabase = DB;
  console.log(`Deleting promotion with id ${id}`);
  const { error } = await supabase.from("sports_promotions").delete().eq("id", id); // ลบข้อมูล
  if (error) {
    console.error("Supabase error:", error); 
  }
  console.log("Deletion successful"); // log การลบสำเร็จ
  return true;
}

// ฟังก์ชันสำหรับจัดการข้อมูลอื่นๆ
export async function fetchData() { // ดึงข้อมูลทั้งหมด
  console.log("Fetching all data...");
  const supabase = DB;
  const { data, error } = await supabase.from("sports_promotions").select("*"); // ดึงข้อมูล
  if (error) {
    console.error("Supabase error:", error); 
    throw error;
  }
  console.log("Fetched data:", data); // log ข้อมูลที่ได้
  return data;
}

export async function getAllSports(stadiumId) { // ดึงกีฬาทั้งหมดตาม stadiumId
  console.log("Fetching all sports for stadiumId:", stadiumId);
  const supabase = DB;

  try {
    if (!stadiumId) {
      console.warn("No stadiumId provided"); // log ถ้าไม่มี stadiumId
      return [];
    }

    const { data: sportsData, error: sportsError } = await supabase // ดึงข้อมูลกีฬา
      .from("add_court")
      .select("id, court_type, court_price, court_image, stadium_id")
      .eq("stadium_id", stadiumId);
    if (sportsError) {
      console.error("Supabase error:", sportsError); 
      throw new Error("Failed to fetch sports: " + sportsError.message);
    }
    if (!sportsData || sportsData.length === 0) {
      console.warn(`No sports found for stadiumId: ${stadiumId}`); // log ถ้าไม่มีข้อมูล
      return [];
    }

    console.log("Fetched sports:", sportsData); // log ข้อมูลกีฬา

    const { data: stadiumData, error: stadiumError } = await supabase // ดึงชื่อสนาม
      .from("add_stadium")
      .select("stadium_name")
      .eq("id", stadiumId)
      .single();
    if (stadiumError) {
      console.error("Supabase error:", stadiumError); 
      throw new Error("Failed to fetch stadium: " + stadiumError.message);
    }

    const stadiumName = stadiumData?.stadium_name || "ไม่ระบุ"; // ชื่อสนาม
    console.log("Fetched stadium name:", stadiumName); // log ชื่อสนาม

    return sportsData.map((sport) => ({ // คืนค่าข้อมูลกีฬา
      id: sport.id,
      name: sport.court_type,
      price: sport.court_price,
      image: sport.court_image || `/pictureowner/${sport.court_type.toLowerCase().replace(/ /g, "_")}.png`,
      stadiumId: sport.stadium_id,
      stadiumName,
    }));
  } catch (error) {
    console.error("Unexpected error in getAllSports:", error); 
    throw error;
  }
}

export async function getAllStadiums(ownerId) { // ดึงสนามทั้งหมด
  console.log(`Fetching stadiums for owner_id: ${ownerId}...`);
  const supabase = DB;

  try {
    let query = supabase.from("add_stadium").select("id, owner_id, stadium_name").not("stadium_name", "is", null); // ดึงข้อมูลสนาม
    if (ownerId) query = query.eq("owner_id", ownerId); // กรองตาม ownerId ถ้ามี

    const { data, error } = await query; // ดึงข้อมูล
    if (error) {
      console.error("Supabase error:", error); 
      throw new Error("Failed to fetch stadiums: " + error.message);
    }
    if (!data || data.length === 0) {
      console.warn(`No stadiums found for owner_id: ${ownerId || "all"}`); // log ถ้าไม่มีข้อมูล
      return [];
    }

    console.log("Fetched stadiums:", data); // log ข้อมูลสนาม
    return data.map((item) => ({ // คืนค่าข้อมูลสนาม
      id: item.id,
      owner_id: item.owner_id,
      name: item.stadium_name || "ไม่ระบุ",
    }));
  } catch (error) {
    console.error("Unexpected error in getAllStadiums:", error); 
    throw error;
  }
}