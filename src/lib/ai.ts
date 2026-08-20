export const generateAIResponse = async (
  systemPrompt: string, 
  history: any[], 
  model: string = 'flash', 
  maxTokens: number = 3000, 
  temperature: number = 0.7
) => {
  
  // ▼ それぞれの包括APIキー
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
  // 1. Google (Gemini) 包括APIルート
  // ----------------------------------------------------
  if (model === 'flash' || model === 'flash-lite' || model === 'lite' || model === 'pro') {
    // 確実に存在する安定版モデルIDをデフォルトに設定
    let targetModel = 'gemini-flash'; 

    if (model === 'pro') {
      targetModel = process.env.NEXT_PUBLIC_GEMINI_MODEL_PRO || 'gemini-pro';
    } else if (model === 'flash') {
      targetModel = process.env.NEXT_PUBLIC_GEMINI_MODEL_FLASH || 'gemini-flash';
    } else if (model === 'flash-lite' || model === 'lite') {
      targetModel = process.env.NEXT_PUBLIC_GEMINI_MODEL_LITE || 'gemini-flash';
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: normalizedHistory,
      generationConfig: { 
        temperature: temperature,
        maxOutputTokens: maxTokens,
      }
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
  // 2. Anthropic (Claude) 包括APIルート
  // ----------------------------------------------------
  if (model === 'claude' || model === 'opus') {
    if (!CLAUDE_API_KEY) throw new Error("Claude API エラー: APIキーが設定されていません。");

    const targetModel = model === 'opus' ? 'claude-3-opus-20240229' : 'claude-3-5-sonnet-latest';
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

    if (!res.ok) throw new Error(`Anthropic API エラー: ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text;
  }

  return "エラー：不明なモデルが選択されました。";
};

export const generateAITextWithPrompt = async (prompt: string, model: string = 'flash', maxTokens: number = 1000, temperature: number = 0.7) => {
  return generateAIResponse("あなたは優秀なアシスタントです。指示に従って出力してください。", [{ role: "user", parts: [{ text: prompt }] }], model, maxTokens, temperature);
};

// ▼ 無料の画像生成（モック用）
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
// 3. Google (Imagen 3) を使ったプレミアム画像生成ルート
// ----------------------------------------------------
export const generatePremiumImage = async (prompt: string): Promise<string> => {
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error("Google APIキーが設定されていません。");

  // Google公式の Imagen 3 エンドポイントを使用
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${GEMINI_API_KEY}`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: prompt + ", masterpiece, high quality, highly detailed" }],
        parameters: { sampleCount: 1 }
      })
    });

    if (!res.ok) throw new Error(`Google Image API Error: ${await res.text()}`);
    const data = await res.json();
    
    // Google Imagen は画像を Base64 エンコードで返す仕様
    const base64Image = data.predictions[0].bytesBase64Encoded;
    return `data:image/jpeg;base64,${base64Image}`;

  } catch (err) {
    console.error(err);
    throw new Error("高品質画像の生成に失敗しました");
  }
};