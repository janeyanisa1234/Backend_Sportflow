import DB from '../db.js';

const fetchData = () => {
    const studentData = {
        name: 'ญาณิศา คงหาญ',
        student_id: '6530300783'
    };

    console.log('Student Name:', studentData.name);
    console.log('Student ID:', studentData.student_id);
};

fetchData();
