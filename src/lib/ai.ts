// 今後 ChatGPT(gpt-4o) や Claude(claude-3.5-sonnet) などを追加しやすくするための型定義
export type AIModel = "gemini-3.5-flash-lite" | "gemini-1.5-pro" | "gpt-4o" | "claude-3.5-sonnet";

/**
 * ゲーム本編のGM・相棒AIとの対話用関数
 */
export async function generateAIResponse(
  systemPrompt: string,
  history: { role: string; parts: { text: string }[] }[],
  model: AIModel = "gemini-3.5-flash-lite"
): Promise<string> {
  // --- Gemini API の場合 ---
  if (model.startsWith("gemini")) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini APIキーが設定されていません。");

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: history,
        generationConfig: { temperature: 0.75 }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      let errorDetail = res.statusText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) errorDetail = errJson.error.message;
      } catch (e) {}
      throw new Error(`AIサーバーの応答エラーが発生しました。\n詳細: ${errorDetail || errText}`);
    }

    const resData = await res.json();
    return resData.candidates?.[0]?.content?.parts?.[0]?.text || "（AIの返答がありません）";
  }

  // 今後ここに if (model.startsWith("gpt")) { ... } などを追加していく
  throw new Error(`サポートされていないAIモデルです: ${model}`);
}

/**
 * リプレイ小説や要約などの単発テキスト生成用関数
 */
export async function generateAITextWithPrompt(
  prompt: string,
  model: AIModel = "gemini-3.5-flash-lite"
): Promise<string> {
  // --- Gemini API の場合 ---
  if (model.startsWith("gemini")) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("APIキーが設定されていません。");

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });

    if (!res.ok) throw new Error("AIサーバーの応答エラー");
    const resData = await res.json();
    return resData.candidates?.[0]?.content?.parts?.[0]?.text || "生成に失敗しました。";
  }
  
  throw new Error(`サポートされていないAIモデルです: ${model}`);
}