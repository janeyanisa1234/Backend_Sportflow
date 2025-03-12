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
        // Start a transaction to ensure all operations succeed or fail together
        // First, delete related records from all tables that reference users.id
        
        // Check and delete from owners table
        const { data: ownerData, error: ownerError } = await DB
            .from('owners')
            .select('*')
            .eq('user_id', userId);

        if (ownerError) throw ownerError;

        if (ownerData && ownerData.length > 0) {
            const { error: deleteOwnerError } = await DB
                .from('owners')
                .delete()
                .eq('user_id', userId);

            if (deleteOwnerError) throw deleteOwnerError;
        }
        
        // Delete from cancle table
        const { error: deleteCancleError } = await DB
            .from('cancle')
            .delete()
            .eq('id', userId);
            
        if (deleteCancleError && !deleteCancleError.message.includes('not found')) {
            throw deleteCancleError;
        }
        
        // Add other tables that reference users.id here
        // Example:
        // const { error: deleteBookingsError } = await DB
        //     .from('bookings')
        //     .delete()
        //     .eq('user_id', userId);
        // if (deleteBookingsError) throw deleteBookingsError;
        
        // Finally delete from users table
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

// ฟังก์ชันนับจำนวนผู้ใช้ทั้งหมด
async function countUsers() {
    try {
        const { data: users, error: usersError } = await DB
            .from('users')
            .select('*');

        if (usersError) {
            console.error("ข้อผิดพลาดในการดึงข้อมูลผู้ใช้: ", usersError);
            throw usersError;
        }

        return { count: users.length, error: null };
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการนับจำนวนผู้ใช้:', error);
        return { count: 0, error: error.message };
    }
}


// ฟังก์ชันนับจำนวนผู้ประกอบการ
async function countOwnerUsers() {
    try {
        const { data: users, error: usersError } = await DB
            .from('users')
            .select('*');

        const { data: owners, error: ownersError } = await DB
            .from('owners')
            .select('*');

        if (usersError) {
            console.error("ข้อผิดพลาดในการดึงข้อมูลผู้ใช้: ", usersError);
            throw usersError;
        }
        
        if (ownersError) {
            console.error("ข้อผิดพลาดในการดึงข้อมูลผู้ประกอบการ: ", ownersError);
            throw ownersError;
        }

        const ownerUsers = users.filter(user => 
            owners.some(owner => owner.user_id === user.id)
        );

        return { count: ownerUsers.length, error: null };
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการนับจำนวนผู้ประกอบการ:', error);
        return { count: 0, error: error.message };
    }
}

// ฟังก์ชันนับจำนวนผู้ใช้ทั่วไป (ไม่รวมผู้ประกอบการ)
async function countRegularUsers() {
    try {
        const { data: users, error: usersError } = await DB
            .from('users')
            .select('*');

        const { data: owners, error: ownersError } = await DB
            .from('owners')
            .select('*');

        if (usersError) {
            console.error("ข้อผิดพลาดในการดึงข้อมูลผู้ใช้: ", usersError);
            throw usersError;
        }
        
        if (ownersError) {
            console.error("ข้อผิดพลาดในการดึงข้อมูลผู้ประกอบการ: ", ownersError);
            throw ownersError;
        }

        // กรองเฉพาะผู้ใช้ที่ไม่ใช่ผู้ประกอบการ
        const regularUsers = users.filter(user => 
            !owners.some(owner => owner.user_id === user.id)
        );

        return { count: regularUsers.length, error: null };
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการนับจำนวนผู้ใช้ทั่วไป:', error);
        return { count: 0, error: error.message };
    }
}



// ฟังก์ชันดึงข้อมูลผู้ใช้ใหม่วันนี้
async function getNewUsersToday() {
    try {
        const today = new Date().toISOString().split('T')[0]; // ได้วันที่ปัจจุบันในรูปแบบ YYYY-MM-DD
        const { data: users, error: usersError } = await DB
            .from('users')
            .select('*')
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`);

        const { data: owners, error: ownersError } = await DB
            .from('owners')
            .select('*');

        if (usersError) throw usersError;
        if (ownersError) throw ownersError;

        const newUsers = {
            total: users.length,
            regular: users.filter(user => !owners.some(owner => owner.user_id === user.id)).length,
            owners: users.filter(user => owners.some(owner => owner.user_id === user.id)).length
        };

        return { data: newUsers, error: null };
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ใหม่วันนี้:', error);
        return { data: null, error: error.message };
    }
}

export { getAllUsers, getRegularUsers, getOwnerUsers, checkUserExists, deleteUser, countUsers, countOwnerUsers, countRegularUsers, getNewUsersToday };
