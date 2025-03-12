import DB from '../db.js';
 
async function history() {
    try {
 
        const { data: add_stadium, error: add_stadiumError } = await DB
            .from('add_stadium')
            .select('*');
 
        const { data: booking, error: booking_historyError } = await DB
            .from('Booking')
            .select('*');
 
        
 
        if (booking_historyError) {
            console.error('Error fetching add_stadium data:', add_stadiumError);
            return;
        }
    
 
        if (booking_historyError) {
            console.error('Error fetching booking data:', booking_historyError);
            return;
        }
 
       
        console.log('Fetched Booking Data:', booking);
        console.log('Fetched add_stadium Data:', add_stadiumError);
     
    } catch (error) {
        console.error('Unexpected error:', booking_historyError);
    }
}
 
history();