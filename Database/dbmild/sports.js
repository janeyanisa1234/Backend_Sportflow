import DB from '../db.js';

async function getSportsCategories() {
  try {
    console.log('Fetching sports categories from add_court...');
    const { data: courts, error } = await DB
      .from('add_court')
      .select('court_type');

    if (error) {
      console.error('Supabase error in getSportsCategories:', error.message, error.details, error.hint);
      throw new Error(`Failed to fetch sports categories: ${error.message}`);
    }
    console.log('Courts data:', courts);

    if (!courts || courts.length === 0) {
      console.log('No sports categories found, returning empty array');
      return [];
    }

    const categories = [...new Set(courts.map(c => c.court_type).filter(c => c))];
    console.log('Processed categories:', categories);
    return categories;
  } catch (error) {
    console.error('Database error in getSportsCategories:', error.message, error.stack);
    throw error;
  }
}

async function getFilteredStadiums(sportType) {
  try {
    if (!sportType) throw new Error('sportType is required');

    console.log('Fetching courts for sportType:', sportType);
    const { data: courts, error: courtError } = await DB
      .from('add_court')
      .select('stadium_id')
      .eq('court_type', sportType)
      .limit(100);

    if (courtError) {
      console.error('Supabase court error:', courtError.message, courtError.details, courtError.hint);
      throw new Error(`Failed to fetch courts: ${courtError.message}`);
    }
    console.log('Courts data:', courts);

    if (!courts || courts.length === 0) {
      console.log('No courts found for sportType:', sportType);
      return [];
    }

    const stadiumIds = courts.map(c => c.stadium_id);
    console.log('Stadium IDs:', stadiumIds);

    const { data: stadiums, error: stadiumError } = await DB.from('add_stadium')
      .select('id, stadium_name, stadium_address, stadium_image, owner_id, stadium_status')
      .in('id', stadiumIds)
      .eq('stadium_status', 'อนุมัติแล้ว')
      .limit(100);

    if (stadiumError) {
      console.error('Supabase stadium error:', stadiumError.message, stadiumError.details, stadiumError.hint);
      throw new Error(`Failed to fetch stadiums: ${stadiumError.message}`);
    }
    console.log('Stadiums data:', stadiums);

    if (!stadiums || stadiums.length === 0) {
      console.log('No stadiums found');
      return [];
    }

    const ownerIds = stadiums.map(s => s.owner_id);
    const { data: promotions, error: promoError } = await DB.from('sports_promotions')
      .select('owner_id, location, sports, sports_list, discount_percentage, end_datetime')
      .in('owner_id', ownerIds)
      .limit(100);

    if (promoError) {
      console.error('Supabase promotion error:', promoError.message, promoError.details, promoError.hint);
      throw new Error(`Failed to fetch promotions: ${promoError.message}`);
    }
    console.log('Promotions data:', promotions);

    const result = stadiums.map(stadium => {
      const promo = promotions.find(p => p.owner_id === stadium.owner_id);
      let promotionData = null;
      if (promo) {
        try {
          const promoDetails = promo.sports || (promo.sports_list ? JSON.parse(promo.sports_list) : {});
          const currentDate = new Date(); // วันที่ปัจจุบัน (13 มีนาคม 2568)
          const expiryDate = promo.end_datetime ? new Date(promo.end_datetime) : null;
          if (expiryDate && expiryDate >= currentDate) {
            promotionData = {
              ...promoDetails,
              discount_percentage: promo.discount_percentage || 0,
              end_datetime: promo.end_datetime,
            };
          } // ถ้าสิ้นสุดแล้ว promotionData จะเป็น null
        } catch (parseError) {
          console.warn(`Failed to parse promotion for owner ${stadium.owner_id}:`, parseError.message);
          promotionData = { name: "ข้อมูลโปรโมชั่นไม่ถูกต้อง", discount_percentage: promo.discount_percentage || 0 };
        }
      }
      return {
        ...stadium,
        promotion: promotionData,
      };
    });

    return result;
  } catch (error) {
    console.error('Database error in getFilteredStadiums:', error.message, error.stack);
    throw error;
  }
}

async function getPromotedStadiums() {
  try {
    console.log('Fetching promoted stadiums...');
    
    // ดึงข้อมูลโปรโมชันที่มี promotion_status = "กำลังดำเนินการ"
    const { data: promotions, error: promoError } = await DB
      .from('sports_promotions')
      .select('owner_id, location, sports, sports_list, discount_percentage, end_datetime')
      .eq('promotion_status', 'กำลังดำเนินการ')
      .limit(100);

    if (promoError) {
      console.error('Supabase promotion error:', promoError.message, promoError.details, promoError.hint);
      throw new Error(`Failed to fetch promotions: ${promoError.message}`);
    }
    console.log('Promotions data:', promotions);

    if (!promotions || promotions.length === 0) {
      console.log('No promotions found');
      return [];
    }

    const ownerIds = promotions.map(p => p.owner_id);

    // ดึงข้อมูลสนามจาก add_stadium โดยใช้ owner_id
    const { data: stadiums, error: stadiumError } = await DB
      .from('add_stadium')
      .select('id, stadium_name, stadium_address, stadium_image, owner_id, stadium_status')
      .in('owner_id', ownerIds)
      .eq('stadium_status', 'อนุมัติแล้ว')
      .limit(100);

    if (stadiumError) {
      console.error('Supabase stadium error:', stadiumError.message, stadiumError.details, stadiumError.hint);
      throw new Error(`Failed to fetch stadiums: ${stadiumError.message}`);
    }
    console.log('Stadiums data:', stadiums);

    if (!stadiums || stadiums.length === 0) {
      console.log('No promoted stadiums found');
      return [];
    }

    // รวมข้อมูลโปรโมชันกับสนาม และกรองโปรโมชั่นที่หมดอายุ
    const currentDate = new Date(); // วันที่ปัจจุบัน (13 มีนาคม 2568)
    const result = stadiums.map(stadium => {
      const promo = promotions.find(p => p.owner_id === stadium.owner_id);
      let promotionData = null;
      if (promo) {
        try {
          const promoDetails = promo.sports || (promo.sports_list ? JSON.parse(promo.sports_list) : {});
          const expiryDate = promo.end_datetime ? new Date(promo.end_datetime) : null;
          if (expiryDate && expiryDate >= currentDate) {
            promotionData = {
              ...promoDetails,
              discount_percentage: promo.discount_percentage || 0,
              end_datetime: promo.end_datetime,
              location: promo.location,
            };
          } // ถ้าสิ้นสุดแล้ว promotionData จะเป็น null
        } catch (parseError) {
          console.warn(`Failed to parse promotion for owner ${stadium.owner_id}:`, parseError.message);
          promotionData = { discount_percentage: promo.discount_percentage || 0, location: promo.location };
        }
      }
      return {
        ...stadium,
        promotion: promotionData,
      };
    });

    console.log('Promoted stadiums result:', result);
    return result;
  } catch (error) {
    console.error('Database error in getPromotedStadiums:', error.message, error.stack);
    throw error;
  }

  
}

export { getSportsCategories, getFilteredStadiums, getPromotedStadiums };