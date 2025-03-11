import supabase from '../db.js';

export const getOwnerDashboardData = async (userId, month, year, timeRange) => {
  console.log(`Fetching dashboard data for userId: ${userId}, month: ${month}, year: ${year}, timeRange: ${timeRange}`);

  try {
    // ตรวจสอบว่า userId ถูกส่งมาหรือไม่
    if (!userId) {
      console.error('No userId provided');
      throw new Error('UserId is required');
    }

    // จาก Log ก่อนหน้า userId และ owner_id มีค่าเดียวกัน ดังนั้นใช้ userId เป็น owner_id ได้เลย
    const ownerId = userId;
    console.log('Using ownerId:', ownerId);

    // ดึงข้อมูลสนามของเจ้าของ (เรียกครั้งเดียว)
    console.log('Fetching stadiums for ownerId:', ownerId);
    const { data: stadiums, error: stadiumError } = await supabase
      .from('add_stadium')
      .select('id, stadium_name')
      .eq('owner_id', ownerId);

    if (stadiumError) {
      console.error('Stadium fetch error:', stadiumError.message);
      throw new Error(`Stadium fetch error: ${stadiumError.message}`);
    }
    console.log('Stadiums fetched:', stadiums);

    // ถ้าไม่มีสนาม
    if (!stadiums || stadiums.length === 0) {
      console.log('No stadiums found for ownerId:', ownerId);
      return {
        totalRevenue: 0,
        bookingRate: 0,
        cancellations: 0,
        sportsData: [],
        mostBookedCourt: { name: 'N/A', count: 0 },
        leastBookedCourt: { name: 'N/A', count: 0 },
        mostBookedSport: { name: 'N/A', count: 0 },
        highestRevenueSport: { name: 'N/A', revenue: 0 },
        monthlyTrends: [],
        yoyGrowth: 0,
        successfulBookings: 0,
      };
    }

    const stadiumIds = stadiums.map(s => s.id);
    console.log('Stadium IDs:', stadiumIds);

    // ดึงข้อมูลคอร์ท
    console.log('Fetching courts for stadiumIds:', stadiumIds);
    const { data: courts, error: courtError } = await supabase
      .from('add_court')
      .select('id, court_type, court_quantity, stadium_id')
      .in('stadium_id', stadiumIds);

    if (courtError) {
      console.error('Court fetch error:', courtError.message);
      throw new Error(`Court fetch error: ${courtError.message}`);
    }
    console.log('Courts fetched:', courts);

    const courtsWithStadium = courts.map(court => ({
      ...court,
      stadium_name: stadiums.find(s => s.id === court.stadium_id)?.stadium_name || 'Unknown',
    }));

    // ดึงข้อมูลการจอง
    let bookingQuery = supabase
      .from('Booking')
      .select('id_booking, status_booking, totalPrice, court, id_court, date, id_stadium')
      .in('id_stadium', stadiumIds);

    const currentDate = new Date(); // เปลี่ยนเป็นวันที่ปัจจุบัน
    if (timeRange && ['today', 'last7days', 'lastmonth'].includes(timeRange)) {
      let startDate, endDate;
      switch (timeRange) {
        case 'today':
          startDate = new Date(currentDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(currentDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last7days':
          startDate = new Date(currentDate);
          startDate.setDate(currentDate.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(currentDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'lastmonth':
          startDate = new Date(currentDate);
          startDate.setMonth(currentDate.getMonth() - 1);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(currentDate);
          endDate.setDate(0);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          console.log('Invalid timeRange, fetching all bookings');
          break;
      }
      if (startDate && endDate) {
        console.log(`Filtering by ${timeRange}: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
        bookingQuery = bookingQuery
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .not('date', 'is', null);
      }
    } else if (month && year) {
      const yearInAD = parseInt(year) - 543; // แปลงปีพุทธศักราชเป็นคริสต์ศักราช
      const startDate = new Date(`${yearInAD}-${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);
      console.log(`Filtering by month/year: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      bookingQuery = bookingQuery
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .not('date', 'is', null);
    } else if (year) {
      const yearInAD = parseInt(year) - 543;
      const startDate = new Date(`${yearInAD}-01-01`);
      const endDate = new Date(`${yearInAD}-12-31`);
      endDate.setHours(23, 59, 59, 999);
      console.log(`Filtering by year: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      bookingQuery = bookingQuery
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .not('date', 'is', null);
    } else {
      console.log('No filters applied, fetching all bookings');
      bookingQuery = bookingQuery.not('date', 'is', null);
    }

    const { data: bookings, error: bookingError } = await bookingQuery;
    if (bookingError) {
      console.error('Booking fetch error:', bookingError.message);
      throw new Error(`Booking fetch error: ${bookingError.message}`);
    }
    console.log('Bookings fetched:', bookings);

    const confirmedBookings = bookings.filter(b => b.status_booking === 'ยืนยัน');
    const successfulBookings = confirmedBookings.length;

    const totalRevenue = confirmedBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    console.log('Total revenue:', totalRevenue);

    const totalSlots = courts.reduce((sum, court) => sum + (court.court_quantity || 0), 0) * 30;
    const bookingRate = totalSlots ? (confirmedBookings.length / totalSlots) * 100 : 0;
    console.log('Booking rate:', bookingRate);

    const cancellations = bookings.filter(b => b.status_booking === 'ยกเลิกแล้ว').length;
    console.log('Cancellations:', cancellations);

    const sportsData = courtsWithStadium.map(court => {
      const courtBookings = confirmedBookings.filter(b => b.id_court === court.id);
      const revenue = courtBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      return {
        name: court.court_type,
        count: courtBookings.length,
        revenue,
      };
    });
    const mostBookedSport = sportsData.reduce((max, sport) => (max.count > sport.count ? max : sport), { name: 'N/A', count: 0 });
    const highestRevenueSport = sportsData.reduce((max, sport) => (max.revenue > sport.revenue ? max : sport), { name: 'N/A', revenue: 0 });

    const stadiumBookingCounts = {};
    confirmedBookings.forEach(booking => {
      stadiumBookingCounts[booking.id_stadium] = (stadiumBookingCounts[booking.id_stadium] || 0) + 1;
    });

    const mostBookedCourt = stadiums
      .map(stadium => ({
        name: stadium.stadium_name,
        count: stadiumBookingCounts[stadium.id] || 0,
      }))
      .sort((a, b) => b.count - a.count)[0] || { name: 'N/A', count: 0 };

    const leastBookedCourt = stadiums
      .map(stadium => ({
        name: stadium.stadium_name,
        count: stadiumBookingCounts[stadium.id] || 0,
      }))
      .sort((a, b) => a.count - b.count)[0] || { name: 'N/A', count: 0 };

    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, '0');
      const currentYear = new Date().getFullYear();
      const bookingsInMonth = confirmedBookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate.getMonth() + 1 === parseInt(month) && bookingDate.getFullYear() === currentYear;
      }).length;
      return {
        month: new Date(0, i).toLocaleString('en-US', { month: 'short' }),
        bookings: bookingsInMonth,
      };
    });

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    const currentYearBookings = confirmedBookings.filter(b => {
      const bookingDate = new Date(b.date);
      return bookingDate.getFullYear() === currentYear;
    }).length;
    const lastYearBookings = confirmedBookings.filter(b => {
      const bookingDate = new Date(b.date);
      return bookingDate.getFullYear() === lastYear;
    }).length;
    const yoyGrowth = lastYearBookings === 0 ? 0 : ((currentYearBookings - lastYearBookings) / lastYearBookings * 100).toFixed(2);

    return {
      totalRevenue,
      bookingRate,
      cancellations,
      sportsData,
      mostBookedCourt,
      leastBookedCourt,
      mostBookedSport,
      highestRevenueSport,
      monthlyTrends,
      yoyGrowth,
      successfulBookings,
    };
  } catch (error) {
    console.error('Error in getOwnerDashboardData:', error.message);
    throw error;
  }
};

export default { getOwnerDashboardData };