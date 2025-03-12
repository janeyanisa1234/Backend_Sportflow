import DB from '../db.js';

async function checkBooking() {
    try {
        const { data: checkBook, error: checkBookError } = await DB
            .from('Booking')
            .select('id_booking')
            .eq("id_booking", id_booking)
            .single();

            if (checkBookError) {
                console.error("Database Error :", checkBookError);
                return res.status(500).json({ error: "Error processing refund", details: checkBookError.message });
              }
          
              res.status(200).json({ message: "Booking canceled and refund request submitted successfully" });
          
            } catch (error) {
              console.error("Server Error:", error);
              res.status(500).json({ error: "Internal Server Error" });
            }
}
export {checkBooking};
          
