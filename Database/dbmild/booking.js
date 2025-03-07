import DB from '../db.js';

// ฟังก์ชันสำหรับแบ่งเวลาเป็นช่วงๆ ละ 1 ชั่วโมง
function splitTimeIntoIntervals(timeStart, timeEnd) {
  const intervals = [];
  let current = new Date(`1970-01-01T${timeStart}`);
  const end = new Date(`1970-01-01T${timeEnd}`);

  while (current < end) {
    let next = new Date(current);
    next.setHours(current.getHours() + 1);

    if (next > end) next = end;

    intervals.push({
      start: current.toTimeString().slice(0, 5),
      end: next.toTimeString().slice(0, 5)
    });

    current = next;
  }

  return intervals;
}

async function getStadiumsWithCourtsAndTimes(stadiumId = null) {
  try {
    let stadiumQuery = DB
      .from('add_stadium')
      .select('id, stadium_name, stadium_address, stadium_image, stadium_status, owner_id')
      .eq('stadium_status', 'อนุมัติแล้ว');

    if (stadiumId) {
      stadiumQuery = stadiumQuery.eq('id', stadiumId);
    }

    const { data: stadiums, error: stadiumError } = await stadiumQuery;
    if (stadiumError) throw stadiumError;
    if (!stadiums?.length) return [];

    const stadiumIds = stadiums.map(s => s.id);
    const ownerIds = stadiums.map(s => s.owner_id);

    // ดึงข้อมูลคอร์ทจากสนามกีฬาที่ได้รับการอนุมัติ
    const { data: courts, error: courtError } = await DB
      .from('add_court')
      .select('id, stadium_id, court_type, court_quantity, court_price, court_image')
      .in('stadium_id', stadiumIds);

    if (courtError) throw courtError;

    const courtIds = courts.map(c => c.id);

    // ดึงช่วงเวลาที่คอร์ทเปิดให้จอง
    const { data: courtTimes, error: timeError } = await DB
      .from('court_time')
      .select('court_id, time_start, time_end')
      .in('court_id', courtIds);

    if (timeError) throw timeError;

    // ดึงข้อมูลโปรโมชั่นของเจ้าของสนาม (เพิ่ม discount_percentage)
    const { data: promotions, error: promoError } = await DB
      .from('sports_promotions')
      .select('owner_id, discount_percentage') // ✅ ใช้ discount_percentage แทน discount_price
      .in('owner_id', ownerIds);

    if (promoError) throw promoError;

    return stadiums.map(stadium => {
      // ตรวจสอบว่าเจ้าของสนามมีโปรโมชั่นหรือไม่
      const promo = promotions.find(p => p.owner_id === stadium.owner_id);
      return {
        ...stadium,
        courts: courts
          .filter(court => court.stadium_id === stadium.id)
          .map(court => {
            const originalPrice = court.court_price;
            let discountPercentage = promo ? promo.discount_percentage : 0;
            let finalPrice = originalPrice;

            // ถ้ามีเปอร์เซ็นต์ส่วนลด คำนวณราคาหลังหักส่วนลด
            if (discountPercentage > 0) {
              finalPrice = originalPrice - (originalPrice * (discountPercentage / 100));
            }

            return {
              ...court,
              original_price: originalPrice,  // ราคาเต็ม
              discount_percentage: discountPercentage, // เปอร์เซ็นต์ส่วนลด
              final_price: finalPrice,  // ราคาหลังหักส่วนลด
              times: courtTimes
                .filter(time => time.court_id === court.id)
                .flatMap(time => splitTimeIntoIntervals(time.time_start, time.time_end))
            };
          })
      };
    });
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export { getStadiumsWithCourtsAndTimes };
