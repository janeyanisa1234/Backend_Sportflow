import DB from '../db.js';
import bcrypt from 'bcrypt';

// ฟังก์ชันดึงข้อมูลผู้ใช้โดย ID
export const getUserById = async (userId) => {
  if (!userId) {
    console.error("Invalid userId:", userId);
    return null;
  }

  try {
    console.log("Fetching user with ID:", userId);
    const { data, error } = await DB
      .from("users")
      .select("id, name, email, phone, password") // เพิ่มการดึง password_hash
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching user:", error.message);
    return null;
  }
};

// ฟังก์ชันตรวจสอบรหัสผ่าน
export const verifyPassword = async (userId, inputPassword) => {
  const user = await getUserById(userId);
  
  if (!user || !user.password_hash) {
    console.error("User not found or no password hash available.");
    return false;
  }

  try {
    const match = await bcrypt.compare(inputPassword, user.password_hash);
    
    if (match) {
      console.log("Password is correct!");
      return true;
    } else {
      console.log("Incorrect password.");
      return false;
    }
  } catch (error) {
    console.error("Error comparing password:", error.message);
    return false;
  }
};


export const getOwnerById = async (userId) => {
    if (!userId) {
      console.error("Invalid userId:", userId);
      return null;
    }
  
    try {
      console.log("Fetching owner with user ID:", userId);
  
      // ดึงข้อมูลจากตาราง users
      const { data: user, error: userError } = await DB
        .from("users")
        .select("name, email, phone")
        .eq("id", userId)
        .single();
  
      if (userError) throw userError;
  
      // ดึงข้อมูลจากตาราง owners
      const { data: owner, error: ownerError } = await DB
        .from("owners")
        .select("bank_name, bank_acc_id")
        .eq("user_id", userId)
        .single();
  
      if (ownerError) throw ownerError;
  
      // รวมข้อมูล
      return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        bank_name: owner?.bank_name || "-",
        bank_account: owner?.bank_acc_id || "-",
      };
    } catch (error) {
      console.error("Error fetching owner data:", error.message);
      return null;
    }
  };
  


export default { getUserById, verifyPassword,getOwnerById  };

