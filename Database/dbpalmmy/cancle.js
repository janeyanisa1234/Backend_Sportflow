import DB from '../db.js';

async function cancle_booking() {
    try{
        const {data: historyBooking, error: historyBookingError} = await DB
        .from('booking_history')
        .select('id,stadium_name,type,date,Price')

        if(historyBooking){
            console.error('Error fetching bookingHistory data:', historyBookingError);
            return;
        }

        console.log('Fetched Booking Data:', historyBooking);


    }catch{ 
        console.error('Unexpected error:', historyBookingError);

    }
}