import DB from "../db.js";

export async function getAllPromotions() {
  console.log("Fetching all promotions...");
  const { data, error } = await DB.from("sports_promotions").select("*");
  if (error) throw error;
  return data;
}

export async function addPromotion(promotion) {
  const supabase = await DB;
  const {
    promotion_name,
    start_date,
    start_time,
    end_date,
    end_time,
    discount,
    discount_limit,
    location,
    sports,
  } = promotion;

  console.log("Received promotion data:", promotion);

  if (!promotion_name || !start_date || !start_time || !end_date || !end_time || !discount || !location || !sports || sports.length === 0) {
    throw new Error("All required fields including sports must be provided");
  }
  if (new Date(`${start_date} ${start_time}`) >= new Date(`${end_date} ${end_time}`)) {
    throw new Error("Start datetime must be before end datetime");
  }
  if (parseFloat(discount) < 0 || parseFloat(discount) > 100) {
    throw new Error("Discount must be between 0 and 100");
  }

  const { data, error } = await supabase
    .from("sports_promotions")
    .insert([
      {
        promotion_name,
        start_datetime: `${start_date} ${start_time}`,
        end_datetime: `${end_date} ${end_time}`,
        discount_percentage: parseFloat(discount),
        discount_limit: discount_limit ? parseInt(discount_limit) : null,
        location,
        promotion_status: "active",
        sports: JSON.stringify(sports),
      },
    ])
    .select();

  if (error) {
    console.error("Supabase error adding promotion:", error);
    throw error;
  }
  console.log("Added promotion:", data);
  if (!data || data.length === 0) {
    throw new Error("No data returned after insertion");
  }
  return data; // คืนค่า array แทน data[0]
}

export async function updatePromotionStatus(id, status) {
  const supabase = await DB;
  console.log(`Updating promotion status for id ${id} to ${status}`);
  const { data, error } = await supabase
    .from("sports_promotions")
    .update({ promotion_status: status })
    .eq("id", id)
    .select();

  if (error) {
    console.error("Supabase error updating promotion:", error);
    throw error;
  }
  console.log("Updated promotion:", data[0]);
  return data[0];
}

export async function deletePromotion(id) {
  const supabase = await DB;
  console.log(`Deleting promotion with id ${id}`);
  const { error } = await supabase.from("sports_promotions").delete().eq("id", id);

  if (error) {
    console.error("Supabase error deleting promotion:", error);
    throw error;
  }
  console.log("Deletion successful");
  return true;
}

export async function fetchData() {
  console.log("Fetching all data...");
  const supabase = await DB;
  const { data, error } = await supabase.from("sports_promotions").select("*");
  if (error) {
    console.error("Supabase error fetching data:", error);
    throw error;
  }
  console.log("Fetched data:", data);
  return data;
}

// ฟังก์ชันสำหรับดึงข้อมูลกีฬาและสนามจากตาราง add_fielddd
export async function getAllSports() {
  console.log("Fetching all sports...");
  const supabase = await DB;
  const { data, error } = await supabase.from("add_fielddd").select("id, sport_type, field_price, stadium_name");
  if (error) {
    console.error("Error fetching sports:", error);
    throw error;
  }
  console.log("Fetched sports:", data);
  return data.map((sport) => ({
    id: sport.id,
    name: sport.sport_type,
    price: sport.field_price,
    stadiumName: sport.stadium_name || "ไม่ระบุ",
    discountPrice: sport.field_price * (1 - 0.1), // ตัวอย่างส่วนลด 10%
    image: `/pictureowner/${sport.sport_type.toLowerCase()}.png`,
  }));
}

// ฟังก์ชันสำหรับดึงรายการสนามที่ไม่ซ้ำจาก add_fielddd
export async function getAllStadiums() {
  console.log("Fetching all stadiums...");
  const supabase = await DB;
  const { data, error } = await supabase
    .from("add_fielddd")
    .select("stadium_name", { distinct: true })
    .not("stadium_name", "is", null); // กรองค่า null
  if (error) {
    console.error("Error fetching stadiums:", error.message || error);
    throw new Error("Failed to fetch stadiums: " + (error.message || "Unknown error"));
  }
  console.log("Fetched stadiums:", data);
  return data.map((item) => ({
    id: item.stadium_name || crypto.randomUUID(), // ใช้ randomUUID ถ้า stadium_name null
    name: item.stadium_name || "ไม่ระบุ",
  }));
}

export async function updatePromotion(id, updates) {
  const supabase = await DB;
  const { data, error } = await supabase
    .from("sports_promotions")
    .update(updates)
    .eq("id", id)
    .select();
  if (error) {
    console.error("Supabase update error:", error);
    throw error;
  }
  if (data.length === 0) return null;
  return data;
}
