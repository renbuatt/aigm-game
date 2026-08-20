import React, { useEffect, useState } from "react";
import { Room, Scene, UserProfile, Character, Message, ChatTab } from "../../types";

type Props = {
  activeRoom: Room;
  myScene: Scene;
  currentUser: UserProfile;
  joinedCharacter: Character | null;
  leaveGame: () => Promise<void>;
  setReportTarget: (target: any) => void;
  rollDice: (targetValue: number, label: string, is1d100?: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  startSplitting: () => Promise<void>;
  isSplitMode: boolean;
  chatTab: ChatTab;
  messages: Message[];
  isLoading: boolean;
  isScenarioEnded: boolean;
  setCurrentView: (view: any) => void;
  endGame: () => Promise<void>;
  input: string;
  setInput: (val: string) => void;
  handleSend: () => Promise<void>;
  handleTabClick: (tab: ChatTab) => void;
  unreadIndicators: { story: boolean, consult: boolean, gm: boolean };
  consultWithAI: boolean;
  setConsultWithAI: (val: boolean) => void;
  isChatDisabled: boolean;
  mergeTeam: () => Promise<void>;
  executeMergeAll: () => Promise<void>;
  generateSceneImage: (type: 'free'|'premium') => Promise<void>;
  proposedTeams: any[];
  setProposedTeams: (val: any[]) => void;
  isGeneratingSplit: boolean;
  generateSplitProposal: () => Promise<void>;
  finishSplitting: () => Promise<void>;
  cancelSplitting: () => Promise<void>;
  togglePauseRoom: () => Promise<void>;
  toggleAFK: (uid: string, forceRemove?: boolean) => Promise<void>;
  triggerAutoAction: () => Promise<void>;
  updateInventory: (val: string) => Promise<void>;
  openRoomConfigModal: (scenario: any) => void;
  aiPlayersList: Character[];
  saveToArchive: (silent?: boolean) => Promise<void>;
  kickUser: (uid: string) => Promise<void>;
};

export default function GameView({
  activeRoom, myScene, currentUser, joinedCharacter, leaveGame, setReportTarget, rollDice, startGame, startSplitting,
  isSplitMode, chatTab, messages, isLoading, isScenarioEnded, setCurrentView, endGame, input, setInput, handleSend,
  handleTabClick, unreadIndicators, consultWithAI, setConsultWithAI, isChatDisabled, mergeTeam, executeMergeAll,
  generateSceneImage, proposedTeams, setProposedTeams, isGeneratingSplit, generateSplitProposal, finishSplitting,
  cancelSplitting, togglePauseRoom, toggleAFK, triggerAutoAction, updateInventory, openRoomConfigModal, aiPlayersList,
  saveToArchive, kickUser
}: Props) {
  
  const [showInventory, setShowInventory] = useState(false);
  const [localInventory, setLocalInventory] = useState("");
  const isHost = activeRoom.host_id === currentUser.id;
  const isRecruiting = activeRoom.status === 'recruiting';

  // 自動スクロール用
  const chatBottomRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (joinedCharacter) {
      setLocalInventory(activeRoom.inventories?.[currentUser.id] || joinedCharacter.items || "");
    }
  }, [joinedCharacter, activeRoom.inventories, currentUser.id]);

  const handleInventorySave = () => {
    updateInventory(localInventory);
    setShowInventory(false);
  };

  const getFilteredMessages = () => {
    return messages.filter(m => {
      if (m.channel === "system") return true;
      if (m.sceneId && m.sceneId !== 'scene_main' && m.sceneId !== myScene.id) return false;
      return m.channel === chatTab;
    });
  };

  // 5分放置キック用の現在時刻（10秒ごとに再計算）
  const [now, setNow] = useState(new Date().getTime());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().getTime()), 10000);
    return () => clearInterval(timer);
  }, []);
  const fiveMinutes = 5 * 60 * 1000;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900">
      {/* ヘッダー */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-emerald-400 line-clamp-1">{activeRoom.scenario?.title}</h2>
          <div className="flex gap-2">
            <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">ID: {activeRoom.id.substring(0,6)}</span>
            {isSplitMode && <span className="text-xs bg-indigo-900/80 px-3 py-1 rounded text-indigo-300 font-bold border border-indigo-500/50">📍 {myScene.name}</span>}
          </div>
        </div>
        <div className="flex gap-3">
          {isHost && isRecruiting && (
            <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-6 py-2 rounded-lg font-bold animate-pulse shadow-lg">▶ セッションを開始する</button>
          )}
          {isHost && !isRecruiting && !isScenarioEnded && (
            <button onClick={togglePauseRoom} className={`text-sm px-4 py-2 rounded-lg font-bold shadow transition-colors ${activeRoom.is_paused ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-600 hover:bg-slate-500'}`}>
              {activeRoom.is_paused ? '▶ 再開する' : '⏸️ セッションを中断'}
            </button>
          )}
          <button onClick={() => setReportTarget({ roomId: activeRoom.id, availableUsers: Object.keys(activeRoom.joined_users||{}).filter(id=>id!==currentUser.id).map(id=>({id, name: activeRoom.scenario?.presetCharacters.find(c=>c.id===activeRoom.joined_users![id])?.name || "不明"})) })} className="text-sm text-slate-400 hover:text-red-400 px-2">🚨 通報</button>
          <button onClick={leaveGame} className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow transition-colors ml-2">🚪 退出</button>
        </div>
      </header>

      {/* メインエリア */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側：チャットエリア */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-700 relative">
          
          {/* タブ */}
          <div className="flex shrink-0 bg-slate-900 border-b border-slate-800 p-2 gap-2">
            <button onClick={() => handleTabClick('story')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${chatTab === 'story' ? 'bg-slate-800 border-t-2 border-emerald-500 text-emerald-400 shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>
              📖 本編 {unreadIndicators.story && <span className="ml-2 w-2.5 h-2.5 inline-block bg-red-500 rounded-full animate-ping"></span>}
            </button>
            <button onClick={() => handleTabClick('consult')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${chatTab === 'consult' ? 'bg-slate-800 border-t-2 border-blue-500 text-blue-400 shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>
              💬 相談(秘匿) {unreadIndicators.consult && <span className="ml-2 w-2.5 h-2.5 inline-block bg-red-500 rounded-full animate-ping"></span>}
            </button>
            <button onClick={() => handleTabClick('gm')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${chatTab === 'gm' ? 'bg-slate-800 border-t-2 border-amber-500 text-amber-400 shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>
              ⚙️ GM質問 {unreadIndicators.gm && <span className="ml-2 w-2.5 h-2.5 inline-block bg-red-500 rounded-full animate-ping"></span>}
            </button>
          </div>

          {/* ログ */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-slate-900/50">
            {getFilteredMessages().map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.sender === "player" ? "items-end" : "items-start"}`}>
                {m.sender !== "system" && (
                  <span className="text-xs text-slate-400 mb-1 ml-1 mr-1">
                    {m.charName || (m.sender === "gm" ? "GM" : "")}
                  </span>
                )}
                <div className={`p-3.5 md:p-4 rounded-2xl max-w-[90%] md:max-w-[85%] shadow-md leading-relaxed ${
                  m.sender === "system" 
                    ? "bg-slate-800/80 text-slate-300 text-xs md:text-sm border border-slate-700 w-full text-center my-2" :
                  m.type === "image" 
                    ? "bg-slate-800 border border-slate-700 rounded-tl-sm" :
                  m.sender === "player" 
                    ? "bg-emerald-900/40 text-emerald-50 border border-emerald-700/50 rounded-tr-sm" :
                  "bg-slate-800 text-slate-200 border border-slate-600 rounded-tl-sm"
                }`}>
                  {m.type === "image" && m.imageUrl ? (
                    <div className="flex flex-col items-center">
                      <img src={m.imageUrl} className="rounded-lg max-w-full h-auto mb-3 shadow-lg border border-slate-700" alt="情景画像" />
                      <p className="text-xs text-slate-400 whitespace-pre-wrap text-center w-full">{m.text}</p>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-[15px]">{m.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-slate-800 border border-slate-600 p-4 rounded-2xl rounded-tl-sm shadow-md animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">AI GMが思考中...</p>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* 入力欄 */}
          {!isScenarioEnded && joinedCharacter && (
            <div className="p-4 bg-slate-800 shrink-0 border-t border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              {chatTab === 'consult' && (
                <div className="flex justify-end mb-2">
                  <label className="text-xs md:text-sm text-slate-300 flex items-center gap-2 cursor-pointer hover:text-white transition">
                    <input type="checkbox" checked={consultWithAI} onChange={e=>setConsultWithAI(e.target.checked)} className="rounded bg-slate-900 border-slate-600 text-blue-500 focus:ring-blue-500 w-4 h-4" />
                    AI相棒にも相談を聞かせる（返答あり）
                  </label>
                </div>
              )}
              <div className="flex gap-3 relative items-stretch">
                <textarea 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
                  disabled={isChatDisabled}
                  placeholder={isChatDisabled ? "AIが応答中です..." : `${joinedCharacter.name}として発言... (Ctrl+Enterで送信)`}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-xl p-3.5 text-[15px] text-white resize-none h-20 disabled:opacity-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <div className="flex flex-col gap-2 w-24 shrink-0">
                  <button onClick={handleSend} disabled={!input.trim() || isChatDisabled} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg font-bold text-sm shadow-md transition-colors">
                    送信
                  </button>
                  <div className="flex gap-1 h-7">
                    <button onClick={() => rollDice(joinedCharacter.str, "STR(筋力)")} disabled={isChatDisabled} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded-md text-[10px] text-slate-200 font-bold transition-colors" title="筋力判定">STR</button>
                    <button onClick={() => rollDice(joinedCharacter.dex, "DEX(敏捷)")} disabled={isChatDisabled} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded-md text-[10px] text-slate-200 font-bold transition-colors" title="敏捷判定">DEX</button>
                    <button onClick={() => rollDice(joinedCharacter.int, "INT(知力)")} disabled={isChatDisabled} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded-md text-[10px] text-slate-200 font-bold transition-colors" title="知力判定">INT</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isScenarioEnded && (
             <div className="p-6 bg-slate-800 text-center border-t border-slate-700">
               <p className="text-xl text-emerald-400 font-bold mb-4">🎉 セッションクリア！</p>
               <button onClick={endGame} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-colors">評価画面へ進む</button>
             </div>
          )}
        </div>

        {/* 右側：サイドバー */}
        <div className="w-72 bg-slate-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar border-l border-slate-700">
          
          {/* 自分 */}
          {joinedCharacter && (
            <div className="p-5 border-b border-slate-700 bg-slate-800/50">
              <h3 className="text-xs font-bold text-slate-400 mb-3">あなた</h3>
              <div className="flex gap-4 items-center">
                <img src={joinedCharacter.imageUrl} className="w-16 h-16 rounded-xl bg-slate-900 object-cover shadow-md border border-slate-600" />
                <div className="flex-1">
                  <p className="font-bold text-[15px] text-white line-clamp-1">{joinedCharacter.name}</p>
                  <div className="text-xs text-slate-300 flex flex-col gap-1 mt-1.5">
                    <span className="bg-red-900/30 text-red-300 px-2 py-0.5 rounded border border-red-500/20 inline-block w-fit">HP: {joinedCharacter.hp}</span>
                    <span className="bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 inline-block w-fit">SAN: {joinedCharacter.san}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowInventory(true)} className="w-full mt-4 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-lg text-sm font-bold text-slate-200 transition-colors shadow-sm">🎒 所持品を確認・メモ</button>
            </div>
          )}

          {/* メンバー */}
          <div className="p-5 border-b border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 mb-4">参加メンバー</h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(activeRoom.joined_users || {}).map(([uid, cid]) => {
                const c = activeRoom.scenario?.presetCharacters.find(p => p.id === cid);
                if (!c) return null;
                const isAfk = activeRoom.afk_users?.includes(uid);
                
                // ★ 5分放置の検知ロジック
                const userLastMsg = [...messages].reverse().find(m => m.charName === c.name);
                const msgTime = userLastMsg ? ((userLastMsg as any).createdAt || (userLastMsg as any).created_at) : null;
                const lastActiveTime = msgTime ? new Date(msgTime).getTime() : now;
                const isIdle = (now - lastActiveTime > fiveMinutes);

                return (
                  <div key={uid} className="relative group flex flex-col items-center">
                    <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 ${uid === currentUser.id ? 'border-emerald-500' : isAfk ? 'border-amber-500 opacity-50' : 'border-slate-500'} shadow-md bg-slate-900 transition-all`}>
                      <img src={c.imageUrl} className="w-full h-full rounded-full object-cover" title={`${c.name} (PL)`} />
                      {isAfk && <span className="absolute -bottom-1 -right-1 text-xs bg-amber-900 rounded-full w-5 h-5 flex items-center justify-center border border-amber-500">💤</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 max-w-[50px] truncate">{c.name}</span>
                    
                    {/* ホスト限定キックボタン（5分放置時に表示） */}
                    {isHost && isIdle && uid !== currentUser.id && (
                      <button onClick={() => kickUser(uid)} className="absolute -bottom-2 text-[10px] bg-red-600 text-white px-2 py-1 rounded-md shadow-lg z-10 hover:bg-red-500 whitespace-nowrap transition-transform scale-90 hover:scale-100">
                        🚪 追放
                      </button>
                    )}
                  </div>
                );
              })}
              {aiPlayersList.map(c => (
                <div key={c.id} className="relative flex flex-col items-center group">
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-blue-500 shadow-md bg-slate-900 transition-all">
                    <img src={c.imageUrl} className="w-full h-full rounded-full object-cover opacity-80" title={`${c.name} (AI)`} />
                    <span className="absolute -bottom-1 -right-1 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-bold shadow">AI</span>
                  </div>
                  <span className="text-[10px] text-blue-300 mt-1 max-w-[50px] truncate">{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GMツール */}
          {isHost && !isRecruiting && (
            <div className="p-5 border-b border-slate-700 bg-slate-800/30">
               <h3 className="text-xs font-bold text-slate-400 mb-4">⚙️ GMツール (ホスト用)</h3>
               <div className="flex flex-col gap-3">
                 <button onClick={() => generateSceneImage('free')} disabled={isLoading} className="bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 text-xs py-2.5 rounded-lg font-bold border border-indigo-500/50 shadow-sm transition-colors">
                   🖼️ 情景画像を生成 (無料)
                 </button>
                 <button onClick={() => generateSceneImage('premium')} disabled={isLoading} className="bg-fuchsia-900/40 hover:bg-fuchsia-800/60 text-fuchsia-300 text-xs py-2.5 rounded-lg font-bold border border-fuchsia-500/50 shadow-sm transition-colors">
                   💎 高品質画像を生成 (1枠)
                 </button>
                 <button onClick={triggerAutoAction} disabled={isLoading} className="bg-slate-700 hover:bg-slate-600 text-xs py-2.5 rounded-lg font-bold text-slate-200 shadow-sm transition-colors mt-2">
                   ⚡ AIに進行を任せる
                 </button>
                 {isSplitMode ? (
                   <button onClick={executeMergeAll} disabled={isLoading} className="bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 text-xs py-2.5 rounded-lg font-bold border border-blue-500/50 shadow-sm transition-colors">
                     🔄 全チームを強制合流
                   </button>
                 ) : (
                   <button onClick={startSplitting} disabled={isLoading} className="bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 text-xs py-2.5 rounded-lg font-bold border border-amber-500/50 shadow-sm transition-colors">
                     ✂️ チームを分割する
                   </button>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* 所持品モーダル */}
      {showInventory && joinedCharacter && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">🎒 {joinedCharacter.name} の所持品・メモ</h3>
            <p className="text-sm text-slate-400 mb-4">セッション中に得たアイテムや重要な情報を自由に書き込めます。</p>
            <textarea 
              value={localInventory} 
              onChange={e=>setLocalInventory(e.target.value)} 
              className="w-full h-40 bg-slate-900 border border-slate-600 rounded-xl p-4 text-sm text-white mb-6 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" 
            />
            <div className="flex gap-3">
              <button onClick={() => setShowInventory(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl text-sm font-bold transition-colors">閉じる</button>
              <button onClick={handleInventorySave} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl text-sm font-bold shadow-lg transition-colors">内容を保存する</button>
            </div>
          </div>
        </div>
      )}

      {/* 分割提案モーダル */}
      {activeRoom.status === 'splitting' && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-amber-500/50 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-bold text-amber-400 mb-2">✂️ チーム分けの設定</h3>
            <p className="text-sm text-slate-300 mb-6">直近の会話からAIがチーム構成を提案しました。<br/>必要に応じて修正し、確定してください。</p>
            
            {isGeneratingSplit ? (
              <div className="py-16 text-center text-slate-400 animate-pulse flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p>AIが最適なチーム構成を考案中...</p>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {proposedTeams.map((team, idx) => (
                  <div key={team.id} className="bg-slate-900 border border-slate-700 p-5 rounded-xl shadow-inner">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                      <span className="font-bold text-emerald-400 text-lg">チーム {idx + 1}</span>
                      {proposedTeams.length > 1 && (
                        <button onClick={() => setProposedTeams(proposedTeams.filter(t => t.id !== team.id))} className="text-sm bg-red-900/30 text-red-400 hover:text-white hover:bg-red-600 px-3 py-1 rounded transition-colors">
                          削除
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">行動目的・行き先</label>
                        <input type="text" value={team.action} onChange={e => { const newT = [...proposedTeams]; newT[idx].action = e.target.value; setProposedTeams(newT); }} placeholder="例：書斎を調べる、二手に分かれる等" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:border-amber-500" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-2">メンバー</label>
                        <div className="flex flex-wrap gap-2">
                          {activeRoom.scenario?.presetCharacters.filter(c => Object.values(activeRoom.joined_users || {}).includes(c.id)).map(c => (
                            <label key={c.id} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer transition-colors ${team.members.includes(c.id) ? 'bg-emerald-900/40 border-emerald-500 text-emerald-100' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
                              <input type="checkbox" checked={team.members.includes(c.id)} onChange={e => { const newT = [...proposedTeams]; if (e.target.checked) newT[idx].members.push(c.id); else newT[idx].members = newT[idx].members.filter((id:string) => id !== c.id); setProposedTeams(newT); }} className="rounded bg-slate-900 border-slate-500 w-4 h-4 text-emerald-500 focus:ring-emerald-500" />
                              {c.name}
                            </label>
                          ))}
                        </div>
                      </div>
                      {!team.members.includes(joinedCharacter?.id) && team.members.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 mt-2">
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">このチームのリーダー（進行役）</label>
                          <select value={team.leader} onChange={e => { const newT = [...proposedTeams]; newT[idx].leader = e.target.value; setProposedTeams(newT); }} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:border-amber-500">
                            <option value="">選択してください</option>
                            {team.members.map((id:string) => { const c = activeRoom.scenario?.presetCharacters.find(pc => pc.id === id); return c ? <option key={id} value={id}>{c.name}</option> : null; })}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button onClick={() => setProposedTeams([...proposedTeams, { id: `team_${Date.now()}`, action: "", members: [], leader: "" }])} className="w-full py-3 bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors">
                  ＋ チームを追加する
                </button>
              </div>
            )}
            <div className="flex gap-4 mt-4">
              <button onClick={cancelSplitting} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3.5 rounded-xl text-sm font-bold transition-colors">キャンセルして戻る</button>
              <button onClick={finishSplitting} disabled={isGeneratingSplit} className="flex-[2] bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 py-3.5 rounded-xl text-sm font-bold shadow-lg transition-colors">この構成で分割・移動する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}