import React, { useState, useEffect } from "react";
import { ViewState, UserProfile, Room, Scenario, RoomDifficulty, GameRule, PlayArchive } from "../../types";
import { supabase } from "../../lib/supabase";

const NO_IMAGE_SCENARIO = "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=400&q=80";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

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
  setRoomConfigModal: React.Dispatch<React.SetStateAction<{ scenario: Scenario, charId: string, privacy: 'open'|'secret', message: string, difficulty: RoomDifficulty, rule: GameRule, itemVisibility: "all"|"self"|"none", aiModel: string } | null>>;
  fetchAdminData: () => Promise<void>;
  startTrialPlay: (scenario: Scenario) => void;
  availableScenarios: Scenario[];
  openUserProfile: (userId: string) => void;
  setScenarioAppealTarget: React.Dispatch<React.SetStateAction<Scenario | null>>;
  playArchives: PlayArchive[];
  setShowTicketModal: React.Dispatch<React.SetStateAction<boolean>>;
  exchangeTicketWithPoints: (type: 'bronze'|'item'|'silver'|'gold'|'platinum'|'diamond', cost: number) => Promise<void>; // ★ bronzeを追加
};

export default function LobbyView({
  currentUser, handleLogout, setShowMailbox, unreadCount, secretRoomIdSearch, setSecretRoomIdSearch,
  rooms, searchedSecretRoom, setSearchedSecretRoom, executeJoinRoom, availableRooms,
  spectateRoom, setEditingScenario, setCurrentView, createdScenarios, deleteScenario, setRoomConfigModal,
  fetchAdminData, startTrialPlay, availableScenarios, openUserProfile, setScenarioAppealTarget, playArchives,
  setShowTicketModal, exchangeTicketWithPoints
}: Props) {
  
  const [lobbyTab, setLobbyTab] = useState<'rooms' | 'scenarios' | 'trials' | 'ranking'>('rooms');
  const [rankingType, setRankingType] = useState<'played' | 'viewed' | 'creator'>('played');
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, {name: string, avatar: string}>>({});

  const trialScenarios = availableScenarios.filter(s => s.isTrialOk);
  const playableScenarios = availableScenarios.filter(s => s.isPlayableByOthers);

  const isScenarioCleared = (scenarioId: string) => {
    return playArchives.some(a => a.scenarioId === scenarioId);
  };

  const getRequiredScenario = (reqId?: string) => {
    if (!reqId) return null;
    return availableScenarios.find(s => s.id === reqId);
  };

  useEffect(() => {
    if (lobbyTab === 'ranking' && rankingType === 'creator') {
      const fetchProfiles = async () => {
        const authorIds = Array.from(new Set(playableScenarios.map(s => s.authorId).filter(Boolean)));
        if (authorIds.length === 0) return;
        const { data } = await supabase.from('profiles').select('id, handle_name, avatar_url').in('id', authorIds as string[]);
        if (data) {
           const map: any = {};
           data.forEach(d => { map[d.id] = { name: d.handle_name, avatar: d.avatar_url }; });
           setCreatorProfiles(map);
        }
      };
      fetchProfiles();
    }
  }, [lobbyTab, rankingType, playableScenarios]);

  const getRankIcon = (idx: number) => {
    if (idx === 0) return <span className="text-3xl">🥇</span>;
    if (idx === 1) return <span className="text-3xl">🥈</span>;
    if (idx === 2) return <span className="text-3xl">🥉</span>;
    return <span className="text-xl font-bold text-slate-400">{idx + 1}</span>;
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full min-h-0 overflow-y-auto custom-scrollbar relative">
      <header className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-700 pb-4 gap-4">
        <div><h1 className="text-3xl font-extrabold text-emerald-400 mb-1">AI GM MORPG Lobby</h1></div>
        <div className="flex flex-wrap items-center gap-4">
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

      <div className="flex gap-4 mb-6 border-b border-slate-700 flex-shrink-0 overflow-x-auto whitespace-nowrap">
        <button onClick={() => setLobbyTab('rooms')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${lobbyTab === 'rooms' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}>🌐 募集中のセッション</button>
        <button onClick={() => setLobbyTab('scenarios')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${lobbyTab === 'scenarios' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>📖 シナリオを探す・作る</button>
        <button onClick={() => setLobbyTab('trials')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${lobbyTab === 'trials' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-400 hover:text-white'}`}>🌟 お試しプレイ</button>
        <button onClick={() => setLobbyTab('ranking')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${lobbyTab === 'ranking' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'}`}>🏆 ランキング</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full mb-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {lobbyTab === 'rooms' && (
            <>
              <div className="flex justify-between items-end flex-wrap gap-2">
                <h2 className="text-sm font-bold text-slate-400">現在参加できるセッション</h2>
                <div className="flex gap-2">
                  <input type="text" placeholder="シークレット部屋ID" value={secretRoomIdSearch} onChange={e=>setSecretRoomIdSearch(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white w-40" />
                  <button onClick={() => { const r = rooms.find(x => x.id === secretRoomIdSearch); if(r){ setSearchedSecretRoom(r); }else{ alert("部屋が見つかりません"); } }} className="bg-slate-700 px-3 py-1 rounded text-xs font-bold">検索</button>
                </div>
              </div>

              <div className="max-h-[60vh] min-h-[300px] overflow-y-auto space-y-4 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50 custom-scrollbar">
                {availableRooms.filter(r => r.privacy === 'open' || r.host_id === currentUser.id).length === 0 ? <p className="text-slate-400 text-sm p-4 text-center">現在募集中のセッションはありません。</p> : 
                  availableRooms.filter(r => r.privacy === 'open' || r.host_id === currentUser.id).map((room) => {
                  const isHost = room.host_id === currentUser.id;
                  const takenIds = Object.values(room.joined_users || {});
                  const availableChars = room.scenario?.presetCharacters.filter(c => !takenIds.includes(c.id)) || [];
                  
                  const reqId = room.scenario?.requiredScenarioId;
                  const hasClearRequired = reqId ? isScenarioCleared(reqId) : true;
                  const reqScenario = getRequiredScenario(reqId);

                  return (
                    <div key={room.id} className={`bg-slate-800 border rounded-xl p-4 flex gap-4 relative transition-colors flex-col sm:flex-row ${room.isWarning ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'border-slate-700 hover:border-blue-500'}`}>
                      {room.isWarning && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                          ⚠️ あなたをブロックしているユーザーが参加しています
                        </div>
                      )}
                      <img src={room.scenario?.imageUrl || NO_IMAGE_SCENARIO} className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded" />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            {room.privacy === 'secret' ? "🔒" : "🔓"} {room.scenario?.title}
                            {isHost && <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded ml-auto">あなたがホスト</span>}
                          </h3>
                        </div>
                        <div className="text-xs text-slate-400 mb-2 flex flex-wrap items-center gap-2">
                          <span>ホスト: <span className="underline cursor-pointer hover:text-blue-300 transition-colors" onClick={() => openUserProfile(room.host_id)}>{room.host_name}</span></span>
                          <span className="text-amber-400 font-bold ml-2">⭐ {room.scenario?.ratingCount ? (room.scenario.ratingSum / room.scenario.ratingCount).toFixed(1) : "未評価"}</span>
                          <span className={`px-1.5 py-0.5 rounded text-white ${room.difficulty === 'beginner' ? 'bg-pink-500' : room.difficulty === 'easy' ? 'bg-green-600' : room.difficulty === 'normal' ? 'bg-blue-600' : room.difficulty === 'hard' ? 'bg-orange-600' : room.difficulty === 'pro' ? 'bg-red-600' : 'bg-purple-600'}`}>
                            {room.difficulty === 'beginner' ? '⬜ 初心者' : room.difficulty === 'easy' ? '🟩 簡単' : room.difficulty === 'normal' ? '🟦 普通' : room.difficulty === 'hard' ? '🟧 難しい' : room.difficulty === 'pro' ? '🟥 プロ' : '🟪 鬼'}
                          </span>
                        </div>
                        {room.host_message && <p className="text-xs text-slate-300 italic mb-2">「{room.host_message}」</p>}
                        
                        {!hasClearRequired && !isHost ? (
                          <div className="bg-red-900/30 border border-red-500/50 p-2 rounded mt-2">
                            <p className="text-xs text-red-300 font-bold mb-1">⚠️ 参加条件を満たしていません</p>
                            <p className="text-[10px] text-slate-400">前提シナリオ『{reqScenario?.title || '不明なシナリオ'}』をクリアする必要があります。</p>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2">
                            {availableChars.length > 0 ? (
                              <select className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white flex-1" onChange={(e) => executeJoinRoom(room, e.target.value)} value="">
                                <option value="" disabled>キャラクターを選択して参加...</option>
                                {availableChars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            ) : (
                              <span className="text-xs text-red-400 font-bold bg-slate-900 p-1.5 rounded flex-1 text-center">満員です</span>
                            )}
                            {room.privacy === 'open' && (
                              <button onClick={() => spectateRoom(room)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1 sm:py-0 rounded font-bold">👁️ 観戦</button>
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
            <div className="max-h-[60vh] min-h-[300px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {playableScenarios.length === 0 ? <p className="text-slate-400 text-sm p-4 text-center">公開されているシナリオはありません。</p> :
                playableScenarios.map(s => {
                  const reqId = s.requiredScenarioId;
                  const hasClearRequired = reqId ? isScenarioCleared(reqId) : true;
                  const reqScenario = getRequiredScenario(reqId);

                  return (
                    <div key={s.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:border-emerald-500 transition-colors">
                      <img src={s.imageUrl || NO_IMAGE_SCENARIO} className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded" />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                          {s.title}
                          {reqId && <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded">続編</span>}
                        </h3>
                        <div className="text-xs text-slate-400 mb-2 flex gap-3">
                          <span className="text-emerald-400">目安: {s.playTime || 60}分</span>
                          <span className="text-amber-400 font-bold">⭐ {s.ratingCount ? (s.ratingSum / s.ratingCount).toFixed(1) : "未評価"}</span>
                        </div>
                        
                        {!hasClearRequired ? (
                          <div className="bg-slate-900 border border-slate-700 p-2 rounded mt-2 text-center">
                            <p className="text-[10px] text-red-300 font-bold mb-1">※前提シナリオのクリアが必要です</p>
                            {reqScenario ? (
                              <button onClick={() => setRoomConfigModal({ scenario: reqScenario, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: reqScenario.itemVisibility || "none", aiModel: 'flash' })} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded shadow">
                                前提シナリオ「{reqScenario.title}」を遊ぶ
                              </button>
                            ) : (
                              <p className="text-[10px] text-slate-500">前提シナリオが現在非公開です。</p>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => setRoomConfigModal({ scenario: s, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: s.itemVisibility || "none", aiModel: 'lite' })} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded shadow mt-2">
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
            <div className="max-h-[60vh] min-h-[300px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {trialScenarios.length === 0 ? <p className="text-slate-400 text-sm p-4 text-center">お試しプレイ可能なシナリオはありません。</p> :
                trialScenarios.map(ts => (
                  <div key={ts.id} className="bg-pink-900/10 border border-pink-500/30 rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:border-pink-500 transition-colors">
                    <img src={ts.imageUrl || NO_IMAGE_SCENARIO} className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded" />
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
          )}

          {lobbyTab === 'ranking' && (
            <div className="flex flex-col h-[60vh] min-h-[400px]">
              <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2">
                <button onClick={() => setRankingType('played')} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${rankingType === 'played' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>🎮 遊ばれた回数</button>
                <button onClick={() => setRankingType('viewed')} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${rankingType === 'viewed' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>👁️ 閲覧数</button>
                <button onClick={() => setRankingType('creator')} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${rankingType === 'creator' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>👑 シナリオ制作者</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {rankingType === 'played' && playableScenarios.slice().sort((a,b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 10).map((s, idx) => (
                  <div key={s.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 flex justify-center items-center">{getRankIcon(idx)}</div>
                    <img src={s.imageUrl || NO_IMAGE_SCENARIO} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{s.title}</h3>
                      <p className="text-xs text-amber-400 mt-1">🎮 {s.playCount || 0} 回プレイ</p>
                    </div>
                    <button onClick={() => setRoomConfigModal({ scenario: s, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: "none", aiModel: 'lite' })} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded font-bold shadow whitespace-nowrap">部屋を作る</button>
                  </div>
                ))}

                {rankingType === 'viewed' && playableScenarios.slice().sort((a,b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 10).map((s, idx) => (
                  <div key={s.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 flex justify-center items-center">{getRankIcon(idx)}</div>
                    <img src={s.imageUrl || NO_IMAGE_SCENARIO} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{s.title}</h3>
                      <p className="text-xs text-blue-400 mt-1">👁️ {s.viewCount || 0} 回閲覧</p>
                    </div>
                    <button onClick={() => setRoomConfigModal({ scenario: s, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: "none", aiModel: 'lite' })} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded font-bold shadow whitespace-nowrap">部屋を作る</button>
                  </div>
                ))}

                {rankingType === 'creator' && (() => {
                  const creatorMap: Record<string, {id: string, pt: number, play: number, view: number}> = {};
                  playableScenarios.forEach(s => {
                    if(!s.authorId) return;
                    if(!creatorMap[s.authorId]) creatorMap[s.authorId] = { id: s.authorId, pt: 0, play: 0, view: 0 };
                    creatorMap[s.authorId].play += (s.playCount || 0);
                    creatorMap[s.authorId].view += (s.viewCount || 0);
                    creatorMap[s.authorId].pt += (s.playCount || 0) + ((s.viewCount || 0) * 0.1);
                  });
                  const ranked = Object.values(creatorMap).sort((a,b) => b.pt - a.pt).slice(0, 10);

                  if (ranked.length === 0) return <p className="text-slate-400 text-sm p-4 text-center">データがありません。</p>;

                  return ranked.map((c, idx) => {
                    const profile = creatorProfiles[c.id];
                    return (
                      <div key={c.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 flex justify-center items-center">{getRankIcon(idx)}</div>
                        <img src={profile?.avatar || DEFAULT_AVATAR} className="w-16 h-16 object-cover rounded-full border-2 border-purple-500 cursor-pointer" onClick={() => openUserProfile(c.id)} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white cursor-pointer hover:text-purple-300 truncate" onClick={() => openUserProfile(c.id)}>{profile?.name || '読込中...'}</h3>
                          <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-3">
                            <span className="text-purple-400 font-bold">✨ {c.pt.toFixed(1)} PT</span>
                            <span>(プレイ: {c.play}回 / 閲覧: {c.view}回)</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg flex flex-col">
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

            <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-2">
               <div className="flex justify-between items-center px-1 mb-1">
                  <span className="text-xs text-slate-400">アイテムチケット</span>
                  <span className="text-sm font-bold text-white">{currentUser.ticketsItem || 0} 枚</span>
               </div>
               
               {/* ★ ブロンズを含めた5列に変更しました */}
               <div className="grid grid-cols-5 gap-1 mt-1">
                  <div className="bg-stone-900 border border-stone-700 rounded p-1 text-center shadow-inner">
                      <span className="block text-[7px] text-stone-400">ブロンズ</span>
                      <span className="block text-xs font-bold text-stone-300">{currentUser.ticketsBronze || 0}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded p-1 text-center shadow-inner">
                      <span className="block text-[7px] text-slate-400">シルバー</span>
                      <span className="block text-xs font-bold text-slate-300">{currentUser.ticketsSilver || 0}</span>
                  </div>
                  <div className="bg-amber-900/20 border border-amber-900/50 rounded p-1 text-center shadow-inner">
                      <span className="block text-[7px] text-amber-500">ゴールド</span>
                      <span className="block text-xs font-bold text-amber-400">{currentUser.ticketsGold || 0}</span>
                  </div>
                  <div className="bg-indigo-900/20 border border-indigo-900/50 rounded p-1 text-center shadow-inner">
                      <span className="block text-[7px] text-indigo-400">プラチナ</span>
                      <span className="block text-xs font-bold text-indigo-300">{currentUser.ticketsPlatinum || 0}</span>
                  </div>
                  <div className="bg-fuchsia-900/20 border border-fuchsia-900/50 rounded p-1 text-center shadow-inner">
                      <span className="block text-[7px] text-fuchsia-400">ダイヤ</span>
                      <span className="block text-xs font-bold text-fuchsia-300">{currentUser.ticketsDiamond || 0}</span>
                  </div>
               </div>
               
               <button onClick={() => setShowTicketModal(true)} className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2.5 rounded font-bold transition-colors shadow">
                 🎟️ チケット購入ストア
               </button>
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
              <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
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
                        <button onClick={() => setRoomConfigModal({ scenario: s, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: s.itemVisibility || "none", aiModel: 'lite' })} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded mt-2 shadow">
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

      <footer className="mt-8 pt-4 border-t border-slate-800 flex flex-col md:flex-row justify-center items-center gap-4 text-xs text-slate-500 pb-4 w-full">
        <a href="/terms" target="_blank" className="hover:text-white transition-colors">利用規約</a>
        <a href="/privacy" target="_blank" className="hover:text-white transition-colors">プライバシーポリシー</a>
        <a href="/tokushoho" target="_blank" className="hover:text-white transition-colors">特定商取引法に基づく表記</a>
        <span className="ml-2">&copy; {new Date().getFullYear()} 五輪警備保障株式会社</span>
      </footer>
    </div>
  );
}