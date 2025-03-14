import DB from '../db.js';

export async function getBookingData() {
  try {
    const { data: bookings, error: bookingError } = await DB //ดึงข้อมูลจากตารางมาเก็บที่ตัวแปล
      .from('Booking')
      .select(` 
        id_booking,
        status_booking,
        date_play,
        time_slot,
        court,
        user_id,
        id_stadium,
        id_court,
        totalPrice  
      `)
      .in('status_booking', ['รอดำเนินการยกเลิก', 'ยกเลิกแล้ว']);

    if (bookingError) {
      throw new Error(bookingError.message);
    }

    const bookingIds = bookings.map(booking => booking.id_booking);
    const { data: bookBankData, error: bookBankError } = await DB
      .from('BookBank')
      .select('*')
      .in('id_booking', bookingIds);

    if (bookBankError) {
      throw new Error(bookBankError.message);
    }

    const bookBankMap = bookBankData.reduce((acc, item) => {
      acc[item.id_booking] = item;
      return acc;
    }, {});

    const userIds = bookings.map(booking => booking.user_id);
    const { data: users, error: userError } = await DB
      .from('users')
      .select('id, name')
      .in('id', userIds);

    if (userError) {
      throw new Error(userError.message);
    }

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const stadiumIds = bookings.map(booking => booking.id_stadium);
    const { data: stadiums, error: stadiumError } = await DB
      .from('add_stadium')
      .select('id, stadium_name')
      .in('id', stadiumIds);

    if (stadiumError) {
      throw new Error(stadiumError.message);
    }

    const stadiumMap = stadiums.reduce((acc, stadium) => {
      acc[stadium.id] = stadium;
      return acc;
    }, {});

    const courtIds = bookings.map(booking => booking.id_court);
    const { data: courts, error: courtError } = await DB
      .from('add_court')
      .select('id, court_type')
      .in('id', courtIds);

    if (courtError) {
      throw new Error(courtError.message);
    }

    const courtMap = courts.reduce((acc, court) => {
      acc[court.id] = court;
      return acc;
    }, {});

    //หลังจากกรอกหลักฐานการโอนเงินจะทำการดึงข้อมูลออกมา
    const cancelledBookingIds = bookings
      .filter(booking => booking.status_booking === 'ยกเลิกแล้ว')
      .map(booking => booking.id_booking);

    let cancleHistoryData = [];
    if (cancelledBookingIds.length > 0) {
      const { data: historyData, error: historyError } = await DB
        .from('canclehistory')
        .select('id_booking, slipcancle, date, name')
        .in('id_booking', cancelledBookingIds);

      if (historyError) {
        console.error('Error fetching canclehistory data:', historyError);
      } else {
        cancleHistoryData = historyData || [];
      }
    }

    const cancleHistoryMap = cancleHistoryData.reduce((acc, item) => {
      acc[item.id_booking] = item;
      return acc;
    }, {});

    const result = bookings
      .filter(booking => bookBankMap[booking.id_booking])
      .map(booking => {
        const bookBank = bookBankMap[booking.id_booking];
        const user = userMap[booking.user_id];
        const stadium = stadiumMap[booking.id_stadium];
        const court = courtMap[booking.id_court];
        const history = cancleHistoryMap[booking.id_booking];

        return {
          id_booking: booking.id_booking,
          status_booking: booking.status_booking,
          user_name: user ? user.name : 'ไม่พบชื่อผู้ใช้',
          stadium_name: stadium ? stadium.stadium_name : 'ไม่พบชื่อสนาม',
          court_type: court ? court.court_type : 'ไม่พบประเภทสนาม',
          date_play: booking.date_play,
          time_slot: booking.time_slot,
          court: booking.court,
          bank_name: bookBank.name,
          bank: bookBank.bank,
          bank_number: bookBank.bank_number,
          reasoncancle: bookBank.reasoncancle,
          bankimages: bookBank.bankimges || null,
          totalPrice: booking.totalPrice,
          slipcancle: history ? history.slipcancle : null,
          refund_date: history ? history.date : null,
          admin_name: history ? history.name : null
        };
      });

    console.log("Result:", result);
    return result;
  } catch (error) {
    console.error("Error fetching booking data:", error);
    throw error;
  }
}

export async function processRefund({ id_booking, date, name, slipImage }) {
  try {
    if (!id_booking) throw new Error('No id_booking provided');
    if (!slipImage) throw new Error('No slip image provided');

    console.log('Starting processRefund with id_booking:', id_booking, 'Type:', typeof id_booking);

    // อัพโหลดไฟล์
    const fileName = `${id_booking}_${Date.now()}.jpg`;
    console.log('Uploading slip to storage:', fileName);
    const { error: uploadError } = await DB.storage
      .from('images')
      .upload(fileName, slipImage, {
        contentType: 'image/jpeg'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload slip: ' + uploadError.message);
    }

    const slipUrl = DB.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    console.log('Slip uploaded successfully, URL:', slipUrl);

    // Insert ลง canclehistory
    console.log('Inserting into canclehistory with id_booking:', id_booking);
    const { data: insertData, error: insertError } = await DB
      .from('canclehistory')
      .insert({
        id_booking: id_booking, // ใช้ id_booking โดยตรง
        date: date,
        name,
        slipcancle: slipUrl
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Insert failed: ' + insertError.message);
    }
    console.log('Successfully inserted into canclehistory:', insertData);

    // ตรวจสอบ Booking ก่อนอัพเดท
    console.log('Checking Booking record for id_booking:', id_booking);
    const { data: bookingCheck, error: checkError } = await DB
      .from('Booking')
      .select('id_booking, status_booking')
      .eq('id_booking', id_booking)
      .single();

    if (checkError) {
      console.error('Check error:', checkError);
      throw new Error('Error checking booking: ' + checkError.message);
    }
    if (!bookingCheck) {
      console.error('No booking found with id:', id_booking);
      throw new Error(`Booking with id ${id_booking} not found`);
    }
    console.log('Found booking:', bookingCheck);
    console.log('Current status before update:', bookingCheck.status_booking);

    // อัพเดทสถานะ Booking
    console.log('Attempting to update Booking with id_booking:', id_booking);
    const { data: updateData, error: updateError } = await DB
      .from('Booking')
      .update({ status_booking: 'ยกเลิกแล้ว' })
      .eq('id_booking', id_booking);

    if (updateError) {
      console.error('Update error details:', updateError);
      throw new Error('Update failed: ' + updateError.message);
    }
    console.log('Update successful, result:', updateData);

    // ตรวจสอบสถานะหลังอัพเดท
    console.log('Verifying status after update for id_booking:', id_booking);
    const { data: updatedBooking, error: postCheckError } = await DB
      .from('Booking')
      .select('id_booking, status_booking')
      .eq('id_booking', id_booking)
      .single();

    if (postCheckError) {
      console.error('Post-update check error:', postCheckError);
    } else {
      console.log('Verified status after update:', updatedBooking.status_booking);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in processRefund:', error);
    throw error;
  }
}