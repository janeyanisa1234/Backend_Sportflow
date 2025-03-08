import DB from '../db.js';

async function edit() {
    try {
        const { data: add_stadium, error: add_stadiumError } = await DB
            .from('add_stadium')
            .select('*');

        

        if (add_stadiumError) {
            console.error('Error fetching booking data:', add_stadiumError);
            return;
        }

       
        console.log('Fetched Booking Data:', add_stadium);
     
    } catch (error) {
        console.error('Unexpected error:', add_stadiumError);
    }
}

edit();