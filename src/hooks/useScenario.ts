import { supabase } from "../lib/supabase";
import { generateAITextWithPrompt, generateFreeImage } from "../lib/ai";
import { UserProfile, Room, Scenario } from "../types";

type UseScenarioProps = {
  currentUser: UserProfile | null;
  activeRoom: Room | null;
  setActiveRoom: React.Dispatch<React.SetStateAction<Room null |>>;
  setJoinedCharacter: React.Dispatch<React.SetStateAction<any>>;
  editingScenario: Scenario | null;
  ratingScenario: number;
  ratingGM: number;
  reportTarget: any;
  setReportTarget: React.Dispatch<React.SetStateAction<any>>;
  reportReason: string;
  setReportReason: React.Dispatch<React.SetStateAction<string>>;
  scenarioAppealTarget: Scenario | null;
  setScenarioAppealTarget: React.Dispatch<React.SetStateAction<Scenario null |>>;
  scenarioAppealText: string;
  setScenarioAppealText: React.Dispatch<React.SetStateAction<string>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchData: () => Promise<any>;
  fetchAdminData: () => Promise<any>;
  setCurrentView: React.Dispatch<React.SetStateAction<any>>;
};

export function useScenario({
  currentUser, activeRoom, setActiveRoom, setJoinedCharacter,
  editingScenario, ratingScenario, ratingGM,
  reportTarget, setReportTarget, reportReason, setReportReason,
  scenarioAppealTarget, setScenarioAppealTarget, scenarioAppealText, setScenarioAppealText,
  setIsLoading, fetchData, fetchAdminData, setCurrentView
}: UseScenarioProps) {

  const deleteScenario = async (id: string) => {
    if (!confirm("本当にこのシナリオを削除しますか？\n（※関連する部屋も削除されます）")) return;
    await supabase.from('rooms').delete().eq('scenario_id', id);
    const { error } = await supabase.from('scenarios').delete().eq('id', id);
    if (error) alert("削除に失敗しました: " + error.message);
    else { alert("シナリオを削除しました。"); await fetchData(); }
  };

  const saveScenario = async () => {
    if (!editingScenario || !currentUser) return;
    setIsLoading(true);
    try {
      // 既存の翻訳データがあれば引き継ぐ
      let translationEn = editingScenario.translationEn || {};
      let translationZh = editingScenario.translationZh || {};
      
      if (editingScenario.title && editingScenario.description) {
        try {
          const charsData = editingScenario.presetCharacters.map((c: any) => ({ name: c.name, job: c.job, personality: c.personality }));
          const promptBase = `You are a professional translator. Translate the following TRPG scenario into [TARGET_LANG].
CRITICAL INSTRUCTION: Output ONLY a valid JSON object. Do NOT wrap it in markdown block. Do NOT add any conversational text.
Structure:
{"title": "...", "description": "...", "characters": [{"name": "...", "job": "...", "personality": "..."}]}

Title: ${editingScenario.title}
Description: ${editingScenario.description}
Characters: ${JSON.stringify(charsData)}`;

          // API制限（429エラー）を避けるため、同時に投げずに順番（直列）に実行する
          try {
            const resEnRaw = await generateAITextWithPrompt(promptBase.replace('[TARGET_LANG]', 'English'), 'flash', 2000, 0.2);
            // 正規表現で { から } までを強制的に抽出（AIの余計な文章を無視）
            const matchEn = resEnRaw.match(/\{[\s\S]*\}/);
            if (matchEn) translationEn = JSON.parse(matchEn[0]);
          } catch (err) {
            console.error("英語翻訳エラー:", err);
          }

          try {
            const resZhRaw = await generateAITextWithPrompt(promptBase.replace('[TARGET_LANG]', 'Simplified Chinese'), 'flash', 2000, 0.2);
            const matchZh = resZhRaw.match(/\{[\s\S]*\}/);
            if (matchZh) translationZh = JSON.parse(matchZh[0]);
          } catch (err) {
            console.error("中国語翻訳エラー:", err);
          }

        } catch (e) { 
          console.error("翻訳全体のエラー:", e);
        }
      }

      const dbData = { 
        title: editingScenario.title, description: editingScenario.description || "", system: editingScenario.system || "", tags: editingScenario.tags || "", setting: editingScenario.setting || "", 
        npc_list: editingScenario.npcList || "", plot: editingScenario.plot || "", prologue: editingScenario.prologue || "", epilogue: editingScenario.epilogue || "",
        image_url: editingScenario.imageUrl || "", preset_characters: editingScenario.presetCharacters, rating_sum: editingScenario.ratingSum, rating_count: editingScenario.ratingCount, author_id: currentUser.id, purchased_tickets: editingScenario.purchasedTickets || {}, price: editingScenario.price || 500, play_limit: editingScenario.playLimit || 1, giftLimit: editingScenario.giftLimit || 1, play_time: editingScenario.playTime || 60, is_playable_by_others: editingScenario.isPlayableByOthers || false, is_trial_ok: editingScenario.isTrialOk || false, item_visibility: editingScenario.itemVisibility || "none", required_scenario_id: editingScenario.requiredScenarioId || "",
        translation_en: translationEn, translation_zh: translationZh
      };
      
      if (editingScenario.id && !editingScenario.id.startsWith('s')) {
        await supabase.from('scenarios').update(dbData).eq('id', editingScenario.id);
      } else {
        await supabase.from('scenarios').insert(dbData);
      }
      
      alert("シナリオを保存（多言語翻訳チェック完了）しました！"); 
      await fetchData(); 
      setCurrentView("lobby");
    } catch (err: any) { 
      alert("保存エラー: " + err.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const submitEvaluation = async () => {
    if(!activeRoom || !activeRoom.scenario || !currentUser) return;
    const newScSum = activeRoom.scenario.ratingSum + ratingScenario;
    const newScCount = activeRoom.scenario.ratingCount + 1;
    await supabase.from('scenarios').update({ rating_sum: newScSum, rating_count: newScCount }).eq('id', activeRoom.scenario.id);
    if(activeRoom.host_id) {
      const { data: hostData } = await supabase.from('profiles').select('rating_sum, rating_count').eq('id', activeRoom.host_id).single();
      if(hostData) await supabase.from('profiles').update({ rating_sum: (hostData.rating_sum || 0) + ratingGM, rating_count: (hostData.rating_count || 0) + 1 }).eq('id', activeRoom.host_id);
    }
    alert("評価を送信しました！ロビーに戻ります。");
    setActiveRoom(null); setJoinedCharacter(null); await fetchData(); setCurrentView("lobby");
  };

  const submitUserReport = async () => {
    if (!currentUser || !reportTarget || !reportReason.trim()) return;
    const { error } = await supabase.from('reports').insert({ reporter_id: currentUser.id, target_type: reportTarget.type, target_id: reportTarget.id, room_id: reportTarget.roomId || null, reason: reportReason });
    if (!error) { alert("運営に通報を送信しました。ご協力ありがとうございます。"); setReportTarget(null); setReportReason(""); } 
    else alert("エラーが発生しました: " + error.message);
  };

  const submitScenarioAppeal = async () => {
    if (!currentUser || !scenarioAppealTarget || !scenarioAppealText.trim()) return;
    const { error } = await supabase.from('reports').insert({ reporter_id: currentUser.id, target_type: 'scenario_appeal', target_id: scenarioAppealTarget.id, reason: scenarioAppealText });
    if (!error) { alert("運営に再審査（修正完了）の申請を送信しました。"); setScenarioAppealTarget(null); setScenarioAppealText(""); await fetchAdminData(); } 
    else alert("エラーが発生しました: " + error.message);
  };

  const generatePackageImage = async (baseText: string, type: 'scenario' | 'character') => {
    setIsLoading(true);
    try {
      const autoPromptReq = type === 'scenario' 
        ? `以下のシナリオプロットから、パッケージとなる情景を1文の日本語で抽出してください。\n\n${baseText}`
        : `以下のキャラクター設定から、その人物の容姿（バストアップ）を1文の日本語で描写してください。\n\n${baseText}`;
      const targetPrompt = await generateAITextWithPrompt(autoPromptReq, 'lite', 200, 0.7);
      const translationPrompt = `以下の日本語を画像生成AI用のカンマ区切りの英語プロンプトに変換してください。最後に「SFW, masterpiece, high quality${type === 'character' ? ', 1girl or 1boy, solo, upper body' : ''}」を含めること。\n\n描写：${targetPrompt}`;
      let englishPrompt = "";
      try { englishPrompt = await generateAITextWithPrompt(translationPrompt, 'lite', 200, 0.3); } catch (err) { englishPrompt = `${targetPrompt}, SFW, masterpiece, high quality`; }
      const base64data = await generateFreeImage(englishPrompt);
      return base64data;
    } catch (err: any) {
      alert("画像生成に失敗しました。"); return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    deleteScenario,
    saveScenario,
    submitEvaluation,
    submitUserReport,
    submitScenarioAppeal,
    generatePackageImage
  };
}