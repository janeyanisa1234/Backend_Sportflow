import express from 'express';
import DB from '../../Database/db.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('');
  });

  export default router;
  
  require("dotenv").config();
  const express = require("express");
  const cors = require("cors");
  
  app.use(cors());
  app.use(express.json());
  
 
  app.get("/api/edit", async (req, res) => {
    try {
      const { data, error } = await supabase.from("users").select("*");
  
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users", error });
    }
  });
  

  app.put("/api/edit/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, password } = req.body;
  
      const { data, error } = await supabase
        .from("users")
        .update({ name, email, phone, password })
        .eq("id", id)
        .select();
  
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Error updating user", error });
    }
  });
  

  
  