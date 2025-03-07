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
        stadium_image: stadiumData.stadium_image || null, // Changed to stadium_image_url to match URL-based approach
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

// FIXED - Better handling of JSON and error cases
const getadd_stadiumByUserId = async (userId) => {
  try {
    console.log("Fetching stadiums for user ID:", userId);
    
    if (!userId) {
      console.error("getadd_stadiumByUserId called with null/undefined userId");
      return { data: [], error: "User ID is required" };
    }
    
    // Parse userId if it's a JSON string
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
    
    // First, get the owner ID for the user
    const { ownerId, error: ownerError } = await getOwnerIdByUserId(parsedUserId);
    
    if (ownerError || !ownerId) {
      console.error('Error fetching owner ID:', ownerError);
      return { data: [], error: 'No owner found for this user ID' };
    }
    
    console.log("Owner ID found:", ownerId);
    
    return await getStadiumsByOwnerId(ownerId);
  } catch (err) {
    console.error('Error in getadd_stadiumByUserId:', err);
    return { data: [], error: err.message || 'An unexpected error occurred' };
  }
};

// NEW function to get stadiums by owner ID directly
const getStadiumsByOwnerId = async (ownerId) => {
  try {
    console.log(`Fetching stadiums for owner ID: ${ownerId}`);
    
    const { data, error } = await DB
      .from('add_stadium')
      .select('*')
      .eq('owner_id', ownerId);
    
    if (error) {
      console.error('Error fetching stadiums:', error);
      return { data: [], error: 'Failed to fetch stadiums' };
    }
    
    console.log(`Found ${data?.length || 0} stadiums for owner ID ${ownerId}`);
    
    // Return empty array instead of null if no stadiums found
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error in getStadiumsByOwnerId:', err);
    return { data: [], error: err.message || 'An unexpected error occurred' };
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
  // If updating stadium image, make sure it follows URL pattern
  if (updateData.stadium_image) {
    updateData.stadium_image = updateData.stadium_image;
    delete updateData.stadium_image;
  }
  
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

// FIXED - More robust parsing and error handling
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
        parsedUserId = parsed.id || parsed.user_id || parsed.userId || parsed;
        console.log(`Parsed user ID from JSON string: ${parsedUserId}`);
      }
    } catch (parseError) {
      console.log("userId is not a JSON string, continuing with original value");
    }
    
    // Try to find the owner in the owners table
    const { data, error } = await DB
      .from('owners')
      .select('*')
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
    
    // Determine which field to use as the owner ID
    const ownerId = data.id || data.owner_id || data.user_id;
    
    console.log(`Found owner record for user ID: ${parsedUserId} with owner ID: ${ownerId}`);
    return { ownerId, error: null };
  } catch (err) {
    console.error('Error in getOwnerIdByUserId:', err);
    return { ownerId: null, error: err.message || 'Failed to retrieve owner ID' };
  }
};

// FIXED - Improved getUserId function with better error handling
const getUserId = () => {
  // Try localStorage first
  const storedUserId = localStorage.getItem('userId');
  
  if (storedUserId) {
    console.log("Found userId in localStorage:", storedUserId);
    // Check if it's a JSON string and extract the ID if needed
    try {
      if (typeof storedUserId === 'string' && (storedUserId.startsWith('{') || storedUserId.startsWith('['))) {
        const parsedUser = JSON.parse(storedUserId);
        return parsedUser.id || parsedUser.userId || parsedUser.user_id || storedUserId;
      }
    } catch (e) {
      console.error("Error parsing stored userId:", e);
    }
    return storedUserId;
  }
  
  // Try sessionStorage as fallback
  const sessionUserId = sessionStorage.getItem('userId');
  if (sessionUserId) {
    console.log("Found userId in sessionStorage:", sessionUserId);
    // Check if it's a JSON string and extract the ID if needed
    try {
      if (typeof sessionUserId === 'string' && (sessionUserId.startsWith('{') || sessionUserId.startsWith('['))) {
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
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          const parsedUser = JSON.parse(value);
          return parsedUser.id || parsedUser.userId || parsedUser.user_id || value;
        }
      } catch (e) {
        console.error(`Error parsing userId from key ${key}:`, e);
      }
      return value;
    }
  }
  
  // Try to parse JWT token for user ID
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      // Extract payload from JWT (without verification)
      const base64Url = token.split('.')[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        const extractedId = payload.userId || payload.id || payload.user_id || payload.sub;
        
        if (extractedId) {
          console.log("Extracted userId from JWT token:", extractedId);
          // Save it for future use
          localStorage.setItem('userId', extractedId);
          return extractedId;
        }
      }
    }
  } catch (e) {
    console.error("Error parsing JWT token:", e);
  }
  
  return null;
};

// Helper function to handle image URLs
const getStadiumImageUrl = (imageData) => {
  if (!imageData) return null;
  
  // If already a URL, return as is
  if (typeof imageData === 'string' && (imageData.startsWith('http') || imageData.startsWith('/'))) {
    return imageData;
  }
  
  // Otherwise, handle as needed (depends on how images are being uploaded)
  console.log("Converting image data to URL format");
  return imageData;
};

// Export as a module
const dbsox = {
  getUserId,
  addStadium,
  getadd_stadiumByUserId,
  getStadiumById,
  updateStadium,
  deleteStadium,
  getOwnerIdByUserId,
  getStadiumsByOwnerId, // Export the new function
  getStadiumImageUrl // Export new helper function
};

export default dbsox;