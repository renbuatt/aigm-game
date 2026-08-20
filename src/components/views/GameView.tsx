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
      <header className="bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-emerald-400 line-clamp-1">{activeRoom.scenario?.title}</h2>
          <div className="flex gap-2">
            <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300">ID: {activeRoom.id.substring(0,6)}</span>
            {isSplitMode && <span className="text-[10px] bg-indigo-900 px-2 py-1 rounded text-indigo-300 font-bold border border-indigo-500">📍 {myScene.name}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {isHost && isRecruiting && (
            <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded font-bold animate-pulse shadow">▶ 開始する</button>
          )}
          {isHost && !isRecruiting && !isScenarioEnded && (
            <button onClick={togglePauseRoom} className={`text-xs px-3 py-1.5 rounded font-bold shadow ${activeRoom.is_paused ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-600 hover:bg-slate-500'}`}>
              {activeRoom.is_paused ? '▶ 再開' : '⏸️ 中断'}
            </button>
          )}
          <button onClick={() => setReportTarget({ roomId: activeRoom.id, availableUsers: Object.keys(activeRoom.joined_users||{}).filter(id=>id!==currentUser.id).map(id=>({id, name: activeRoom.scenario?.presetCharacters.find(c=>c.id===activeRoom.joined_users![id])?.name || "不明"})) })} className="text-xs text-slate-500 hover:text-red-400">🚨通報</button>
          <button onClick={leaveGame} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded font-bold shadow ml-2">退出</button>
        </div>
      </header>

      {/* メインエリア */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側：チャットエリア */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-700 relative">
          
          {/* タブ */}
          <div className="flex shrink-0 bg-slate-900 border-b border-slate-800 p-2 gap-2">
            <button onClick={() => handleTabClick('story')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${chatTab === 'story' ? 'bg-slate-700 text-emerald-400 shadow-inner' : 'text-slate-400 hover:bg-slate-800'}`}>
              本編 {unreadIndicators.story && <span className="ml-1 w-2 h-2 inline-block bg-red-500 rounded-full animate-ping"></span>}
            </button>
            <button onClick={() => handleTabClick('consult')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${chatTab === 'consult' ? 'bg-slate-700 text-blue-400 shadow-inner' : 'text-slate-400 hover:bg-slate-800'}`}>
              相談(秘匿) {unreadIndicators.consult && <span className="ml-1 w-2 h-2 inline-block bg-red-500 rounded-full animate-ping"></span>}
            </button>
            <button onClick={() => handleTabClick('gm')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${chatTab === 'gm' ? 'bg-slate-700 text-amber-400 shadow-inner' : 'text-slate-400 hover:bg-slate-800'}`}>
              GM質問 {unreadIndicators.gm && <span className="ml-1 w-2 h-2 inline-block bg-red-500 rounded-full animate-ping"></span>}
            </button>
          </div>

          {/* ログ */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900">
            {getFilteredMessages().map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.sender === "player" ? "items-end" : "items-start"}`}>
                <span className="text-[10px] text-slate-500 mb-1">{m.charName || (m.sender==="gm" ? "GM" : m.sender==="system" ? "SYSTEM" : "")}</span>
                <div className={`p-3 rounded-2xl max-w-[85%] shadow-sm ${
                  m.sender === "system" ? "bg-slate-800/80 text-slate-300 text-xs border border-slate-700 w-full text-center" :
                  m.type === "image" ? "bg-slate-800 border border-slate-700" :
                  m.sender === "player" ? "bg-emerald-900/40 text-emerald-50 border border-emerald-700/50" :
                  "bg-slate-800 text-slate-200 border border-slate-700"
                }`}>
                  {m.type === "image" && m.imageUrl ? (
                    <div><img src={m.imageUrl} className="rounded max-w-full h-auto mb-2" /><p className="text-xs text-slate-400 whitespace-pre-wrap">{m.text}</p></div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start"><div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl shadow animate-pulse"><p className="text-sm text-slate-400">AI GMが思考中...</p></div></div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* 入力欄 */}
          {!isScenarioEnded && joinedCharacter && (
            <div className="p-3 bg-slate-800 shrink-0 border-t border-slate-700">
              {chatTab === 'consult' && (
                <div className="flex justify-end mb-2">
                  <label className="text-xs text-slate-400 flex items-center gap-1 cursor-pointer hover:text-white transition">
                    <input type="checkbox" checked={consultWithAI} onChange={e=>setConsultWithAI(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-500" />
                    AI相棒にも相談を聞かせる（返答あり）
                  </label>
                </div>
              )}
              <div className="flex gap-2 relative">
                <textarea 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
                  disabled={isChatDisabled}
                  placeholder={isChatDisabled ? "AIが応答中です..." : `${joinedCharacter.name}として発言... (Ctrl+Enterで送信)`}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white resize-none h-14 disabled:opacity-50"
                />
                <div className="flex flex-col gap-1 w-20">
                  <button onClick={handleSend} disabled={!input.trim() || isChatDisabled} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded font-bold text-xs shadow transition-colors">
                    送信
                  </button>
                  <div className="flex gap-1 h-6">
                    <button onClick={() => rollDice(joinedCharacter.str, "STR(筋力)")} disabled={isChatDisabled} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-300 font-bold" title="筋力判定">STR</button>
                    <button onClick={() => rollDice(joinedCharacter.dex, "DEX(敏捷)")} disabled={isChatDisabled} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-300 font-bold" title="敏捷判定">DEX</button>
                    <button onClick={() => rollDice(joinedCharacter.int, "INT(知力)")} disabled={isChatDisabled} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-300 font-bold" title="知力判定">INT</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isScenarioEnded && (
             <div className="p-4 bg-slate-800 text-center border-t border-slate-700">
               <p className="text-emerald-400 font-bold mb-2">🎉 セッションクリア！</p>
               <button onClick={endGame} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-bold shadow">評価画面へ進む</button>
             </div>
          )}
        </div>

        {/* 右側：サイドバー */}
        <div className="w-64 bg-slate-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          
          {/* 自分 */}
          {joinedCharacter && (
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-xs font-bold text-slate-400 mb-2">あなた</h3>
              <div className="flex gap-3">
                <img src={joinedCharacter.imageUrl} className="w-12 h-12 rounded bg-slate-900 object-cover shadow" />
                <div className="flex-1">
                  <p className="font-bold text-sm text-white line-clamp-1">{joinedCharacter.name}</p>
                  <div className="text-[10px] text-slate-400 flex gap-2 mt-1"><span>HP: {joinedCharacter.hp}</span><span>SAN: {joinedCharacter.san}</span></div>
                </div>
              </div>
              <button onClick={() => setShowInventory(true)} className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-xs py-1.5 rounded font-bold text-slate-300 transition-colors">🎒 所持品を確認</button>
            </div>
          )}

          {/* メンバー */}
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 mb-3">参加メンバー</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(activeRoom.joined_users || {}).map(([uid, cid]) => {
                const c = activeRoom.scenario?.presetCharacters.find(p => p.id === cid);
                if (!c) return null;
                const isAfk = activeRoom.afk_users?.includes(uid);
                
                // ★ 5分放置の検知ロジック (TypeError対策済)
                const userLastMsg = [...messages].reverse().find(m => m.charName === c.name);
                const msgTime = userLastMsg ? ((userLastMsg as any).createdAt || (userLastMsg as any).created_at) : null;
                const lastActiveTime = msgTime ? new Date(msgTime).getTime() : now;
                const isIdle = (now - lastActiveTime > fiveMinutes);

                return (
                  <div key={uid} className="relative group flex flex-col items-center">
                    <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 ${uid === currentUser.id ? 'border-emerald-500' : isAfk ? 'border-amber-500 opacity-50' : 'border-slate-500'} shadow-sm bg-slate-900`}>
                      <img src={c.imageUrl} className="w-full h-full rounded-full object-cover" title={`${c.name} (PL)`} />
                      {isAfk && <span className="absolute -bottom-1 -right-1 text-[10px]">💤</span>}
                    </div>
                    
                    {/* ★ ホスト限定キックボタン（5分放置時に表示） */}
                    {isHost && isIdle && uid !== currentUser.id && (
                      <button onClick={() => kickUser(uid)} className="absolute -bottom-4 text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded shadow z-10 hover:bg-red-500 whitespace-nowrap">
                        🚪 追放
                      </button>
                    )}
                  </div>
                );
              })}
              {aiPlayersList.map(c => (
                <div key={c.id} className="relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-blue-500 shadow-sm bg-slate-900">
                  <img src={c.imageUrl} className="w-full h-full rounded-full object-cover" title={`${c.name} (AI)`} />
                  <span className="absolute -bottom-1 -right-1 text-[8px] bg-blue-600 text-white px-1 rounded">AI</span>
                </div>
              ))}
            </div>
          </div>

          {/* GMツール */}
          {isHost && !isRecruiting && (
            <div className="p-4 border-b border-slate-700">
               <h3 className="text-xs font-bold text-slate-400 mb-3">GMツール (ホスト用)</h3>
               <div className="flex flex-col gap-2">
                 <button onClick={() => generateSceneImage('free')} disabled={isLoading} className="bg-indigo-900/50 hover:bg-indigo-800 text-indigo-300 text-[10px] py-2 rounded font-bold border border-indigo-500/50">🖼️ 情景画像を生成 (無料)</button>
                 <button onClick={() => generateSceneImage('premium')} disabled={isLoading} className="bg-fuchsia-900/50 hover:bg-fuchsia-800 text-fuchsia-300 text-[10px] py-2 rounded font-bold border border-fuchsia-500/50">💎 高品質画像を生成 (1枠)</button>
                 <button onClick={triggerAutoAction} disabled={isLoading} className="bg-slate-700 hover:bg-slate-600 text-[10px] py-2 rounded font-bold text-slate-300">⚡ AIに進行を任せる</button>
                 {isSplitMode ? (
                   <button onClick={executeMergeAll} disabled={isLoading} className="bg-blue-900/50 hover:bg-blue-800 text-blue-300 text-[10px] py-2 rounded font-bold border border-blue-500/50">🔄 全チームを強制合流</button>
                 ) : (
                   <button onClick={startSplitting} disabled={isLoading} className="bg-amber-900/50 hover:bg-amber-800 text-amber-300 text-[10px] py-2 rounded font-bold border border-amber-500/50">✂️ チームを分割する</button>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* 所持品モーダル */}
      {showInventory && joinedCharacter && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">🎒 {joinedCharacter.name} の所持品</h3>
            <p className="text-xs text-slate-400 mb-4">セッション中に得たアイテムやメモを自由に書き込めます。</p>
            <textarea value={localInventory} onChange={e=>setLocalInventory(e.target.value)} className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowInventory(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm font-bold">閉じる</button>
              <button onClick={handleInventorySave} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-sm font-bold shadow">保存する</button>
            </div>
          </div>
        </div>
      )}

      {/* 分割提案モーダル */}
      {activeRoom.status === 'splitting' && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-amber-500/50 rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-bold text-amber-400 mb-4">✂️ チーム分けの設定</h3>
            <p className="text-sm text-slate-300 mb-4">直近の会話からAIがチーム構成を提案しました。<br/>必要に応じて修正し、確定してください。</p>
            
            {isGeneratingSplit ? (
              <div className="py-12 text-center text-slate-400 animate-pulse">AIが最適なチーム構成を考案中...</div>
            ) : (
              <div className="space-y-4 mb-6">
                {proposedTeams.map((team, idx) => (
                  <div key={team.id} className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-emerald-400 text-sm">チーム {idx + 1}</span>
                      {proposedTeams.length > 1 && <button onClick={() => setProposedTeams(proposedTeams.filter(t => t.id !== team.id))} className="text-xs text-red-400 hover:text-red-300">削除</button>}
                    </div>
                    <div className="space-y-3">
                      <div><label className="text-[10px] text-slate-500 block mb-1">行動目的・行き先</label><input type="text" value={team.action} onChange={e => { const newT = [...proposedTeams]; newT[idx].action = e.target.value; setProposedTeams(newT); }} placeholder="例：書斎を調べる" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white" /></div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">メンバー</label>
                        <div className="flex flex-wrap gap-2">
                          {activeRoom.scenario?.presetCharacters.filter(c => Object.values(activeRoom.joined_users || {}).includes(c.id)).map(c => (
                            <label key={c.id} className="flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded border border-slate-600 cursor-pointer hover:bg-slate-700">
                              <input type="checkbox" checked={team.members.includes(c.id)} onChange={e => { const newT = [...proposedTeams]; if (e.target.checked) newT[idx].members.push(c.id); else newT[idx].members = newT[idx].members.filter((id:string) => id !== c.id); setProposedTeams(newT); }} className="rounded bg-slate-900 border-slate-500" />
                              {c.name}
                            </label>
                          ))}
                        </div>
                      </div>
                      {!team.members.includes(joinedCharacter?.id) && team.members.length > 0 && (
                        <div><label className="text-[10px] text-slate-500 block mb-1">このチームのリーダー（進行役）</label><select value={team.leader} onChange={e => { const newT = [...proposedTeams]; newT[idx].leader = e.target.value; setProposedTeams(newT); }} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white"><option value="">選択してください</option>{team.members.map((id:string) => { const c = activeRoom.scenario?.presetCharacters.find(pc => pc.id === id); return c ? <option key={id} value={id}>{c.name}</option> : null; })}</select></div>
                      )}
                    </div>
                  </div>
                ))}
                <button onClick={() => setProposedTeams([...proposedTeams, { id: `team_${Date.now()}`, action: "", members: [], leader: "" }])} className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 rounded text-sm text-slate-400">＋ チームを追加</button>
              </div>
            )}
            <div className="flex gap-4">
              <button onClick={cancelSplitting} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button>
              <button onClick={finishSplitting} disabled={isGeneratingSplit} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-amber-900/50">この構成で分割する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}