import DB from '../db.js';

// ฟังก์ชันสำหรับเพิ่มสนามกีฬา
const addStadium = async (stadiumData) => {
  try {
    console.log("Adding stadium with data:", stadiumData);
    
    let ownerIdToUse = stadiumData.owner_id;
    if (!ownerIdToUse && stadiumData.user_id) {
      const { ownerId } = await getOwnerIdByUserId(stadiumData.user_id);
      ownerIdToUse = ownerId;
    }
    
    if (!ownerIdToUse) {
      throw new Error('Owner ID is required to add a stadium');
    }
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!stadiumData.stadium_name || !stadiumData.stadium_address) {
      throw new Error('Stadium name and address are required');
    }
    
    // บันทึกข้อมูลสนามลงตาราง add_stadium
    const { data, error } = await DB
      .from('add_stadium')
      .insert([{ 
        owner_id: ownerIdToUse,
        stadium_name: stadiumData.stadium_name,
        stadium_address: stadiumData.stadium_address,
        stadium_image: stadiumData.stadium_image || null,
        stadium_status: 'รออนุมัติ'
      }])
      .select();
    
    if (error) throw error;
    return { data };
  } catch (err) {
    console.error("Database error:", err);
    throw new Error('Failed to add stadium: ' + err.message);
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลสนามตาม owner_id
const getStadiumsByOwnerId = async (ownerId) => {
  try {
    console.log(`Fetching stadiums for owner ID: ${ownerId}`);
    
    // ดึงข้อมูลสนามทั้งหมดของ owner_id
    const { data: stadiums, error: stadiumError } = await DB
      .from('add_stadium')
      .select('*')
      .eq('owner_id', ownerId);
    
    if (stadiumError) {
      console.error('Error fetching stadiums:', stadiumError);
      return { data: [], error: 'Failed to fetch stadiums' };
    }
    
    console.log(`Found ${stadiums?.length || 0} stadiums for owner ID ${ownerId}`);
    
    if (!stadiums || stadiums.length === 0) {
      return { data: [], error: null };
    }

    // ดึงข้อมูลคอร์ทของสนามทั้งหมด
    const stadiumIds = stadiums.map(stadium => stadium.id);
    const { data: courts, error: courtError } = await DB
      .from('add_court')
      .select('stadium_id, court_type, court_quantity')
      .in('stadium_id', stadiumIds);

    if (courtError) {
      console.error("Error fetching courts:", courtError);
      return { data: stadiums, error: courtError };
    }

    // รวมจำนวนคอร์ทตามประเภทกีฬา
    const sportsTypesByStadium = courts.reduce((acc, court) => {
      const { stadium_id, court_type, court_quantity } = court;
      if (!acc[stadium_id]) {
        acc[stadium_id] = {};
      }
      if (!acc[stadium_id][court_type]) {
        acc[stadium_id][court_type] = 0;
      }
      acc[stadium_id][court_type] += parseInt(court_quantity || 0, 10);
      return acc;
    }, {});

    // แนบข้อมูลประเภทกีฬาเข้ากับสนาม
    const enrichedStadiums = stadiums.map(stadium => {
      const sportsTypes = sportsTypesByStadium[stadium.id] || {};
      const sportsArray = Object.entries(sportsTypes).map(([name, count]) => ({
        name,
        count
      }));
      return {
        ...stadium,
        sports_types: sportsArray
      };
    });

    return { data: enrichedStadiums, error: null };
  } catch (err) {
    console.error('Error in getStadiumsByOwnerId:', err);
    return { data: [], error: err.message || 'An unexpected error occurred' };
  }
};

// ฟังก์ชันสำหรับดึง owner_id จาก user_id
const getOwnerIdByUserId = async (userId) => {
  try {
    console.log(`Looking up owner ID for user ID: ${userId}`);
    
    if (!userId) {
      console.error("getOwnerIdByUserId called with null/undefined userId");
      return { ownerId: null, error: "User ID is required" };
    }
    
    let parsedUserId = userId;
    try {
      if (typeof userId === 'string' && (userId.startsWith('{') || userId.startsWith('['))) {
        const parsed = JSON.parse(userId);
        parsedUserId = parsed.id || parsed.user_id || parsed.userId || parsed;
        console.log(`Parsed user ID from JSON string: ${parsedUserId}`);
      }
    } catch (parseError) {
      console.log("userId is not a JSON string, continuing with original value");
    }
    
    // ค้นหา owner_id จากตาราง owners
    const { data, error } = await DB
      .from('owners')
      .select('*')
      .eq('user_id', parsedUserId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`No owner found for user ID: ${parsedUserId}`);
        return { ownerId: null, error: `No owner found for user ID: ${parsedUserId}` };
      }
      
      console.error('Database error when fetching owner ID:', error);
      return { ownerId: null, error: error.message || 'Database error' };
    }
    
    if (!data) {
      console.log(`No owner record found for user ID: ${parsedUserId}`);
      return { ownerId: null, error: 'No owner found for the given user ID' };
    }
    
    const ownerId = data.id || data.owner_id || data.user_id;
    
    console.log(`Found owner record for user ID: ${parsedUserId} with owner ID: ${ownerId}`);
    return { ownerId, error: null };
  } catch (err) {
    console.error('Error in getOwnerIdByUserId:', err);
    return { ownerId: null, error: err.message || 'Failed to retrieve owner ID' };
  }
};

// ส่งออกโมดูล
const dbsox = {
  addStadium,
  getOwnerIdByUserId,
  getStadiumsByOwnerId
};

export default dbsox;