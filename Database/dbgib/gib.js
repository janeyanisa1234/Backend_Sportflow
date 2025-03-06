import DB from "../db.js";

export async function getAllPromotions() {
  console.log("Fetching all promotions...");
  const supabase = await DB;

  try {
    const { data, error } = await supabase
      .from("sports_promotions")
      .select("*");

    if (error) {
      console.error("Supabase error fetching promotions:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error("Failed to fetch promotions: " + error.message);
    }

    if (!data || data.length === 0) {
      console.warn("No promotions found in sports_promotions table");
      return [];
    }

    console.log("Fetched promotions:", data);
    return data.map((promo) => ({
      id: promo.id,
      promotion_name: promo.promotion_name,
      start_datetime: promo.start_datetime,
      end_datetime: promo.end_datetime,
      discount_percentage: promo.discount_percentage,
      discount_limit: promo.discount_limit,
      promotion_status: promo.promotion_status,
      location: promo.location,
      sports: promo.sports,
      owner_id: promo.owner_id,
    }));
  } catch (error) {
    console.error("Unexpected error in getAllPromotions:", error);
    throw error;
  }
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

// ดึงข้อมูลกีฬาจาก add_court โดยกรองตาม stadium_id
export async function getAllSports(stadiumId) {
  console.log("Fetching all sports for stadiumId:", stadiumId);
  const supabase = await DB;

  if (!stadiumId) {
    console.error("No stadiumId provided");
    throw new Error("stadiumId is required");
  }

  try {
    const { data, error } = await supabase
      .from("add_court")
      .select("id, court_type, court_price, stadium_id");

    if (error) {
      console.error("Supabase error fetching sports:", error);
      throw new Error("Failed to fetch sports: " + error.message);
    }

    if (!data || data.length === 0) {
      console.warn("No sports found for stadiumId:", stadiumId);
      return [];
    }

    console.log("Fetched sports:", data);
    return data
  .filter((sport) => sport.stadium_id === stadiumId)
  .map((sport) => ({
    id: sport.id,
    name: sport.court_type,
    price: sport.court_price,
    stadiumId: sport.stadium_id,
    image: `/pictureowner/${sport.court_type.toLowerCase().replace(/ /g, "_")}.png`,
  }));
  } catch (error) {
    console.error("Unexpected error in getAllSports:", error);
    throw error;
  }
}
// ดึงข้อมูลสนามใช้เฉพาะข้อมูลจาก add_stadium
export async function getAllStadiums() {
  console.log("Fetching all stadiums...");
  const supabase = await DB;

  try {
    const { data, error } = await supabase
      .from("add_stadium")
      .select("id, owner_id, stadium_name") // เปลี่ยน user_id เป็น owner_id
      .not("stadium_name", "is", null);

    if (error) {
      console.error("Supabase error fetching stadiums:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error("Failed to fetch stadiums: " + error.message);
    }

    if (!data || data.length === 0) {
      console.warn("No stadiums found in add_stadium table");
      return [];
    }

    console.log("Fetched stadiums:", data);
    return data.map((item) => ({
      id: item.id,
      owner_id: item.owner_id, // ใช้ owner_id
      name: item.stadium_name || "ไม่ระบุ",
    }));
  } catch (error) {
    console.error("Unexpected error in getAllStadiums:", error);
    throw error;
  }
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

//บันทึกโปรโมชั่นโดยใช้ owner_id จาก add_stadium และสนามที่เลือก
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
    owner_id,
  } = promotion;

  if (!promotion_name || !start_date || !start_time || !end_date || !end_time || !discount || !location || !sports || !owner_id) {
    throw new Error("All required fields including owner_id and location must be provided");
  }

  if (!end_time) {
    throw new Error("end_time is required");
  }

  const validSports = Array.isArray(sports) && sports.length > 0 ? sports : [];
  const sportsJson = JSON.stringify(validSports.map(sport => ({
    name: sport.name || "",
    price: sport.price || 0,
    discountPrice: sport.discountPrice || 0,
  })));

  console.log("Promotion data to insert:", {
    promotion_name,
    start_datetime: `${start_date} ${start_time}`,
    end_datetime: `${end_date} ${end_time}`,
    discount_percentage: parseFloat(discount),
    discount_limit: discount_limit ? parseInt(discount_limit) : null,
    location,
    promotion_status: "active",
    sports: sportsJson,
    owner_id,
  });

  try {
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
          sports: sportsJson,
          owner_id,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase error adding promotion:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    console.log("Added promotion:", data);
    return data;
  } catch (error) {
    console.error("Unexpected error in addPromotion:", error);
    throw error;
  }
}