import React, { useState, useEffect, useRef } from "react";
import { ViewState, UserProfile, Room, Character, Scene, Message, ChatTab } from "../../types";

type Props = {
  activeRoom: Room;
  myScene: Scene;
  currentUser: UserProfile;
  joinedCharacter: Character | null;
  leaveGame: () => Promise<void>;
  setReportTarget: React.Dispatch<React.SetStateAction<{
    type: 'user' | 'scenario' | 'room';
    id: string;
    name: string;
    roomId?: string;
    scenarioId?: string;
    scenarioName?: string;
    availableUsers?: { id: string, name: string }[];
  } | null>>;
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
  generateSceneImage: (promptText: string) => Promise<void>;
  proposedTeams: {id: string, action: string, members: string[], leader: string}[];
  setProposedTeams: React.Dispatch<React.SetStateAction<{id: string, action: string, members: string[], leader: string}[]>>;
  isGeneratingSplit: boolean;
  generateSplitProposal: () => Promise<void>;
  finishSplitting: () => Promise<void>;
  cancelSplitting: () => Promise<void>;
  togglePauseRoom: () => Promise<void>;
  toggleAFK: (userId: string, forceRemove?: boolean) => Promise<void>;
  triggerAutoAction: () => Promise<void>;
};

export default function GameView({
  activeRoom, myScene, currentUser, joinedCharacter, leaveGame, setReportTarget, rollDice,
  startGame, startSplitting, isSplitMode, chatTab, messages, isLoading, isScenarioEnded,
  setCurrentView, endGame, input, setInput, handleSend, handleTabClick, unreadIndicators,
  consultWithAI, setConsultWithAI, isChatDisabled, mergeTeam, executeMergeAll, generateSceneImage,
  proposedTeams, setProposedTeams, isGeneratingSplit, generateSplitProposal, finishSplitting, cancelSplitting,
  togglePauseRoom, toggleAFK, triggerAutoAction
}: Props) {
  const isRecruiting = activeRoom.status === 'recruiting';
  const isHost = currentUser?.id === activeRoom.host_id || currentUser?.handleName === activeRoom.host_name;
  const imageCount = messages.filter(m => m.type === 'image').length;
  
  const [showImagePromptModal, setShowImagePromptModal] = useState(false);
  const [imagePromptText, setImagePromptText] = useState("");
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  const handleGenerateImage = async () => {
    if (!imagePromptText.trim() || imageCount >= 3) return;
    setIsGeneratingImg(true);
    await generateSceneImage(imagePromptText);
    setIsGeneratingImg(false);
    setShowImagePromptModal(false);
    setImagePromptText("");
  };

  const rule = activeRoom.rule || "coc_jp";
  const isAfk = activeRoom.afk_users?.includes(currentUser.id);

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 min-h-0 relative">
      
      {showSummaryModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <h3 className="text-xl font-bold text-amber-400 border-b border-slate-700 pb-3">📖 これまでのあらすじ</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
              {activeRoom.current_summary || "まだあらすじは記録されていません。（一定の会話が進むと自動で生成されます）"}
            </div>
            <button onClick={() => setShowSummaryModal(false)} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold text-white mt-2">閉じる</button>
          </div>
        </div>
      )}

      {activeRoom.status === 'splitting' && isHost && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-blue-500/50 rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-xl font-bold text-blue-400">👥 チーム編成</h3>
              <button onClick={generateSplitProposal} disabled={isGeneratingSplit} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-3 py-1.5 rounded font-bold shadow flex items-center gap-1 transition-colors">
                {isGeneratingSplit ? "⏳ AI考案中..." : "✨ AIに再提案させる"}
              </button>
            </div>
            <p className="text-xs text-slate-300">AIが提案したチーム構成を編集し、完了を押してください。</p>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {proposedTeams.length === 0 && isGeneratingSplit && (
                <div className="text-center py-10 text-indigo-400 font-bold animate-pulse">AIが最適なチーム構成を考案しています...</div>
              )}
              {proposedTeams.map((team, tIdx) => (
                <div key={team.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4 shadow">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded">チーム {tIdx + 1}</span>
                    <button onClick={() => { const nt = [...proposedTeams]; nt.splice(tIdx, 1); setProposedTeams(nt); }} className="text-[10px] bg-red-900/50 text-red-300 px-3 py-1 rounded hover:bg-red-800">削除</button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">行動・目的地</label>
                      <input type="text" value={team.action} onChange={e => { const nt=[...proposedTeams]; nt[tIdx].action=e.target.value; setProposedTeams(nt); }} placeholder="例：2階の書庫を調べる" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-2">メンバー</label>
                      <div className="flex flex-wrap gap-2">
                         {Object.values(activeRoom.joined_users || {}).map((charId: string) => {
                            const c = activeRoom.scenario?.presetCharacters.find((pc: Character) => pc.id === charId);
                            if(!c) return null;
                            const isChecked = team.members.includes(charId);
                            return (
                              <label key={charId} className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded cursor-pointer border transition-colors ${isChecked ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}>
                                <input type="checkbox" checked={isChecked} onChange={(e) => {
                                  const nt = [...proposedTeams];
                                  if (e.target.checked) nt[tIdx].members.push(charId);
                                  else nt[tIdx].members = nt[tIdx].members.filter(id => id !== charId);
                                  if (nt[tIdx].members.length > 0 && !nt[tIdx].members.includes(nt[tIdx].leader)) nt[tIdx].leader = nt[tIdx].members[0];
                                  setProposedTeams(nt);
                                }} className="hidden" />
                                {c.name}
                              </label>
                            )
                         })}
                      </div>
                    </div>
                    {team.members.length > 0 && !team.members.includes(joinedCharacter?.id || "") && (
                       <div className="bg-amber-900/20 border border-amber-900/50 p-2 rounded">
                         <label className="text-[10px] text-amber-400 block mb-1">リーダー (システム代表者を選択)</label>
                         <div className="flex gap-4">
                           {team.members.map(mId => {
                             const c = activeRoom.scenario?.presetCharacters.find((pc: Character) => pc.id === mId);
                             return <label key={mId} className="flex items-center gap-1 text-xs text-amber-100 cursor-pointer"><input type="radio" checked={team.leader === mId} onChange={() => { const nt=[...proposedTeams]; nt[tIdx].leader=mId; setProposedTeams(nt); }} className="accent-amber-500" /> {c?.name}</label>
                           })}
                         </div>
                       </div>
                    )}
                  </div>
                </div>
              ))}
              
              {!isGeneratingSplit && (
                <button onClick={() => setProposedTeams([...proposedTeams, { id: `team_${Date.now()}`, action: "", members: [], leader: "" }])} className="w-full bg-slate-800 border-2 border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 py-3 rounded-lg text-sm font-bold transition-colors">
                  ＋ 手動でチームを追加する
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-700">
              <button onClick={cancelSplitting} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold text-white">キャンセル</button>
              <button onClick={finishSplitting} disabled={isGeneratingSplit} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold text-white shadow-lg shadow-emerald-900/50">編成を確定して再開する</button>
            </div>
          </div>
        </div>
      )}

      {activeRoom.status === 'splitting' && !isHost && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl text-center">
            <h3 className="text-lg font-bold text-blue-400 mb-2 animate-pulse">ホストがチーム分けを行っています...</h3>
            <p className="text-xs text-slate-400">AIが最適なチーム構成を考案し、ホストが確認中です。</p>
          </div>
        </div>
      )}

      {showImagePromptModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-purple-500/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-purple-400 mb-4">🖼️ 情景画像を生成 (残り {3 - imageCount}回)</h3>
            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-1">現在の状況を説明してください（日本語でOK）</label>
              <textarea 
                value={imagePromptText} 
                onChange={e => setImagePromptText(e.target.value)} 
                placeholder="例：薄暗い廃病院の廊下。壁には血文字が書かれており、奥から這い寄る影が見える。"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-24"
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowImagePromptModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold text-white">キャンセル</button>
              <button onClick={handleGenerateImage} disabled={!imagePromptText.trim() || isGeneratingImg} className="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded text-sm font-bold text-white shadow-lg disabled:opacity-50">
                {isGeneratingImg ? "⏳ 生成中..." : "生成して皆に共有する"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 shadow-md flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <button onClick={leaveGame} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-bold shadow">🚪 離脱 / 終了</button>
            
            {isHost && activeRoom.status === 'playing' && !isScenarioEnded && (
              <button onClick={togglePauseRoom} className={`text-xs px-3 py-1.5 rounded font-bold shadow transition-colors ${activeRoom.is_paused ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                {activeRoom.is_paused ? "▶️ セッション再開" : "⏸️ 中断(セーブ)"}
              </button>
            )}
            <button onClick={() => setShowSummaryModal(true)} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded font-bold shadow">📖 あらすじ</button>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-blue-400 font-bold border border-blue-500/50 bg-blue-900/30 px-2 py-0.5 rounded flex items-center gap-1 mb-1">
              <span>ROOM: {activeRoom.scenario?.title} (約{activeRoom.scenario?.playTime || 60}分)</span>
              <span className="px-1 py-0.5 rounded text-white bg-slate-700 border border-slate-500">
                {rule === 'dnd' ? '🟥 D&D' : rule === 'coc_en' ? '🟦 CoC海外版' : rule === 'sw25' ? '🟨 SW2.5' : rule === 'storytelling' ? '🟪 ストテリ' : '🟩 CoC日本卓'}
              </span>
            </span>
            
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-1">
                {Object.entries(activeRoom.joined_users).map(([uid, cid]) => {
                  const c = activeRoom.scenario?.presetCharacters.find(pc => pc.id === cid);
                  const isUserAfk = activeRoom.afk_users?.includes(uid);
                  if (!c) return null;
                  return (
                    <div key={uid} className={`relative flex items-center justify-center w-6 h-6 rounded-full border ${isUserAfk ? 'border-red-500 opacity-50' : 'border-slate-500'}`} title={c.name}>
                      <img src={c.imageUrl || DEFAULT_AVATAR} className="w-full h-full rounded-full object-cover" />
                      {isUserAfk && <span className="absolute -top-2 -right-2 text-[8px] bg-red-600 px-1 rounded font-bold">AFK</span>}
                      {isHost && isUserAfk && uid !== currentUser.id && (
                        <button onClick={() => toggleAFK(uid, true)} className="absolute -bottom-2 -right-1 text-[8px] bg-slate-800 text-white px-1 border border-slate-500 rounded z-10 hover:bg-slate-600">解除</button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {!isScenarioEnded && joinedCharacter && (
                <button onClick={() => toggleAFK(currentUser.id)} className={`text-[10px] px-2 py-1 rounded font-bold border transition-colors ml-2 ${isAfk ? 'bg-red-900/80 border-red-500 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}>
                  {isAfk ? "☕ 離席中(解除)" : "☕ 離席(AFK)"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 justify-between w-full border-t border-slate-700/50 pt-2 mt-1">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            {joinedCharacter ? joinedCharacter.name : "👁️ 観戦者"}
            {isSplitMode && myScene.id !== 'scene_main' && <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded-full">{myScene.name} 班</span>}
          </span>
          <div className="flex flex-wrap items-center gap-1 justify-end">
            {joinedCharacter && (
              <div className="flex gap-1 items-center">
                <div className="bg-red-900/80 text-red-200 border border-red-500/50 text-[10px] px-2 py-1.5 rounded font-bold shadow-lg flex items-center mr-1">
                  ❤️ HP:{joinedCharacter.hp}
                </div>
                {rule === 'dnd' && (
                  <>
                    <button onClick={() => rollDice(joinedCharacter.str, "STR")} className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 STR(1d20)</button>
                    <button onClick={() => rollDice(joinedCharacter.dex, "DEX")} className="bg-green-700 hover:bg-green-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 DEX(1d20)</button>
                    <button onClick={() => rollDice(joinedCharacter.int, "INT")} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 INT(1d20)</button>
                    <button onClick={() => rollDice(joinedCharacter.con, "CON")} className="bg-amber-700 hover:bg-amber-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 CON(1d20)</button>
                  </>
                )}
                {(rule === 'coc_en' || rule === 'coc_jp') && (
                  <>
                    <button onClick={() => rollDice(joinedCharacter.san, "SAN", true)} className="bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 SAN({joinedCharacter.san}%)</button>
                    <button onClick={() => rollDice(joinedCharacter.str, "STR", false)} className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 STR({joinedCharacter.str})</button>
                    <button onClick={() => rollDice(joinedCharacter.dex, "DEX", false)} className="bg-green-700 hover:bg-green-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 DEX({joinedCharacter.dex})</button>
                    <button onClick={() => rollDice(joinedCharacter.int, "INT", false)} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 INT({joinedCharacter.int})</button>
                    <button onClick={() => rollDice(joinedCharacter.con, "CON", false)} className="bg-amber-700 hover:bg-amber-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 CON({joinedCharacter.con})</button>
                  </>
                )}
                {rule === 'sw25' && (
                  <>
                    <button onClick={() => rollDice(joinedCharacter.str, "STR")} className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 STR(2d6)</button>
                    <button onClick={() => rollDice(joinedCharacter.dex, "DEX")} className="bg-green-700 hover:bg-green-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 DEX(2d6)</button>
                    <button onClick={() => rollDice(joinedCharacter.int, "INT")} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 INT(2d6)</button>
                    <button onClick={() => rollDice(joinedCharacter.con, "CON")} className="bg-amber-700 hover:bg-amber-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 CON(2d6)</button>
                  </>
                )}
                {rule === 'storytelling' && (
                  <button onClick={() => rollDice(0, "行動")} className="bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-[10px] px-4 py-1.5 rounded font-bold shadow-lg">🎲 行動・葛藤判定 (1d6)</button>
                )}
              </div>
            )}
            {isHost && isRecruiting && joinedCharacter && (
              <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-4 py-2 rounded animate-pulse ml-2 shadow-lg shadow-emerald-900/50">▶ ゲーム開始</button>
            )}
            {isHost && activeRoom.status === "playing" && !isScenarioEnded && (
               <>
                 {imageCount < 3 && (
                   <button onClick={() => setShowImagePromptModal(true)} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg ml-2">🖼️ 情景生成</button>
                 )}
                 {isSplitMode ? (
                   <button onClick={executeMergeAll} className="bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg ml-2">🚪 全員合流</button>
                 ) : (
                   <button onClick={startSplitting} className="bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg ml-2">👥 チーム分け</button>
                 )}
               </>
            )}
          </div>
        </div>
      </header>

      <div ref={chatContainerRef} className="flex-1 overflow-y-scroll space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3 min-h-0 custom-scrollbar">
        {activeRoom.is_paused && (
          <div className="sticky top-0 z-10 bg-amber-900/90 text-amber-200 text-xs font-bold text-center py-1 rounded shadow mb-3 border border-amber-500">
            ⏸️ 現在セッションは中断（セーブ）されています。AIは停止中です。
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
          
          const displayText = msg.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim();
          if (!displayText && !isSystem && !msg.imageUrl) return null;
          
          let messageAvatar = "";
          if (!isSystem && activeRoom.scenario?.presetCharacters) {
              const character = activeRoom.scenario.presetCharacters.find((c: Character) => c.name === msg.charName);
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
                {msg.type === 'image' && msg.imageUrl && (
                  <div className="mt-2 border border-slate-600 rounded-lg overflow-hidden bg-black/50">
                    <img src={msg.imageUrl} alt="生成された情景" className="w-full h-auto max-h-64 object-contain" />
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
        {isLoading && <div className="text-xs text-emerald-400 animate-pulse font-bold bg-slate-900/50 w-fit px-3 py-1 rounded">AI思考中...</div>}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2 shadow-lg">
        {isRecruiting && (
          <div className="bg-blue-900/40 border border-blue-500/50 rounded-lg p-2 text-center text-blue-300 text-xs font-bold mb-1">
            📢 現在はプレイヤー準備・待機中です。「▶ ゲーム開始」ボタンを押すまでAI GMは起動しません。
          </div>
        )}

        {isScenarioEnded && (
          activeRoom.status === 'finished' ? (
            <div className="bg-amber-900/50 border border-amber-500 rounded p-2 flex justify-between items-center mb-2">
              <span className="text-amber-400 text-sm font-bold">🎉 感想戦モード（AIは停止しています）</span>
              <button onClick={() => setCurrentView("evaluation")} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded shadow">
                評価して退出する
              </button>
            </div>
          ) : isHost ? (
            <button onClick={endGame} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl shadow-lg animate-pulse text-sm mb-2">
              🎉 セッション完了！感想戦モードへ移行する
            </button>
          ) : (
            <div className="bg-amber-900/50 border border-amber-500 rounded p-2 text-center text-amber-400 text-sm font-bold mb-2">
              🎉 エンディング到達！ホストの完了操作をお待ちください...
            </div>
          )
        )}

        {isSplitMode && myScene.isMerged && activeRoom.status === 'playing' && (
          <div className="bg-indigo-900/50 border border-indigo-500 rounded p-2 text-center text-indigo-300 text-sm font-bold mb-2">
            ⏳ {myScene.name}チームの行動を終了し、他チームの合流を待っています... (相談チャットのみ使用可能)
          </div>
        )}

        {joinedCharacter ? (
          activeRoom.status === 'finished' ? (
            <div className="flex gap-2 pt-1">
              <div className="flex items-center justify-center bg-amber-600/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-lg text-xs font-bold">
                🗣️ 感想戦
              </div>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} 
                placeholder="他のプレイヤーとセッションの感想を語り合いましょう！（AIは反応しません）" 
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition" />
              <button onClick={handleSend} disabled={isLoading} className="text-white px-6 py-2 rounded-lg text-sm font-bold shadow transition bg-amber-600 hover:bg-amber-500 disabled:opacity-50">送信</button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 border-b border-slate-700 pb-2 items-center overflow-x-auto whitespace-nowrap">
                <button onClick={() => handleTabClick("story")} className={`relative text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "story" ? "bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500" : "text-slate-400 hover:text-white"}`}>
                  📖 {isSplitMode && myScene.id !== 'scene_main' ? 'チーム行動宣言 (GMへ)' : '行動宣言 (GMへ)'}
                  {unreadIndicators.story && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                </button>
                <button onClick={() => handleTabClick("consult")} className={`relative text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "consult" ? "bg-indigo-600/20 text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"}`}>
                  🗣️ 相談 (PL・AI相棒へ)
                  {unreadIndicators.consult && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                </button>
                <button onClick={() => handleTabClick("gm")} className={`relative text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "gm" ? "bg-amber-600/20 text-amber-400 border-b-2 border-amber-500" : "text-slate-400 hover:text-white"}`}>
                  ⚙️ GMへのメタ質問
                  {unreadIndicators.gm && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                </button>

                {chatTab === "consult" && !isScenarioEnded && (
                  <label className="ml-auto text-[10px] flex items-center gap-1.5 text-indigo-300 bg-slate-900 px-2 py-1 rounded border border-slate-600 cursor-pointer hover:bg-slate-800 transition">
                    <input type="checkbox" checked={consultWithAI} onChange={(e) => setConsultWithAI(e.target.checked)} className="accent-indigo-500 w-3 h-3" />
                    AI相棒にも意見を求める
                  </label>
                )}
              </div>
              
              <div className="flex gap-2 pt-1">
                {isSplitMode && myScene.id !== 'scene_main' && !myScene.isMerged && (currentUser?.id === myScene.leaderId || activeRoom.host_id === currentUser?.id) && (
                  <button onClick={mergeTeam} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg text-xs font-bold shadow-lg flex-shrink-0">
                    🚪 このチームだけ合流する
                  </button>
                )}
                
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} 
                  placeholder={activeRoom.is_paused ? "中断中のため入力できません" : (chatTab === "story" ? "例：鍵穴を覗き込みます。" : (chatTab === "consult" ? (consultWithAI && !isScenarioEnded ? "例：ねえ、どうしようか？ (AI相棒が返答します)" : "例：PL同士の作戦会議メモ (AIは反応しません)") : "例：今の状況でもう一度目星は振れますか？"))} 
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition" 
                  disabled={isChatDisabled || activeRoom.is_paused}
                />
                <button onClick={handleSend} disabled={isChatDisabled || activeRoom.is_paused || !input.trim()} className={`text-white px-6 py-2 rounded-lg text-sm font-bold shadow transition ${chatTab === "story" ? "bg-emerald-600 hover:bg-emerald-500" : (chatTab === "consult" ? "bg-indigo-600 hover:bg-indigo-500" : "bg-amber-600 hover:bg-amber-500")} disabled:opacity-50`}>送信</button>
              </div>
            </>
          )
        ) : (
          <div className="text-center p-2 text-slate-400 text-sm font-bold">あなたは観戦モードです（チャットは行えません）</div>
        )}
      </div>
    </div>
  );
}