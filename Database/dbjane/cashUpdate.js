import DB from '../db.js';

async function getCashUpdate() {
    try {
        // ดึงข้อมูลจาก cashbooking ที่ statuscash = 'รอโอน' หรือ 'โอนแล้ว' และเพิ่มการดึง date
        const { data: cashbookingData, error: cashbookingError } = await DB.from('cashbooking')
            .select('id_owner, totalcash, statuscash, date')
            .or('statuscash.eq.รอโอน,statuscash.eq.โอนแล้ว');  // เพิ่มการกรองทั้งสถานะรอโอนและโอนแล้ว

        if (cashbookingError) {
            console.error('Error fetching cashbooking data:', cashbookingError);
            throw new Error(`Error fetching cashbooking data: ${cashbookingError.message}`);
        }

        if (!Array.isArray(cashbookingData)) {
            console.error('Expected cashbookingData to be an array, but it is not:', cashbookingData);
            return [];
        }

        // คำนวณยอดรวมของ totalcash ตาม id_owner และ status
        const ownerIncomeByStatus = {};
        cashbookingData.forEach(record => {
            const key = `${record.id_owner}_${record.statuscash}`;
            if (!ownerIncomeByStatus[key]) {
                ownerIncomeByStatus[key] = {
                    id_owner: record.id_owner,
                    status: record.statuscash,
                    totalIncome: 0,
                    date: record.date
                };
            }
            ownerIncomeByStatus[key].totalIncome += record.totalcash;
        });

        // ดึงข้อมูลประวัติการโอนเงินจากตาราง cashhistory สำหรับรายการที่โอนแล้ว
        const historyOwnerIds = Object.values(ownerIncomeByStatus)
            .filter(item => item.status === 'โอนแล้ว')
            .map(item => item.id_owner);

        let cashHistoryData = [];
        if (historyOwnerIds.length > 0) {
            const { data: historyData, error: historyError } = await DB.from('cashhistory')
                .select('id_owner, slippay')
                .in('id_owner', historyOwnerIds);

            if (historyError) {
                console.error('Error fetching cashhistory data:', historyError);
            } else {
                cashHistoryData = historyData || [];
            }
        }

        // ดึงข้อมูลผู้ประกอบการจากตาราง users
        const ownerIds = [...new Set(Object.values(ownerIncomeByStatus).map(item => item.id_owner))];
        const { data: usersData, error: usersError } = await DB.from('users')
            .select('id, name')
            .in('id', ownerIds);

        if (usersError) {
            console.error('Error fetching users data:', usersError);
            throw new Error(`Error fetching users data: ${usersError.message}`);
        }

        // ดึงข้อมูลบัญชีธนาคารและรูปบัญชีจากตาราง owners
        const { data: ownersData, error: ownersError } = await DB.from('owners')
            .select('user_id, bank_name, bank_acc_id, identity_card_url')
            .in('user_id', ownerIds);

        if (ownersError) {
            console.error('Error fetching owners data:', ownersError);
            throw new Error(`Error fetching owners data: ${ownersError.message}`);
        }

        // สร้างข้อมูลผลลัพธ์
        const result = Object.values(ownerIncomeByStatus).map(item => {
            const user = usersData.find(user => user.id === item.id_owner);
            const owner = ownersData.find(owner => owner.user_id === item.id_owner);
            
            // ค้นหาข้อมูลสลิปการโอนเงินจาก cashhistory
            const historyRecord = cashHistoryData.find(history => history.id_owner === item.id_owner);
            
            // คำนวณยอดหลังหัก 10%
            const incomeAfter = item.totalIncome * 0.9;

            return {
                id_owner: item.id_owner,
                totalIncome: item.totalIncome,
                incomeAfter: incomeAfter,
                user_name: user ? user.name : 'ไม่พบชื่อผู้ประกอบการ',
                bank_name: owner ? owner.bank_name : 'ไม่พบข้อมูลธนาคาร',
                bank_account: owner ? owner.bank_acc_id : 'ไม่พบเลขบัญชี',
                identity_card_url: owner ? owner.identity_card_url : null,
                slip_url: historyRecord ? historyRecord.slippay : null,
                date: item.date,
                status: item.status
            };
        });

        return result;
    } catch (error) {
        console.error('Error fetching cash update:', error);
        throw error;
    }
}

export default getCashUpdate;