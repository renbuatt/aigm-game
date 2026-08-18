const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY;
const NANOBANANA_API_KEY = process.env.NEXT_PUBLIC_NANOBANANA_API_KEY;

export const generateAIResponse = async (systemPrompt: string, history: any[], model: string = 'flash') => {
  // ※ここにGeminiやClaudeへの実際のリクエスト処理を入れます。今回はモックです。
  console.log(`[AI Request] Model: ${model}, Key: ${model === 'claude' ? CLAUDE_API_KEY : GEMINI_API_KEY}`);
  return "（AIからの応答モック）GMの描写です。\n[STATUS_UPDATE: プレイヤー, 10, 50]";
};

export const generateAITextWithPrompt = async (prompt: string, model: string = 'flash') => {
  console.log(`[AI Text Request] Model: ${model}`);
  return "（AIからのテキストモック）";
};

// 従来の無料画像API
export const generateFreeImage = async (prompt: string): Promise<string> => {
  const seed = Math.floor(Math.random() * 100000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&seed=${seed}&safe=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("無料AIサーバーが混雑しています");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// 高品質画像API (nanobanana等)
export const generatePremiumImage = async (prompt: string): Promise<string> => {
  console.log(`[Premium Image] Key: ${NANOBANANA_API_KEY}`);
  // ※ここにnanobananaへの実際のリクエストを記述します。
  return generateFreeImage(prompt + ", masterpiece, high quality, highly detailed");
};