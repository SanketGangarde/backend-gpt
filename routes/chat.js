import express from "express";
import {
  createTestThread,
  getThreads,
  getThreadById,
  deleteThread,
  handleChat,
} from "../controllers/chatController.js";

const router = express.Router();

// Test route (creates a dummy thread)
router.post("/test", createTestThread);

// Get all threads (sorted by latest update first)
router.get("/thread", getThreads);

// Get a specific thread by ID
router.get("/thread/:threadId", getThreadById);

// Delete a thread by ID
router.delete("/thread/:threadId", deleteThread);

// Chat route
router.post("/chat", handleChat);

export default router;
