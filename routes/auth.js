import express from "express";
import { register, login, logout, getMe } from "../controllers/authController.js";

const router = express.Router();

// Register a new user
router.post("/register", register);

// Login
router.post("/login", login);

// Logout
router.post("/logout", logout);

// Get current logged-in user
router.get("/me", getMe);

export default router;
