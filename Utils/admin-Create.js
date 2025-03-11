import bcrypt from 'bcrypt';
import DB from '../Database/db.js';

async function createAdmin() {
  try {
    // Admin details
    const email = 'info.sportflow@gmail.com';
    const password = '_SPORTFLOW_';
    const name = 'SPORTFLOW_ADMIN';
    const phone = '0203138888';
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert admin into database
    const { data, error } = await DB
      .from('admins')
      .insert([{
        email,
        password: hashedPassword,
        name,
        phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
    
    if (error) {
      console.error('Error creating admin:', error);
      return;
    }
    
    console.log('Admin created successfully:', email);
  } catch (error) {
    console.error('Script error:', error);
  }
}

createAdmin();
