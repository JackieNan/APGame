const API_KEY = process.env.AI_API_KEY!;
const BASE_URL = process.env.AI_BASE_URL || "https://api.siliconflow.cn/v1";

export async function chatCompletion(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1024
): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content ?? "";
}

// 省钱：策展/Oracle 用小模型，理由评分用更小的模型
export const CURATOR_MODEL = "Qwen/Qwen2.5-7B-Instruct";
export const ORACLE_MODEL = "Qwen/Qwen2.5-7B-Instruct";
export const SCORER_MODEL = "Qwen/Qwen2.5-7B-Instruct";
