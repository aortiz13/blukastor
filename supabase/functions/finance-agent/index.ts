
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.24.1'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai"

// --- CONFIGURATION ---
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Tool Definitions ---
const toolsDefinition = [
  {
    name: 'get_user_projects',
    description: 'List available projects and the user contact ID.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_financial_summary',
    description: 'Get a summary of income, expenses, and balance.',
    parameters: {
      type: 'object',
      properties: {
        p_company_id: { type: 'string', description: 'The project/company ID (UUID)' },
        p_start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        p_end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
      required: ['p_company_id', 'p_start_date', 'p_end_date'],
    },
  },
  {
    name: 'add_financial_transaction',
    description: 'Record a new income or expense.',
    parameters: {
      type: 'object',
      properties: {
        p_company_id: { type: 'string', description: 'The project/company ID (Must be a UUID from get_user_projects or the Default Business ID)' },
        p_contact_id: { type: 'string', description: 'The user contact ID (Must be the UUID provided in system instructions)' },
        p_transaction_type: { type: 'string', enum: ['income', 'expense'] },
        p_amount: { type: 'number' },
        p_category: { type: 'string' },
        p_description: { type: 'string' },
      },
      required: ['p_company_id', 'p_contact_id', 'p_transaction_type', 'p_amount', 'p_category'],
    },
  },
  {
    name: 'get_budget_status',
    description: 'Check budget status for a category.',
    parameters: {
      type: 'object',
      properties: {
        p_company_id: { type: 'string', description: 'The project/company ID' },
        p_month: { type: 'integer' },
        p_year: { type: 'integer' },
      },
      required: ['p_company_id', 'p_month', 'p_year'],
    },
  },
  {
    name: 'update_user_financial_profile',
    description: 'Save user preferences or business facts to memory.',
    parameters: {
      type: 'object',
      properties: {
        p_contact_id: { type: 'string', description: 'The user contact ID' },
        p_category: { type: 'string', enum: ['personal_finance', 'business_context'] },
        p_data: { type: 'object', description: 'Key-value pairs of facts to store' },
      },
      required: ['p_contact_id', 'p_category', 'p_data'],
    },
  },
]

// --- Helper: Execute RPC ---
async function executeRpc(supabaseClient: any, functionName: string, args: any) {
  try {
    // Sanitize args: The DB function calculates context_company_id internaly.
    // We strictly remove it here to prevent 'PGRST202' errors if the LLM tries to send it.
    if (args && typeof args === 'object' && 'p_context_company_id' in args) {
      console.warn(`Sanitizing: Removing p_context_company_id from ${functionName} args`);
      delete args.p_context_company_id;
    }

    console.log(`Executing RPC: ${functionName}`, args)
    const { data, error } = await supabaseClient.rpc(functionName, args)
    if (error) {
      console.error(`RPC Error ${functionName}:`, error)
      return JSON.stringify({ error: error.message })
    }
    return JSON.stringify(data)
  } catch (e) {
    console.error(`Exec Error ${functionName}:`, e)
    return JSON.stringify({ error: e.message })
  }
}

// --- Helper: Download Image and Convert to Base64 ---
async function downloadImage(url: string): Promise<string | null> {
  try {
    console.log(`Downloading image: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.statusText}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    // Convert to Base64
    const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    return base64;
  } catch (e) {
    console.error("Error downloading image:", e);
    return null;
  }
}

// --- Gemini Implementation ---
async function runGemini(apiKey: string, systemMessage: string, messages: any[], supabaseClient: any) {
  console.log("Starting Gemini...")
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: systemMessage,
    tools: [{ functionDeclarations: toolsDefinition }]
  });

  // Transform Messages for Gemini
  // Gemini expects parts: [{ text: "..." }, { inlineData: ... }]
  // OpenAI format is content: string OR content: [{ type: 'text', text: '...'}, { type: 'image_url', image_url: { url: '...' } }]

  const history = [];

  // Build History (excluding last message)
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts = [];

    if (typeof msg.content === 'string') {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (item.type === 'text') {
          parts.push({ text: item.text });
        } else if (item.type === 'image_url') {
          // For history, we might skip images or try to re-download if needed, 
          // but usually simpler to just put a placeholder "Image sent" to save tokens/bandwidth
          // UNLESS logical continuity depends on it. Ideally we should store base64 in DB or cache.
          // For now, let's include text "Image Omitted from History" to save complexity.
          parts.push({ text: "[Image Sent]" });
        }
      }
    }
    history.push({ role, parts });
  }

  const chat = model.startChat({ history });

  // Process Current Message (The Last One)
  const lastMessage = messages[messages.length - 1];
  const lastMessageParts = [];

  if (typeof lastMessage.content === 'string') {
    lastMessageParts.push({ text: lastMessage.content });
  } else if (Array.isArray(lastMessage.content)) {
    for (const item of lastMessage.content) {
      if (item.type === 'text') {
        lastMessageParts.push({ text: item.text });
      } else if (item.type === 'image_url') {
        const base64Data = await downloadImage(item.image_url.url);
        if (base64Data) {
          lastMessageParts.push({
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for simplicity, or we could detect
              data: base64Data
            }
          });
        } else {
          lastMessageParts.push({ text: "[Failed to download image]" });
        }
      }
    }
  }

  const result = await chat.sendMessage(lastMessageParts);
  const response = await result.response;
  const call = response.functionCalls();

  if (call && call.length > 0) {
    const functionCall = call[0];
    const functionName = functionCall.name;
    const args = functionCall.args;

    const toolResult = await executeRpc(supabaseClient, functionName, args);

    // Send tool result back to Gemini
    const result2 = await chat.sendMessage([{
      functionResponse: {
        name: functionName,
        response: { name: functionName, content: toolResult }
      }
    }]);

    return result2.response.text();
  }

  return response.text();
}

// --- OpenAI Implementation (Fallback) ---
async function runOpenAI(apiKey: string, systemMessage: string, messages: any[], supabaseClient: any) {
  console.log("Starting OpenAI Fallback...")
  const openai = new OpenAI({ apiKey: apiKey })

  // Map shared tools to OpenAI format
  const openaiTools = toolsDefinition.map(t => ({
    type: 'function',
    function: t
  }))

  const chatMessages = [
    { role: 'system', content: systemMessage },
    ...messages
  ]

  const runner = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: chatMessages,
    tools: openaiTools,
    tool_choice: 'auto',
  })

  const responseMessage = runner.choices[0].message
  const toolCalls = responseMessage.tool_calls

  if (toolCalls) {
    chatMessages.push(responseMessage)
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name
      const args = JSON.parse(toolCall.function.arguments)

      // Defensive sanitization for OpenAI too (though executeRpc has it)
      executeRpc(supabaseClient, functionName, args).then(res => {
        // We need to await inside the loop or map it properly, fixing naive implementation:
        return res;
      });

      // Correct implementation:
      const toolResult = await executeRpc(supabaseClient, functionName, args)

      chatMessages.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: toolResult,
      })
    }
    const secondResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: chatMessages,
    })
    return secondResponse.choices[0].message.content
  }

  return responseMessage.content
}

// --- Memory Helper ---
async function saveToMemory(supabaseClient: any, contactId: string, role: string, content: any, instanceCompanyId: string) {
  if (!contactId) return;
  // If content is array (with images), flatten to string for storage or just store generic text
  let contentToSave = "";
  if (typeof content === 'string') {
    contentToSave = content;
  } else if (Array.isArray(content)) {
    contentToSave = content.map(c => c.type === 'text' ? c.text : '[Image Attachment]').join(' ');
  }

  await supabaseClient.from('ai_chat_memory').insert({
    contact_id: contactId,
    role: role,
    content: contentToSave,
    agent_type: 'finance',
    instance_company_id: instanceCompanyId,
    session_id: `${instanceCompanyId}:${contactId}` // Simple session ID strategy
  });
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 1. Verify user & Get Contact ID
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error("Auth Error:", userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    console.log("User Authenticated:", user.id);

    // Fetch Contact ID and Client Company ID
    const { data: contactData, error: contactError } = await supabaseClient
      .from('wa.contacts')
      .select('id, client_company_id')
      .eq('user_id', user.id)
      .single();

    if (contactError) console.error("Contact Fetch Error:", contactError);

    let contactId = contactData?.id;
    let clientCompanyId = contactData?.client_company_id;

    console.log(`Resolved IDs - Contact: ${contactId}, Company: ${clientCompanyId}`);

    // 2. Fetch User Context (Semantic Memory)
    let userContextPrompt = "";
    if (contactId) {
      const { data: contextData } = await supabaseClient
        .from('user_context')
        .select('personal_finance, business_context')
        .eq('contact_id', contactId)
        .single();

      if (contextData) {
        userContextPrompt = `\n\n[USER KNOWLEDGE]\nPersonal Finance: ${JSON.stringify(contextData.personal_finance)}\nBusiness Context: ${JSON.stringify(contextData.business_context)}`;
      }
    }


    const { messages } = await req.json()
    if (!messages || !Array.isArray(messages)) throw new Error('Invalid body: messages array required')

    // 3. Fetch System Prompt
    const { data: prompts } = await supabaseClient
      .from('company_prompts')
      .select('system_message')
      .eq('agent_type', 'finance')
      .limit(1)

    let systemMessage = prompts && prompts.length > 0 ? prompts[0].system_message : "You are a helpful financial assistant."

    // Inject Memory Instructions and UUID Strictness
    const defaultCompanyIdInfo = clientCompanyId ? clientCompanyId : "UNKNOWN (User must specify project)";

    systemMessage += `\n\nIMPORTANT SYSTEM INSTRUCTIONS:
    1. **IDENTITY**: You are an AI Financial Assistant.
    2. **IDS & UUIDs**:
       - Your 'p_contact_id' is ALWAYS: ${contactId}
       - Your 'Default Business Company ID' is: ${defaultCompanyIdInfo}
    
    3. **PROTOCOL - CONFIRMATION FIRST**:
       - **STEP 1: PROPOSE**: If you have all details, ASK: "Registraré [Monto] en [Categoría] para [Proyecto]. ¿Procedo?"
       - **STEP 2: EXECUTE**: If the user says "Si", "Claro", "Dale", or "Confirmado", **DO NOT ASK AGAIN**. CALL THE TOOL IMMEDIATELY.
       - **STEP 3: REPORT**: After the tool executes, confirm the success.

    4. **CRITICAL - EXECUTING TOOLS**:
       - **Loop Prevention**: If the user just said "Si", your NEXT action MUST be a tool call. Do not talk.
       - **UUIDs**: NEVER invent a UUID. Use the IDs provided above or obtained from 'get_user_projects'.
       - **SAFETY**: If 'p_company_id' is "UNKNOWN", ask the user for the project name first.

    5. **IMAGE PROCESSING**:
       - If the user sends an image (Receipt, Invoice, Document), **READ IT**.
       - Extract: Amount, Date, Merchant/Category, and Description.
       - Then **PROPOSE** the transaction based on what you see.

    6. **MEMORY**:
       - Use 'update_user_financial_profile' to remember important user preferences.
    
    ${userContextPrompt}`;

    let responseText = "";
    const lastUserMessage = messages[messages.length - 1]; // Keep object for memory

    // 4. Try Gemini
    if (GOOGLE_API_KEY) {
      try {
        console.log("--- Sending request to Gemini ---");
        // console.log("System Message Snippet:", systemMessage.slice(-500)); 
        // console.log("User Messages:", JSON.stringify(messages)); // Caution: Logs images as base64 or urls

        responseText = await runGemini(GOOGLE_API_KEY, systemMessage, messages, supabaseClient);

        console.log("--- Gemini Response ---");
        console.log("Response text:", responseText);
      } catch (e) {
        console.error("Gemini Failed:", e)
      }
    }

    // 5. Fallback to OpenAI
    if (!responseText) {
      if (!OPENAI_API_KEY) throw new Error("No AI Provider configured")

      try {
        console.log("--- Sending request to OpenAI Fallback ---");
        const res = await runOpenAI(OPENAI_API_KEY, systemMessage, messages, supabaseClient);
        responseText = res || "No response generated.";
        console.log("--- OpenAI Response ---");
        console.log("Response text:", responseText);
      } catch (e) {
        console.error("OpenAI Failed:", e)
        throw new Error("All AI providers failed.")
      }
    }

    // 6. Save to Episodic Memory (Async - Fire and forget)
    if (contactId && clientCompanyId) {
      try {
        await saveToMemory(supabaseClient, contactId, 'user', lastUserMessage.content, clientCompanyId);
        await saveToMemory(supabaseClient, contactId, 'assistant', responseText, clientCompanyId);
      } catch (e) {
        console.error("Memory Save Error:", e);
      }
    }

    return new Response(JSON.stringify({ role: 'assistant', content: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Agent Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
