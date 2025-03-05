// cancle.js
import DB from '../db.js';  // Assuming db.js contains the setup for Supabase

// Function to fetch all bookings
export const getBookings = async () => {
  try {
    const { data, error } = await DB.from('Booking').select('*');  // Replace 'Booking' with your actual table name

    if (error) {
      throw new Error(error.message);
    }

    return data;  // Return the booking data
  } catch (error) {
    console.error('Error fetching bookings:', error.message);
    throw error;  // Rethrow the error for further handling
  }
};
