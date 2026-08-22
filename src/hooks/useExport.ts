import { supabase } from "../lib/supabase";
import { generateAITextWithPrompt } from "../lib/ai";
import { getNovelPrompt } from "../lib/prompts";
import { UserProfile, Room, Character, Message, PlayArchive } from "../types";

type UseExportProps = {
  currentUser: UserProfile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  activeRoom: Room | null;
  joinedCharacter: Character | null;
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
  setIsExporting, geminiFlashModel, novelSettingsModal, setNovelSettingsModal,
  setCurrentView
}: UseExportProps) {

  const saveToArchive = async (silent: boolean = false) => {
    if (!currentUser || !activeRoom || !joinedCharacter) return;
    const isOwn = activeRoom.scenario?.authorId === currentUser.id;
    if (isTicketSystemEnabled && !isOwn) {
      if ((currentUser.ticketsItem || 0) < 1) { 
        if(!silent) { alert("チケット不足"); setShowTicketModal(true); } 
        return; 
      }
      if(!silent && !confirm("アイテムチケットを1枚消費しますか？")) return;
      await supabase.from('profiles').update({ tickets_item: (currentUser.ticketsItem || 0) - 1 }).eq('id', currentUser.id);
      setCurrentUser(p => p ? { ...p, ticketsItem: (p.ticketsItem || 0) - 1 } : null);
    }
    const end = messages.findIndex((m: any) => m.text.includes('[SCENARIO_END]'));
    const bMsgs = end !== -1 ? messages.slice(0, end + 1) : messages;
    
    const userIds = Object.keys(activeRoom.joined_users || {});
    const { data: profiles } = await supabase.from('profiles').select('id, handle_name').in('id', userIds);
    const profileMap: Record<string, string> = {};
    if (profiles) profiles.forEach((p: any) => { profileMap[p.id] = p.handle_name; });

    const charactersWithPlayers = activeRoom.scenario?.presetCharacters.map((c: any) => {
      const uid = Object.keys(activeRoom.joined_users || {}).find((k: string) => activeRoom.joined_users![k] === c.id);
      return { ...c, playerName: uid ? profileMap[uid] : 'AI相棒' };
    }) || [];

    const { data } = await supabase.from('play_archives').insert({ 
      user_id: currentUser.id, 
      scenario_id: activeRoom.scenario_id, 
      scenario_title: activeRoom.scenario?.title || "", 
      scenario_image: activeRoom.scenario?.imageUrl || "", 
      character_name: joinedCharacter.name, 
      chat_logs: bMsgs, 
      rule: activeRoom.rule,
      co_players: Object.values(profileMap).filter((name: any) => name !== currentUser?.handleName),
      characters: charactersWithPlayers
    }).select().single();
    
    if (data) { 
      setPlayArchives(p => [data, ...p]); 
      if(!silent) { alert("保存しました！"); setCurrentView("library"); } 
    }
  };

  const executeExport = async (title: string, sourceMessages: Message[], type: 'chat' | 'summary' | 'novel', options?: { archiveId?: string, modelName?: string, viewPoint?: 'third' | 'first', myCharacterName?: string, scenarioImage?: string, createdAt?: string, coPlayers?: string[], characters?: Character[], scenarioId?: string, authorId?: string, aiModelConfirmed?: boolean, aiModel?: string, tone?: string }) => {
    if (type === 'novel' && !options?.aiModelConfirmed) {
      setNovelSettingsModal({ title, sourceMessages, type, options: { ...options, tone: 'light' }, aiModel: 'flash' });
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert("ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。"); return; }
    printWindow.document.write('<div style="padding: 20px; font-family: sans-serif; color: #333;">生成中...しばらくお待ちください。（AI執筆中の場合は数十秒かかることがあります）</div>');

    const targetMessages = sourceMessages.filter((m: any) => m.channel !== 'gm');
    let contentHtml = "";

    const commonStyle = `<style>body { font-family: sans-serif; color: #333; margin: 0; padding: 0; background: #f9f9f9; } .page { background: #fff; max-width: 800px; margin: 20px auto; padding: 60px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px; } .page-break { page-break-before: always; margin-top: 40px; padding-top: 40px; border-top: 2px dashed #ccc; } @media print { body { background: #fff; } .page { box-shadow: none; margin: 0; padding: 0; } .page-break { border-top: none; padding-top: 0; margin-top: 0; } } .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; } .cover img { max-width: 80%; max-height: 50vh; object-fit: contain; border-radius: 8px; margin-bottom: 30px; } .character-intro { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 40px; } .character-intro img { width: 140px; height: 140px; object-fit: cover; border-radius: 8px; flex-shrink: 0; } .character-info h3 { margin: 0 0 10px 0; border-bottom: 2px solid #10b981; padding-bottom: 5px; } .no-image { width: 140px; height: 140px; background: #eee; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; flex-shrink: 0; } .novel-body { white-space: pre-wrap; line-height: 1.9; font-size: 15px; } .novel-image { text-align: center; margin: 40px 0; } .novel-image img { max-width: 100%; max-height: 400px; border-radius: 8px; }</style>`;

    const coverHtml = `<div class="cover">${options?.scenarioImage ? `<img src="${options.scenarioImage}" />` : ''}<h1>${title}</h1><div class="meta"><p>プレイ日時: ${options?.createdAt ? new Date(options.createdAt).toLocaleString() : '不明'}</p><p>参加プレイヤー: ${options?.coPlayers?.length ? options.coPlayers.join(', ') : 'ソロプレイ'}</p></div></div>`;

    const generateCharsHtml = (introMap: Record<string, string> = {}) => {
      let charsToRender = options?.characters || [];
      if (charsToRender.length === 0) {
        charsToRender = Object.keys(introMap).map(name => ({ id: name, name: name, job: '探索者', personality: introMap[name], imageUrl: '', hp: 0, san: 0, str: 0, dex: 0, int: 0, con: 0, wis: 0, cha: 0, playerName: 'プレイヤー' }));
      }
      const chunks = [];
      const chunkSize = 3;
      for (let i = 0; i < charsToRender.length; i += chunkSize) { chunks.push(charsToRender.slice(i, i + chunkSize)); }
      return chunks.map((chunk: any, chunkIdx: number) => `
        <div class="page-break">
          ${chunkIdx === 0 ? '<h2 style="text-align: center; margin-bottom: 40px; font-size: 24px; color: #2c3e50;">登場キャラクター</h2>' : ''}
          ${chunk.map((c: any) => {
            const matchedKey = Object.keys(introMap).find((k: string) => k.includes(c.name) || c.name.includes(k));
            const introText = matchedKey ? introMap[matchedKey] : (c.personality || '情報なし');
            const playerName = c.playerName ? c.playerName : 'AI相棒';
            return `<div class="character-intro">${c.imageUrl ? `<img src="${c.imageUrl}" />` : `<div class="no-image">No Image</div>`}<div class="character-info"><h3>${c.name} <span style="font-size:14px; font-weight:normal; color:#666;">（PL: ${playerName}）</span></h3><p><strong>【特徴・活躍】</strong><br/>${introText}</p></div></div>`;
          }).join('')}
        </div>`).join('');
    };

    if (type === 'chat') {
      const chatHtml = targetMessages.map((m: any) => {
        if (m.type === 'image' && m.imageUrl) return `<div style="margin-bottom: 12px; border-bottom: 1px dashed #eee; padding-bottom: 8px;"><strong style="color: #2c3e50;">AI GM (画像)</strong><br><img src="${m.imageUrl}" style="max-width: 300px; border-radius: 8px;" /><br><span style="white-space: pre-wrap; color: #34495e;">${m.text}</span></div>`;
        const senderName = m.charName || (m.sender === "player" ? "プレイヤー" : m.sender === "gm" ? "AI GM" : "システム");
        const text = m.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim();
        if (!text) return "";
        return `<div style="margin-bottom: 12px; border-bottom: 1px dashed #eee; padding-bottom: 8px;"><strong style="color: #2c3e50;">${senderName}</strong><br><span style="white-space: pre-wrap; color: #34495e;">${text}</span></div>`;
      }).join('');
      contentHtml = `${commonStyle}<div class="page">${coverHtml}${generateCharsHtml()}<div class="page-break"><h2 style="text-align: center; margin-bottom: 40px;">チャットログ</h2>${chatHtml}</div></div>`;
    } else {
      setIsExporting(true);
      let imageCounter = 0; const imagesList: string[] = [];
      const logTextForAI = targetMessages.map((m: any) => {
        if (m.type === 'image' && m.imageUrl) { 
          imagesList.push(m.imageUrl); 
          imageCounter++; 
          return `[IMAGE_ID: ${imageCounter}] (ここに情景画像が生成されました: ${m.text})`; 
        }
        return `${m.charName || (m.sender === 'gm' ? 'GM' : 'システム')}: ${m.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim()}`;
      }).join('\n');

      const viewpointInstruction = options?.viewPoint === 'first' && options?.myCharacterName ? `1. 単調な事実の羅列を避け、五感を刺激する情景描写と心理描写を大幅に肉付けすること。また、【${options.myCharacterName}】の視点（一人称）で物語を描写すること。` : `1. 単調な事実の羅列を避け、五感を刺激する情景描写と心理描写を大幅に肉付けすること。神の視点（第三者視点）で物語を描写すること。`;
      const uniqueCharNames = Array.from(new Set(targetMessages.filter((m: any) => m.sender === 'player' || m.sender === 'ai_player').map((m: any) => m.charName).filter(Boolean)));
      const charNamesStr = uniqueCharNames.length > 0 ? `登場キャラクター（${uniqueCharNames.join('、')}）` : '各キャラクター';
      const prompt = getNovelPrompt(options?.aiModel || 'flash', viewpointInstruction, charNamesStr, options?.tone || 'light');

      try {
        let aiModelToUse = options?.aiModel || 'flash'; 
        if (aiModelToUse === 'flash') {
          aiModelToUse = geminiFlashModel === '3.5-lite' ? 'flash-lite' : 'flash';
        }

        const generatedText = await generateAITextWithPrompt(prompt + "\n\n【チャットログ】\n" + logTextForAI, aiModelToUse, 3000, 0.8);

        let introMap: Record<string, string> = {}; let finalNovelText = generatedText;
        if (generatedText.includes('[NOVEL_START]')) {
          const parts = generatedText.split('[NOVEL_START]');
          finalNovelText = parts[1].trim();
          const introRegex = /\[CHAR_INTRO:\s*(.+?)\]([\s\S]*?)(?=\[CHAR_INTRO:|$)/g;
          let m; while ((m = introRegex.exec(parts[0])) !== null) {
            introMap[m[1].trim()] = m[2].trim();
          }
        }

        imagesList.forEach((imgUrl: any, idx: number) => {
          finalNovelText = finalNovelText.replace(new RegExp(`\\[IMAGE_ID:\\s*${idx + 1}\\]`, 'g'), `</div><div class="novel-image"><img src="${imgUrl}" /></div><div class="novel-body">`);
        });

        contentHtml = `${commonStyle}<div class="page">${coverHtml}${generateCharsHtml(introMap)}<div class="page-break"><h2 style="text-align: center; margin-bottom: 40px;">本編</h2><div class="novel-body">${finalNovelText}</div></div></div>`;

        if (options?.archiveId && type === 'novel' && options.modelName) {
          const archive = playArchives.find((a: any) => a.id === options.archiveId);
          if (archive) {
            const updatedNovels = { ...(archive.novels || {}), [options.modelName]: contentHtml }; 
            await supabase.from('play_archives').update({ novels: updatedNovels }).eq('id', options.archiveId);
            setPlayArchives(prev => prev.map((a: any) => a.id === options.archiveId ? { ...a, novels: updatedNovels } : a));
          }
        }
      } catch(e: any) { 
        alert("エクスポート生成エラー: " + e.message); 
        setIsExporting(false); 
        printWindow.close(); 
        return; 
      }
      setIsExporting(false);
    }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${contentHtml}<script>setTimeout(() => { if('${type}' === 'chat') { window.print(); window.close(); } }, 500);</script></body></html>`);
    printWindow.document.close();
  };

  const handleStartNovel = async () => {
    if (!novelSettingsModal || !currentUser) return;
    const { title, sourceMessages, type, options, aiModel } = novelSettingsModal;
    
    if (isTicketSystemEnabled) {
      if ((currentUser.ticketsItem || 0) < 1) { 
        alert("アイテムチケットが足りません！\nロビーの「チケット購入ストア」から入手してください。"); 
        setShowTicketModal(true); 
        return; 
      }
      if (!confirm("小説化を開始します。\nアイテムチケットを 1 枚消費しますか？")) return;
      
      const { error } = await supabase.from('profiles').update({ tickets_item: (currentUser.ticketsItem || 0) - 1 }).eq('id', currentUser.id);
      if (error) { alert("チケットの消費に失敗しました。"); return; }
      setCurrentUser(prev => prev ? { ...prev, ticketsItem: (prev.ticketsItem || 0) - 1 } : null);
    }
    
    setNovelSettingsModal(null);
    executeExport(title, sourceMessages, type, { ...options, aiModelConfirmed: true, aiModel });
  };

  const exportToPDF = async (type: 'chat' | 'summary' | 'novel', viewPoint: 'third' | 'first' = 'third') => {
    if (!activeRoom) return;
    const endIndex = messages.findIndex((m: any) => m.text.includes('[SCENARIO_END]'));
    const baseMessages = endIndex !== -1 ? messages.slice(0, endIndex + 1) : messages;

    const userIds = Object.keys(activeRoom.joined_users || {});
    const { data: profiles } = await supabase.from('profiles').select('id, handle_name').in('id', userIds);
    const profileMap: Record<string, string> = {};
    if (profiles) profiles.forEach((p: any) => { profileMap[p.id] = p.handle_name; });

    const charactersWithPlayers = activeRoom.scenario?.presetCharacters.map((c: any) => {
      const uid = Object.keys(activeRoom.joined_users || {}).find((k: string) => activeRoom.joined_users![k] === c.id);
      return { ...c, playerName: uid ? profileMap[uid] : 'AI相棒' };
    }) || [];

    await executeExport(
      activeRoom.scenario?.title || "名称未設定", 
      baseMessages, 
      type, 
      { 
        scenarioImage: activeRoom.scenario?.imageUrl, 
        createdAt: new Date().toISOString(), 
        coPlayers: Object.values(profileMap).filter((name: any) => name !== currentUser?.handleName), 
        characters: charactersWithPlayers, 
        viewPoint: viewPoint, 
        myCharacterName: joinedCharacter?.name, 
        scenarioId: activeRoom.scenario?.id, 
        authorId: activeRoom.scenario?.authorId 
      }
    );
  };

  return {
    saveToArchive,
    executeExport,
    handleStartNovel,
    exportToPDF
  };
}