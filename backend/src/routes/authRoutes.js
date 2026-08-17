// src/routes/authRoutes.js - ES Module
import express from 'express';
import { register, login } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

export default router;
