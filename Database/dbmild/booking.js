
import DB from '../Database/db.js';

async function getStadium() {
    
  try {
    let query = DB.from('add_stadium').select('stadium_name,stadium_address,stadium_image');

    if (searchQuery) {
      query = query.ilike('stadium_name', `%${searchQuery}%`); // Case-insensitive search
    }

    const { data: add_stadium, error: add_stadiumError } = await query;

    if (add_stadiumError) {
      throw new Error('Error fetching stadium data');
    }

    return add_stadium;
  } catch (error) {
    throw new Error(`Error in getStadiums: ${error.message}`);
  }
};



async function getCourts() {
    
  try {
    const { data: add_court, error: add_courtError } = await DB
      .from('add_court')
      .select('court_type, court_price, id, stadium_id, court_image');

    if (add_courtError) {
      throw new Error('Error fetching add_court data');
    }

    const { data: add_stadium, error: add_stadiumError } = await DB.from('add_stadium').select('id, stadium_name, stadium_address');
    if (add_stadiumError) {
      throw new Error('Error fetching add_stadium data');
    }

    const { data: court_time, error: court_timeError } = await DB.from('court_time').select('court_id, time_start, time_end');
    if (court_timeError) {
      throw new Error('Error fetching court_time data');
    }

    const result = add_court.map(court => {
      const stadium = add_stadium.find(stadium => stadium.id === court.stadium_id);
      const time = court_time.filter(time => time.court_id === court.id);

      return {
        court_type: court.court_type,
        court_price: court.court_price,
        court_image: court.court_image,
        stadium_name: stadium ? stadium.stadium_name : null,
        stadium_address: stadium ? stadium.stadium_address : null,
        time_slots: time.map(t => ({ time_start: t.time_start, time_end: t.time_end }))
      };
    });

    return result;
  } catch (error) {
    throw new Error(`Error in getCourts: ${error.message}`);
  }
};

export {getCourts,getStadium};
