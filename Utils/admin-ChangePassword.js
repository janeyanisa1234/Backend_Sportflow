import bcrypt from 'bcrypt';
import DB from '../Database/db.js';

async function changePassword() {
    try {
      // Admin details
      const email = 'info.sportflow@gmail.com';
      const password = 'SPORTFLOW';
  
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Update admin password in database
      const { data, error } = await DB
        .from('admins')
        .update({
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);
  
      if (error) {
        console.error('Error updating admin password:', error);
        return;
      }

      console.log('Admin password updated successfully:', email);
    } catch (error) {
      console.error('Script error:', error);
    }
}

changePassword();
