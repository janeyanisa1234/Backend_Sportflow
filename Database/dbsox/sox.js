// sox.js
import DB from '../db.js';

const addStadium = async (stadiumData) => {
  try {
    console.log("Adding stadium with data:", stadiumData);
    
    // Get the owner ID if it's not already provided
    let ownerIdToUse = stadiumData.owner_id;
    if (!ownerIdToUse && stadiumData.user_id) {
      const { ownerId } = await getOwnerIdByUserId(stadiumData.user_id);
      ownerIdToUse = ownerId;
    }
    
    if (!ownerIdToUse) {
      throw new Error('Owner ID is required to add a stadium');
    }
    
    // Make sure we have all required fields
    if (!stadiumData.stadium_name || !stadiumData.stadium_address) {
      throw new Error('Stadium name and address are required');
    }
    
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
  
const getadd_stadiumByUserId = async (userId) => {
  try {
    console.log("Fetching stadiums for user ID:", userId);
    
    // First, get the owner ID for the user
    const { ownerId, error: ownerError } = await getOwnerIdByUserId(userId);
    
    if (ownerError) {
      console.error('Error fetching owner ID:', ownerError);
      return { error: 'Failed to fetch owner ID' };
    }
    
    console.log("Owner ID found:", ownerId);
    
    // Then fetch stadiums using the owner ID
    const { data, error } = await DB
      .from('add_stadium')
      .select('*')
      .eq('owner_id', ownerId);
    
    if (error) {
      console.error('Error fetching stadiums:', error);
      return { error: 'Failed to fetch stadiums' };
    }
    
    console.log(`Found ${data?.length || 0} stadiums for owner ID ${ownerId}`);
    
    return { data, error: null };
  } catch (err) {
    console.error('Error in getadd_stadiumByUserId:', err);
    return { data: null, error: err.message || 'An unexpected error occurred' };
  }
};

const getStadiumById = async (stadiumId) => {
  const { data, error } = await DB
    .from('add_stadium')
    .select('*')
    .eq('id', stadiumId)
    .single();
  
  if (error) {
    console.error('Error fetching stadium:', error);
    throw new Error('Failed to fetch stadium details');
  }
  
  return { data, error };
};

const updateStadium = async (stadiumId, updateData) => {
  const { data, error } = await DB
    .from('add_stadium')
    .update(updateData)
    .eq('id', stadiumId)
    .select();
  
  if (error) {
    console.error('Error updating stadium:', error);
    throw new Error('Failed to update stadium');
  }
  
  return { data, error };
};

const deleteStadium = async (stadiumId) => {
  const { error } = await DB
    .from('add_stadium')
    .delete()
    .eq('id', stadiumId);
  
  if (error) {
    console.error('Error deleting stadium:', error);
    throw new Error('Failed to delete stadium');
  }
  
  return { error };
};

const getOwnerIdByUserId = async (userId) => {
  try {
    console.log(`Looking up owner ID for user ID: ${userId}`);
    
    if (!userId) {
      console.error("getOwnerIdByUserId called with null/undefined userId");
      return { ownerId: null, error: "User ID is required" };
    }
    
    // Check if userId is a JSON string and parse it if needed
    let parsedUserId = userId;
    try {
      if (typeof userId === 'string' && (userId.startsWith('{') || userId.startsWith('['))) {
        const parsed = JSON.parse(userId);
        // Extract the actual user ID from the parsed object
        parsedUserId = parsed.id || parsed.user_id || parsed;
        console.log(`Parsed user ID from JSON string: ${parsedUserId}`);
      }
    } catch (parseError) {
      console.error("Failed to parse userId as JSON:", parseError);
      // Continue with the original userId
    }
    
    // Try to find the owner in the owners table
    const { data, error } = await DB
      .from('owners')
      .select('user_id')
      .eq('user_id', parsedUserId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
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
    
    console.log(`Found owner record for user ID: ${parsedUserId} with owner ID: ${data.user_id}`);
    return { ownerId: data.user_id, error: null };
  } catch (err) {
    console.error('Error in getOwnerIdByUserId:', err);
    return { ownerId: null, error: err.message || 'Failed to retrieve owner ID' };
  }
};

// Function to get user ID from multiple possible sources
const getUserId = () => {
  // Try localStorage first
  const storedUserId = localStorage.getItem('userId');
  
  if (storedUserId) {
    console.log("Found userId in localStorage:", storedUserId);
    // Check if it's a JSON string and extract the ID if needed
    try {
      if (storedUserId.startsWith('{') || storedUserId.startsWith('[')) {
        const parsedUser = JSON.parse(storedUserId);
        return parsedUser.id || parsedUser.userId || parsedUser.user_id || storedUserId;
      }
    } catch (e) {
      console.error("Error parsing stored userId:", e);
    }
    return storedUserId;
  }
  
  // Rest of your existing code...
  // Try sessionStorage as fallback
  const sessionUserId = sessionStorage.getItem('userId');
  if (sessionUserId) {
    console.log("Found userId in sessionStorage:", sessionUserId);
    // Check if it's a JSON string and extract the ID if needed
    try {
      if (sessionUserId.startsWith('{') || sessionUserId.startsWith('[')) {
        const parsedUser = JSON.parse(sessionUserId);
        return parsedUser.id || parsedUser.userId || parsedUser.user_id || sessionUserId;
      }
    } catch (e) {
      console.error("Error parsing stored userId:", e);
    }
    return sessionUserId;
  }
  
  // Try other possible storage keys
  const possibleKeys = ['user_id', 'id', 'user'];
  for (const key of possibleKeys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value) {
      console.log(`Found userId using alternative key '${key}':`, value);
      // Check if it's a JSON string and extract the ID if needed
      try {
        if (value.startsWith('{') || value.startsWith('[')) {
          const parsedUser = JSON.parse(value);
          return parsedUser.id || parsedUser.userId || parsedUser.user_id || value;
        }
      } catch (e) {
        console.error(`Error parsing userId from key ${key}:`, e);
      }
      return value;
    }
  }
  
  // Rest of your existing JWT logic...
};

// Export as a module
const dbsox = {
  getUserId,
  addStadium,
  getadd_stadiumByUserId,
  getStadiumById,
  updateStadium,
  deleteStadium,
  getOwnerIdByUserId
};

export default dbsox;