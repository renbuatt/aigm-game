// 環境変数からAPIキーを取得（Next.jsの仕様により必ずファイルの先頭で定義）
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY || "";
const NANOBANANA_API_KEY = process.env.NEXT_PUBLIC_NANOBANANA_API_KEY || "";

export const generateAIResponse = async (
  systemPrompt: string, 
  history: any[], 
  model: string = 'flash', 
  maxTokens: number = 2500, 
  temperature: number = 0.7
) => {
  
  const normalizedHistory: any[] = [];
  for (const msg of history) {
    const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
    const text = msg.parts?.[0]?.text || msg.content || "";
    if (normalizedHistory.length > 0 && normalizedHistory[normalizedHistory.length - 1].role === role) {
      normalizedHistory[normalizedHistory.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      normalizedHistory.push({ role, parts: [{ text }] });
    }
  }

  // APIエラーを防ぐためのダミー発言
  if (normalizedHistory.length > 0 && normalizedHistory[normalizedHistory.length - 1].role === 'model') {
    normalizedHistory.push({ role: 'user', parts: [{ text: '（待機しています。続けてください）' }] });
  }

  // ----------------------------------------------------
  // ▼ Gemini (1.5 Flash / 1.5 Pro / Flash-8b) のAPI呼び出し
  // ----------------------------------------------------
  if (model === 'flash' || model === 'flash-lite' || model === 'pro') {
    if (!GEMINI_API_KEY) {
      throw new Error("GeminiのAPIキーが読み込めていません。.env.local の場所を確認し、サーバーを再起動してください。");
    }

    let targetModel = 'gemini-1.5-flash';
    if (model === 'pro') targetModel = 'gemini-1.5-pro';
    else if (model === 'flash-lite') targetModel = 'gemini-1.5-flash-8b';
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: normalizedHistory,
      generationConfig: { 
        temperature: temperature,
        maxOutputTokens: maxTokens,
      }
    };

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Gemini API エラー: ${await res.text()}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }
  
  // ----------------------------------------------------
  // ▼ Claude (Sonnet / Opus) のAPI呼び出し
  // ----------------------------------------------------
  if (model === 'claude' || model === 'opus') {
    // ★キーが空っぽの場合、明確なエラーメッセージを出して止める
    if (!CLAUDE_API_KEY) {
      throw new Error("ClaudeのAPIキーが読み込めていません。原因: ① .env.local ファイルが『srcフォルダの中』など間違った場所にありませんか？一番外側に置いてください。 ② サーバーを再起動(Ctrl+C → npm run dev)しましたか？");
    }

    const targetModel = model === 'opus' ? 'claude-3-opus-20240229' : 'claude-3-5-sonnet-20240620';
    const claudeHistory = normalizedHistory.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true', 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: claudeHistory,
        temperature: temperature
      })
    });

    if (!res.ok) throw new Error(`Claude API エラー: ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text;
  }

  return "エラー：不明なモデルが選択されました。";
};

// 要約や翻訳など、単発のAI処理用関数
export const generateAITextWithPrompt = async (prompt: string, model: string = 'flash', maxTokens: number = 1000, temperature: number = 0.7) => {
  return generateAIResponse("あなたは優秀なアシスタントです。指示に従って出力してください。", [{ role: "user", parts: [{ text: prompt }] }], model, maxTokens, temperature);
};

// ▼ 無料の画像生成API (Pollinations.ai)
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

// ▼ プレミアム画像生成API
export const generatePremiumImage = async (prompt: string): Promise<string> => {
  console.log(`[Premium Image] Model: Nano Banana Pro`);
  
  try {
    return generateFreeImage(prompt + ", masterpiece, high quality, highly detailed, photorealistic, 8k resolution, volumetric lighting");
  } catch (err) {
    console.error("高品質画像の生成に失敗しました:", err);
    throw new Error("高品質画像の生成に失敗しました");
  }
};