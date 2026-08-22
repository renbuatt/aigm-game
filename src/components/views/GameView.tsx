import React, { useState, useEffect, useRef } from "react";
import { ViewState, UserProfile, Room, Character, Scene, Message, ChatTab, Scenario } from "../../types";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

type Props = {
  activeRoom: Room;
  myScene: Scene;
  currentUser: UserProfile;
  joinedCharacter: Character | null;
  leaveGame: () => Promise<void>;
  setReportTarget: React.Dispatch<React.SetStateAction<any>>;
  rollDice: (targetValue: number, label: string, is1d100?: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  startSplitting: () => Promise<void>;
  isSplitMode: boolean;
  chatTab: ChatTab;
  messages: Message[];
  isLoading: boolean;
  isScenarioEnded: boolean;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  endGame: () => Promise<void>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend: () => Promise<void>;
  handleTabClick: (tab: ChatTab) => void;
  unreadIndicators: { story: boolean; consult: boolean; gm: boolean; };
  consultWithAI: boolean;
  setConsultWithAI: React.Dispatch<React.SetStateAction<boolean>>;
  isChatDisabled: boolean;
  mergeTeam: () => Promise<void>;
  executeMergeAll: () => Promise<void>;
  generateSceneImage: (imageType: 'free' | 'premium') => Promise<void>;
  proposedTeams: {id: string, action: string, members: string[], leader: string}[];
  setProposedTeams: React.Dispatch<React.SetStateAction<any>>;
  isGeneratingSplit: boolean;
  generateSplitProposal: () => Promise<void>;
  finishSplitting: () => Promise<void>;
  cancelSplitting: () => Promise<void>;
  togglePauseRoom: () => Promise<void>;
  toggleAFK: (userId: string, forceRemove?: boolean) => Promise<void>;
  triggerAutoAction: () => Promise<void>;
  updateInventory: (newItems: string) => Promise<void>;
  openRoomConfigModal?: (scenario: Scenario) => void;
  aiPlayersList: Character[];
  saveToArchive: () => Promise<void>;
  kickUser: (uid: string) => Promise<void>;
  appLanguage?: "ja" | "en" | "zh"; // ★多言語対応
};

export default function GameView({
  activeRoom, myScene, currentUser, joinedCharacter, leaveGame, setReportTarget, rollDice,
  startGame, startSplitting, isSplitMode, chatTab, messages, isLoading, isScenarioEnded,
  setCurrentView, endGame, input, setInput, handleSend, handleTabClick, unreadIndicators,
  consultWithAI, setConsultWithAI, isChatDisabled, mergeTeam, executeMergeAll, generateSceneImage,
  proposedTeams, setProposedTeams, isGeneratingSplit, generateSplitProposal, finishSplitting, cancelSplitting,
  togglePauseRoom, toggleAFK, triggerAutoAction, updateInventory, aiPlayersList, kickUser, appLanguage
}: Props) {
  const isRecruiting = activeRoom.status === 'recruiting';
  const isHost = currentUser?.id === activeRoom.host_id || currentUser?.handleName === activeRoom.host_name;
  
  const [showImagePromptModal, setShowImagePromptModal] = useState(false);
  const [imagePromptText, setImagePromptText] = useState("");
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false); 
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const spectatorCount = activeRoom.spectator_ids ? activeRoom.spectator_ids.length : 0;

  const [now, setNow] = useState(new Date().getTime());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().getTime()), 10000);
    return () => clearInterval(timer);
  }, []);
  const fiveMinutes = 5 * 60 * 1000;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, chatTab]);

  useEffect(() => {
    if (!isHost || activeRoom.status !== 'playing' || activeRoom.is_paused || isScenarioEnded) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && (lastMsg.sender === 'gm' || lastMsg.sender === 'system')) {
      const timer = setTimeout(() => {
        triggerAutoAction();
      }, 5 * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, activeRoom.status, activeRoom.is_paused, isHost, isScenarioEnded, triggerAutoAction]);

  const handleGenerateImage = async (type: 'free' | 'premium') => {
    if (type === 'free' && (activeRoom.free_image_count || 0) >= 3) return;
    if (isGeneratingImg) return;
    setIsGeneratingImg(true);
    await generateSceneImage(type);
    setIsGeneratingImg(false);
  };

  const openInventoryEditor = () => {
    if(!joinedCharacter) return;
    setShowInventoryModal(true);
  };

  // ★ 言語ごとのUI辞書
  const lang = appLanguage || "ja";
  const t = {
    ja: {
      diffNormal: '普通', diffHard: '難しい', diffPro: 'プロ', diffOni: '鬼', diffEasy: '簡単', diffBeginner: '初心者',
      summaryTitle: '📖 これまでのあらすじ', noSummary: 'まだあらすじは記録されていません。（一定の会話が進むと自動で生成されます）', close: '閉じる',
      statusTitle: '👥 キャラクター紹介・ステータス', unknown: '不明', aiPartner: 'AI相棒', player: 'プレイヤー',
      invTitle: '🎒 あなたの所持品', invDesc: '※所持品はシステム（GM）が管理しています。新しくアイテムを取得したい場合や、設定上持っているはずの物を追加したい場合は、「GMへ質問」タブから交渉して認められてください。', noItems: '特になし',
      teamTitle: '👥 チーム編成', aiThinking: '⏳ AI考案中...', aiSuggest: '✨ AIに再提案させる', teamDesc: 'AIが提案したチーム構成を編集し、完了を押してください。', aiGenerating: 'AIが最適なチーム構成を考案しています...', team: 'チーム', delete: '削除', actionDest: '行動・目的地', actionEg: '例：2階の書庫を調べる', members: 'メンバー', addTeamManual: '＋ 手動でチームを追加する', cancel: 'キャンセル', confirmTeam: '編成を確定して再開',
      leave: '🚪 離脱', resume: '▶️ セッション再開', pause: '⏸️ 中断(セーブ)', summaryBtn: '📖 あらすじ', charStatusBtn: '👥 キャラ紹介', spectators: '👁️ 観戦者', roomPrefix: 'ROOM', about: '約', mins: '分', difficulty: '難易度', removeAfk: '解除', kick: '🚪追放', afkOn: '☕ 離席中(解除)', afkOff: '☕ 離席', teamSuffix: '班', invBtn: '🎒 所持品', conflictRoll: '🎲 葛藤判定', startBtn: '▶ ゲーム開始', generatingImg: '⏳ 生成中...', freeImgLeft: '🖼️ 情景生成(無料残', premiumImg: '✨ 高品質生成', mergeAll: '🚪 全員合流', splitTeam: '👥 チーム分け',
      pausedNotice: '⏸️ 現在セッションは中断（セーブ）されています。AIは停止中です。', aiThinkingStatus: 'AI思考中...',
      waitingNotice: '📢 現在はプレイヤー準備・待機中です。「▶ ゲーム開始」ボタンを押すまでAI GMは起動しません。',
      evalModeAI: '🎉 感想戦モード（AIは停止しています）', evalExit: '評価して退出する', evalTransition: '🎉 セッション完了！感想戦モードへ移行する', evalWait: '🎉 エンディング到達！ホストの完了操作をお待ちください...',
      postGameChat: '🗣️ 感想戦', postGamePlaceholder: '他のプレイヤーとセッションの感想を語り合いましょう！（AIは反応しません）', send: '送信',
      tabTeamAction: '📖 チーム行動宣言', tabAction: '📖 行動宣言 (GMへ)', tabConsult: '🗣️ 相談 (PL・AI相棒へ)', tabGM: '⚙️ GMへ質問', askAiPartner: 'AI相棒にも意見を求める',
      inputPaused: '中断中のため入力できません', inputAction: '例：鍵穴を覗き込みます。', inputConsultAI: '例：ねえ、どうしようか？ (AI相棒が返答します)', inputConsultPL: '例：PL同士の作戦会議メモ (AIは反応しません)', inputGM: '例：今の状況でもう一度目星は振れますか？ 職業柄、〇〇を持っていませんか？',
      spectatorNotice: 'あなたは観戦モードです（チャットは行えません）'
    },
    en: {
      diffNormal: 'Normal', diffHard: 'Hard', diffPro: 'Pro', diffOni: 'Oni', diffEasy: 'Easy', diffBeginner: 'Beginner',
      summaryTitle: '📖 Story Summary So Far', noSummary: 'No summary recorded yet. (Generated automatically as the conversation progresses.)', close: 'Close',
      statusTitle: '👥 Character Profiles & Status', unknown: 'Unknown', aiPartner: 'AI Partner', player: 'Player',
      invTitle: '🎒 Your Inventory', invDesc: '*Inventory is managed by the GM. If you want to acquire an item, negotiate in the "Ask GM" tab.', noItems: 'None',
      teamTitle: '👥 Team Formation', aiThinking: '⏳ AI is thinking...', aiSuggest: '✨ Ask AI to propose again', teamDesc: 'Edit the AI-proposed team structure and click confirm.', aiGenerating: 'AI is devising the optimal team structure...', team: 'Team', delete: 'Delete', actionDest: 'Action / Destination', actionEg: 'e.g., Investigate the library', members: 'Members', addTeamManual: '＋ Add team manually', cancel: 'Cancel', confirmTeam: 'Confirm & Resume',
      leave: '🚪 Leave', resume: '▶️ Resume', pause: '⏸️ Pause (Save)', summaryBtn: '📖 Summary', charStatusBtn: '👥 Status', spectators: '👁️ Spectators', roomPrefix: 'ROOM', about: '~', mins: 'm', difficulty: 'Diff', removeAfk: 'Un-AFK', kick: '🚪Kick', afkOn: '☕ AFK (Return)', afkOff: '☕ AFK', teamSuffix: ' Team', invBtn: '🎒 Inventory', conflictRoll: '🎲 Conflict Roll', startBtn: '▶ Start Game', generatingImg: '⏳ Generating...', freeImgLeft: '🖼️ Generate Scene (Free: ', premiumImg: '✨ High Quality Gen', mergeAll: '🚪 Merge All', splitTeam: '👥 Split Teams',
      pausedNotice: '⏸️ Session is paused (saved). AI is currently offline.', aiThinkingStatus: 'AI is thinking...',
      waitingNotice: '📢 Waiting for players to be ready. AI GM will not start until "Start Game" is pressed.',
      evalModeAI: '🎉 Post-match Mode (AI is offline)', evalExit: 'Evaluate & Exit', evalTransition: '🎉 Session Complete! Transitioning to post-match mode.', evalWait: '🎉 Ending reached! Waiting for host...',
      postGameChat: '🗣️ Post-match', postGamePlaceholder: 'Discuss your thoughts on the session! (AI will not respond)', send: 'Send',
      tabTeamAction: '📖 Team Action', tabAction: '📖 Action (to GM)', tabConsult: '🗣️ Consult (PL/AI)', tabGM: '⚙️ Ask GM', askAiPartner: 'Ask AI partner for opinion',
      inputPaused: 'Cannot type while paused.', inputAction: 'e.g., I peek through the keyhole.', inputConsultAI: 'e.g., Hey, what should we do? (AI partner replies)', inputConsultPL: 'e.g., Strategy memo for players (AI ignores)', inputGM: 'e.g., Can I roll Spot Hidden again here?',
      spectatorNotice: 'You are in spectator mode (chat disabled).'
    },
    zh: {
      diffNormal: '普通', diffHard: '困难', diffPro: '专家', diffOni: '恶鬼', diffEasy: '简单', diffBeginner: '新手',
      summaryTitle: '📖 剧情摘要', noSummary: '暂无摘要。（随着对话进行将自动生成）', close: '关闭',
      statusTitle: '👥 角色介绍与状态', unknown: '未知', aiPartner: 'AI搭档', player: '玩家',
      invTitle: '🎒 你的物品栏', invDesc: '※物品栏由GM管理。如果你想获得新物品，请在“向GM提问”标签页中交涉。', noItems: '无',
      teamTitle: '👥 队伍编成', aiThinking: '⏳ AI思考中...', aiSuggest: '✨ 让AI重新提议', teamDesc: '请编辑AI推荐的队伍结构并点击完成。', aiGenerating: 'AI正在设计最佳队伍结构...', team: '队伍', delete: '删除', actionDest: '行动 / 目的地', actionEg: '例：调查书库', members: '成员', addTeamManual: '＋ 手动添加队伍', cancel: '取消', confirmTeam: '确认编成并恢复',
      leave: '🚪 离开', resume: '▶️ 恢复游戏', pause: '⏸️ 暂停 (保存)', summaryBtn: '📖 摘要', charStatusBtn: '👥 角色状态', spectators: '👁️ 观战者', roomPrefix: '房间', about: '约', mins: '分钟', difficulty: '难度', removeAfk: '解除', kick: '🚪踢出', afkOn: '☕ 离开 (返回)', afkOff: '☕ 离开', teamSuffix: ' 组', invBtn: '🎒 物品栏', conflictRoll: '🎲 冲突判定', startBtn: '▶ 开始游戏', generatingImg: '⏳ 生成中...', freeImgLeft: '🖼️ 场景生成(免费余', premiumImg: '✨ 高级生成', mergeAll: '🚪 集合', splitTeam: '👥 分组',
      pausedNotice: '⏸️ 游戏已暂停（已保存）。AI目前处于离线状态。', aiThinkingStatus: 'AI思考中...',
      waitingNotice: '📢 目前在等待玩家准备。点击“开始游戏”前，AI GM不会启动。',
      evalModeAI: '🎉 赛后复盘模式 (AI已停止)', evalExit: '评价并退出', evalTransition: '🎉 游戏完成！进入复盘模式', evalWait: '🎉 已到达结局！等待房主操作...',
      postGameChat: '🗣️ 复盘聊天', postGamePlaceholder: '和其他玩家交流一下感想吧！（AI不会回复）', send: '发送',
      tabTeamAction: '📖 队伍行动', tabAction: '📖 行动宣告 (给GM)', tabConsult: '🗣️ 讨论 (玩家/AI)', tabGM: '⚙️ 询问GM', askAiPartner: '询问AI搭档的意见',
      inputPaused: '暂停中，无法输入', inputAction: '例：我透过钥匙孔往里看。', inputConsultAI: '例：嘿，我们该怎么办？(AI回复)', inputConsultPL: '例：玩家间的作战会议记录 (AI不回复)', inputGM: '例：这种情况下我能再进行一次检定吗？',
      spectatorNotice: '您处于观战模式（无法聊天）。'
    }
  }[lang];

  // ★ シナリオデータを指定言語に自動翻訳（代入）する関数
  const getTScen = (scenario?: Scenario): Scenario | undefined => {
    if (!scenario) return undefined;
    let s = { ...scenario };
    if (lang === 'en' && s.translationEn?.title) {
      s.title = s.translationEn.title;
      s.description = s.translationEn.description;
      if (s.translationEn.characters) s.presetCharacters = s.translationEn.characters;
    } else if (lang === 'zh' && s.translationZh?.title) {
      s.title = s.translationZh.title;
      s.description = s.translationZh.description;
      if (s.translationZh.characters) s.presetCharacters = s.translationZh.characters;
    }
    return s;
  };

  const sc = getTScen(activeRoom.scenario);
  const rule = activeRoom.rule || "coc_jp";
  const isAfk = activeRoom.afk_users?.includes(currentUser.id);
  const visibility = activeRoom.item_visibility || 'none';

  const diffText = activeRoom.difficulty === 'normal' ? t.diffNormal : activeRoom.difficulty === 'hard' ? t.diffHard : activeRoom.difficulty === 'pro' ? t.diffPro : activeRoom.difficulty === 'oni' ? t.diffOni : activeRoom.difficulty === 'easy' ? t.diffEasy : t.diffBeginner;

  const allParticipatingChars = [
    ...(sc?.presetCharacters.filter(c => Object.values(activeRoom.joined_users || {}).includes(c.id)) || []),
    ...aiPlayersList
  ];

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 min-h-0 relative">
      
      {showSummaryModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <h3 className="text-xl font-bold text-amber-400 border-b border-slate-700 pb-3">{t.summaryTitle}</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
              {activeRoom.current_summary || t.noSummary}
            </div>
            <button onClick={() => setShowSummaryModal(false)} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold text-white mt-2">{t.close}</button>
          </div>
        </div>
      )}

      {showStatusModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-indigo-500/50 rounded-xl p-6 w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-4 shrink-0">
              <h3 className="text-xl font-bold text-indigo-400">{t.statusTitle}</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-2xl text-slate-400 hover:text-white">×</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
              {allParticipatingChars.map(c => {
                const uid = Object.keys(activeRoom.joined_users || {}).find(k => activeRoom.joined_users![k] === c.id);
                const isAI = !uid;
                const isMe = joinedCharacter && c.id === joinedCharacter.id;
                
                return (
                  <div key={c.id} className={`bg-slate-900 border rounded-xl p-4 flex flex-col sm:flex-row gap-4 ${isMe ? 'border-blue-500/50' : 'border-slate-700'}`}>
                    <img src={c.imageUrl || DEFAULT_AVATAR} className="w-24 h-24 object-cover rounded-lg border border-slate-600 shrink-0 mx-auto sm:mx-0" alt={c.name} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-white text-lg flex items-center gap-2">
                            {c.name} <span className="text-xs text-slate-400 font-normal">({c.job} / {c.genderOrRace || t.unknown})</span>
                          </h4>
                          <p className="text-[10px] mt-1 font-bold">
                            {isAI ? <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded border border-purple-700/50">{t.aiPartner}</span> : <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-700/50">{t.player}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="bg-red-900/30 text-red-400 text-xs px-2 py-1 rounded font-bold border border-red-800/50">HP: {c.hp}</span>
                        <span className="bg-cyan-900/30 text-cyan-400 text-xs px-2 py-1 rounded font-bold border border-cyan-800/50">SAN: {c.san}</span>
                        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded">STR: {c.str}</span>
                        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded">DEX: {c.dex}</span>
                        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded">INT: {c.int}</span>
                        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded">CON: {c.con}</span>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-800/50 p-2 rounded">{c.personality}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="pt-4 border-t border-slate-700 shrink-0 mt-2">
              <button onClick={() => setShowStatusModal(false)} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold text-white shadow">{t.close}</button>
            </div>
          </div>
        </div>
      )}

      {showInventoryModal && joinedCharacter && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-amber-500/50 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4 flex flex-col">
            <h3 className="text-xl font-bold text-amber-400 border-b border-slate-700 pb-3">{t.invTitle}</h3>
            <p className="text-xs text-slate-300">
              {t.invDesc}
            </p>
            <textarea 
              readOnly
              value={activeRoom.inventories?.[joinedCharacter.id] || joinedCharacter.items || t.noItems} 
              className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:outline-none cursor-not-allowed"
            />
            <div className="pt-2">
              <button onClick={() => setShowInventoryModal(false)} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold text-white shadow">{t.close}</button>
            </div>
          </div>
        </div>
      )}

      {activeRoom.status === 'splitting' && isHost && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-blue-500/50 rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-xl font-bold text-blue-400">{t.teamTitle}</h3>
              <button onClick={generateSplitProposal} disabled={isGeneratingSplit} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-3 py-1.5 rounded font-bold shadow flex items-center gap-1 transition-colors">
                {isGeneratingSplit ? t.aiThinking : t.aiSuggest}
              </button>
            </div>
            <p className="text-xs text-slate-300">{t.teamDesc}</p>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {proposedTeams.length === 0 && isGeneratingSplit && (
                <div className="text-center py-10 text-indigo-400 font-bold animate-pulse">{t.aiGenerating}</div>
              )}
              {proposedTeams.map((team, tIdx) => (
                <div key={team.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4 shadow">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded">{t.team} {tIdx + 1}</span>
                    <button onClick={() => { const nt = [...proposedTeams]; nt.splice(tIdx, 1); setProposedTeams(nt); }} className="text-[10px] bg-red-900/50 text-red-300 px-3 py-1 rounded hover:bg-red-800">{t.delete}</button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">{t.actionDest}</label>
                      <input type="text" value={team.action} onChange={e => { const nt=[...proposedTeams]; nt[tIdx].action=e.target.value; setProposedTeams(nt); }} placeholder={t.actionEg} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-2">{t.members}</label>
                      <div className="flex flex-wrap gap-2">
                         {Object.values(activeRoom.joined_users || {}).map((charId: string) => {
                            const c = sc?.presetCharacters.find((pc: Character) => pc.id === charId);
                            if(!c) return null;
                            const isChecked = team.members.includes(charId);
                            return (
                              <label key={charId} className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded cursor-pointer border transition-colors ${isChecked ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}>
                                <input type="checkbox" checked={isChecked} onChange={(e) => {
                                  const nt = [...proposedTeams];
                                  if (e.target.checked) nt[tIdx].members.push(charId);
                                  else nt[tIdx].members = nt[tIdx].members.filter((id: string) => id !== charId);
                                  if (nt[tIdx].members.length > 0 && !nt[tIdx].members.includes(nt[tIdx].leader)) nt[tIdx].leader = nt[tIdx].members[0];
                                  setProposedTeams(nt);
                                }} className="hidden" />
                                {c.name}
                              </label>
                            )
                         })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!isGeneratingSplit && (
                <button onClick={() => setProposedTeams([...proposedTeams, { id: `team_${Date.now()}`, action: "", members: [], leader: "" }])} className="w-full bg-slate-800 border-2 border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 py-3 rounded-lg text-sm font-bold transition-colors">
                  {t.addTeamManual}
                </button>
              )}
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-700">
              <button onClick={cancelSplitting} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold text-white">{t.cancel}</button>
              <button onClick={finishSplitting} disabled={isGeneratingSplit} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold text-white shadow-lg shadow-emerald-900/50">{t.confirmTeam}</button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 shadow-md flex flex-col gap-2 relative">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <button onClick={leaveGame} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-bold shadow">{t.leave}</button>
            
            {isHost && activeRoom.status === 'playing' && !isScenarioEnded && (
              <button onClick={togglePauseRoom} className={`text-xs px-3 py-1.5 rounded font-bold shadow transition-colors ${activeRoom.is_paused ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                {activeRoom.is_paused ? t.resume : t.pause}
              </button>
            )}
            <button onClick={() => setShowSummaryModal(true)} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded font-bold shadow flex items-center gap-1">
              {t.summaryBtn}
            </button>
            <button onClick={() => setShowStatusModal(true)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded font-bold shadow flex items-center gap-1">
              {t.charStatusBtn}
            </button>
            
            <span className="text-xs text-slate-400 ml-2 flex items-center gap-1 hidden sm:flex">
              {t.spectators}: {spectatorCount}
            </span>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-blue-400 font-bold border border-blue-500/50 bg-blue-900/30 px-2 py-0.5 rounded flex items-center gap-1 mb-1">
              <span>{t.roomPrefix}: {sc?.title} ({t.about}{sc?.playTime || 60}{t.mins})</span>
              <span className="px-1 py-0.5 rounded text-white bg-slate-700 border border-slate-500">
                {rule === 'dnd' ? '🟥 D&D' : rule === 'coc_en' ? '🟦 CoC海外' : rule === 'sw25' ? '🟨 SW2.5' : rule === 'storytelling' ? '🟪 ストテリ' : '🟩 CoC日本'}
              </span>
              <span className="px-1 py-0.5 rounded text-white bg-slate-700 border border-slate-500">
                {t.difficulty}: {diffText}
              </span>
            </span>
            
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-1">
                {Object.entries(activeRoom.joined_users).map(([uid, cid]) => {
                  const c = sc?.presetCharacters.find((pc:any) => pc.id === cid);
                  const isUserAfk = activeRoom.afk_users?.includes(uid);
                  if (!c) return null;

                  const userLastMsg = [...messages].reverse().find(m => m.charName === c.name);
                  const msgTime = userLastMsg ? ((userLastMsg as any).createdAt || (userLastMsg as any).created_at) : null;
                  const lastActiveTime = msgTime ? new Date(msgTime).getTime() : now;
                  const isIdle = (now - lastActiveTime > fiveMinutes);

                  return (
                    <div key={uid} className={`relative flex items-center justify-center w-6 h-6 rounded-full border ${isUserAfk ? 'border-red-500 opacity-50' : 'border-slate-500'}`} title={c.name}>
                      <img src={c.imageUrl || DEFAULT_AVATAR} className="w-full h-full rounded-full object-cover" />
                      {isUserAfk && <span className="absolute -top-2 -right-2 text-[8px] bg-red-600 px-1 rounded font-bold">AFK</span>}
                      {isHost && isUserAfk && uid !== currentUser.id && (
                        <button onClick={() => toggleAFK(uid, true)} className="absolute -bottom-2 -right-1 text-[8px] bg-slate-800 text-white px-1 border border-slate-500 rounded z-10 hover:bg-slate-600">{t.removeAfk}</button>
                      )}
                      {isHost && isIdle && uid !== currentUser.id && (
                        <button onClick={() => kickUser(uid)} className="absolute -bottom-4 text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded shadow z-10 hover:bg-red-500 whitespace-nowrap">
                          {t.kick}
                        </button>
                      )}
                    </div>
                  );
                })}
                {aiPlayersList.map(c => (
                  <div key={c.id} className="relative flex items-center justify-center w-6 h-6 rounded-full border border-blue-500" title={c.name + " (AI)"}>
                    <img src={c.imageUrl || DEFAULT_AVATAR} className="w-full h-full rounded-full object-cover opacity-80" />
                    <span className="absolute -bottom-2 -right-1 text-[8px] bg-blue-600 text-white px-1 rounded">AI</span>
                  </div>
                ))}
              </div>
              
              {!isScenarioEnded && joinedCharacter && (
                <button onClick={() => toggleAFK(currentUser.id)} className={`text-[10px] px-2 py-1 rounded font-bold border transition-colors ml-2 ${isAfk ? 'bg-red-900/80 border-red-500 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}>
                  {isAfk ? t.afkOn : t.afkOff}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between w-full border-t border-slate-700/50 pt-2 mt-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              {joinedCharacter ? joinedCharacter.name : "👁️ " + t.spectators.replace('👁️ ', '')}
              {isSplitMode && myScene.id !== 'scene_main' && <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded-full">{myScene.name}{t.teamSuffix}</span>}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-1 justify-end">
            {joinedCharacter && visibility !== 'none' && (
              <div className="relative group flex items-center mr-2">
                <button onClick={openInventoryEditor} className="bg-amber-800/80 hover:bg-amber-700 text-amber-100 border border-amber-500/30 text-[10px] px-3 py-1.5 rounded font-bold shadow-lg flex items-center gap-1 transition-colors">
                  {t.invBtn}
                </button>
              </div>
            )}
            
            {joinedCharacter && (
              <div className="flex gap-1 items-center">
                <div className="bg-red-900/80 text-red-200 border border-red-500/50 text-[10px] px-2 py-1.5 rounded font-bold shadow-lg flex items-center mr-1">
                  ❤️ HP:{joinedCharacter.hp}
                </div>
                {rule === 'dnd' && (
                  <>
                    <button onClick={() => rollDice(joinedCharacter.str, "STR")} className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 STR</button>
                    <button onClick={() => rollDice(joinedCharacter.dex, "DEX")} className="bg-green-700 hover:bg-green-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 DEX</button>
                    <button onClick={() => rollDice(joinedCharacter.int, "INT")} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 INT</button>
                    <button onClick={() => rollDice(joinedCharacter.con, "CON")} className="bg-amber-700 hover:bg-amber-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 CON</button>
                  </>
                )}
                {(rule === 'coc_en' || rule === 'coc_jp') && (
                  <>
                    <button onClick={() => rollDice(joinedCharacter.san, "SAN", true)} className="bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 SAN({joinedCharacter.san})</button>
                    <button onClick={() => rollDice(joinedCharacter.str, "STR", false)} className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 STR({joinedCharacter.str})</button>
                    <button onClick={() => rollDice(joinedCharacter.dex, "DEX", false)} className="bg-green-700 hover:bg-green-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 DEX({joinedCharacter.dex})</button>
                    <button onClick={() => rollDice(joinedCharacter.int, "INT", false)} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 INT({joinedCharacter.int})</button>
                    <button onClick={() => rollDice(joinedCharacter.con, "CON", false)} className="bg-amber-700 hover:bg-amber-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 CON({joinedCharacter.con})</button>
                  </>
                )}
                {rule === 'sw25' && (
                  <>
                    <button onClick={() => rollDice(joinedCharacter.str, "STR")} className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 STR</button>
                    <button onClick={() => rollDice(joinedCharacter.dex, "DEX")} className="bg-green-700 hover:bg-green-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 DEX</button>
                    <button onClick={() => rollDice(joinedCharacter.int, "INT")} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 INT</button>
                    <button onClick={() => rollDice(joinedCharacter.con, "CON")} className="bg-amber-700 hover:bg-amber-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 CON</button>
                  </>
                )}
                {rule === 'storytelling' && (
                  <button onClick={() => rollDice(0, "行動")} className="bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-[10px] px-4 py-1.5 rounded font-bold shadow-lg">{t.conflictRoll}</button>
                )}
              </div>
            )}
            
            {isHost && isRecruiting && joinedCharacter && (
              <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-4 py-2 rounded animate-pulse ml-2 shadow-lg shadow-emerald-900/50">{t.startBtn}</button>
            )}
            
            {isHost && activeRoom.status === "playing" && !isScenarioEnded && !activeRoom.is_trial && (
              <div className="flex gap-2 ml-2">
                {(activeRoom.free_image_count || 0) < 3 && (
                  <>
                    <button onClick={() => handleGenerateImage("free")} disabled={isGeneratingImg} className="bg-purple-700 hover:bg-purple-600 disabled:bg-slate-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg transition">
                      {isGeneratingImg ? t.generatingImg : `${t.freeImgLeft}${3 - (activeRoom.free_image_count || 0)})`}
                    </button>
                    <button onClick={() => handleGenerateImage("premium")} disabled={isGeneratingImg} className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg transition">
                      {t.premiumImg}
                    </button>
                  </>
                )}
                {isSplitMode ? (
                  <button onClick={executeMergeAll} className="bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg">{t.mergeAll}</button>
                ) : (
                  <button onClick={startSplitting} className="bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg">{t.splitTeam}</button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* チャット表示エリア */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-scroll space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3 min-h-0 custom-scrollbar">
        {activeRoom.is_paused && (
          <div className="sticky top-0 z-10 bg-amber-900/90 text-amber-200 text-xs font-bold text-center py-1 rounded shadow mb-3 border border-amber-500">
            {t.pausedNotice}
          </div>
        )}
        
        {messages.filter((msg: Message) => {
          if (msg.type === "system" || msg.type === "image") return true;
          if (!isSplitMode) return msg.channel === chatTab;
          return (!msg.sceneId || msg.sceneId === 'scene_main' || msg.sceneId === myScene.id) && msg.channel === chatTab;
        }).map((msg: Message, index: number) => {
          const isMe = msg.sender === "player";
          const isAIPlayer = msg.sender === "ai_player";
          const isSystem = msg.type === "system" || msg.type === "image";
          
          const displayText = msg.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').replace(/\\n/g, '\n').trim();
          
          if (!displayText && !isSystem && !msg.imageUrl) return null;
          
          let messageAvatar = "";
          if (!isSystem && sc?.presetCharacters) {
              const character = sc.presetCharacters.find((c: Character) => c.name === msg.charName);
              if (character && character.imageUrl) {
                  messageAvatar = character.imageUrl;
              }
          }

          let bgColor = isMe ? "bg-blue-600/90 border border-blue-500/50" : (isAIPlayer ? "bg-indigo-600/80 border-l-4 border-indigo-400" : "bg-slate-700/90 border-l-4 border-emerald-500");
          if (isSystem) bgColor = "bg-slate-900/80 border border-slate-700 text-center";

          return (
            <div key={index} className={`flex w-full ${isSystem ? 'justify-center' : (isMe ? 'justify-end' : 'justify-start')}`}>
              {!isMe && !isSystem && (
                <div className="mr-2 flex-shrink-0 flex items-end">
                    {messageAvatar ? (
                        <img src={messageAvatar} alt={msg.charName} className="w-10 h-10 rounded-full object-cover border border-slate-600 bg-slate-800 shadow-sm" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 border border-slate-600 font-bold shadow-sm">
                            {(msg.charName || "GM").charAt(0)}
                        </div>
                    )}
                </div>
              )}
              <div className={`p-3 rounded-2xl max-w-[80%] ${bgColor} text-white shadow-md`}>
                {!isSystem && (
                  <span className="text-[10px] text-slate-300 block mb-1 font-bold">
                    {msg.charName || (isMe && joinedCharacter ? joinedCharacter.name : (msg.sender === "gm" ? "AI GM" : "SYSTEM"))} 
                    {msg.type && ` [${msg.type.toUpperCase()}]`}
                  </span>
                )}
                {displayText && <p className={`text-sm whitespace-pre-wrap leading-relaxed ${isSystem && 'text-xs text-slate-300'}`}>{displayText}</p>}
                {msg.type === 'image' && msg.imageUrl && chatTab === 'story' && (
                  <div className="mt-2 border border-slate-600 rounded-lg overflow-hidden bg-black/50">
                    <img src={msg.imageUrl} alt="Generated Scene" className="w-full h-auto max-h-64 object-contain" />
                  </div>
                )}
              </div>
              {isMe && !isSystem && (
                <div className="ml-2 flex-shrink-0 flex items-end">
                    {messageAvatar ? (
                        <img src={messageAvatar} alt={msg.charName} className="w-10 h-10 rounded-full object-cover border border-slate-600 bg-slate-800 shadow-sm" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 border border-slate-600 font-bold shadow-sm">
                            {(msg.charName || "ME").charAt(0)}
                        </div>
                    )}
                </div>
              )}
            </div>
          )
        })}
        {isLoading && <div className="text-xs text-emerald-400 animate-pulse font-bold bg-slate-900/50 w-fit px-3 py-1 rounded">{t.aiThinkingStatus}</div>}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2 shadow-lg">
        {isRecruiting && (
          <div className="bg-blue-900/40 border border-blue-500/50 rounded-lg p-2 text-center text-blue-300 text-xs font-bold mb-1">
            {t.waitingNotice}
          </div>
        )}

        {isScenarioEnded && (
          activeRoom.status === 'finished' ? (
            <div className="bg-amber-900/50 border border-amber-500 rounded p-2 flex justify-between items-center mb-2">
              <span className="text-amber-400 text-sm font-bold">{t.evalModeAI}</span>
              <button onClick={() => setCurrentView("evaluation")} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded shadow">
                {t.evalExit}
              </button>
            </div>
          ) : isHost ? (
            <button onClick={endGame} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl shadow-lg animate-pulse text-sm mb-2">
              {t.evalTransition}
            </button>
          ) : (
            <div className="bg-amber-900/50 border border-amber-500 rounded p-2 text-center text-amber-400 text-sm font-bold mb-2">
              {t.evalWait}
            </div>
          )
        )}

        {joinedCharacter ? (
          activeRoom.status === 'finished' ? (
            <div className="flex gap-2 pt-1">
              <div className="flex items-center justify-center bg-amber-600/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-lg text-xs font-bold">
                {t.postGameChat}
              </div>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} 
                placeholder={t.postGamePlaceholder} 
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition" />
              <button onClick={handleSend} disabled={isLoading} className="text-white px-6 py-2 rounded-lg text-sm font-bold shadow transition bg-amber-600 hover:bg-amber-500 disabled:opacity-50">{t.send}</button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 border-b border-slate-700 pb-2 items-center overflow-x-auto whitespace-nowrap">
                <button onClick={() => handleTabClick("story")} className={`relative text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "story" ? "bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500" : "text-slate-400 hover:text-white"}`}>
                  {isSplitMode && myScene.id !== 'scene_main' ? t.tabTeamAction : t.tabAction}
                  {unreadIndicators.story && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                </button>
                <button onClick={() => handleTabClick("consult")} className={`relative text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "consult" ? "bg-indigo-600/20 text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"}`}>
                  {t.tabConsult}
                  {unreadIndicators.consult && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                </button>
                <button onClick={() => handleTabClick("gm")} className={`relative text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "gm" ? "bg-amber-600/20 text-amber-400 border-b-2 border-amber-500" : "text-slate-400 hover:text-white"}`}>
                  {t.tabGM}
                  {unreadIndicators.gm && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                </button>

                {chatTab === "consult" && !isScenarioEnded && (
                  <label className="ml-auto text-[10px] flex items-center gap-1.5 text-indigo-300 bg-slate-900 px-2 py-1 rounded border border-slate-600 cursor-pointer hover:bg-slate-800 transition">
                    <input type="checkbox" checked={consultWithAI} onChange={(e) => setConsultWithAI(e.target.checked)} className="accent-indigo-500 w-3 h-3" />
                    {t.askAiPartner}
                  </label>
                )}
              </div>
              
              <div className="flex gap-2 pt-1">
                {isSplitMode && myScene.id !== 'scene_main' && !myScene.isMerged && (currentUser?.id === myScene.leaderId || activeRoom.host_id === currentUser?.id) && (
                  <button onClick={mergeTeam} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg text-xs font-bold shadow-lg flex-shrink-0">
                    {t.mergeAll}
                  </button>
                )}
                
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} 
                  placeholder={activeRoom.is_paused ? t.inputPaused : (chatTab === "story" ? t.inputAction : (chatTab === "consult" ? (consultWithAI && !isScenarioEnded ? t.inputConsultAI : t.inputConsultPL) : t.inputGM))} 
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition" 
                  disabled={isChatDisabled || activeRoom.is_paused}
                />
                <button onClick={handleSend} disabled={isChatDisabled || activeRoom.is_paused || !input.trim()} className={`text-white px-6 py-2 rounded-lg text-sm font-bold shadow transition ${chatTab === "story" ? "bg-emerald-600 hover:bg-emerald-500" : (chatTab === "consult" ? "bg-indigo-600 hover:bg-indigo-500" : "bg-amber-600 hover:bg-amber-500")} disabled:opacity-50`}>{t.send}</button>
              </div>
            </>
          )
        ) : (
          <div className="text-center p-2 text-slate-400 text-sm font-bold">{t.spectatorNotice}</div>
        )}
      </div>
    </div>
  );
}