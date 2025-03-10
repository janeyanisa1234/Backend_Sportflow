import DB from '../db.js';

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
    
    if (!stadiumData.stadium_name || !stadiumData.stadium_address) {
      throw new Error('Stadium name and address are required');
    }
    
    const dateAdd = new Date().toISOString();

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
      console.error("Database insert error:", error);
      throw new Error(`Failed to insert stadium: ${error.message}`);
    }
    
    console.log("Stadium added successfully:", data);
    return { data };
  } catch (err) {
    console.error("Error in addStadium:", err);
    throw new Error('Failed to add stadium: ' + err.message);
  }
};

const deleteStadium = async (stadiumId) => {
  try {
    console.log(`Deleting stadium with ID: ${stadiumId}`);
    console.log("Stadium ID type and value:", typeof stadiumId, stadiumId);
    
    if (!stadiumId) {
      throw new Error('Stadium ID is required to delete a stadium');
    }
    
    const { data: existingStadium, error: fetchError } = await DB
      .from('add_stadium')
      .select('*')
      .eq('id', stadiumId)
      .single();
    
    if (fetchError) {
      console.error("Error checking stadium existence:", fetchError);
      throw new Error(`Failed to check stadium existence: ${fetchError.message}`);
    }
    
    if (!existingStadium) {
      console.error(`Stadium with ID ${stadiumId} not found in the database during existence check`);
      throw new Error('No stadium found with the given ID');
    }
    
    console.log("Found stadium before deletion:", existingStadium);
    
    // Delete related courts first
    const { error: courtDeleteError } = await DB
      .from('add_court')
      .delete()
      .eq('stadium_id', stadiumId);
    
    if (courtDeleteError) {
      console.error("Error deleting related courts:", courtDeleteError);
      throw new Error(`Failed to delete related courts: ${courtDeleteError.message}`);
    }
    
    // Perform the stadium delete operation
    const { data, error, count } = await DB
      .from('add_stadium')
      .delete()
      .eq('id', stadiumId)
      .select();
    
    console.log("Delete operation result:", { data, error, count });
    
    if (error) {
      console.error("Database delete error:", error);
      throw new Error(`Failed to delete stadium: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.error(`Delete operation returned no data for stadium ID ${stadiumId}`);
      throw new Error('No stadium found with the given ID or deletion failed');
    }
    
    console.log("Stadium deleted successfully:", data);
    return { data };
  } catch (err) {
    console.error("Error in deleteStadium:", err);
    throw new Error('Failed to delete stadium: ' + err.message);
  }
};

const getStadiumsByOwnerId = async (ownerId) => {
  try {
    console.log(`Fetching stadiums for owner ID: ${ownerId}`);
    
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

    const stadiumIds = stadiums.map(stadium => stadium.id);
    const { data: courts, error: courtError } = await DB
      .from('add_court')
      .select('stadium_id, court_type, court_quantity')
      .in('stadium_id', stadiumIds);

    if (courtError) {
      console.error("Error fetching courts:", courtError);
      return { data: stadiums, error: courtError };
    }

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

const dbsox = {
  addStadium,
  deleteStadium,
  getOwnerIdByUserId,
  getStadiumsByOwnerId
};

export default dbsox;