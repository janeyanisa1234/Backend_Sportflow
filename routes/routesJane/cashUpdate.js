import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import getCashUpdate from '../../Database/dbjane/cashUpdate.js';
import DB from '../../Database/db.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ storage });

router.get('/update-cash', async (req, res) => {
  try {
    console.log('Received request for /update-cash');
    const cashUpdate = await getCashUpdate();
    const sortedCashUpdate = cashUpdate.sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log('Sending cash update data:', sortedCashUpdate);
    res.json(sortedCashUpdate);
  } catch (error) {
    console.error("Error in /update-cash route:", error);
    res.status(500).json({ error: 'Error fetching cash update', details: error.message });
  }
});

router.post('/complete-transfer', upload.single('slipImage'), async (req, res) => {
  try {
    const { id_owner, paydate, nameadmin, date } = req.body;
    const slipFile = req.file;
    
    console.log('Received data:', { id_owner, paydate, nameadmin, date, slipFile: slipFile ? slipFile.originalname : 'No file' });

    if (!slipFile) {
      return res.status(400).json({ error: 'No slip image uploaded' });
    }
    if (!id_owner || !paydate || !nameadmin || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const filePath = slipFile.path;
    const fileContent = fs.readFileSync(filePath);
    const fileName = `${Date.now()}_${path.basename(slipFile.filename)}`;
    
    const { data: uploadData, error: uploadError } = await DB.storage
      .from('cashhistory')
      .upload(fileName, fileContent, {
        contentType: slipFile.mimetype,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return res.status(500).json({ error: 'Failed to upload slip image', details: uploadError.message });
    }
    
    const { data: publicURL } = DB.storage
      .from('cashhistory')
      .getPublicUrl(fileName);
    
    const insertData = {
      id_owner: id_owner,
      paydate: paydate,
      nameadmin: nameadmin,
      slippay: publicURL.publicUrl,
      date: date
    };
    console.log('Inserting into cashhistory:', insertData);

    const { data: cashHistoryData, error: cashHistoryError } = await DB
      .from('cashhistory')
      .insert(insertData)
      .select();

    if (cashHistoryError) {
      console.error('Error inserting data into cashhistory:', cashHistoryError);
      return res.status(500).json({ error: 'Failed to save transfer data', details: cashHistoryError.message });
    }
    console.log('Inserted cashhistory data:', cashHistoryData);

    const { data: updateData, error: updateError } = await DB
      .from('cashbooking')
      .update({ statuscash: 'โอนแล้ว' })
      .eq('id_owner', id_owner)
      .eq('date', date)
      .select();

    if (updateError) {
      console.error('Error updating cashbooking status:', updateError);
      return res.status(500).json({ error: 'Failed to update transfer status', details: updateError.message });
    }
    console.log('Updated cashbooking data:', updateData);

    fs.unlinkSync(filePath);
    
    res.status(200).json({ 
      message: 'Transfer completed successfully',
      slipUrl: publicURL.publicUrl
    });
    
  } catch (error) {
    console.error('Error in /complete-transfer route:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.get('/transfer-details/:id_owner', async (req, res) => {
  try {
    const { id_owner } = req.params;
    const { date } = req.query;

    console.log(`Fetching transfer details for id_owner: ${id_owner}, date: ${date}`);

    const { data, error } = await DB.from('cashhistory')
      .select('paydate, nameadmin')
      .eq('id_owner', id_owner)
      .eq('date', date);

    if (error) {
      console.error('Error fetching transfer details:', error);
      return res.status(500).json({ error: 'Failed to fetch transfer details', details: error.message });
    }

    if (!data || data.length === 0) {
      console.log(`No transfer details found for id_owner: ${id_owner}, date: ${date}`);
      return res.status(404).json({ error: 'Transfer details not found' });
    }

    const transferData = data[0];
    console.log('Transfer details found:', transferData);
    res.json({
      paydate: transferData.paydate,
      nameadmin: transferData.nameadmin
    });
  } catch (error) {
    console.error('Error in /transfer-details route:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;