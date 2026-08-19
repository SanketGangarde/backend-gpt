import Thread from "../models/Thread.js";
import getResponse from "../utils/openAi.js";
import { buildContext, runMemoryEditor } from "../utils/MemoryManager.js";

// Quick responses for common greetings & basic questions (no AI call needed)
const quickResponses = [
  { patterns: ["hi", "hello", "hey", "hii", "hiii", "helo", "heyy", "heya"], reply: "Hey there! 👋 How can I help you today?" },
  { patterns: ["good morning", "gm"], reply: "Good morning! ☀️ Hope you're having a great start to the day. How can I assist you?" },
  { patterns: ["good afternoon"], reply: "Good afternoon! 🌤️ What can I help you with?" },
  { patterns: ["good evening", "ge"], reply: "Good evening! 🌙 What would you like to know?" },
  { patterns: ["good night", "gn"], reply: "Good night! 🌙 Sleep well. Feel free to come back anytime!" },
  { patterns: ["bye", "goodbye", "see you", "see ya", "cya"], reply: "Goodbye! 👋 It was nice chatting with you. Come back anytime!" },
  { patterns: ["thanks", "thank you", "thx", "ty", "thankyou"], reply: "You're welcome! 😊 Let me know if there's anything else I can help with." },
  { patterns: ["how are you", "how r u", "how are u", "hru"], reply: "I'm doing great, thank you for asking! 😊 How can I help you today?" },
  { patterns: ["what is your name", "what's your name", "who are you", "whats your name"], reply: "I'm **MITRA** — your AI assistant! 🤖 Ask me anything." },
  { patterns: ["what can you do", "what do you do", "help"], reply: "I can answer your questions, help with coding, explain concepts, write content, and much more! 💡 Just ask away." },
  { patterns: ["ok", "okay", "k", "ohk", "alright"], reply: "Got it! 👍 Let me know if you need anything else." },
  { patterns: ["lol", "haha", "hehe", "😂", "🤣"], reply: "Haha! 😄 Glad I could make you smile. What else can I do for you?" },
];

function getQuickResponse(message) {
  const cleaned = message.trim().toLowerCase().replace(/[?!.,]+$/g, "");
  for (const entry of quickResponses) {
    if (entry.patterns.includes(cleaned)) {
      return entry.reply;
    }
  }
  return null;
}

// Test route (creates a dummy thread)
export const createTestThread = async (req, res) => {
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
};

// Get all threads (sorted by latest update first)
export const getThreads = async (req, res) => {
  try {
    const userId = req.user?._id?.toString();
    const filter = userId ? { userId } : {};
    const threads = await Thread.find(filter).sort({ updatedAt: -1 });
    res.send(threads);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "no result found!" });
  }
};

// Get a specific thread by ID
export const getThreadById = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user?._id?.toString();
    const filter = userId ? { threadId, userId } : { threadId };
    const thread = await Thread.findOne(filter);

    if (!thread) {
      return res.status(404).json({ error: "thread not found" });
    }

    res.send(thread);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "no specific result found!" });
  }
};

// Delete a thread by ID
export const deleteThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user?._id?.toString();
    const filter = userId ? { threadId, userId } : { threadId };
    const result = await Thread.deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "thread not deleted successfully" });
    }

    res.status(200).json({ message: "thread deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "something went wrong! Unable to delete thread!" });
  }
};

// Chat route
export const handleChat = async (req, res) => {
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
      const userId = req.user?._id?.toString() || "anonymous";
      thread = new Thread({
        threadId: threadId.trim(),
        userId,
        title: message,
        messages: [{ role: "user", content: message }],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Push user message if thread already exists
      thread.messages.push({ role: "user", content: message });
    }

    // Check for quick response first (skip AI call for basic messages)
    let gptResponse = getQuickResponse(message);

    if (gptResponse) {
      console.log('Quick response matched:', gptResponse);
    } else {
      // Call GPT or your AI function
      try {
        const messagesContext = buildContext(thread, message);
        gptResponse = await getResponse(messagesContext);
        console.log('GPT response:', gptResponse);
      } catch (err) {
        console.error('Error from getResponse:', err?.message || err);
        return res.status(502).json({ error: 'AI service error' });
      }

      if (!gptResponse) {
        console.error('Empty response from AI, aborting save.');
        return res.status(502).json({ error: 'Empty response from AI' });
      }
    }

    // Save assistant response
    thread.messages.push({ role: "assistant", content: gptResponse });
    thread.updatedAt = new Date();

    // Save to DB
    await thread.save();

    // Trigger background memory compression task (fire-and-forget)
    runMemoryEditor(thread.threadId);

    res.json({ threadId: thread.threadId, messages: thread.messages, assistant: gptResponse });
  } catch (err) {
    console.error("Error in /api/chat:", err.message);
    res.status(500).json({ error: "Something went wrong! Unable to get response!" });
  }
};
