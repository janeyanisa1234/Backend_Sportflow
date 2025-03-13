import DB from '../db.js';

// ฟังก์ชันเพิ่มข้อมูลสนามกีฬาลงในฐานข้อมูล
const addStadium = async (stadiumData) => {
  try {
    let ownerIdToUse = stadiumData.owner_id;
    // ถ้าไม่มี owner_id แต่มี user_id ให้ดึง owner_id จาก user_id
    if (!ownerIdToUse && stadiumData.user_id) {
      const { ownerId } = await getOwnerIdByUserId(stadiumData.user_id);
      ownerIdToUse = ownerId;
    }
    
    // ตรวจสอบว่ามี owner_id หรือไม่ ถ้าไม่มีให้โยน error
    if (!ownerIdToUse) {
      throw new Error('Owner ID is required to add a stadium');
    }
    
    // ตรวจสอบว่ามีชื่อสนามและที่อยู่หรือไม่ ถ้าไม่มีให้โยน error
    if (!stadiumData.stadium_name || !stadiumData.stadium_address) {
      throw new Error('Stadium name and address are required');
    }
    
    const dateAdd = new Date().toISOString();

    // เพิ่มข้อมูลสนามลงในตาราง 'add_stadium' ด้วยสถานะ 'รออนุมัติ'
    const { data, error } = await DB
      .from('add_stadium')
      .insert([{ 
        owner_id: ownerIdToUse,
        stadium_name: stadiumData.stadium_name,
        stadium_address: stadiumData.stadium_address,
        stadium_image: stadiumData.stadium_image || null,
        stadium_status: 'รออนุมัติ', 
        date_add: dateAdd
      }])
      .select();
    
    if (error) {
      throw new Error(`Failed to insert stadium: ${error.message}`);
    }
    
    return { data };
  } catch (err) {
    throw new Error('Failed to add stadium: ' + err.message);
  }
};

// ฟังก์ชันลบข้อมูลสนามกีฬาออกจากฐานข้อมูล
const deleteStadium = async (stadiumId) => {
  try {
    // ตรวจสอบว่ามี stadiumId หรือไม่ ถ้าไม่มีให้โยน error
    if (!stadiumId) {
      throw new Error('Stadium ID is required to delete a stadium');
    }
    
    // ตรวจสอบว่ามีสนามนี้อยู่ในฐานข้อมูลหรือไม่
    const { data: existingStadium, error: fetchError } = await DB
      .from('add_stadium')
      .select('*')
      .eq('id', stadiumId)
      .single();
    
    if (fetchError) {
      throw new Error(`Failed to check stadium existence: ${fetchError.message}`);
    }
    
    if (!existingStadium) {
      throw new Error('No stadium found with the given ID');
    }
    
    // ลบข้อมูลคอร์ทที่เกี่ยวข้องกับสนามนี้ก่อน
    const { error: courtDeleteError } = await DB
      .from('add_court')
      .delete()
      .eq('stadium_id', stadiumId);
    
    if (courtDeleteError) {
      throw new Error(`Failed to delete related courts: ${courtDeleteError.message}`);
    }
    
    // ลบข้อมูลสนาม
    const { data, error } = await DB
      .from('add_stadium')
      .delete()
      .eq('id', stadiumId)
      .select();
    
    if (error) {
      throw new Error(`Failed to delete stadium: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('No stadium found with the given ID or deletion failed');
    }
    
    return { data };
  } catch (err) {
    throw new Error('Failed to delete stadium: ' + err.message);
  }
};

// ฟังก์ชันดึงข้อมูลสนามทั้งหมดตาม owner_id
const getStadiumsByOwnerId = async (ownerId) => {
  try {
    // ดึงข้อมูลสนามทั้งหมดที่ owner_id นี้เป็นเจ้าของ
    const { data: stadiums, error: stadiumError } = await DB
      .from('add_stadium')
      .select('*')
      .eq('owner_id', ownerId);
    
    if (stadiumError) {
      return { data: [], error: 'Failed to fetch stadiums' };
    }
    
    if (!stadiums || stadiums.length === 0) {
      return { data: [], error: null };
    }

    // ดึงข้อมูลคอร์ทที่เกี่ยวข้องกับสนามทั้งหมด
    const stadiumIds = stadiums.map(stadium => stadium.id);
    const { data: courts, error: courtError } = await DB
      .from('add_court')
      .select('stadium_id, court_type, court_quantity')
      .in('stadium_id', stadiumIds);

    if (courtError) {
      return { data: stadiums, error: courtError };
    }

    // จัดกลุ่มประเภทกีฬาและจำนวนคอร์ทตาม stadium_id
    const sportsTypesByStadium = courts.reduce((acc, court) => {
      const { stadium_id, court_type, court_quantity } = court;
      if (!acc[stadium_id]) acc[stadium_id] = {};
      if (!acc[stadium_id][court_type]) acc[stadium_id][court_type] = 0;
      acc[stadium_id][court_type] += parseInt(court_quantity || 0, 10);
      return acc;
    }, {});

    // เพิ่มข้อมูลประเภทกีฬาให้กับข้อมูลสนาม
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
    return { data: [], error: err.message || 'An unexpected error occurred' };
  }
};

// ฟังก์ชันดึง owner_id จาก user_id
const getOwnerIdByUserId = async (userId) => {
  try {
    if (!userId) {
      return { ownerId: null, error: "User ID is required" };
    }
    
    let parsedUserId = userId;
    // จัดการกรณี userId เป็น JSON string
    try {
      if (typeof userId === 'string' && (userId.startsWith('{') || userId.startsWith('['))) {
        const parsed = JSON.parse(userId);
        parsedUserId = parsed.id || parsed.user_id || parsed.userId || parsed;
      }
    } catch (parseError) {
    }
    
    // ดึงข้อมูล owner จากตาราง 'owners' โดยใช้ user_id
    const { data, error } = await DB
      .from('owners')
      .select('*')
      .eq('user_id', parsedUserId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { ownerId: null, error: `No owner found for user ID: ${parsedUserId}` };
      }
      return { ownerId: null, error: error.message || 'Database error' };
    }
    
    if (!data) {
      return { ownerId: null, error: 'No owner found for the given user ID' };
    }
    
    const ownerId = data.id || data.owner_id || data.user_id;
    
    return { ownerId, error: null };
  } catch (err) {
    return { ownerId: null, error: err.message || 'Failed to retrieve owner ID' };
  }
};

const dbsox = {
  addStadium,
  deleteStadium,
  getOwnerIdByUserId,
  getStadiumsByOwnerId
};

export default dbsox;