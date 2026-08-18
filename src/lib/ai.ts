// 環境変数からAPIキーを取得
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY;
const NANOBANANA_API_KEY = process.env.NEXT_PUBLIC_NANOBANANA_API_KEY;

export const generateAIResponse = async (systemPrompt: string, history: any[], model: string = 'flash') => {
  // ※ここに本来はGeminiやClaudeのAPIリクエスト処理を記述します。
  // 今回はモック（仮の戻り値）を返します。
  console.log(`[AI GM Request] Model: ${model}, Key: ${model === 'claude' || model === 'opus' ? CLAUDE_API_KEY : GEMINI_API_KEY}`);
  return "（AIからの応答モック）GMの描写です。\n[STATUS_UPDATE: プレイヤー, 10, 50]";
};

export const generateAITextWithPrompt = async (prompt: string, model: string = 'flash') => {
  console.log(`[AI Text Request] Model: ${model}`);
  return "（AIからのテキストモック）";
};

// 無料の画像生成API (pollinations.ai)
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

// 高品質な画像生成API (nanobanana等)
export const generatePremiumImage = async (prompt: string): Promise<string> => {
  console.log(`[Premium Image Request] Prompt: ${prompt}, Key: ${NANOBANANA_API_KEY}`);
  // ※ここに本来はnanobananaのAPI呼び出しを記述します。
  // 今回はモックとしてpollinationsを呼び出しますが、実装としては分離されています。
  return generateFreeImage(prompt + ", masterpiece, high quality, highly detailed");
};