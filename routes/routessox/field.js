import express from 'express';
import jwt from 'jsonwebtoken';
import dbsox from '../../Database/dbsox/field.js';

const router = express.Router();

// Test route
router.get('/', (req, res) => {
    res.send("test test");
  });

export default router;