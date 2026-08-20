export const generateAIResponse = async (
  systemPrompt: string, 
  history: any[], 
  model: string = 'flash', 
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
  // ▼ Gemini API呼び出し（本番用 v1 エンドポイント）
  // ----------------------------------------------------
  if (model === 'flash' || model === 'flash-lite' || model === 'lite' || model === 'pro') {
    // 確実に動くデフォルトの汎用ID
    let targetModel = 'gemini-pro'; 

    // 本番環境（Vercel等）の環境変数で設定された値を優先
    if (model === 'pro') {
      targetModel = process.env.NEXT_PUBLIC_GEMINI_MODEL_PRO || 'gemini-pro';
    } else if (model === 'flash') {
      targetModel = process.env.NEXT_PUBLIC_GEMINI_MODEL_FLASH || 'gemini-pro';
    } else if (model === 'flash-lite' || model === 'lite') {
      targetModel = process.env.NEXT_PUBLIC_GEMINI_MODEL_LITE || 'gemini-pro';
    }
    
    // ※ v1beta ではなく v1 を使用
    const url = `https://generativelanguage.googleapis.com/v1/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`;
    
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
    
    if (!res.ok) throw new Error(`Gemini API エラー: ${await res.text()}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }
  
  // ----------------------------------------------------
  // ▼ Claude のAPI呼び出し
  // ----------------------------------------------------
  if (model === 'claude' || model === 'opus') {
    if (!CLAUDE_API_KEY) throw new Error("Claude API エラー: APIキーが設定されていません。");

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

export const generateAITextWithPrompt = async (prompt: string, model: string = 'flash', maxTokens: number = 1000, temperature: number = 0.7) => {
  return generateAIResponse("あなたは優秀なアシスタントです。指示に従って出力してください。", [{ role: "user", parts: [{ text: prompt }] }], model, maxTokens, temperature);
};

// ▼ 無料の画像生成API
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

// ▼ 本番用プレミアム画像生成API（モック廃止・正規のリクエスト処理）
export const generatePremiumImage = async (prompt: string): Promise<string> => {
  const NANOBANANA_API_KEY = process.env.NEXT_PUBLIC_NANOBANANA_API_KEY;
  if (!NANOBANANA_API_KEY) {
    throw new Error("プレミアム画像生成のAPIキーが設定されていません。");
  }

  const url = "https://api.nanobanana.com/v1/images/generate"; 
  
  try {
    const enhancedPrompt = prompt + ", masterpiece, high quality, highly detailed, photorealistic, 8k resolution, volumetric lighting";
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NANOBANANA_API_KEY}`
      },
      body: JSON.stringify({
        prompt: enhancedPrompt
        // ※APIの仕様書に合わせて width, height 等が必要な場合はここに追加してください
      })
    });

    if (!res.ok) throw new Error(`Image API Error: ${await res.text()}`);
    
    const data = await res.json();
    // 一般的な画像APIのレスポンス形式に合わせてURLを返却します
    return data.url || data.image_url || data.image; 
  } catch (err) {
    console.error(err);
    throw new Error("高品質画像の生成に失敗しました");
  }
};