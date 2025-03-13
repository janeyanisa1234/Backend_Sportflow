import express from 'express';
import { getSportsCategories, getFilteredStadiums } from '../../Database/dbmild/sports.js';
 
const router = express.Router();
 
// ดึงประเภทกีฬาทั้งหมด
router.get('/sports-categories', async (req, res) => {
  console.log('Received request for /booking/sports-categories, params:', req.params, 'query:', req.query);
  try {
    const categories = await getSportsCategories();
    console.log('Sports categories:', categories);
    res.json(categories);
  } catch (error) {
    console.error('Error in /sports-categories:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch sports categories', details: error.message });
  }
});
 
// กรองสนามตามประเภทกีฬา
router.get('/filtered-stadiums', async (req, res) => {
  console.log('Received request for /booking/filtered-stadiums, params:', req.params, 'query:', req.query);
  try {
    const { sportType } = req.query;
    if (!sportType) {
      return res.status(400).json({ error: 'sportType is required' });
    }
    const stadiums = await getFilteredStadiums(sportType);
    console.log('Filtered stadiums:', stadiums);
    res.json(stadiums);
  } catch (error) {
    console.error('Error in /filtered-stadiums:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch filtered stadiums', details: error.message });
  }
});
 
export default router;