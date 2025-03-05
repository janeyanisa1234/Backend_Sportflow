import DB from '../db.js';

async function getAllStadiumRequests() {
    try {
        const { data: stadiums, error: stadiumError } = await DB
            .from('add_stadium')
            .select('*');

        if (stadiumError) throw stadiumError;

        const { data: users, error: userError } = await DB
            .from('users')
            .select('id, name');

        if (userError) throw userError;

        const result = stadiums.map(stadium => {
            const owner = users.find(user => user.id === stadium.owner_id);
            return {
                ...stadium,
                owner_name: owner ? owner.name : null
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