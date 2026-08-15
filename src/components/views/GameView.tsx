import React from "react";
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
  rollDice: (targetValue: number, label: string, is1d100: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  startSplitting: () => void;
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
  draftAction: string;
  setDraftAction: React.Dispatch<React.SetStateAction<string>>;
  draftMembers: string[];
  setDraftMembers: React.Dispatch<React.SetStateAction<string[]>>;
  draftLeader: string;
  setDraftLeader: React.Dispatch<React.SetStateAction<string>>;
  addTeamDraft: () => Promise<void>;
  finishSplitting: () => Promise<void>;
};

export default function GameView({
  activeRoom, myScene, currentUser, joinedCharacter, leaveGame, setReportTarget, rollDice,
  startGame, startSplitting, isSplitMode, chatTab, messages, isLoading, isScenarioEnded,
  setCurrentView, endGame, input, setInput, handleSend, handleTabClick, unreadIndicators,
  consultWithAI, setConsultWithAI, isChatDisabled, mergeTeam, executeMergeAll, draftAction, setDraftAction,
  draftMembers, setDraftMembers, draftLeader, setDraftLeader, addTeamDraft, finishSplitting
}: Props) {
  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 min-h-0 relative">
      
      {/* チーム分け設定モーダル（ホスト専用） */}
      {activeRoom.status === 'splitting' && currentUser?.id === activeRoom.host_id && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-blue-500/50 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-blue-400">👥 チーム編成</h3>
            <p className="text-xs text-slate-300 mb-2">※現在作成中のチームを設定してください。</p>
            <div>
              <label className="text-xs text-slate-400 block mb-1">チームの行動・目的地</label>
              <input type="text" value={draftAction} onChange={e=>setDraftAction(e.target.value)} placeholder="例：管理室に行く" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">メンバー</label>
              {draftMembers.map((m: string, i: number) => (
                <div key={i} className="flex gap-2 mb-2">
                  <select value={m} onChange={e => { const nm=[...draftMembers]; nm[i]=e.target.value; setDraftMembers(nm); }} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
                    <option value="" disabled>メンバーを選択...</option>
                    {Object.values(activeRoom.joined_users || {}).map((charId: string) => {
                      const isAssigned = activeRoom.scenes.some((s: Scene) => s.id !== 'scene_main' && s.memberIds.includes(charId));
                      if (isAssigned) return null;
                      const c = activeRoom.scenario?.presetCharacters.find((pc: Character) => pc.id === charId);
                      return c ? <option key={c.id} value={c.id}>{c.name}</option> : null;
                    })}
                  </select>
                  {i === draftMembers.length - 1 && <button onClick={()=>setDraftMembers([...draftMembers, ""])} className="bg-slate-700 px-3 rounded text-xs font-bold text-white">＋</button>}
                </div>
              ))}
            </div>
            {draftMembers.filter((m: string)=>m!=="").length > 0 && !draftMembers.includes(joinedCharacter?.id || "") && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">このチームのリーダー</label>
                <div className="flex gap-4">
                  {draftMembers.filter((m: string)=>m!=="").map((m: string) => {
                    const c = activeRoom.scenario?.presetCharacters.find((pc: Character) => pc.id === m);
                    if(!c) return null;
                    return <label key={m} className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="leader" value={m} checked={draftLeader===m} onChange={()=>setDraftLeader(m)} /> {c.name}</label>;
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={addTeamDraft} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded text-sm font-bold shadow-lg">このチームを確定して次へ</button>
              <button onClick={finishSplitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded text-sm font-bold shadow-lg">編成を完了して再開する</button>
            </div>
          </div>
        </div>
      )}

      {/* チーム分け待機画面（ゲスト用） */}
      {activeRoom.status === 'splitting' && currentUser?.id !== activeRoom.host_id && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl text-center">
            <h3 className="text-lg font-bold text-blue-400 mb-2 animate-pulse">ホストがチーム分けを行っています...</h3>
            <div className="space-y-2 mt-4 text-left">
              {activeRoom.scenes.filter((s: Scene) => s.id !== 'scene_main').map((s: Scene) => (
                <div key={s.id} className="bg-slate-900 border border-slate-700 p-3 rounded">
                  <span className="text-xs text-amber-400 font-bold bg-amber-900/30 px-2 py-0.5 rounded mr-2">{s.name}</span>
                  <span className="text-sm text-slate-300">
                    {s.memberIds.map((id: string) => activeRoom.scenario?.presetCharacters.find((c: Character)=>c.id===id)?.name).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={leaveGame} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-bold shadow">🚪 離脱 / 終了</button>
          
          <button onClick={() => {
            const users = Object.entries(activeRoom.joined_users || {})
              .filter(([userId]) => userId !== currentUser.id)
              .map(([userId, charId]) => {
                const charName = activeRoom.scenario?.presetCharacters.find((c: Character) => c.id === charId)?.name || "不明";
                return { id: userId, name: charName };
              });
            
            setReportTarget({
              type: 'room', 
              id: activeRoom.id, 
              name: "この部屋の進行・チャット全般", 
              roomId: activeRoom.id,
              scenarioId: activeRoom.scenario_id,
              scenarioName: activeRoom.scenario?.title || "",
              availableUsers: users
            });
          }} className="text-xs bg-slate-900 hover:bg-red-900/50 text-red-400 border border-slate-700 px-3 py-1.5 rounded font-bold">🚨 通報</button>
          
          <div className="flex flex-col ml-4">
            <span className="text-[10px] text-blue-400 font-bold border border-blue-500/50 bg-blue-900/30 px-2 py-0.5 rounded w-fit mb-1">
              ROOM: {activeRoom.scenario?.title} (約{activeRoom.scenario?.playTime || 60}分)
            </span>
            <span className="text-sm font-bold text-white flex items-center gap-2">
              {joinedCharacter ? joinedCharacter.name : "👁️ 観戦者"}
              {isSplitMode && myScene.id !== 'scene_main' && <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded-full ml-2">{myScene.name} 班</span>}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 justify-end max-w-md">
          {joinedCharacter && (
            <>
              <button onClick={() => rollDice(joinedCharacter.san, "SAN", true)} className="bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 SAN({joinedCharacter.san}%)</button>
              <button onClick={() => rollDice(joinedCharacter.str, "STR", false)} className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 STR({joinedCharacter.str})</button>
              <button onClick={() => rollDice(joinedCharacter.dex, "DEX", false)} className="bg-green-700 hover:bg-green-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 DEX({joinedCharacter.dex})</button>
              <button onClick={() => rollDice(joinedCharacter.int, "INT", false)} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 INT({joinedCharacter.int})</button>
              <button onClick={() => rollDice(joinedCharacter.con, "CON", false)} className="bg-amber-700 hover:bg-amber-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 CON({joinedCharacter.con})</button>
            </>
          )}

          {/* ゲーム開始ボタン */}
          {(currentUser?.id === activeRoom.host_id || currentUser?.handleName === activeRoom.host_name) && activeRoom.status === "recruiting" && joinedCharacter && (
            <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-4 py-2 rounded animate-pulse ml-2 shadow-lg shadow-emerald-900/50">▶ ゲーム開始</button>
          )}

          {/* チーム分け・強制合流ボタン */}
          {(currentUser?.id === activeRoom.host_id || currentUser?.handleName === activeRoom.host_name) && activeRoom.status === "playing" && !isScenarioEnded && (
             isSplitMode ? (
               <button onClick={executeMergeAll} className="bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg ml-2">🚪 全員を強制合流</button>
             ) : (
               <button onClick={startSplitting} className="bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg ml-2">👥 チーム分け</button>
             )
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-scroll space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3 min-h-0">
        {messages.filter((msg: Message) => {
          if (msg.type === "system") return true;
          if (!isSplitMode) return msg.channel === chatTab;
          return (!msg.sceneId || msg.sceneId === 'scene_main' || msg.sceneId === myScene.id) && msg.channel === chatTab;
        }).map((msg: Message, index: number) => {
          const isMe = msg.sender === "player";
          const isAIPlayer = msg.sender === "ai_player";
          const isSystem = msg.type === "system";
          
          const displayText = msg.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim();
          if (!displayText && !isSystem) return null;
          
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
                <p className={`text-sm whitespace-pre-wrap leading-relaxed ${isSystem && 'text-xs text-slate-300'}`}>{displayText}</p>
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
        
        {isScenarioEnded && (
          activeRoom.status === 'finished' ? (
            <div className="bg-amber-900/50 border border-amber-500 rounded p-2 flex justify-between items-center mb-2">
              <span className="text-amber-400 text-sm font-bold">🎉 感想戦モード（AIは停止しています）</span>
              <button onClick={() => setCurrentView("evaluation")} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded shadow">
                評価して退出する
              </button>
            </div>
          ) : currentUser?.id === activeRoom.host_id ? (
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
                  placeholder={chatTab === "story" ? "例：鍵穴を覗き込みます。" : (chatTab === "consult" ? (consultWithAI && !isScenarioEnded ? "例：ねえ、どうしようか？ (AI相棒が返答します)" : "例：PL同士の作戦会議メモ (AIは反応しません)") : "例：今の状況でもう一度目星は振れますか？")} 
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition" 
                  disabled={isChatDisabled}
                />
                <button onClick={handleSend} disabled={isChatDisabled} className={`text-white px-6 py-2 rounded-lg text-sm font-bold shadow transition ${chatTab === "story" ? "bg-emerald-600 hover:bg-emerald-500" : (chatTab === "consult" ? "bg-indigo-600 hover:bg-indigo-500" : "bg-amber-600 hover:bg-amber-500")} disabled:opacity-50`}>送信</button>
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