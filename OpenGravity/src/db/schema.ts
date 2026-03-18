import { db } from './firebase.js';

// With Firestore we don't need to manually initialize tables, collections are created automatically.
export function initializeDatabase() {
    console.log('[DB] Firebase connected. Using collections for storage.');
}

// Interacting functions

export async function saveMessage(userId: number, role: string, content: string | null = null, toolCalls: string | null = null, toolCallId: string | null = null) {
    const messagesRef = db.collection('users').doc(userId.toString()).collection('messages');
    
    await messagesRef.add({
        user_id: userId,
        role: role,
        content: content,
        tool_calls: toolCalls,
        tool_call_id: toolCallId,
        timestamp: new Date()
    });
}

export async function getHistory(userId: number, limit: number = 20) {
    const messagesRef = db.collection('users').doc(userId.toString()).collection('messages');
    
    // Get latest messages
    const snapshot = await messagesRef
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
        
    const docs = snapshot.docs.map(doc => doc.data());
    
    // Reverse them so they are in chronological order for the LLM
    docs.reverse();
    
    return docs.map(row => ({
        role: row.role,
        content: row.content || null,
        ...(row.tool_calls ? { tool_calls: JSON.parse(row.tool_calls) } : {}),
        ...(row.tool_call_id ? { tool_call_id: row.tool_call_id } : {})
    }));
}
