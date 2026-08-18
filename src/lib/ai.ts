// 環境変数からAPIキーを取得（GitHubにプッシュするため直接書き込まず .env.local から読み込む）
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY;
const NANOBANANA_API_KEY = process.env.NEXT_PUBLIC_NANOBANANA_API_KEY;

export const generateAIResponse = async (systemPrompt: string, history: any[], model: string = 'flash') => {
  
  // ★重要：GeminiやClaudeは「user」と「model(assistant)」が必ず交互になることを要求します。
  // 連続したロールの履歴を1つに統合して、APIエラー（400 Bad Request）を防ぎます。
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

  // もし最後の履歴が「model」で終わっている場合、APIが返答を拒否するためダミーのユーザー発言を足す
  if (normalizedHistory.length > 0 && normalizedHistory[normalizedHistory.length - 1].role === 'model') {
    normalizedHistory.push({ role: 'user', parts: [{ text: '（待機しています。続けてください）' }] });
  }

  // ----------------------------------------------------
  // ▼ Gemini (3.6 Flash / 3.1 Pro) のAPI呼び出し
  // ----------------------------------------------------
  if (model === 'flash' || model === 'pro') {
    const targetModel = model === 'pro' ? 'gemini-3.1-pro' : 'gemini-3.6-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      model: `models/${targetModel}`,
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: normalizedHistory,
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
    
    const claudeHistory = normalizedHistory.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts[0].text
    }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY || '',
        'anthropic-version': '2023-06-01',
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

export const generatePremiumImage = async (prompt: string): Promise<string> => {
  console.log(`[Premium Image] Key: ${NANOBANANA_API_KEY}`);
  return generateFreeImage(prompt + ", masterpiece, high quality, highly detailed");
};