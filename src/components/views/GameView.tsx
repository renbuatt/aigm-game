import React, { useState, useEffect, useRef } from "react";
import { Room, Scene, UserProfile, Character, Message, ChatTab } from "../../types";

type Props = {
  activeRoom: Room;
  myScene: Scene;
  currentUser: UserProfile;
  joinedCharacter: Character;
  leaveGame: () => void;
  setReportTarget: (target: any) => void;
  rollDice: (targetValue: number, label: string, is1d100?: boolean) => void;
  startGame: () => void;
  startSplitting: () => void;
  isSplitMode: boolean;
  chatTab: ChatTab;
  messages: Message[];
  isLoading: boolean;
  isScenarioEnded: boolean;
  setCurrentView: (v: any) => void;
  endGame: () => void;
  input: string;
  setInput: (v: string) => void;
  handleSend: () => void;
  handleTabClick: (tab: ChatTab) => void;
  unreadIndicators: { story: boolean, consult: boolean, gm: boolean };
  consultWithAI: boolean;
  setConsultWithAI: (v: boolean) => void;
  isChatDisabled: boolean;
  mergeTeam: () => void;
  executeMergeAll: () => void;
  generateSceneImage: (type: 'free'|'premium') => void;
  proposedTeams: any[];
  setProposedTeams: (v: any[]) => void;
  isGeneratingSplit: boolean;
  generateSplitProposal: () => void;
  finishSplitting: () => void;
  cancelSplitting: () => void;
  togglePauseRoom: () => void;
  toggleAFK: (uid: string, force?: boolean) => void;
  triggerAutoAction: () => void;
  updateInventory: (v: string) => void; // ★読み取り専用になったためUIからは呼び出しませんがPropsとして残します
  openRoomConfigModal: (s: any) => void;
  aiPlayersList: Character[];
  saveToArchive: (silent?: boolean) => void;
  kickUser: (uid: string) => void;
};

export default function GameView({
  activeRoom, myScene, currentUser, joinedCharacter, leaveGame, setReportTarget, rollDice, startGame, startSplitting,
  isSplitMode, chatTab, messages, isLoading, isScenarioEnded, setCurrentView, endGame, input, setInput, handleSend, handleTabClick,
  unreadIndicators, consultWithAI, setConsultWithAI, isChatDisabled, mergeTeam, executeMergeAll, generateSceneImage, proposedTeams,
  setProposedTeams, isGeneratingSplit, generateSplitProposal, finishSplitting, cancelSplitting, togglePauseRoom, toggleAFK,
  triggerAutoAction, updateInventory, aiPlayersList, saveToArchive, kickUser
}: Props) {
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatTab]);

  const displayMessages = messages.filter(m => m.channel === chatTab || m.channel === "system" || !m.channel);
  const isHost = currentUser.id === activeRoom.host_id;

  // 難易度の日本語化
  const diffText = activeRoom.difficulty === 'normal' ? '普通' : activeRoom.difficulty === 'hard' ? '難しい' : activeRoom.difficulty === 'pro' ? 'プロ' : activeRoom.difficulty === 'oni' ? '鬼' : activeRoom.difficulty === 'easy' ? '簡単' : '初心者';
  
  // 参加している全キャラクター（プレイヤー＋AI）のリスト
  const allParticipatingChars = [
    ...(activeRoom.scenario?.presetCharacters.filter(c => Object.values(activeRoom.joined_users || {}).includes(c.id)) || []),
    ...aiPlayersList
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100">
      
      {/* ヘッダーエリア */}
      <header className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-800 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto custom-scrollbar whitespace-nowrap">
          <div className="border border-blue-500/50 rounded px-2 sm:px-3 py-1 flex items-center gap-2 bg-blue-900/20">
            <span className="font-bold text-blue-300 text-xs sm:text-sm truncate max-w-[150px] sm:max-w-[300px]">ROOM: {activeRoom.scenario?.title} (約{activeRoom.scenario?.playTime}分)</span>
            <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded hidden sm:inline-block">{activeRoom.rule === 'coc_jp' ? 'CoC日本' : activeRoom.rule}</span>
            <span className="bg-slate-700 text-white text-[10px] px-1.5 py-0.5 rounded">難易度: {diffText}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowStatusModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-xs font-bold shadow">👥 キャラクター紹介</button>
          <button onClick={() => saveToArchive()} className="bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-xs font-bold hidden sm:block">📖 あらすじ</button>
          <button onClick={leaveGame} className="bg-red-900/50 hover:bg-red-800 px-2 py-1 rounded text-xs font-bold border border-red-700/50">🚪 離脱</button>
        </div>
      </header>

      {/* ステータス＆アクションバー */}
      <div className="bg-slate-800 border-b border-slate-700 p-2 flex flex-wrap gap-2 items-center shrink-0">
        <button onClick={() => setShowInventoryModal(true)} className="bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-lg">🎒 所持品</button>
        <button onClick={() => rollDice(joinedCharacter.hp, "HP", false)} className="bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-lg">❤️ HP:{joinedCharacter.hp}</button>
        <button onClick={() => rollDice(joinedCharacter.san, "SAN", true)} className="bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-lg">🧠 SAN({joinedCharacter.san})</button>
        <button onClick={() => rollDice(joinedCharacter.str * 5, "STR", true)} className="bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow">🎲 STR({joinedCharacter.str})</button>
        <button onClick={() => rollDice(joinedCharacter.dex * 5, "DEX", true)} className="bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow">🎲 DEX({joinedCharacter.dex})</button>
        <button onClick={() => rollDice(joinedCharacter.int * 5, "INT", true)} className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow">🎲 INT({joinedCharacter.int})</button>
        <button onClick={() => rollDice(joinedCharacter.con * 5, "CON", true)} className="bg-orange-700 hover:bg-orange-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow">🎲 CON({joinedCharacter.con})</button>
        
        <div className="ml-auto flex gap-2">
          {activeRoom.status === 'playing' && (
            <button onClick={() => generateSceneImage('free')} disabled={isLoading} className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow">🖼️ 情景生成({3 - (activeRoom.free_image_count || 0)}回)</button>
          )}
          {isHost && activeRoom.status === 'recruiting' && (
            <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-xs font-bold shadow animate-pulse">▶ ゲーム開始</button>
          )}
          {isHost && isScenarioEnded && (
            <button onClick={endGame} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold shadow">🏁 感想戦へ進む</button>
          )}
        </div>
      </div>

      {/* チャットログエリア */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900 pb-10">
        {displayMessages.map((m, idx) => {
          const isSystem = m.type === "system";
          const isGM = m.sender === "gm";
          const isMe = m.charName === joinedCharacter.name;
          const bubbleColor = isSystem ? "bg-slate-800 border-slate-600" : isGM ? "bg-slate-800 border-emerald-500 border-l-4" : isMe ? "bg-blue-900/40 border-blue-500/50" : "bg-slate-800 border-slate-700";
          
          return (
            <div key={idx} className={`flex flex-col ${isSystem ? 'items-center my-2' : isMe ? 'items-end' : 'items-start'}`}>
              {!isSystem && <span className={`text-[10px] mb-1 font-bold ${isGM ? 'text-emerald-400' : 'text-slate-400'}`}>{isGM ? "AI GM" : m.charName} {m.type === 'ooc' ? '[OOC]' : '[IC]'}</span>}
              <div className={`p-3 rounded-lg border max-w-[95%] sm:max-w-[80%] whitespace-pre-wrap text-sm leading-relaxed shadow-md ${bubbleColor} ${isSystem ? 'text-slate-300 text-center w-full sm:w-auto font-bold' : 'text-slate-200'}`}>
                {m.text}
                
                {/* 画像表示（ストーリータブ限定） */}
                {m.type === "image" && m.imageUrl && chatTab === "story" && (
                  <div className="mt-3 mb-1 flex justify-center">
                    <img src={m.imageUrl} className="max-w-[100%] sm:max-w-[400px] rounded-lg shadow-lg border border-slate-600" alt="情景画像" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border-l-4 border-emerald-500 p-3 rounded-lg text-sm text-slate-400 flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
              AIが思考中...
            </div>
          </div>
        )}
      </div>

      {/* 入力エリア */}
      <div className="bg-slate-800 border-t border-slate-700 shrink-0">
        <div className="flex border-b border-slate-700">
          <button onClick={() => handleTabClick("story")} className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1 sm:gap-2 relative ${chatTab === 'story' ? 'bg-slate-800 text-blue-400 border-t-2 border-blue-400' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}>
            📝 行動宣言 (GMへ)
            {unreadIndicators.story && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
          </button>
          <button onClick={() => handleTabClick("consult")} className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1 sm:gap-2 relative ${chatTab === 'consult' ? 'bg-slate-800 text-purple-400 border-t-2 border-purple-400' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}>
            🗣️ 相談 (PL・AI相棒へ)
            {unreadIndicators.consult && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
          </button>
          <button onClick={() => handleTabClick("gm")} className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1 sm:gap-2 relative ${chatTab === 'gm' ? 'bg-slate-800 text-amber-400 border-t-2 border-amber-400' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}>
            ⚙️ GMへ質問
            {unreadIndicators.gm && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
          </button>
        </div>
        
        <div className="p-3 bg-slate-800 flex flex-col gap-2">
          {chatTab === 'consult' && (
             <div className="flex justify-end px-1">
               <label className="text-[10px] flex items-center gap-1 cursor-pointer text-slate-300">
                 <input type="checkbox" checked={consultWithAI} onChange={e=>setConsultWithAI(e.target.checked)} className="accent-purple-500" />
                 AI相棒にも相談に返答させる
               </label>
             </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
              placeholder={chatTab === 'story' ? "行動やセリフを入力... (Ctrl+Enterで送信)" : chatTab === 'consult' ? "PL間や相棒への相談を入力..." : "GMへのメタ質問やアイテムの交渉を入力..."}
              disabled={isChatDisabled}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white resize-none h-20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isChatDisabled}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold rounded-lg px-6 h-20 transition-colors shadow-lg"
            >
              送信
            </button>
          </div>
        </div>
      </div>

      {/* キャラクター紹介モーダル */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-indigo-500/50 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-700 shrink-0">
              <h3 className="text-lg font-bold text-indigo-400">👥 キャラクター紹介・ステータス</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-2xl text-slate-400 hover:text-white">×</button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {allParticipatingChars.map(c => {
                const uid = Object.keys(activeRoom.joined_users || {}).find(k => activeRoom.joined_users![k] === c.id);
                const isAI = !uid;
                const isMe = c.id === joinedCharacter.id;
                
                return (
                  <div key={c.id} className={`bg-slate-900 border rounded-xl p-4 flex flex-col sm:flex-row gap-4 ${isMe ? 'border-blue-500/50' : 'border-slate-700'}`}>
                    <img src={c.imageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} className="w-24 h-24 object-cover rounded-lg border border-slate-600 shrink-0 mx-auto sm:mx-0" alt={c.name} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-white text-lg flex items-center gap-2">
                            {c.name} <span className="text-xs text-slate-400 font-normal">({c.job} / {c.genderOrRace || "不明"})</span>
                          </h4>
                          <p className="text-[10px] mt-1 font-bold">
                            {isAI ? <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded border border-purple-700/50">AI相棒</span> : <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-700/50">プレイヤー</span>}
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
            <div className="p-4 border-t border-slate-700 shrink-0">
              <button onClick={() => setShowStatusModal(false)} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold shadow">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* 所持品モーダル（閲覧専用） */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-amber-500/50 rounded-xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-700 shrink-0">
              <h3 className="text-lg font-bold text-amber-400">🎒 あなたの所持品</h3>
              <button onClick={() => setShowInventoryModal(false)} className="text-2xl text-slate-400 hover:text-white">×</button>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-400 mb-4">
                ※所持品はシステム（GM）が管理しています。新しくアイテムを取得したい場合や、設定上持っているはずの物を追加したい場合は、「GMへ質問」タブから交渉して認められてください。
              </p>
              <textarea 
                readOnly
                value={activeRoom.inventories?.[currentUser.id] || joinedCharacter.items || "特になし"} 
                className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white resize-none cursor-not-allowed focus:outline-none"
              />
            </div>
            <div className="p-4 border-t border-slate-700 shrink-0">
              <button onClick={() => setShowInventoryModal(false)} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold shadow">閉じる</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}