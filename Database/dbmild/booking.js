import DB from '../db.js';

async function getStadium() {
  try {
    const { data: add_stadium, error } = await DB
      .from('add_stadium')
      .select('*');

    if (error) {
      throw error;
    }

    return add_stadium;
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export { getStadium };
