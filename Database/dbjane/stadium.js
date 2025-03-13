import DB from '../db.js';

async function getAllStadiumRequests() {
    try {
        const { data: stadiums, error: stadiumError } = await DB
            .from('add_stadium')
            .select('*')
            .order('date_add', { ascending: false }); // เปลี่ยนจาก created_at เป็น date_add

        if (stadiumError) throw stadiumError;

        const { data: users, error: userError } = await DB
            .from('users')
            .select('id, name');

        if (userError) throw userError;

        const validStadiums = stadiums.filter(stadium => {
            return stadium.owner_id != null && stadium.stadium_status != null;
        });

        const result = validStadiums.map(stadium => {
            const owner = users.find(user => user.id === stadium.owner_id);
            return {
                id: stadium.id,
                owner_name: owner ? owner.name : null,
                stadium_name: stadium.stadium_name,
                stadium_image: stadium.stadium_image,
                stadium_address: stadium.stadium_address,
                stadium_status: stadium.stadium_status,
                date_add: stadium.date_add // เปลี่ยนจาก created_at เป็น date_add
            };
        });

        return result;
    } catch (error) {
        console.error('Error fetching stadium requests:', error);
        throw error;
    }
}

async function updateStadiumStatus(stadiumId, status) {
    try {
        const { data, error } = await DB
            .from('add_stadium')
            .update({ 
                stadium_status: status // บันทึกสถานะเป็นภาษาไทยโดยตรง
            })
            .eq('id', stadiumId)
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating stadium status:', error);
        throw error;
    }
}

export { getAllStadiumRequests, updateStadiumStatus };