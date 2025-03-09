import DB from "../db.js";

export async function getAllPromotions(ownerId) {
  console.log(`Fetching promotions for owner_id: ${ownerId || "all"}...`);
  const supabase = DB;

  try {
    let query = supabase.from("sports_promotions").select("*");
    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }

    const { data: promotionsData, error: promotionsError } = await query;

    if (promotionsError) {
      console.error("Supabase error fetching promotions:", promotionsError);
      throw new Error("Failed to fetch promotions: " + promotionsError.message);
    }

    if (!promotionsData || promotionsData.length === 0) {
      console.warn(`No promotions found for owner_id: ${ownerId || "all"}`);
      return [];
    }

    console.log("Raw promotions data:", promotionsData);

    const { data: stadiumsData, error: stadiumsError } = await supabase
      .from("add_stadium")
      .select("id, stadium_name");

    if (stadiumsError) {
      console.error("Supabase error fetching stadiums:", stadiumsError);
      throw new Error("Failed to fetch stadiums: " + stadiumsError.message);
    }

    const stadiumMap = stadiumsData.reduce((acc, stadium) => {
      acc[stadium.id] = stadium.stadium_name || "ไม่ระบุ";
      return acc;
    }, {});

    const currentDate = new Date();

    const updatedPromotions = await Promise.all(promotionsData.map(async (promo) => {
      let sportsArray = [];
      if (typeof promo.sports === "string") {
        try {
          sportsArray = JSON.parse(promo.sports);
        } catch (e) {
          console.warn(`Invalid JSON in sports for promotion ${promo.id}:`, promo.sports);
          sportsArray = [];
        }
      } else if (Array.isArray(promo.sports)) {
        sportsArray = promo.sports;
      }

      const mappedStadiumName = stadiumMap[promo.location] || "ไม่พบชื่อสนาม (ID: " + promo.location + ")";
      const endDate = new Date(promo.end_datetime);
      const calculatedStatus = endDate > currentDate ? "กำลังดำเนินการ" : "หมดอายุแล้ว";

      if (promo.promotion_status !== calculatedStatus || promo.promotion_status == null) {
        await updatePromotionStatus(promo.id, calculatedStatus);
      }

      return {
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


// ฟังก์ชัน getPromotionById ใน gib.js
export async function getPromotionById(id) {
  console.log(`Fetching promotion with id ${id}...`);
  const supabase = DB;

  try {
    if (!supabase) {
      console.error("Supabase client is not initialized");
      throw new Error("Supabase client is not initialized");
    }

    // แปลง id เป็น integer เพื่อให้ Supabase ยอมรับ
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      console.error("Invalid ID format:", id);
      throw new Error("Invalid ID format: ID must be a valid integer");
    }

    const { data, error } = await supabase
      .from("sports_promotions")
      .select("*")
      .eq("id", parsedId)
      .single(); // ใช้ .single() เพราะคาดหวัง 1 record

    if (error) {
      console.error("Supabase error fetching promotion:", error);
      throw new Error("Failed to fetch promotion: " + error.message);
    }

    if (!data) {
      console.warn(`No promotion found with id ${parsedId}`);
      throw new Error("Promotion not found");
    }

    console.log("Raw promotion data:", data);
    const promo = data;

    // ดึง stadium_name จาก add_stadium
    let stadiumName = "ไม่ระบุ";
    if (promo.location) {
      const { data: stadiumData, error: stadiumError } = await supabase
        .from("add_stadium")
        .select("stadium_name")
        .eq("id", promo.location)
        .single();

      if (stadiumError) {
        console.error("Supabase error fetching stadium:", stadiumError);
      } else if (stadiumData) {
        stadiumName = stadiumData.stadium_name || "ไม่ระบุ";
      }
    }

    let sportsArray = [];
    if (typeof promo.sports === "string") {
      try {
        sportsArray = JSON.parse(promo.sports);
      } catch (e) {
        console.warn(`Invalid JSON in sports for promotion ${promo.id}:`, promo.sports);
        sportsArray = [];
      }
    } else if (Array.isArray(promo.sports)) {
      sportsArray = promo.sports;
    }

    const currentDate = new Date();
    const endDate = new Date(promo.end_datetime);
    const calculatedStatus = endDate > currentDate ? "กำลังดำเนินการ" : "หมดอายุแล้ว";

    if (promo.promotion_status !== calculatedStatus || promo.promotion_status == null) {
      try {
        await updatePromotionStatus(promo.id, calculatedStatus);
        console.log(`Updated status for promotion ${promo.id} to ${calculatedStatus}`);
      } catch (error) {
        console.error(`Failed to update status for promotion ${promo.id}:`, error);
      }
    }

    return {
      id: promo.id,
      promotion_name: promo.promotion_name,
      start_datetime: promo.start_datetime,
      end_datetime: promo.end_datetime,
      discount_percentage: promo.discount_percentage,
      promotion_status: calculatedStatus,
      location: promo.location || "ไม่ระบุ",
      stadium_name: stadiumName, // เพิ่ม stadium_name
      sports: sportsArray,
      owner_id: promo.owner_id,
    };
  } catch (error) {
    console.error("Unexpected error in getPromotionById:", error);
    throw error;
  }
}

export async function updatePromotionStatus(id, status) {
  const supabase = DB;
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
  const supabase = DB;
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
  const supabase = DB;
  const { data, error } = await supabase.from("sports_promotions").select("*");
  if (error) {
    console.error("Supabase error fetching data:", error);
    throw error;
  }
  console.log("Fetched data:", data);
  return data;
}

export async function getAllSports(stadiumId) {
  console.log("Fetching all sports for stadiumId:", stadiumId);
  const supabase = DB;

  try {
    if (!stadiumId) {
      console.warn("No stadiumId provided, returning empty array");
      return [];
    }

    const { data: sportsData, error: sportsError } = await supabase
      .from("add_court")
      .select("id, court_type, court_price, court_image, stadium_id")
      .eq("stadium_id", stadiumId);

    if (sportsError) {
      console.error("Supabase error fetching sports:", sportsError);
      throw new Error("Failed to fetch sports: " + sportsError.message);
    }

    if (!sportsData || sportsData.length === 0) {
      console.warn(`No sports found for stadiumId: ${stadiumId}`);
      return [];
    }

    console.log("Fetched sports:", sportsData);

    const { data: stadiumData, error: stadiumError } = await supabase
      .from("add_stadium")
      .select("stadium_name")
      .eq("id", stadiumId)
      .single();

    if (stadiumError) {
      console.error("Supabase error fetching stadium:", stadiumError);
      throw new Error("Failed to fetch stadium: " + stadiumError.message);
    }

    const stadiumName = stadiumData?.stadium_name || "ไม่ระบุ";
    console.log("Fetched stadium name:", stadiumName);

    return sportsData.map((sport) => ({
      id: sport.id,
      name: sport.court_type,
      price: sport.court_price,
      image: sport.court_image || `/pictureowner/${sport.court_type.toLowerCase().replace(/ /g, "_")}.png`,
      stadiumId: sport.stadium_id,
      stadiumName: stadiumName,
    }));
  } catch (error) {
    console.error("Unexpected error in getAllSports:", error);
    throw error;
  }
}

export async function getAllStadiums(ownerId) {
  console.log(`Fetching stadiums for owner_id: ${ownerId}...`);
  const supabase = DB;

  try {
    let query = supabase.from("add_stadium").select("id, owner_id, stadium_name").not("stadium_name", "is", null);
    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error fetching stadiums:", error);
      throw new Error("Failed to fetch stadiums: " + error.message);
    }

    if (!data || data.length === 0) {
      console.warn(`No stadiums found for owner_id: ${ownerId || "all"}`);
      return [];
    }

    console.log("Fetched stadiums:", data);
    return data.map((item) => ({
      id: item.id,
      owner_id: item.owner_id,
      name: item.stadium_name || "ไม่ระบุ",
    }));
  } catch (error) {
    console.error("Unexpected error in getAllStadiums:", error);
    throw error;
  }
}

export async function updatePromotion(id, updates) {
  const supabase = DB;
  console.log(`Updating promotion with id ${id}:`, updates);

  const { data, error } = await supabase
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
    console.error("Supabase error updating promotion:", error);
    throw error;
  }
  if (data.length === 0) return null;
  console.log("Updated promotion:", data[0]);
  return data[0];
}

export async function addPromotion(promotion) {
  const supabase = DB;
  const {
    promotion_name,
    start_date,
    start_time,
    end_date,
    end_time,
    discount,
    location,
    sports,
    owner_id,
  } = promotion;

  if (!promotion_name || !start_date || !start_time || !end_date || !end_time || !discount || !location || !sports || !owner_id) {
    throw new Error("All required fields including owner_id and location must be provided");
  }

  const validSports = Array.isArray(sports) && sports.length > 0 
    ? sports.map(sport => ({
        name: sport.name || "Unknown",
        price: Number(sport.price) || 0,
        discountPrice: Number(sport.discountPrice) || 0,
      }))
    : [];

  const sportsList = validSports
    .map(sport => `${sport.name}:${sport.discountPrice}`)
    .join(", ");

  try {
    const { data, error } = await supabase
      .from("sports_promotions")
      .insert([
        {
          promotion_name,
          start_datetime: `${start_date} ${start_time}`,
          end_datetime: `${end_date} ${end_time}`,
          discount_percentage: parseFloat(discount),
          location,
          promotion_status: "active",
          sports: validSports,
          sports_list: sportsList,
          owner_id,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase error adding promotion:", error);
      throw error;
    }

    console.log("Added promotion:", data);
    return data;
  } catch (error) {
    console.error("Unexpected error in addPromotion:", error);
    throw error;
  }
}