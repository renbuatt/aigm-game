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
    // ★ モデルのランクに応じた「1章の総文字数ターゲット」と「1ターンの描写ボリューム」の細分化
    if (model === 'opus') {
      volumeInstruction = "1章の総文字数が【約40,000文字】に達する重厚なペースを意識し、1ターンにつき1500〜2500文字（最大3000文字）で非常に読み応えのある文章を出力すること。";
      detailInstruction = "1回の行動に対して、周囲の微細な変化、五感（温度、湿度、匂い、微かな音、光の陰影）、キャラクターの微細な心理描写、NPCの表情の機微などを、世界最高峰の語彙力で圧倒的にリッチに描写してください。";
    } else if (model === 'claude') { // Sonnet
      volumeInstruction = "1章の総文字数が【約36,000文字】になるペースを意識し、1ターンにつき1200〜1800文字の重厚で文学的な文章を出力すること。";
      detailInstruction = "1回の行動に対して、周囲の状況、五感（視界の暗さ、冷気、音、匂い）、キャラクターの心理描写を深く掘り下げてリッチに描写してください。";
    } else if (model === 'pro') {
      volumeInstruction = "1章の総文字数が【約32,000文字】になるペースを意識し、1ターンにつき1000〜1500文字の読み応えのある文章を出力すること。";
      detailInstruction = "1回の行動に対して、周囲の状況や五感、張り詰めた空気感などをリッチに描写し、決して展開を端折らないでください。";
    } else if (model === 'flash') {
      volumeInstruction = "1章の総文字数が【約28,000文字】になるペースを意識し、1ターンにつき800〜1200文字でしっかりと情景を描写すること。";
      detailInstruction = "1回の行動に対して、視覚情報だけでなく聴覚や嗅覚などの五感を交え、状況の変化を詳しく描写してください。";
    } else { // lite, flash-lite
      volumeInstruction = "1章の総文字数が【約25,000文字】になるペースを意識し、通常は600〜1000文字程度で丁寧に描写すること。";
      detailInstruction = "プレイヤーの行動に対する結果と、その場の状況や空気感を丁寧に描写してください。";
    }
    
    // 間延び防止のための共通指示
    volumeInstruction += "ただし、単純な行動や会話の際は、間延びを防ぐためあなたの判断で柔軟に短くテンポを調整して構いません。";
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
2. **状況に応じたメリハリをつけること。** 重要な発見やピンチの場面ではリッチに、単純な探索や移動では短くテンポ良くするなど、PLが退屈しないよう文章量をコントロールしてください。
3. ${detailInstruction}
4. 判定失敗時は「手がかりが得られない焦り」や「不穏な気配の接近」などを演出し、即座に別の解決策へ勝手に誘導しないこと。

【システム・難易度設定】
${ruleSpec}
${gmStyle}
${difficultyInstruction}
${afkInstruction}

【進行ペースとターンの最適化（重要）】
参加人数に関わらず、間延び（ダレ）を防ぐために1つの章は【全体で20〜30ターン以内】に収まるよう、1ターンあたりの情報密度を上げてテンポ良く事態を進展させてください。
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