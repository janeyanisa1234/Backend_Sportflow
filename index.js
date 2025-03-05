import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/index.js';  // ต้องใส่ `.js` เต็ม
import cors from 'cors';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(routes);

app.use('/api', routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
