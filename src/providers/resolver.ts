import { configStore, getEffectiveToken, getEffectiveApiUrl } from "../core/config";
import { AVAILABLE_TOOLS, type ToolDefinition } from "../tools/registry";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_calls?: any[];
}

export interface LLMResponse {
  content: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
  }>;
}

export async function callModel(
  messages: ChatMessage[],
  tools: ToolDefinition[] = AVAILABLE_TOOLS,
  modelOverride?: string
): Promise<LLMResponse> {
  const model = modelOverride || configStore.get("default_model") || "claude-3-7-sonnet";
  const token = getEffectiveToken();
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 1. Direct Anthropic Claude API
  if (anthropicKey && (model.includes("claude") || !openaiKey)) {
    return await callAnthropic(messages, tools, model, anthropicKey);
  }

  // 2. Direct OpenAI API
  if (openaiKey) {
    return await callOpenAI(messages, tools, model, openaiKey);
  }

  // 3. Fallback to AccureIQ LLM Gateway (if token present)
  if (token) {
    return await callAccureGateway(messages, tools, model, token);
  }

  throw new Error(
    "No LLM provider configured!\n" +
    "Set one of the following:\n" +
    "  • Run: iqx auth login (to use your AccureIQ Developer Hub Token)\n" +
    "  • Export: ANTHROPIC_API_KEY=sk-ant-...\n" +
    "  • Export: OPENAI_API_KEY=sk-..."
  );
}

async function callAnthropic(messages: ChatMessage[], tools: ToolDefinition[], model: string, apiKey: string): Promise<LLMResponse> {
  const systemMsg = messages.find(m => m.role === "system")?.content || "";
  const conversation = messages.filter(m => m.role !== "system").map(m => {
    if (m.role === "tool") {
      return {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: m.name, content: m.content }]
      };
    }
    if (m.tool_calls && m.tool_calls.length) {
      return {
        role: "assistant",
        content: m.tool_calls.map(tc => ({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: tc.arguments
        }))
      };
    }
    return { role: m.role, content: m.content };
  });

  const formattedTools = tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: model.includes("claude-3-7") ? "claude-3-7-sonnet-20250219" : "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemMsg,
      messages: conversation,
      tools: formattedTools
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API Error (${res.status}): ${errText}`);
  }

  const data: any = await res.json();
  let content = "";
  const toolCalls: any[] = [];

  for (const block of data.content || []) {
    if (block.type === "text") content += block.text;
    if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input
      });
    }
  }

  return { content, tool_calls: toolCalls.length ? toolCalls : undefined };
}

async function callOpenAI(messages: ChatMessage[], tools: ToolDefinition[], model: string, apiKey: string): Promise<LLMResponse> {
  const formattedTools = tools.map(t => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model.includes("gpt") ? model : "gpt-4o",
      messages,
      tools: formattedTools
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API Error (${res.status}): ${err}`);
  }

  const data: any = await res.json();
  const choice = data.choices[0]?.message;
  const toolCalls = choice?.tool_calls?.map((tc: any) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments || "{}")
  }));

  return {
    content: choice?.content || "",
    tool_calls: toolCalls
  };
}

async function callAccureGateway(messages: ChatMessage[], tools: ToolDefinition[], model: string, token: string): Promise<LLMResponse> {
  const apiUrl = getEffectiveApiUrl();
  const res = await fetch(`${apiUrl}/api/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": token
    },
    body: JSON.stringify({
      model,
      messages,
      tools
    })
  });

  if (!res.ok) {
    throw new Error(`Accure Gateway Error (${res.status}): ${res.statusText}`);
  }
  const data: any = await res.json();
  return data;
}
