// 環境変数からAPIキーを取得
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY;
const NANOBANANA_API_KEY = process.env.NEXT_PUBLIC_NANOBANANA_API_KEY;

export const generateAIResponse = async (systemPrompt: string, history: any[], model: string = 'flash') => {
  // ----------------------------------------------------
  // ▼ Gemini (Flash / Pro) のAPI呼び出し
  // ----------------------------------------------------
  if (model === 'flash' || model === 'pro') {
    const targetModel = model === 'pro' ? 'gemini-1.5-pro-latest' : 'Gemini 3.6 Flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: history,
      generationConfig: { 
        temperature: 0.7,
        maxOutputTokens: 2500,
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API エラー: ${errText}`);
    }

    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }
  
  // ----------------------------------------------------
  // ▼ Claude (Sonnet / Opus) のAPI呼び出し
  // ----------------------------------------------------
  if (model === 'claude' || model === 'opus') {
    const targetModel = model === 'opus' ? 'claude-3-opus-20240229' : 'claude-3-5-sonnet-20240620';
    
    // Gemini用の履歴フォーマットをClaude用に変換
    const claudeHistory = history.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts[0].text
    }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY || '',
        'anthropic-version': '2023-06-01',
        // ※Next.jsのクライアントサイドから直接叩くための特殊ヘッダー（本来はサーバー経由推奨ですが今回は直接通信します）
        'anthropic-dangerous-direct-browser-access': 'true', 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: 3000,
        system: systemPrompt,
        messages: claudeHistory,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API エラー: ${errText}`);
    }

    const data = await res.json();
    return data.content[0].text;
  }

  return "エラー：不明なモデルが選択されました。";
};

// 要約や翻訳など、単発のAI処理用関数
export const generateAITextWithPrompt = async (prompt: string, model: string = 'flash') => {
  return generateAIResponse("あなたは優秀なアシスタントです。指示に従って出力してください。", [{ role: "user", parts: [{ text: prompt }] }], model);
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

// 高品質なプレミアム画像生成API (nanobanana等)
export const generatePremiumImage = async (prompt: string): Promise<string> => {
  // ※ここにnanobanana APIの実際のエンドポイントとリクエスト処理を実装します。
  // 今回は仮として、無料APIに「masterpiece(傑作)」のプロンプトを付与して代用しています。
  console.log(`[Premium Image] Key: ${NANOBANANA_API_KEY}`);
  return generateFreeImage(prompt + ", masterpiece, high quality, highly detailed");
};