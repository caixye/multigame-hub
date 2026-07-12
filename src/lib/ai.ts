/** AI 调用配置 */
interface AIConfig {
  baseURL: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
}

/** AI 响应 */
export interface AIResponse {
  content: string;
  success: boolean;
  duration: number;
}

// 本地降级叙事
const FALLBACK_NARRATIVES = {
  night: [
    "夜色如墨，笼罩着寂静的村庄。远处传来一声狼嚎...",
    "月光被乌云遮蔽，村庄陷入一片黑暗。不安的气息弥漫...",
    "寒风呼啸而过，树叶沙沙作响。村庄的夜晚从未如此漫长...",
  ],
  day: [
    "黎明的阳光洒在村庄，人们聚集广场，发现有人失踪了...",
    "钟声打破清晨的寂静，村民们面色凝重地走出各自房屋...",
  ],
};

// 本地词语库
const FALLBACK_WORD_PAIRS: [string, string][] = [
  ["羽毛球", "乒乓球"], ["玫瑰", "月季"], ["西瓜", "哈密瓜"],
  ["篮球", "排球"], ["可乐", "雪碧"], ["苹果", "桃子"],
  ["牛奶", "豆浆"], ["火车", "高铁"], ["眼镜", "墨镜"],
  ["裙子", "连衣裙"], ["手机", "平板"], ["冰淇淋", "圣代"],
  ["咖啡", "拿铁"], ["蛋糕", "面包"], ["筷子", "叉子"],
  ["口罩", "面罩"], ["背包", "腰包"], ["围巾", "披肩"],
];

/** 获取 AI 配置 */
function getAIConfig(): AIConfig | null {
  const baseURL = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!baseURL || !apiKey) return null;

  return {
    baseURL,
    apiKey,
    modelName: process.env.AI_MODEL || "gpt-4o",
    temperature: parseFloat(process.env.AI_TEMPERATURE || "0.8"),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || "2000"),
  };
}

/** 调用 AI API */
export async function generateContent(
  prompt: string,
  system?: string
): Promise<AIResponse> {
  const config = getAIConfig();
  if (!config) return { content: "", success: false, duration: 0 };

  const startTime = Date.now();

  try {
    const messages: { role: string; content: string }[] = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content, success: true, duration: Date.now() - startTime };
  } catch {
    return { content: "", success: false, duration: Date.now() - startTime };
  }
}

/** 获取随机叙事（降级） */
export function getFallbackNarrative(type: "night" | "day"): string {
  const arr = FALLBACK_NARRATIVES[type];
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 获取随机词语对（降级） */
export function getFallbackWordPair(): [string, string] {
  return FALLBACK_WORD_PAIRS[Math.floor(Math.random() * FALLBACK_WORD_PAIRS.length)];
}

/** 生成卧底词语对 */
export async function generateUndercoverWords(): Promise<{
  civilianWord: string;
  undercoverWord: string;
  usedAI: boolean;
}> {
  const aiResult = await generateContent(
    `生成一对相似但又可区分的词语作"谁是卧底"游戏用。JSON返回：{"civilianWord":"平民词","undercoverWord":"卧底词"}`,
    "你是聚会游戏创意助手，只返回纯 JSON。"
  );

  if (aiResult.success) {
    try {
      const content = aiResult.content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(content);
      if (parsed.civilianWord && parsed.undercoverWord) {
        return { ...parsed, usedAI: true };
      }
    } catch { /* fallback */ }
  }

  const pair = getFallbackWordPair();
  return { civilianWord: pair[0], undercoverWord: pair[1], usedAI: false };
}

/** 生成狼人杀叙事 */
export async function generateNarrative(
  phase: "night" | "day",
  context: string
): Promise<{ narrative: string; usedAI: boolean }> {
  const prompt = phase === "night"
    ? `狼人杀夜晚叙事，约80字。局势：${context}`
    : `狼人杀白天叙事，含死亡描述，约80字。局势：${context}`;

  const aiResult = await generateContent(prompt, "你是悬疑叙事作家，短小精悍。");

  if (aiResult.success && aiResult.content) {
    return { narrative: aiResult.content, usedAI: true };
  }

  return { narrative: getFallbackNarrative(phase), usedAI: false };
}
