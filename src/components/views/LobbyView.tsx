import React, { useState } from "react";
import { ViewState, UserProfile, Room, Scenario, RoomDifficulty, GameRule, PlayArchive } from "../../types";

const NO_IMAGE_SCENARIO = "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=400&q=80";

type Props = {
  currentUser: UserProfile;
  handleLogout: () => Promise<void>;
  setShowMailbox: React.Dispatch<React.SetStateAction<boolean>>;
  unreadCount: number;
  secretRoomIdSearch: string;
  setSecretRoomIdSearch: React.Dispatch<React.SetStateAction<string>>;
  rooms: Room[];
  searchedSecretRoom: Room | null;
  setSearchedSecretRoom: React.Dispatch<React.SetStateAction<Room | null>>;
  executeJoinRoom: (room: Room, charId: string) => Promise<void>;
  availableRooms: Room[];
  spectateRoom: (room: Room) => Promise<void>;
  setEditingScenario: React.Dispatch<React.SetStateAction<Scenario | null>>;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  createdScenarios: Scenario[];
  deleteScenario: (id: string) => Promise<void>;
  setRoomConfigModal: React.Dispatch<React.SetStateAction<{ scenario: Scenario, charId: string, privacy: 'open'|'secret', message: string, difficulty: RoomDifficulty, rule: GameRule, itemVisibility: "all"|"self"|"none" } | null>>;
  fetchAdminData: () => Promise<void>;
  startTrialPlay: (scenario: Scenario) => void;
  availableScenarios: Scenario[];
  openUserProfile: (userId: string) => void;
  setScenarioAppealTarget: React.Dispatch<React.SetStateAction<Scenario | null>>;
  playArchives: PlayArchive[]; // ★ 追加：クリア判定用
};

export default function LobbyView({
  currentUser, handleLogout, setShowMailbox, unreadCount, secretRoomIdSearch, setSecretRoomIdSearch,
  rooms, searchedSecretRoom, setSearchedSecretRoom, executeJoinRoom, availableRooms,
  spectateRoom, setEditingScenario, setCurrentView, createdScenarios, deleteScenario, setRoomConfigModal,
  fetchAdminData, startTrialPlay, availableScenarios, openUserProfile, setScenarioAppealTarget, playArchives
}: Props) {
  
  const [lobbyTab, setLobbyTab] = useState<'rooms' | 'scenarios' | 'trials'>('rooms');
  const [trialSort, setTrialSort] = useState<'new'|'popular'>('new');

  const trialScenarios = availableScenarios.filter(s => s.isTrialOk);
  const sortedTrials = [...trialScenarios].sort((a,b) => trialSort === 'popular' ? (b.ratingSum/b.ratingCount || 0) - (a.ratingSum/a.ratingCount || 0) : (a.id < b.id ? 1 : -1));
  const playableScenarios = availableScenarios.filter(s => s.isPlayableByOthers);

  // ★ 追加：前提シナリオをクリアしているかチェック
  const isScenarioCleared = (scenarioId: string) => {
    return playArchives.some(a => a.scenarioId === scenarioId);
  };

  const getRequiredScenario = (reqId?: string) => {
    if (!reqId) return null;
    return availableScenarios.find(s => s.id === reqId);
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full min-h-0 overflow-y-auto custom-scrollbar">
      <header className="mb-4 flex justify-between items-end border-b border-slate-700 pb-4">
        <div><h1 className="text-3xl font-extrabold text-emerald-400 mb-1">AI GM MORPG Lobby</h1></div>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView("library")} className="bg-amber-600/20 text-amber-400 border border-amber-500/50 hover:bg-amber-600/40 px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1 transition-colors">
            <span className="text-base">👑</span> プレイ書庫 (Premium)
          </button>
          <button onClick={() => setShowMailbox(true)} className="relative text-slate-300 hover:text-white p-2 text-xl">
            ✉️{unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1.5 rounded-full">{unreadCount}</span>}
          </button>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white underline">ログアウト</button>
        </div>
      </header>

      {unreadCount > 0 && (
        <div className="mb-4 bg-indigo-900/50 border border-indigo-500 p-3 rounded-lg flex items-center justify-between shadow-lg animate-pulse">
          <p className="text-sm font-bold text-indigo-200">
            ⚠️ 新着メッセージ（お知らせ等）が {unreadCount} 件あります！
          </p>
          <button onClick={() => setShowMailbox(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-1.5 rounded font-bold transition-colors">
            確認する
          </button>
        </div>
      )}

      <div className="flex gap-4 mb-6 border-b border-slate-700 flex-shrink-0">
        <button onClick={() => setLobbyTab('rooms')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${lobbyTab === 'rooms' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}>🌐 募集中のセッション</button>
        <button onClick={() => setLobbyTab('scenarios')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${lobbyTab === 'scenarios' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>📖 シナリオを探す・部屋を作る</button>
        <button onClick={() => setLobbyTab('trials')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${lobbyTab === 'trials' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-400 hover:text-white'}`}>🌟 お試しプレイ (広告無料)</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {lobbyTab === 'rooms' && (
            <>
              <div className="flex justify-between items-end">
                <h2 className="text-sm font-bold text-slate-400">現在参加できるセッション</h2>
                <div className="flex gap-2">
                  <input type="text" placeholder="シークレット部屋ID" value={secretRoomIdSearch} onChange={e=>setSecretRoomIdSearch(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white w-40" />
                  <button onClick={() => { const r = rooms.find(x => x.id === secretRoomIdSearch); if(r){ setSearchedSecretRoom(r); }else{ alert("部屋が見つかりません"); } }} className="bg-slate-700 px-3 py-1 rounded text-xs font-bold">検索</button>
                </div>
              </div>

              <div className="h-[500px] overflow-y-auto space-y-4 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50 custom-scrollbar">
                {availableRooms.filter(r => r.privacy === 'open' || r.host_id === currentUser.id).length === 0 ? <p className="text-slate-400 text-sm p-4 text-center">現在募集中のセッションはありません。</p> : 
                  availableRooms.filter(r => r.privacy === 'open' || r.host_id === currentUser.id).map((room) => {
                  const isHost = room.host_id === currentUser.id;
                  const takenIds = Object.values(room.joined_users || {});
                  const availableChars = room.scenario?.presetCharacters.filter(c => !takenIds.includes(c.id)) || [];
                  
                  // ★ 追加：前提シナリオのチェック
                  const reqId = room.scenario?.requiredScenarioId;
                  const hasClearRequired = reqId ? isScenarioCleared(reqId) : true;
                  const reqScenario = getRequiredScenario(reqId);

                  return (
                    <div key={room.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4 hover:border-blue-500 relative">
                      <img src={room.scenario?.imageUrl || NO_IMAGE_SCENARIO} className="w-24 h-24 object-cover rounded" />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            {room.privacy === 'secret' ? "🔒" : "🔓"} {room.scenario?.title}
                            {isHost && <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded ml-auto">あなたがホスト</span>}
                          </h3>
                        </div>
                        <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                          <span>ホスト: <span className="underline cursor-pointer hover:text-blue-300 transition-colors" onClick={() => openUserProfile(room.host_id)}>{room.host_name}</span></span>
                          <span className="text-amber-400 font-bold ml-2">⭐ {room.scenario?.ratingCount ? (room.scenario.ratingSum / room.scenario.ratingCount).toFixed(1) : "未評価"}</span>
                          <span className={`px-1.5 py-0.5 rounded text-white ${room.difficulty === 'beginner' ? 'bg-pink-500' : room.difficulty === 'easy' ? 'bg-green-600' : room.difficulty === 'normal' ? 'bg-blue-600' : room.difficulty === 'hard' ? 'bg-orange-600' : room.difficulty === 'pro' ? 'bg-red-600' : 'bg-purple-600'}`}>
                            {room.difficulty === 'beginner' ? '⬜ 初心者' : room.difficulty === 'easy' ? '🟩 簡単' : room.difficulty === 'normal' ? '🟦 普通' : room.difficulty === 'hard' ? '🟧 難しい' : room.difficulty === 'pro' ? '🟥 プロ' : '🟪 鬼'}
                          </span>
                        </div>
                        {room.host_message && <p className="text-xs text-slate-300 italic mb-2">「{room.host_message}」</p>}
                        
                        {/* ★ 参加制御 */}
                        {!hasClearRequired && !isHost ? (
                          <div className="bg-red-900/30 border border-red-500/50 p-2 rounded mt-2">
                            <p className="text-xs text-red-300 font-bold mb-1">⚠️ 参加条件を満たしていません</p>
                            <p className="text-[10px] text-slate-400">前提シナリオ『{reqScenario?.title || '不明なシナリオ'}』をクリアする必要があります。</p>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {availableChars.length > 0 ? (
                              <select className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white flex-1" onChange={(e) => executeJoinRoom(room, e.target.value)} value="">
                                <option value="" disabled>キャラクターを選択して参加...</option>
                                {availableChars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            ) : (
                              <span className="text-xs text-red-400 font-bold bg-slate-900 p-1.5 rounded flex-1 text-center">満員です</span>
                            )}
                            {room.privacy === 'open' && (
                              <button onClick={() => spectateRoom(room)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 rounded font-bold">👁️ 観戦</button>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {lobbyTab === 'scenarios' && (
            <div className="h-[500px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {playableScenarios.length === 0 ? <p className="text-slate-400 text-sm p-4 text-center">公開されているシナリオはありません。</p> :
                playableScenarios.map(s => {
                  // ★ 追加：前提シナリオのチェック
                  const reqId = s.requiredScenarioId;
                  const hasClearRequired = reqId ? isScenarioCleared(reqId) : true;
                  const reqScenario = getRequiredScenario(reqId);

                  return (
                    <div key={s.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4 hover:border-emerald-500 transition-colors">
                      <img src={s.imageUrl || NO_IMAGE_SCENARIO} className="w-24 h-24 object-cover rounded" />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                          {s.title}
                          {reqId && <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded">続編</span>}
                        </h3>
                        <div className="text-xs text-slate-400 mb-2 flex gap-3">
                          <span className="text-emerald-400">目安: {s.playTime || 60}分</span>
                          <span className="text-amber-400 font-bold">⭐ {s.ratingCount ? (s.ratingSum / s.ratingCount).toFixed(1) : "未評価"}</span>
                        </div>
                        
                        {/* ★ 部屋作成の制御 */}
                        {!hasClearRequired ? (
                          <div className="bg-slate-900 border border-slate-700 p-2 rounded mt-2 text-center">
                            <p className="text-[10px] text-red-300 font-bold mb-1">※前提シナリオのクリアが必要です</p>
                            {reqScenario ? (
                              <button onClick={() => setRoomConfigModal({ scenario: reqScenario, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: reqScenario.itemVisibility || "none" })} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded shadow">
                                前提シナリオ「{reqScenario.title}」を遊ぶ
                              </button>
                            ) : (
                              <p className="text-[10px] text-slate-500">前提シナリオが現在非公開です。</p>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => setRoomConfigModal({ scenario: s, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: s.itemVisibility || "none" })} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded shadow mt-2">
                            このシナリオで部屋を作成する
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}

          {lobbyTab === 'trials' && (
            <>
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs text-pink-300">広告視聴で導入部(約10分)を無料でAIと遊べます。</p>
              </div>
              <div className="h-[460px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {sortedTrials.length === 0 ? <p className="text-slate-400 text-sm p-4 text-center">お試しプレイ可能なシナリオはありません。</p> :
                  sortedTrials.map(ts => (
                    <div key={ts.id} className="bg-pink-900/10 border border-pink-500/30 rounded-xl p-4 flex gap-4 hover:border-pink-500 transition-colors">
                      <img src={ts.imageUrl || NO_IMAGE_SCENARIO} className="w-24 h-24 object-cover rounded" />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">{ts.title}</h3>
                          <p className="text-[10px] text-pink-300 mb-1">【設定固定】ルール: 国内CoC風 / 難易度: 普通 / アイテム表示なし</p>
                          <span className="text-xs text-amber-400 font-bold">⭐ {ts.ratingCount ? (ts.ratingSum / ts.ratingCount).toFixed(1) : "未評価"}</span>
                        </div>
                        <button onClick={() => startTrialPlay(ts)} className="w-full bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold py-2 rounded shadow mt-2">
                          📺 広告を見てお試しプレイ
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
            <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
              <h2 className="text-sm font-bold text-blue-400">👤 プレイヤー情報</h2>
              {currentUser.isAdmin && (
                <button onClick={async () => { await fetchAdminData(); setCurrentView("admin"); }} className="text-[10px] bg-red-900/50 hover:bg-red-800 text-red-300 px-3 py-1 rounded font-bold border border-red-700/50 transition-colors">⚙️ 管理画面</button>
              )}
            </div>
            <div 
              onClick={() => openUserProfile(currentUser.id)} 
              className="flex gap-4 items-center p-2 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
            >
              <img src={currentUser.avatarUrl} className="w-14 h-14 rounded-full object-cover shadow" />
              <div>
                <p className="text-lg font-bold text-white flex items-center gap-1">{currentUser.handleName}</p>
                <p className="text-[10px] text-slate-500 mt-1">ID: {currentUser.id}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col shadow-lg border-t-2 border-t-emerald-500">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-emerald-400">📜 作成したシナリオ</h2>
              <button onClick={() => { setEditingScenario({ id: "", title: "", system: "", tags: "", setting: "", npcList: "", plot: "", imageUrl: "", presetCharacters: [], ratingSum: 0, ratingCount: 0, price: 500, playLimit: 1, giftLimit: 1, playTime: 60, isTrialOk: false, isPlayableByOthers: false, itemVisibility: "none" }); setCurrentView("scenarioEdit"); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">＋ 新規作成</button>
            </div>
            {createdScenarios.length === 0 ? (
              <p className="text-xs text-slate-400 mt-2 text-center p-2 bg-slate-900 rounded border border-slate-700/50">作成したシナリオはありません。</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {createdScenarios.map(s => {
                  return (
                    <div key={s.id} className={`bg-slate-900 border rounded-lg p-3 flex flex-col gap-2 ${s.isBanned ? 'border-red-900/50 opacity-80' : 'border-slate-700'}`}>
                      <div className="flex items-start gap-3">
                        <img src={s.imageUrl || NO_IMAGE_SCENARIO} className="w-12 h-12 object-cover rounded border border-slate-600" />
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-white flex gap-1 items-center">
                            {s.title} 
                            {s.isTrialOk && <span className="text-[8px] bg-pink-600 text-white px-1 rounded">試</span>}
                            {s.isPlayableByOthers && <span className="text-[8px] bg-blue-600 text-white px-1 rounded">公</span>}
                            {s.isBanned && <span className="text-[8px] bg-red-600 text-white px-1 rounded">BAN</span>}
                          </h4>
                          <p className="text-[9px] text-emerald-400">目安: {s.playTime || 60}分</p>
                          <div className="flex gap-2 mt-2 items-center">
                            <button onClick={() => { setEditingScenario(s); setCurrentView("scenarioEdit"); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded text-white hover:bg-slate-600">編集</button>
                            <button onClick={() => deleteScenario(s.id)} className="text-[10px] bg-red-900/50 px-2 py-1 rounded text-red-300 hover:bg-red-800/80">削除</button>
                            {s.isBanned && (
                              <button onClick={() => setScenarioAppealTarget(s)} className="text-[10px] bg-amber-900/50 px-2 py-1 rounded text-amber-300 hover:bg-amber-800/80 border border-amber-700/50">再審査申請</button>
                            )}
                          </div>
                        </div>
                      </div>
                      {!s.isBanned && (
                        <button onClick={() => setRoomConfigModal({ scenario: s, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: s.itemVisibility || "none" })} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded mt-2 shadow">
                          部屋を立てる
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-auto pt-4 border-t border-slate-800 flex flex-col md:flex-row justify-center items-center gap-4 text-xs text-slate-500 pb-2 flex-shrink-0">
        <a href="/terms" target="_blank" className="hover:text-white transition-colors">利用規約</a>
        <a href="/privacy" target="_blank" className="hover:text-white transition-colors">プライバシーポリシー</a>
        <a href="/tokushoho" target="_blank" className="hover:text-white transition-colors">特定商取引法に基づく表記</a>
        <span className="ml-2">&copy; {new Date().getFullYear()} 五輪警備保障株式会社</span>
      </footer>
    </div>
  );
}