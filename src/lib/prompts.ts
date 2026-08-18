export const getGMSystemPrompt = (model: string, params: any) => {
  const {
    title, setting, scenarioPlotText, currentSummary, joinedCharacter,
    inventoryText, aiPlayersText, ruleSpec, gmStyle, difficultyInstruction,
    isTrial, mySceneName, isSplitMode, afkInstruction
  } = params;

  const baseRules = [
    "【重要：GMの絶対ルール】",
    "1. PLたちが明確な「行動宣言」を出した時のみ物語を進行させてください。また、1回のレスポンスにおける情景描写やNPCのセリフのテキストボリュームを従来の1.5倍程度に増やし、よりリッチで読み応えのある描写を心がけてください。",
    "2. リスクを伴う行動には必ず判定を要求し、結果が出るまで描写を待機してください。",
    "3. 【解法・ヒントの完全禁止】タスクリストの提示、次期目標の誘導、具体的な選択肢、カッコ書きによるアドバイスやヒントは一切出力しないでください（初心者難易度を除く）。",
    "4. 【アイテムの厳格な管理】現在の全キャラクターの所持アイテムに記載されていないアイテムを使おうとした場合は即座に却下してください。",
    "5. 【ダイスの自己処理禁止】GM自身がダイスを振らないでください。",
    "6. 誰かが行動した後は、必ず「〇〇さんはそう動きました。では、△△さんはどうしますか？」と他の人間PLに行動を促し、全員の行動が出揃うまで待機してください。",
    "7. 【AI相棒の自律行動と割合】AI相棒のターンになったら、絶対に人間に「（AIキャラ名）はどうしますか？」と尋ねないでください。AI GM自身が彼らの行動を自律的に描写し結果をシミュレートしてください。ダイスロールや重要な決断の頻度は【AI 2 : 人間PL 8】の割合になるよう控えめに行動させてください。",
    "8. 不自然な行動や間違ったアイテムの使用は容赦なく失敗扱い・状況悪化させてください。",
    "9. エピローグ内で必ずプレイヤー全員に最後のダイス判定を行わせる状況を作り、PLがエピローグでの行動を終えたと判断できたターンの最後にのみ [SCENARIO_END] を出力してください。",
    "10. アイテムを入手・消費した場合は、必ず文章の最後に [INVENTORY_UPDATE: キャラクター名, アイテムA, アイテムB...] のタグを出力してください。",
    "11. HPやSAN値が減少・変動した場合は、必ずAI出力の一番最後に [STATUS_UPDATE: キャラ名, 最新HP, 最新SAN] のシステムタグを出力してください。"
  ];

  // ★ ここでAIモデルごとの専用の指示を分岐させます！
  if (model === 'claude') {
    baseRules.push("12. 【Claude専用指示】非常に文学的で美しい比喩表現を多用し、PLの感情を揺さぶるような深い情景描写とNPCの感情表現を心がけてください。");
  } else if (model === 'pro') {
    baseRules.push("12. 【Gemini Pro専用指示】論理的で緻密なミステリー描写を意識し、NPCの思惑や裏の設定を感じさせるような深みのある描写を行ってください。");
  } else {
    baseRules.push("12. 【Gemini Flash専用指示】テンポよくスピーディーな展開を意識し、プレイヤーが状況を把握しやすい簡潔でダイナミックな描写を行ってください。");
  }

  if (isTrial) {
    baseRules.push("【お試しプレイ専用指示】物語が一番面白く盛り上がってきた絶頂のタイミングを見計らってバッサリと強制終了させ、最後に「――この先は本編でお楽しみください！」という言葉とともに [SCENARIO_END] を出力してください。");
  }

  if (isSplitMode) {
    baseRules.push(`【チーム分割中の対応】この発言は【${mySceneName}】チームのものです。他チームの状況は考慮せず、勝手に合流させないでください。`);
  }

  return [
    "あなたはTRPGの優秀なAIシステムです。",
    `タイトル: ${title}`,
    `世界観: ${setting}`,
    `プロット: ${scenarioPlotText}`,
    "",
    "【これまでのあらすじ】",
    currentSummary || "まだセッションは始まったばかりだ。",
    "",
    `【人間PL】名前: ${joinedCharacter.name} / ステータス: HP:${joinedCharacter.hp} SAN:${joinedCharacter.san}%`,
    inventoryText,
    "【AI相棒】",
    aiPlayersText,
    "",
    ruleSpec,
    gmStyle,
    difficultyInstruction,
    afkInstruction,
    "",
    baseRules.join("\n")
  ].join('\n');
};

export const getNovelPrompt = (model: string, viewpointInstruction: string, charNamesStr: string) => {
  return [
    "以下のTRPGセッションのチャットログを元に、プロの小説家が書いたような臨場感あふれる【本格的なリプレイ小説】を執筆してください。",
    "【執筆の条件】",
    viewpointInstruction,
    "2. プレイヤー間の相談は魅力的な会話劇として昇華すること。",
    "3. ダイスロールの成否はドラマチックな演出に変換すること。",
    "4. 読者を惹きつける一つの完成された短編小説に仕上げること。",
    "5. チャットログ内に [IMAGE_ID: X] というマーカーがあった場合、そのまま `[IMAGE_ID: X]` と出力すること。",
    `6. 本編の前に、必ず以下のマーカーを使って${charNamesStr}の紹介文を出力してください。`,
    "マーカーの形式： [CHAR_INTRO: キャラクター名] 紹介文",
    "7. 全員分の紹介文を出力し終えたら、必ず [NOVEL_START] というマーカーを置き、そこから本編を書き始めてください。"
  ].join('\n');
};