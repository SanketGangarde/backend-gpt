import getResponse from "./openAi.js";
import Thread from "../models/Thread.js";

const WORKING_MEMORY_LIMIT = 6; // Keep only the last 6 messages (3 exchanges)
const EDITOR_TRIGGER_INTERVAL = 6; // Trigger editor every 6 messages

// 1. Build Optimized Prompt for the AI
export function buildContext(thread, currentMessage) {
    let systemContent = "You are MITRA, a helpful and highly intelligent AI assistant. Always format your responses using clean, valid Markdown. If you generate a table, you MUST use strict Markdown table syntax with full pipe (|) borders and a header divider row (e.g., |---|---|). Do not output broken or malformed characters.\n\n";
    
    if (thread.coreMemory) {
        systemContent += `--- CORE FACTS ABOUT USER ---\n${thread.coreMemory}\n\n`;
    }
    
    if (thread.rollingSummary) {
        systemContent += `--- PREVIOUS CONVERSATION SUMMARY ---\n${thread.rollingSummary}\n\n`;
    }

    // Grab only the last few messages for working memory
    const workingMemory = thread.messages.slice(-WORKING_MEMORY_LIMIT).map(msg => ({
        role: msg.role,
        content: msg.content
    }));
    
    return [
        { role: "system", content: systemContent },
        ...workingMemory,
        { role: "user", content: currentMessage }
    ];
}

// 2. The Editor: Runs in background to compress old messages
export async function runMemoryEditor(threadId) {
    try {
        const thread = await Thread.findOne({ threadId });
        if (!thread || thread.messages.length <= WORKING_MEMORY_LIMIT) return;

        // Only run if we have a multiple of EDITOR_TRIGGER_INTERVAL beyond the working limit
        // (e.g., when length is 12, 18, 24...)
        if (thread.messages.length % EDITOR_TRIGGER_INTERVAL !== 0) return;

        console.log(`[MemoryEditor] Waking up for thread ${threadId}...`);

        // The messages that just fell out of working memory
        const olderMessages = thread.messages.slice(0, -WORKING_MEMORY_LIMIT);
        
        // We only want to summarize the recently fallen out messages to avoid re-summarizing everything.
        // Grab the last batch that needs summarizing:
        const unsummarizedMessages = olderMessages.slice(-EDITOR_TRIGGER_INTERVAL);
        
        const conversationText = unsummarizedMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");

        const editorPrompt = `
You are the Memory Editor AI. Your job is to analyze the recent conversation and update the user's memory.

CURRENT ROLLING SUMMARY:
${thread.rollingSummary || "None"}

CURRENT CORE FACTS:
${thread.coreMemory || "None"}

NEW CONVERSATION TO ANALYZE:
${conversationText}

INSTRUCTIONS:
1. Return a JSON object with two keys: "newRollingSummary" and "newCoreFacts".
2. "newRollingSummary" should be a concise paragraph (max 3 sentences) describing the current flow and topic of the conversation, combining the old summary with the new context.
3. "newCoreFacts" should be a bulleted list of PERMANENT facts extracted (e.g., User's name, preferences, project details). Combine old facts with any new ones.
4. Output ONLY valid JSON. Do not include markdown formatting or backticks around the JSON.
`;

        const responseText = await getResponse([{ role: "user", content: editorPrompt }]);
        
        try {
            // Clean response text in case it has markdown code blocks
            let cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
            const memoryData = JSON.parse(cleanJson);
            
            thread.rollingSummary = memoryData.newRollingSummary || thread.rollingSummary;
            thread.coreMemory = memoryData.newCoreFacts || thread.coreMemory;
            
            await thread.save();
            console.log(`[MemoryEditor] Successfully updated memory for ${threadId}`);
        } catch (parseError) {
            console.error(`[MemoryEditor] Failed to parse JSON from AI:`, responseText);
        }

    } catch (err) {
        console.error(`[MemoryEditor] Error running editor:`, err.message);
    }
}
