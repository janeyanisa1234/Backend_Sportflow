import DB from '../db.js';

// ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมด
async function getAllUsers() {
    try {
        const { data: users, error: usersError } = await DB
            .from('users')
            .select('*');

        const { data: owners, error: ownersError } = await DB
            .from('owners')
            .select('*');

        if (usersError) throw usersError;
        if (ownersError) throw ownersError;

        const allUsers = [];
        users.forEach(user => {
            const isOwner = owners.some(owner => owner.user_id === user.id);
            if (!isOwner) {
                allUsers.push({
                    ...user,
                    role: "ผู้ใช้งาน",
                    status: "active"
                });
            }
        });

        users.forEach(user => {
            const ownerData = owners.find(owner => owner.user_id === user.id);
            if (ownerData) {
                allUsers.push({
                    ...user,
                    role: "ผู้ประกอบการ",
                    status: "active",
                    ownerData: ownerData
                });
            }
        });

        return { data: allUsers, error: null };
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:', error);
        return { data: null, error: error.message };
    }
}

// ฟังก์ชันเช็คว่าผู้ใช้มีอยู่ในฐานข้อมูลหรือไม่
async function checkUserExists(userId) {
    try {
        const { data, error } = await DB
            .from('users')
            .select('*')
            .eq('id', userId);

        if (error) {
            throw error;
        }

        return { exists: data.length > 0, error: null };
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการตรวจสอบผู้ใช้:', error);
        return { exists: false, error: error.message };
    }
}

// ฟังก์ชันดึงข้อมูลผู้ใช้ทั่วไป (ไม่ใช่ผู้ประกอบการ)
async function getRegularUsers() {
    try {
        const { data: users, error: usersError } = await DB
            .from('users')
            .select('*');

        const { data: owners, error: ownersError } = await DB
            .from('owners')
            .select('*');

        if (usersError) throw usersError;
        if (ownersError) throw ownersError;

        const regularUsers = users.filter(user => 
            !owners.some(owner => owner.user_id === user.id)
        ).map(user => ({
            ...user,
            role: "ผู้ใช้งาน",
            status: "active"
        }));

        return { data: regularUsers, error: null };
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ทั่วไป:', error);
        return { data: null, error: error.message };
    }
}


// ฟังก์ชันดึงข้อมูลผู้ประกอบการ
async function getOwnerUsers() {
    try {
        const { data: users, error: usersError } = await DB
            .from('users')
            .select('*');

        const { data: owners, error: ownersError } = await DB
            .from('owners')
            .select('*');

        if (usersError) throw usersError;
        if (ownersError) throw ownersError;

        const ownerUsers = [];
        users.forEach(user => {
            const ownerData = owners.find(owner => owner.user_id === user.id);
            if (ownerData) {
                ownerUsers.push({
                    ...user,
                    role: "ผู้ประกอบการ",
                    status: "active",
                    ownerData: ownerData
                });
            }
        });

        return { data: ownerUsers, error: null };
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ประกอบการ:', error);
        return { data: null, error: error.message };
    }
}

// ฟังก์ชันลบผู้ใช้
async function deleteUser(userId) {
    try {
        const { data, error } = await DB
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        return { success: true, error: null };
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการลบผู้ใช้:', error);
        return { success: false, error: error.message };
    }
}

export { getAllUsers, getRegularUsers, getOwnerUsers, checkUserExists, deleteUser };
