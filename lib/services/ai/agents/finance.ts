import { createClient } from '@/lib/supabase/server'

export class FinanceAgent {
    async execute(message: string, context: any, mediaUrl?: string) {
        console.log("FinanceAgent: Delegating to Supabase Edge Function 'finance-agent'...", { hasMedia: !!mediaUrl });
        const supabase = await createClient();

        // 1. Prepare History for Edge Function
        // Edge Function expects: { messages: [ {role, content}, ... ] }
        // context.recentHistory usually contains [{ role: 'user', content: ... }, ...]

        let messages = [];
        if (context.recentHistory && Array.isArray(context.recentHistory)) {
            messages = context.recentHistory.map((m: any) => ({
                role: m.role === 'me' ? 'user' : (m.role === 'model' ? 'assistant' : m.role),
                // Ensure content is string if it was an object in history (though usually history is text)
                content: typeof m.content === 'object' ? JSON.stringify(m.content) : (m.content || "")
            }));
        }

        // Append current message
        // If mediaUrl is present, send structured content
        let currentMessageContent: any = message;
        if (mediaUrl) {
            currentMessageContent = [
                { type: 'text', text: message },
                { type: 'image_url', image_url: { url: mediaUrl } }
            ];
        }

        messages.push({ role: 'user', content: currentMessageContent });

        try {
            // 2. Invoke Edge Function
            const { data, error } = await supabase.functions.invoke('finance-agent', {
                body: { messages, mediaUrl }  // <-- pasar mediaUrl explícitamente
            });

            if (error) {
                console.error("FinanceAgent: Edge Function Error:", error);
                throw error;
            }

            console.log("FinanceAgent: Edge Function Response:", data);

            // 3. Format response for Orchestrator
            // Edge Function returns: { role: 'assistant', content: "..." }
            // Orchestrator expects: { assistant_reply, intent, ops, ... }

            return {
                assistant_reply: data.content,
                intent: 'finance',
                ops: [], // Edge Function executes tools internally, so no ops for Orchestrator to run
                _tokenUsage: {
                    agentType: 'finance',
                    modelName: 'gemini-1.5-flash', // Assumed
                    success: true
                }
            };

        } catch (e: any) {
            console.error("FinanceAgent: Execution Failed", e);
            return {
                assistant_reply: "Lo siento, tuve un problema conectando con mi cerebro financiero. ¿Podrías intentar de nuevo?",
                intent: "finance",
                ops: [],
            };
        }
    }
}
