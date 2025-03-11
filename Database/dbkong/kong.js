import DB from '../db.js';
import bcrypt from 'bcrypt';

// User operations
export const findUserByEmail = async (email) => {
  const { data, error } = await DB
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Supabase lookup error:', error);
    throw new Error('Error checking user existence');
  }
  
  return { data, error };
};

export const createUser = async (userData) => {
  const { name, email, phone, password } = userData;
  
  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const { data, error } = await DB
    .from('users')
    .insert([{ 
      name, 
      email, 
      phone, 
      password: hashedPassword 
    }])
    .select();
  
  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error('Failed to register user: ' + error.message);
  }
  
  return { data, error };
};

// Owner operations
export const findOwnerByUserId = async (userId) => {
  const { data, error } = await DB
    .from('owners')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return { data, error };
};

export const createOwner = async (ownerData) => {
  const { user_id, identity_card, bank_name, bank_acc_id, identity_card_url, bank_acc_url } = ownerData;
  
  const { data, error } = await DB
    .from('owners')
    .insert([{ 
      user_id, 
      identity_card, 
      bank_name, 
      bank_acc_id,
      identity_card_url,
      bank_acc_url
    }]);
  
  if (error) {
    console.error('Owner creation error:', error);
    throw new Error('Failed to create owner: ' + error.message);
  }
  
  return { data, error };
};

// Add new function to update owner document URLs
export const updateOwnerDocuments = async (userId, updates) => {
  const { data, error } = await DB
    .from('owners')
    .update(updates)
    .eq('user_id', userId)
    .select();
  
  if (error) {
    console.error('Owner document update error:', error);
    throw new Error('Failed to update owner documents: ' + error.message);
  }
  
  return { data, error };
};

// Password reset operations
export const deleteExistingResetTokens = async (userId) => {
  const { error } = await DB
    .from('password_reset_tokens')
    .delete()
    .eq('user_id', userId);
  
  return { error };
};

export const createPasswordResetToken = async (userId, token, expiryDate) => {
  const { error } = await DB
    .from('password_reset_tokens')
    .insert([{
      user_id: userId,
      token: token,
      expires_at: expiryDate.toISOString(),
    }]);
  
  if (error) {
    console.error('Error inserting reset token:', error);
    throw new Error('Failed to generate reset token');
  }
  
  return { error };
};

export const findResetToken = async (token) => {
  const { data, error } = await DB
    .from('password_reset_tokens')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();
  
  return { data, error };
};

export const deleteResetToken = async (token) => {
  const { error } = await DB
    .from('password_reset_tokens')
    .delete()
    .eq('token', token);
  
  return { error };
};

// User profile and password operations
export const getUserProfile = async (userId) => {
  const { data, error } = await DB
    .from('users')
    .select('id, name, email, phone')
    .eq('id', userId)
    .single();
  
  return { data, error };
};

export const updateUserPassword = async (userId, hashedPassword) => {
  const { data, error } = await DB
    .from('users')
    .update({ 
      password: hashedPassword, 
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select();
  
  return { data, error };
};

// Admin operations
export const findAdminByEmail = async (email) => {
  const { data, error } = await DB
    .from('admins')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Supabase lookup error:', error);
    throw new Error('Error checking admin existence');
  }
  
  return { data, error };
};

// Supabase Storage operations
export const uploadFileToSupabase = async (bucket, filePath, fileBuffer, contentType, options = {}) => {
  try {
    // Upload file to Supabase Storage
    const { data, error } = await DB.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
        ...options
      });
    
    if (error) {
      console.error(`Supabase storage upload error (${bucket}/${filePath}):`, error);
      throw new Error(`Failed to upload file to ${bucket}: ${error.message}`);
    }
    
    // Get public URL for the uploaded file
    const { data: publicUrlData } = DB.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return {
      data,
      publicUrl: publicUrlData.publicUrl
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};

// Update the default export to include the new function
export default {
  findUserByEmail,
  createUser,
  findOwnerByUserId,
  createOwner,
  updateOwnerDocuments,
  findAdminByEmail,
  deleteExistingResetTokens,
  createPasswordResetToken,
  findResetToken,
  deleteResetToken,
  getUserProfile,
  updateUserPassword,
  uploadFileToSupabase
};
