import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/index.js';  // ต้องใส่ `.js` เต็ม

dotenv.config();

const app = express();
app.use('/api', routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
