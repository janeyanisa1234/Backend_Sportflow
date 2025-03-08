import DB from '../db.js';

// Function to add a stadium
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

// Function to get stadiums by user ID
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

// Updated function to get stadiums by owner ID, summing court_quantity
const getStadiumsByOwnerId = async (ownerId) => {
  try {
    console.log(`Fetching stadiums for owner ID: ${ownerId}`);
    
    // Fetch stadiums for the given owner
    const { data: stadiums, error: stadiumError } = await DB
      .from('add_stadium')
      .select('*')
      .eq('owner_id', ownerId);
    
    if (stadiumError) {
      console.error('Error fetching stadiums:', stadiumError);
      return { data: [], error: 'Failed to fetch stadiums' };
    }
    
    console.log(`Found ${stadiums?.length || 0} stadiums for owner ID ${ownerId}`);
    
    // If no stadiums found, return empty array
    if (!stadiums || stadiums.length === 0) {
      return { data: [], error: null };
    }

    // Fetch courts for each stadium and sum court_quantity for each court_type
    const stadiumIds = stadiums.map(stadium => stadium.id);
    const { data: courts, error: courtError } = await DB
      .from('add_court')
      .select('stadium_id, court_type, court_quantity')
      .in('stadium_id', stadiumIds);

    if (courtError) {
      console.error("Error fetching courts:", courtError);
      return { data: stadiums, error: courtError }; // Return stadiums without sports types if courts fail
    }

    // Aggregate courts by stadium_id and court_type, summing court_quantity
    const sportsTypesByStadium = courts.reduce((acc, court) => {
      const { stadium_id, court_type, court_quantity } = court;
      if (!acc[stadium_id]) {
        acc[stadium_id] = {};
      }
      if (!acc[stadium_id][court_type]) {
        acc[stadium_id][court_type] = 0;
      }
      // Sum the court_quantity instead of counting rows
      acc[stadium_id][court_type] += parseInt(court_quantity || 0, 10);
      return acc;
    }, {});

    // Attach sports types to each stadium
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

// Function to get a stadium by ID
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

// Function to update a stadium
const updateStadium = async (stadiumId, updateData) => {
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

// Function to delete a stadium
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

// Function to get owner ID by user ID
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

// Function to get user ID from local storage or token
const getUserId = () => {
  const storedUserId = localStorage.getItem('userId');
  
  if (storedUserId) {
    console.log("Found userId in localStorage:", storedUserId);
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
  
  const sessionUserId = sessionStorage.getItem('userId');
  if (sessionUserId) {
    console.log("Found userId in sessionStorage:", sessionUserId);
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
  
  const possibleKeys = ['user_id', 'id', 'user'];
  for (const key of possibleKeys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value) {
      console.log(`Found userId using alternative key '${key}':`, value);
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
  
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
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
  
  if (typeof imageData === 'string' && (imageData.startsWith('http') || imageData.startsWith('/'))) {
    return imageData;
  }
  
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
  getStadiumsByOwnerId,
  getStadiumImageUrl
};

export default dbsox;