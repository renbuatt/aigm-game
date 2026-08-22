import { supabase } from "../lib/supabase";
import { generateAITextWithPrompt } from "../lib/ai";
import { Message, Room, UserProfile, PlayArchive } from "../types";

type UseExportProps = {
  currentUser: UserProfile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  activeRoom: Room | null;
  joinedCharacter: any;
  messages: Message[];
  isTicketSystemEnabled: boolean;
  setShowTicketModal: React.Dispatch<React.SetStateAction<boolean>>;
  playArchives: PlayArchive[];
  setPlayArchives: React.Dispatch<React.SetStateAction<PlayArchive[]>>;
  setIsExporting: React.Dispatch<React.SetStateAction<boolean>>;
  geminiFlashModel: '3.5-lite' | '3.6';
  novelSettingsModal: any;
  setNovelSettingsModal: React.Dispatch<React.SetStateAction<any>>;
  setCurrentView: React.Dispatch<React.SetStateAction<any>>;
};

export function useExport({
  currentUser, setCurrentUser, activeRoom, joinedCharacter, messages,
  isTicketSystemEnabled, setShowTicketModal, playArchives, setPlayArchives,
  setIsExporting, geminiFlashModel, novelSettingsModal, setNovelSettingsModal, setCurrentView
}: UseExportProps) {

  const saveToArchive = async () => {
    if (!currentUser || !activeRoom || !activeRoom.scenario) return;
    setIsExporting(true);
    try {
      const chatLogs = messages.map(m => `${m.charName || m.sender}: ${m.text}`).join('\n');
      const coPlayers = Object.keys(activeRoom.joined_users || {}).filter(id => id !== currentUser.id);
      
      const { data, error } = await supabase.from('play_archives').insert({
        user_id: currentUser.id,
        scenario_id: activeRoom.scenario.id,
        scenario_title: activeRoom.scenario.title,
        scenario_image: activeRoom.scenario.imageUrl || "",
        character_name: joinedCharacter?.name || "プレイヤー",
        chat_logs: chatLogs,
        rule: activeRoom.rule,
        co_players: coPlayers,
        novels: {},
        characters: activeRoom.scenario.presetCharacters
      }).select().single();
      
      if (error) throw error;
      alert("プレイ書庫に保存しました！");
      if (data) {
        setPlayArchives([data, ...playArchives]);
      }
    } catch(e:any) {
      alert("保存エラー: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleStartNovel = async (lang: "ja" | "en" | "zh" | string = 'ja') => {
    if (!currentUser || !activeRoom || !activeRoom.scenario) return;
    
    setIsExporting(true);
    try {
      const chatLogs = messages.map(m => `${m.charName || m.sender}: ${m.text}`).join('\n');
      
      let langInstruction = "必ず【日本語】で、美しく読みやすい小説形式で出力してください。";
      if (lang === 'en') langInstruction = "You MUST output the entire novel in 【English】, writing in a beautiful, engaging, and highly descriptive prose style.";
      if (lang === 'zh') langInstruction = "You MUST output the entire novel in 【Simplified Chinese (简体中文)】, writing in a beautiful, engaging, and highly descriptive prose style.";

      const novelPrompt = `あなたはプロの小説家です。以下のTRPGのチャットログを元に、臨場感あふれる一つの小説を作成してください。
【シナリオ名】${activeRoom.scenario.title}
【プレイヤーキャラ】${joinedCharacter?.name || "主人公"}

【出力の絶対条件】
1. ログのメタ発言（ダイスロール結果やシステムメッセージ）は描写に溶け込ませるか除外し、純粋な物語として読めるようにすること。
2. 視点は三人称、または主人公の視点で統一すること。
3. ${langInstruction}

【チャットログ】
${chatLogs}`;
      
      const novelText = await generateAITextWithPrompt(novelPrompt, geminiFlashModel, 8000, 0.7);
      
      const existingArchive = playArchives.find(a => a.scenarioId === activeRoom.scenario_id && a.userId === currentUser.id);
      
      if (existingArchive) {
        const updatedNovels = { ...(existingArchive.novels || {}), [lang]: novelText };
        const { error } = await supabase.from('play_archives').update({ novels: updatedNovels }).eq('id', existingArchive.id);
        if (error) throw error;
        
        setPlayArchives(playArchives.map(a => a.id === existingArchive.id ? { ...a, novels: updatedNovels } : a));
        alert(`ノベル（${lang.toUpperCase()}）の作成が完了し、プレイ書庫に追記保存されました！`);
      } else {
        const coPlayers = Object.keys(activeRoom.joined_users || {}).filter(id => id !== currentUser.id);
        const { data, error } = await supabase.from('play_archives').insert({
          user_id: currentUser.id,
          scenario_id: activeRoom.scenario.id,
          scenario_title: activeRoom.scenario.title,
          scenario_image: activeRoom.scenario.imageUrl || "",
          character_name: joinedCharacter?.name || "プレイヤー",
          chat_logs: chatLogs,
          rule: activeRoom.rule,
          co_players: coPlayers,
          novels: { [lang]: novelText },
          characters: activeRoom.scenario.presetCharacters
        }).select().single();
        
        if (error) throw error;
        if (data) setPlayArchives([data, ...playArchives]);
        alert(`ノベル（${lang.toUpperCase()}）の作成が完了し、プレイ書庫に新規保存されました！`);
      }
    } catch(e:any) {
      alert("ノベル作成エラー: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const executeExport = async (
    title: string, 
    messagesArg: any[], 
    type: "summary" | "chat" | "novel", 
    options?: { archiveId?: string; modelName?: string; viewPoint?: "third" | "first"; characters?: any[]; language?: string }
  ) => {
    const targetArchiveId = options?.archiveId;
    const target = playArchives.find(a => a.id === targetArchiveId) || playArchives[0];
    
    let content = `シナリオ: ${title}\nキャラクター: ${target?.characterName || "プレイヤー"}\n\n`;
    if (type === 'novel' && target?.novels) {
      const lang = options?.language || 'ja';
      content += target.novels[lang] || Object.values(target.novels)[0] || target?.chatLogs || "";
    } else {
      content += target?.chatLogs || messagesArg.map(m => `${m.charName || m.sender}: ${m.text}`).join('\n');
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}_log.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    window.print();
  };

  return { saveToArchive, handleStartNovel, executeExport, exportToPDF };
}