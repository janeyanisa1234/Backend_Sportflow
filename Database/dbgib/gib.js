import DB from "../db.js"; // Supabase Client สำหรับเชื่อมต่อฐานข้อมูล


// ดึงโปรโมชันทั้งหมดตาม ownerId
export async function getAllPromotions(ownerId) {
  console.log(`Fetching promotions for owner_id: ${ownerId || "all"}...`);
  const supabase = DB;

  try {
    let query = supabase.from("sports_promotions").select("*"); // สร้างคำสั่งดึงข้อมูลโปรโมชันทั้งหมด
    if (ownerId) query = query.eq("owner_id", ownerId); // ถ้ามี ownerId จะกรองเฉพาะของเจ้าของนั้น

    const { data: promotionsData, error: promotionsError } = await query; // ดึงข้อมูลจากตาราง sports_promotions
    if (promotionsError) {
      console.error("Supabase error:", promotionsError);
      throw new Error("Failed to fetch promotions: " + promotionsError.message);
    }
    if (!promotionsData || promotionsData.length === 0) {
      console.warn(`No promotions found for owner_id: ${ownerId || "all"}`);
      return [];
    }
    console.log("Raw promotions data:", promotionsData);

    const { data: stadiumsData, error: stadiumsError } = await supabase // ดึงข้อมูลสนามจากตาราง add_stadium
      .from("add_stadium")
      .select("id, stadium_name");
    if (stadiumsError) {
      console.error("Supabase error fetching stadiums:", stadiumsError);
      throw new Error("Failed to fetch stadiums: " + stadiumsError.message);
    }

    const stadiumMap = stadiumsData.reduce((acc, stadium) => { // สร้างตารางชื่อสนามเพื่อเชื่อมกับ location
      acc[stadium.id] = stadium.stadium_name || "ไม่ระบุ";
      return acc;
    }, {});

    const currentDate = new Date(); // ใช้ดูวันที่ปัจจุบันเพื่อเช็คสถานะ
    const updatedPromotions = await Promise.all(promotionsData.map(async (promo) => {
      let sportsArray = [];
      if (typeof promo.sports === "string") { // ถ้า sports เป็น string จะแปลงเป็น array
        try {
          sportsArray = JSON.parse(promo.sports);
        } catch (e) {
          console.warn(`Invalid JSON in sports for promotion ${promo.id}:`, promo.sports);
          sportsArray = [];
        }
      } else if (Array.isArray(promo.sports)) sportsArray = promo.sports;

      const mappedStadiumName = stadiumMap[promo.location] || "ไม่พบชื่อสนาม (ID: " + promo.location + ")";
      const endDate = new Date(promo.end_datetime);
      const calculatedStatus = endDate > currentDate ? "กำลังดำเนินการ" : "หมดอายุแล้ว"; // คำนวณสถานะจากวันที่สิ้นสุด

      if (promo.promotion_status !== calculatedStatus || promo.promotion_status == null) {
        await updatePromotionStatus(promo.id, calculatedStatus); // อัปเดตสถานะถ้าต่างจากที่คำนวณ
      }

      return { // ส่งข้อมูลโปรโมชันที่จัดรูปแบบแล้ว
        id: promo.id,
        promotion_name: promo.promotion_name,
        start_datetime: promo.start_datetime,
        end_datetime: promo.end_datetime,
        discount_percentage: promo.discount_percentage,
        promotion_status: calculatedStatus,
        location: promo.location || "ไม่ระบุ",
        stadium_name: mappedStadiumName,
        sports: sportsArray,
        owner_id: promo.owner_id,
      };
    }));

    return updatedPromotions;
  } catch (error) {
    console.error("Unexpected error in getAllPromotions:", error);
    throw error;
  }
}

// ดึงโปรโมชันตาม ID
export async function getPromotionById(id) {
  console.log(`Fetching promotion with id ${id}...`);
  const supabase = DB;

  try {
    if (!supabase) throw new Error("Supabase client is not initialized");

    const parsedId = parseInt(id, 10); // แปลง id จาก string เป็นตัวเลข
    if (isNaN(parsedId)) throw new Error("Invalid ID format: ID must be a valid integer");

    const { data, error } = await supabase // ดึงข้อมูลโปรโมชันจากตารางตาม id
      .from("sports_promotions")
      .select("*")
      .eq("id", parsedId)
      .single();
    if (error) {
      console.error("Supabase error:", error);
      throw new Error("Failed to fetch promotion: " + error.message);
    }
    if (!data) {
      console.warn(`No promotion found with id ${parsedId}`);
      throw new Error("Promotion not found");
    }
    console.log("Raw promotion data:", data);
    const promo = data;

    let stadiumName = "ไม่ระบุ";
    if (promo.location) { // ดึงชื่อสนามจาก location
      const { data: stadiumData, error: stadiumError } = await supabase
        .from("add_stadium")
        .select("stadium_name")
        .eq("id", promo.location)
        .single();
      if (stadiumError) console.error("Supabase error fetching stadium:", stadiumError);
      else if (stadiumData) stadiumName = stadiumData.stadium_name || "ไม่ระบุ";
    }

    let sportsArray = [];
    if (typeof promo.sports === "string") { // แปลง sports เป็น array
      try {
        sportsArray = JSON.parse(promo.sports);
      } catch (e) {
        console.warn(`Invalid JSON in sports for promotion ${promo.id}:`, promo.sports);
        sportsArray = [];
      }
    } else if (Array.isArray(promo.sports)) sportsArray = promo.sports;

    const currentDate = new Date();
    const endDate = new Date(promo.end_datetime);
    const calculatedStatus = endDate > currentDate ? "กำลังดำเนินการ" : "หมดอายุแล้ว";

    if (promo.promotion_status !== calculatedStatus || promo.promotion_status == null) {
      try {
        await updatePromotionStatus(promo.id, calculatedStatus); // อัปเดตสถานะถ้าจำเป็น
        console.log(`Updated status for promotion ${promo.id} to ${calculatedStatus}`);
      } catch (error) {
        console.error(`Failed to update status for promotion ${promo.id}:`, error);
      }
    }

    return { // ส่งข้อมูลโปรโมชันที่จัดรูปแบบแล้ว
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

// เพิ่มโปรโมชันใหม่
export async function addPromotion(promotion) {
  const supabase = DB;
  const { promotion_name, start_date, start_time, end_date, end_time, discount, location, sports, owner_id } = promotion;

  if (!promotion_name || !start_date || !start_time || !end_date || !end_time || !discount || !location || !sports || !owner_id) {
    throw new Error("All required fields including owner_id and location must be provided"); // ตรวจสอบว่าข้อมูลครบ
  }

  const validSports = Array.isArray(sports) && sports.length > 0 // จัดรูปแบบ sports เป็น array
    ? sports.map(sport => ({
        name: sport.name || "Unknown",
        price: Number(sport.price) || 0,
        discountPrice: Number(sport.discountPrice) || 0,
      }))
    : [];
  const sportsList = validSports.map(sport => `${sport.name}:${sport.discountPrice}`).join(", ");

  try {
    const { data, error } = await supabase // บันทึกโปรโมชันใหม่ลงตาราง
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
    console.log("Added promotion:", data);
    return data; // ส่งข้อมูลที่เพิ่มกลับ
  } catch (error) {
    console.error("Unexpected error in addPromotion:", error);
    throw error;
  }
}

// อัปเดตข้อมูลโปรโมชัน
export async function updatePromotion(id, updates) {
  const supabase = DB;
  console.log(`Updating promotion with id ${id}:`, updates);

  try {
    const { data, error } = await supabase // อัปเดตข้อมูลในตารางตาม id
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
    if (data.length === 0) return null;
    console.log("Updated promotion:", data[0]);
    return data[0]; // ส่งข้อมูลที่อัปเดตกลับ
  } catch (error) {
    console.error("Unexpected error in updatePromotion:", error);
    throw error;
  }
}

// อัปเดตสถานะโปรโมชัน
export async function updatePromotionStatus(id, status) {
  const supabase = DB;
  console.log(`Updating promotion status for id ${id} to ${status}`);

  try {
    const { data, error } = await supabase // อัปเดตสถานะในตาราง
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
  } catch (error) {
    console.error("Unexpected error in updatePromotionStatus:", error);
    throw error;
  }
}

// ลบโปรโมชัน
export async function deletePromotion(id) {
  const supabase = DB;
  console.log(`Deleting promotion with id ${id}`);

  try {
    const { error } = await supabase.from("sports_promotions").delete().eq("id", id); // ลบข้อมูลจากตารางตาม id
    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }
    console.log("Deletion successful");
    return true; // ส่งผลลัพธ์ว่าลบสำเร็จ
  } catch (error) {
    console.error("Unexpected error in deletePromotion:", error);
    throw error;
  }
}

// ---- ฟังก์ชันจัดการข้อมูลสนามและกีฬา ----

// ดึงสนามทั้งหมดตาม ownerId
export async function getAllStadiums(ownerId) {
  console.log(`Fetching stadiums for owner_id: ${ownerId}...`);
  const supabase = DB;

  try {
    let query = supabase.from("add_stadium").select("id, owner_id, stadium_name").not("stadium_name", "is", null); // ดึงข้อมูลสนามทั้งหมด
    if (ownerId) query = query.eq("owner_id", ownerId); // กรองตาม ownerId ถ้ามี

    const { data, error } = await query;
    if (error) {
      console.error("Supabase error:", error);
      throw new Error("Failed to fetch stadiums: " + error.message);
    }
    if (!data || data.length === 0) {
      console.warn(`No stadiums found for owner_id: ${ownerId || "all"}`);
      return [];
    }
    console.log("Fetched stadiums:", data);

    return data.map(item => ({ // จัดรูปแบบข้อมูลสนาม
      id: item.id,
      owner_id: item.owner_id,
      name: item.stadium_name || "ไม่ระบุ",
    }));
  } catch (error) {
    console.error("Unexpected error in getAllStadiums:", error);
    throw error;
  }
}

// ดึงกีฬาทั้งหมดตาม stadiumId
export async function getAllSports(stadiumId) {
  console.log("Fetching all sports for stadiumId:", stadiumId);
  const supabase = DB;

  try {
    if (!stadiumId) {
      console.warn("No stadiumId provided");
      return [];
    }

    const { data: sportsData, error: sportsError } = await supabase // ดึงข้อมูลกีฬาจากตาราง add_court
      .from("add_court")
      .select("id, court_type, court_price, court_image, stadium_id")
      .eq("stadium_id", stadiumId);
    if (sportsError) {
      console.error("Supabase error:", sportsError);
      throw new Error("Failed to fetch sports: " + sportsError.message);
    }
    if (!sportsData || sportsData.length === 0) {
      console.warn(`No sports found for stadiumId: ${stadiumId}`);
      return [];
    }
    console.log("Fetched sports:", sportsData);

    const { data: stadiumData, error: stadiumError } = await supabase // ดึงชื่อสนาม
      .from("add_stadium")
      .select("stadium_name")
      .eq("id", stadiumId)
      .single();
    if (stadiumError) {
      console.error("Supabase error:", stadiumError);
      throw new Error("Failed to fetch stadium: " + stadiumError.message);
    }
    const stadiumName = stadiumData?.stadium_name || "ไม่ระบุ";
    console.log("Fetched stadium name:", stadiumName);

    return sportsData.map(sport => ({ // จัดรูปแบบข้อมูลกีฬา
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