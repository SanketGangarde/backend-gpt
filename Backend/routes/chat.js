import express from "express";
import Thread from "../models/Thread.js";
import getResponse from "../utils/openAi.js";

const router = express.Router();


// Test route (creates a dummy thread)
router.post("/test", async (req, res) => {
  try {
    const thread = new Thread({
      threadId: "2xyz",
      title: "Testing new Thread",
    });

    const response = await thread.save();
    res.send(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "failed to save data to db" });
  }
});

// Get all threads (sorted by latest update first)
router.get("/thread", async (req, res) => {
  try {
    const threads = await Thread.find({}).sort({ updatedAt: -1 });
    res.send(threads);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "no result found!" });
  }
});

// Get a specific thread by ID
router.get("/thread/:threadId", async (req, res) => {
  try {
    const { threadId } = req.params;
    const thread = await Thread.findOne({ threadId });

    if (!thread) {
      return res.status(404).json({ error: "thread not found" });
    }

    res.send(thread);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "no specific result found!" });
  }
});

// Delete a thread by ID
router.delete("/thread/:threadId", async (req, res) => {
  try {
    const { threadId } = req.params;
    const result = await Thread.deleteOne({ threadId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "thread not deleted successfully" });
    }

    res.status(200).json({ message: "thread deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "something went wrong! Unable to delete thread!" });
  }
});

// Chat route
router.post("/chat", async (req, res) => {
  const { threadId, message } = req.body;

  console.log('/api/chat called with body:', req.body);

  if (!threadId || !message) {
    return res.status(400).json({ error: "threadId or message empty!" });
  }

  try {
    // Look for an existing thread
    let thread = await Thread.findOne({ threadId: threadId.trim() });

    if (!thread) {
      // Create a new thread only if it doesn’t exist
      thread = new Thread({
        threadId: threadId.trim(),
        title: message,
        messages: [{ role: "user", content: message }],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Push user message if thread already exists
      thread.messages.push({ role: "user", content: message });
    }

    // Call GPT or your AI function
    let gptResponse;
    try {
      gptResponse = await getResponse(message);
      console.log('GPT response:', gptResponse);
    } catch (err) {
      console.error('Error from getResponse:', err?.message || err);
      return res.status(502).json({ error: 'AI service error' });
    }

    if (!gptResponse) {
      console.error('Empty response from AI, aborting save.');
      return res.status(502).json({ error: 'Empty response from AI' });
    }

    // Save assistant response
    thread.messages.push({ role: "assistant", content: gptResponse });
    thread.updatedAt = new Date();

    // Save to DB
    await thread.save();

  res.json({ threadId: thread.threadId, messages: thread.messages, assistant: gptResponse });
  } catch (err) {
    console.error("Error in /api/chat:", err.message);
    res.status(500).json({ error: "Something went wrong! Unable to get response!" });
  }
});

export default router;
