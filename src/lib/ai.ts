export const generateAIResponse = async (
  systemPrompt: string, 
  history: any[], 
  model: string = 'lite', // デフォルトをブロンズ(lite)に設定
  maxTokens: number = 3000, 
  temperature: number = 0.7
) => {
  
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY;

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

  if (normalizedHistory.length > 0 && normalizedHistory[normalizedHistory.length - 1].role === 'model') {
    normalizedHistory.push({ role: 'user', parts: [{ text: '（待機しています。続けてください）' }] });
  }

  // ----------------------------------------------------
  // ▼ 1. Google (Gemini) APIルート（最新モデルへ強制固定）
  // ----------------------------------------------------
  if (model === 'flash' || model === 'flash-lite' || model === 'lite' || model === 'pro') {
    let targetModel = 'gemini-3.5-flash-lite'; 

    // Vercelの古い環境変数が悪さをしないよう、ここで強制的に上書きします
    if (model === 'pro') {
      targetModel = 'gemini-2.5-pro'; // ゴールド
    } else if (model === 'flash') {
      targetModel = 'gemini-3.6-flash'; // シルバー
    } else if (model === 'flash-lite' || model === 'lite') {
      targetModel = 'gemini-3.5-flash-lite'; // ブロンズ ＆ 裏側のシステム処理
    }
    
    // v1betaエンドポイントを使用
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: normalizedHistory,
      generationConfig: { temperature, maxOutputTokens: maxTokens }
    };

    const res = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    });
    
    if (!res.ok) throw new Error(`Google API エラー: ${await res.text()}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }
  
  // ----------------------------------------------------
  // ▼ 2. Anthropic (Claude) APIルート（プラチナ・ダイヤ用）
  // ----------------------------------------------------
  if (model === 'claude' || model === 'opus') {
    if (!CLAUDE_API_KEY) throw new Error("Claude API エラー: APIキーが設定されていません。");

    // プラチナ -> Claude Sonnet 5, ダイヤ -> Claude Opus 5
    const targetModel = model === 'opus' ? 'claude-5-opus' : 'claude-5-sonnet';
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
        model: targetModel, max_tokens: maxTokens, system: systemPrompt, messages: claudeHistory, temperature: temperature
      })
    });

    if (!res.ok) throw new Error(`Claude API エラー: ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text;
  }

  return "エラー：不明なモデルが選択されました。";
};

// ----------------------------------------------------
// 単発のAI処理用関数（裏側の処理は確実に lite を使うように固定）
// ----------------------------------------------------
export const generateAITextWithPrompt = async (prompt: string, model: string = 'lite', maxTokens: number = 1000, temperature: number = 0.7) => {
  return generateAIResponse("あなたは優秀なアシスタントです。指示に従って出力してください。", [{ role: "user", parts: [{ text: prompt }] }], model, maxTokens, temperature);
};

// ----------------------------------------------------
// 無料の画像生成API（フォールバック用）
// ----------------------------------------------------
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

// ----------------------------------------------------
// ▼ 5. 情景画像の生成 👉 Nano Banana Pro (Gemini 3 Pro Image)
// ----------------------------------------------------
export const generatePremiumImage = async (prompt: string): Promise<string> => {
  const NANOBANANA_API_KEY = process.env.NEXT_PUBLIC_NANOBANANA_API_KEY;
  const url = "https://api.nanobanana.com/v1/images/generate"; 
  
  try {
    if(!NANOBANANA_API_KEY) {
      return generateFreeImage(prompt + ", Nano Banana Pro Style, masterpiece, high quality");
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${NANOBANANA_API_KEY}` },
      body: JSON.stringify({ prompt: prompt + ", masterpiece, high quality, highly detailed" })
    });

    if (!res.ok) throw new Error(`Nano Banana API Error: ${await res.text()}`);
    const data = await res.json();
    return data.url || data.image_url; 
  } catch (err) {
    console.error(err);
    throw new Error("Nano Banana Proでの画像生成に失敗しました");
  }
};