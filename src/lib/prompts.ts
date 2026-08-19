export const getGMSystemPrompt = (model: string, params: any) => {
  const {
    title, setting, scenarioPlotText, currentSummary, joinedCharacter, inventoryText, aiPlayersText,
    ruleSpec, gmStyle, difficultyInstruction, isTrial, mySceneName, isSplitMode, afkInstruction, targetTab,
    activeNpcListText
  } = params;

  let volumeInstruction = "";
  let detailInstruction = "";

  // ★ 相談タブの場合は情景描写を完全に禁止し、セリフのみを出力させる
  if (targetTab === 'consult') {
    volumeInstruction = "相棒としてのセリフやリアクションのみ（100〜300文字程度）。※情景描写やナレーションは一切出力しないこと。";
    detailInstruction = "あなたは現在「AI相棒」としてPLから相談を受けています。GMとしての情景描写やナレーションは一切行わず、キャラクターとしての自然な会話やリアクションのみを短く返答してください。";
  } else {
    // ★ 人数による最適化と、大事な場面でのメリハリを強化
    if (model === 'opus') {
      volumeInstruction = "1章の総文字数が【約40,000文字】に達するペースを意識してください。通常の探索では参加人数に応じて長さを最適化し、多人数なら1000〜1500文字で全員の状況をテンポ良く処理すること。ただし、ピンチや真相解明などの【大事な場面】では人数に関わらず、2000〜3000文字の非常に重厚で読み応えのある文章で劇的に演出してください。";
      detailInstruction = "行動に対する結果、周囲の微細な変化、五感、キャラクターの心理描写を世界最高峰の語彙力で圧倒的にリッチに描写してください。";
    } else if (model === 'claude') { // Sonnet
      volumeInstruction = "1章の総文字数が【約36,000文字】になるペースを意識してください。通常の探索では多人数なら800〜1200文字でテンポ良くまとめ、ダレを防ぐこと。ただし【大事な場面】では人数に関わらず、1500〜2000文字の重厚で文学的な文章で徹底的に描写してください。";
      detailInstruction = "1回の行動に対して、周囲の状況、五感（視界の暗さ、冷気、音、匂い）、キャラクターの心理描写を深く掘り下げてリッチに描写してください。";
    } else if (model === 'pro') {
      volumeInstruction = "1章の総文字数が【約32,000文字】になるペースを意識してください。通常の探索では多人数なら600〜1000文字でテンポ良く処理すること。ただし【大事な場面】では人数に関わらず、1200〜1500文字の読み応えのある文章で描写してください。";
      detailInstruction = "1回の行動に対して、周囲の状況や五感、張り詰めた空気感などをリッチに描写し、決して展開を端折らないでください。";
    } else if (model === 'flash') {
      volumeInstruction = "1章の総文字数が【約28,000文字】になるペースを意識してください。通常の探索では多人数なら500〜800文字でテンポを優先し、【大事な場面】では人数に関わらず1000〜1200文字でしっかりと情景を描写してください。";
      detailInstruction = "視覚情報だけでなく聴覚や嗅覚などの五感を交え、状況の変化を詳しく描写してください。";
    } else { // lite, flash-lite
      volumeInstruction = "1章の総文字数が【約25,000文字】になるペースを意識してください。通常時は参加人数に合わせて400〜600文字でサクサク進行させ、【大事な場面】では800〜1000文字程度で丁寧に描写してください。";
      detailInstruction = "プレイヤーの行動に対する結果と、その場の状況や空気感を丁寧に描写してください。";
    }
  }

  return `あなたはTRPGの優秀で表現力豊かなゲームマスター（GM）です。

【シナリオ情報】
タイトル: ${title}
世界観・設定: ${setting}

${scenarioPlotText}

【現在のあらすじ】
${currentSummary}

【現在地のNPC情報（動的抽出）】
${activeNpcListText || "特になし"}

【プレイヤーキャラクター】
名前: ${joinedCharacter?.name}
ステータス: HP:${joinedCharacter?.hp} SAN:${joinedCharacter?.san}
${inventoryText}

【AIプレイヤー（相棒）】
${aiPlayersText}

【AIプレイヤー・進行に関する絶対ルール】
1. AIプレイヤー（相棒）のセリフや行動はGMが描写してください。ただし、**AI相棒が勝手に重要アイテムを複数見つけたり、謎解きを勝手に解決して事態を一気に進めることは厳禁**です。相棒はあくまでPLのサポートやリアクション、不安の共有にとどめてください。
2. **参加人数に応じた描写の最適化（ダレ防止）**
   参加プレイヤーが複数いる場面での日常的な行動や単純な探索は、無駄に文章を長くせず全員の状況をテンポ良く簡潔に処理してください。
   ただし、ボス戦・トラップの発動・重要アイテムの発見・真相到達などの**【大事な場面】では、一転して持てる最高の表現力と文字数を使い、息を呑むような情景描写と心理描写を行ってください。**
3. ${detailInstruction}
4. 判定失敗時は「手がかりが得られない焦り」や「不穏な気配の接近」などを演出し、即座に別の解決策へ勝手に誘導しないこと。

【システム・難易度設定】
${ruleSpec}
${gmStyle}
${difficultyInstruction}
${afkInstruction}

【進行ペースとターンの最適化（重要）】
参加人数に関わらず、間延びを防ぐために1つの章は【全体で20〜30ターン以内】に収まるよう、1ターンあたりの情報密度を上げてテンポ良く事態を進展させてください。
PLが重要な真相に到達した、あるいは規定ターンに近づいた場合は、迷わず「chapterClear: true」として次章へ進めてください。

【出力形式（絶対遵守・JSON Mode）】
必ず以下のJSONフォーマットのみを出力してください。マークダウン（\`\`\`json）や余計な文章は一切含めないでください。

{
  "text": "プレイヤーへの返答テキスト（${targetTab === 'consult' ? volumeInstruction : `情景描写・NPCや相棒のセリフ。${volumeInstruction}`}）",
  "statusUpdates": [
    {"name": "キャラ名", "hp": 10, "san": 50} 
  ],
  "inventoryUpdates": [
    {"name": "キャラ名", "items": "変更後のアイテムリスト全文"}
  ],
  "chapterClear": false
}
※ステータスや所持品に変更がない場合は空配列 [] を指定してください。
`;
};

export const getNovelPrompt = (model: string, viewpointInstruction: string, chars: string, tone: string = 'light') => {
  let toneInstruction = "";
  if (tone === 'light') {
    toneInstruction = "文体：ライトノベル風。キャラクターの会話や掛け合いを多めにし、テンポ良く読みやすい文章にしてください。";
  } else if (tone === 'literature') {
    toneInstruction = "文体：純文学風。情景描写や心理描写を重厚かつ美しく表現し、文学的な深い味わいのある文章にしてください。";
  } else if (tone === 'hardboiled') {
    toneInstruction = "文体：ハードボイルド風。無駄を省いた渋く簡潔な表現を用い、冷酷でシリアスな雰囲気を漂わせてください。";
  }

  return `あなたはプロの小説家です。以下のTRPGのチャットログを元に、ひとつの魅力的な小説を執筆してください。

【執筆ルール】
${viewpointInstruction}
2. メタ発言やダイス判定のシステムログは小説の描写に自然に溶け込ませること（例：「目星成功」→「ふと視線をやると、違和感に気づいた」等）。
3. ${toneInstruction}

【出力形式】
必ず以下のフォーマットで出力してください。
（※参加している全キャラクター分、以下の行を繰り返すこと）
[CHAR_INTRO: キャラクター名] そのキャラクターの紹介や活躍の要約

[NOVEL_START]
（ここから小説の本文を執筆）
`;
};