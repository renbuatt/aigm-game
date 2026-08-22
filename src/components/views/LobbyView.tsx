import React, { useState } from "react";
import { UserProfile, Room, Scenario, PlayArchive } from "../../types";

type LobbyViewProps = {
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
  setCurrentView: React.Dispatch<React.SetStateAction<any>>;
  createdScenarios: Scenario[];
  deleteScenario: (id: string) => Promise<void>;
  setRoomConfigModal: React.Dispatch<React.SetStateAction<any>>;
  fetchAdminData: () => Promise<void>;
  startTrialPlay: (scenario: Scenario) => void;
  availableScenarios: Scenario[];
  openUserProfile: (id: string) => Promise<void>;
  setScenarioAppealTarget: React.Dispatch<React.SetStateAction<Scenario | null>>;
  playArchives: PlayArchive[];
  setShowTicketModal: React.Dispatch<React.SetStateAction<boolean>>;
  exchangeTicketWithPoints: (type: 'bronze'|'item'|'silver'|'gold'|'platinum'|'diamond', cost: number) => Promise<void>;
  appLanguage?: "ja" | "en" | "zh";
};

export default function LobbyView(props: LobbyViewProps) {
  const [activeTab, setActiveTab] = useState<'rooms' | 'scenarios' | 'create'>('rooms');
  
  // ★ 言語ごとのUI辞書
  const lang = props.appLanguage || "ja";
  const t = {
    ja: { lobby: "TRPG ロビー", rooms: "募集中の部屋", scenarios: "シナリオ一覧", create: "シナリオ作成", mypage: "マイページ", library: "プレイ書庫", logout: "ログアウト", store: "チケット購入", searchRoom: "シークレット部屋IDを入力...", search: "検索", host: "ホスト", players: "参加者", spectate: "観戦", join: "参加", author: "作者", play: "プレイ", view: "観戦", createRoom: "部屋を立てる", trial: "お試しプレイ", details: "詳細を見る", edit: "編集", del: "削除", selectChar: "キャラクターを選択して参加...", noRooms: "現在募集中の部屋はありません。", noScenarios: "まだ作成されたシナリオはありません。", myScenarios: "あなたの作成したシナリオ", newScenario: "+ 新規作成", originalScenario: "✨ オリジナルシナリオを作る", originalDesc: "あなただけの物語を作成し、世界中のプレイヤーと共有しましょう。" },
    en: { lobby: "TRPG Lobby", rooms: "Open Rooms", scenarios: "Scenarios", create: "Create", mypage: "My Page", library: "Library", logout: "Logout", store: "Ticket Store", searchRoom: "Enter Secret Room ID...", search: "Search", host: "Host", players: "Players", spectate: "Spectate", join: "Join", author: "Author", play: "Plays", view: "Views", createRoom: "Create Room", trial: "Trial Play", details: "Details", edit: "Edit", del: "Delete", selectChar: "Select a character to join...", noRooms: "No rooms are currently open.", noScenarios: "No scenarios have been created yet.", myScenarios: "Your Created Scenarios", newScenario: "+ Create New", originalScenario: "✨ Create Original Scenario", originalDesc: "Create your own story and share it with players worldwide." },
    zh: { lobby: "TRPG 大厅", rooms: "开放房间", scenarios: "剧本列表", create: "创建剧本", mypage: "我的主页", library: "游玩记录", logout: "登出", store: "购买门票", searchRoom: "输入私密房间 ID...", search: "搜索", host: "房主", players: "玩家", spectate: "观战", join: "加入", author: "作者", play: "游玩", view: "观战", createRoom: "创建房间", trial: "试玩", details: "查看详情", edit: "编辑", del: "删除", selectChar: "选择角色加入...", noRooms: "当前没有开放的房间。", noScenarios: "目前还没有创建任何剧本。", myScenarios: "你创建的剧本", newScenario: "+ 创建新剧本", originalScenario: "✨ 创建原创剧本", originalDesc: "创建你自己的故事并与全世界的玩家分享。" }
  }[lang];

  // ★ シナリオデータを指定言語に自動翻訳（代入）する関数
  const getTScen = (scenario: Scenario): Scenario => {
    if (!scenario) return scenario;
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

  const localizedScenarios = props.availableScenarios.map(s => getTScen(s));
  const localizedRooms = props.availableRooms.map(r => ({ ...r, scenario: getTScen(r.scenario) }));
  const localizedCreated = props.createdScenarios.map(s => getTScen(s));

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden w-full max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-tight">
            {t.lobby}
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             Welcome, <span className="text-white">{props.currentUser.handleName}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={()=>props.setShowTicketModal(true)} className="px-4 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/40 rounded-lg text-sm font-bold transition-colors">🎟️ {t.store}</button>
          <button onClick={()=>props.setShowMailbox(true)} className="relative p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
            🔔 {props.unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-lg border-2 border-slate-900">{props.unreadCount}</span>}
          </button>
          <button onClick={()=>props.setCurrentView("userProfile")} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm rounded-lg font-bold transition-colors">👤 {t.mypage}</button>
          <button onClick={()=>props.setCurrentView("library")} className="px-4 py-2 bg-purple-900/40 text-purple-300 border border-purple-500/30 hover:bg-purple-900/80 text-sm rounded-lg font-bold transition-colors">📚 {t.library}</button>
          {props.currentUser.isAdmin && <button onClick={()=>props.setCurrentView("admin")} className="px-4 py-2 bg-red-900/40 text-red-300 border border-red-500/30 hover:bg-red-900/80 text-sm rounded-lg font-bold transition-colors">⚙️ Admin</button>}
          <button onClick={props.handleLogout} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm rounded-lg font-bold transition-colors">🚪 {t.logout}</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-800 bg-slate-900/30 p-4 flex flex-col gap-2 shrink-0">
          <button onClick={()=>setActiveTab('rooms')} className={`flex items-center gap-3 px-4 py-4 rounded-xl font-bold transition-all ${activeTab==='rooms' ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>🚪 {t.rooms}</button>
          <button onClick={()=>setActiveTab('scenarios')} className={`flex items-center gap-3 px-4 py-4 rounded-xl font-bold transition-all ${activeTab==='scenarios' ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>📖 {t.scenarios}</button>
          <button onClick={()=>setActiveTab('create')} className={`flex items-center gap-3 px-4 py-4 rounded-xl font-bold transition-all ${activeTab==='create' ? 'bg-emerald-600 shadow-lg shadow-emerald-900/50 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>✏️ {t.create}</button>

          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Secret Room</div>
            <div className="flex gap-2">
              <input type="text" value={props.secretRoomIdSearch} onChange={e=>props.setSecretRoomIdSearch(e.target.value)} placeholder={t.searchRoom} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-colors" />
              <button onClick={async () => {
                if(!props.secretRoomIdSearch.trim()) return;
                const r = props.rooms.find(x => x.id === props.secretRoomIdSearch.trim() && x.status === 'recruiting');
                if(r) props.setSearchedSecretRoom(r); else alert("該当する部屋が見つかりません。");
              }} className="bg-slate-700 hover:bg-slate-600 px-3 rounded-lg text-sm font-bold transition-colors">{t.search}</button>
            </div>
          </div>
        </div>

        {/* List Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900 custom-scrollbar">
          
          {/* Secret Room Hit */}
          {props.searchedSecretRoom && (
             <div className="mb-8 p-1 border-2 border-emerald-500/50 rounded-2xl bg-emerald-900/10 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative">
                <div className="absolute -top-3 left-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">シークレット部屋発見！</div>
                <div className="p-4 bg-slate-800 rounded-xl">
                   <h3 className="font-bold text-lg mb-2">{getTScen(props.searchedSecretRoom.scenario).title}</h3>
                   <button onClick={() => {}} className="bg-emerald-600 px-4 py-2 rounded font-bold">参加する (Coming Soon)</button>
                   <button onClick={()=>props.setSearchedSecretRoom(null)} className="ml-2 text-sm text-slate-400">閉じる</button>
                </div>
             </div>
          )}

          {/* Tab: Rooms */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              {localizedRooms.length === 0 && <div className="text-center text-slate-500 py-20 font-medium bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">{t.noRooms}</div>}
              {localizedRooms.map(room => (
                <div key={room.id} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                  <div className="flex flex-col md:flex-row gap-6 relative z-10">
                    {room.scenario?.imageUrl ? (
                      <div className="w-full md:w-48 h-32 md:h-full shrink-0 rounded-xl overflow-hidden relative shadow-lg">
                         <img src={room.scenario.imageUrl} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                      </div>
                    ) : (
                      <div className="w-full md:w-48 h-32 md:h-full shrink-0 rounded-xl bg-slate-700 flex items-center justify-center shadow-inner">
                        <span className="text-slate-500 font-bold text-lg">No Image</span>
                      </div>
                    )}
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                           {room.privacy === 'secret' && <span className="bg-purple-900/80 text-purple-200 text-xs px-2 py-0.5 rounded shadow border border-purple-500/30">🔒 Secret</span>}
                           {room.isWarning && <span className="bg-red-900/80 text-red-200 text-xs px-2 py-0.5 rounded shadow border border-red-500/30">⚠️ ブロックユーザー参加中</span>}
                           <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded-md border border-blue-500/30 font-semibold tracking-wide">
                             {room.ai_model === 'lite' ? '🟢 Lite' : room.ai_model === 'pro' ? '🟡 Pro' : room.ai_model === 'claude' ? '🟣 Claude' : room.ai_model === 'opus' ? '💎 Opus' : '🔵 Flash'}
                           </span>
                        </div>
                        <h3 className="text-xl font-bold mb-1 line-clamp-1">{room.scenario?.title}</h3>
                        <p className="text-sm text-slate-400 flex items-center gap-2 mb-3">
                          <span className="font-medium text-slate-300">{t.host}: <span className="text-blue-300">{room.host_name}</span></span>
                          <span className="text-slate-600">|</span>
                          <span className="text-xs">ID: {room.id.substring(0,8)}...</span>
                        </p>
                        
                        {room.host_message && (
                          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-sm text-slate-300 mb-4 italic border-l-4 border-l-blue-500">
                             "{room.host_message}"
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 mt-auto">
                        <div className="w-full sm:w-auto">
                          <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">👤 {t.players}</div>
                          <div className="flex flex-wrap gap-2">
                            {room.scenario?.presetCharacters.map((c: any) => {
                              const isTaken = Object.values(room.joined_users || {}).includes(c.id);
                              return (
                                <div key={c.id} className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 ${isTaken ? 'bg-slate-700/50 border-slate-600 text-slate-500' : 'bg-slate-900 border-blue-500/30 text-blue-200'}`}>
                                  {isTaken ? <span className="text-[10px]">❌</span> : <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                  {c.name}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                          <select id={`char_select_${room.id}`} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none flex-1">
                            <option value="">{t.selectChar}</option>
                            {room.scenario?.presetCharacters.map((c: any) => {
                              const isTaken = Object.values(room.joined_users || {}).includes(c.id);
                              if (isTaken) return null;
                              return <option key={c.id} value={c.id}>{c.name}</option>;
                            })}
                          </select>
                          <button onClick={() => props.spectateRoom(room)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold shadow transition-colors shrink-0">👁️ {t.spectate}</button>
                          <button onClick={() => {
                            const charId = (document.getElementById(`char_select_${room.id}`) as HTMLSelectElement)?.value;
                            if(charId) props.executeJoinRoom(room, charId); else alert(t.selectChar);
                          }} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/50 transition-colors shrink-0">{t.join}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Scenarios */}
          {activeTab === 'scenarios' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {localizedScenarios.length === 0 && <div className="col-span-full text-center text-slate-500 py-20 font-medium bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">{t.noScenarios}</div>}
              {localizedScenarios.map((s) => (
                <div key={s.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col group hover:border-slate-500 transition-colors shadow-lg">
                  {s.imageUrl ? (
                    <div className="h-48 overflow-hidden relative">
                      <img src={s.imageUrl} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                    </div>
                  ) : (
                    <div className="h-48 bg-slate-700 flex items-center justify-center shadow-inner relative">
                      <span className="text-slate-500 font-bold text-lg">No Image</span>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                    </div>
                  )}
                  
                  <div className="p-5 flex flex-col flex-1 relative z-10 -mt-8">
                    <div className="flex gap-2 mb-3">
                      {s.price && s.price > 0 ? (
                        <span className="bg-yellow-900/80 text-yellow-300 text-xs px-2 py-0.5 rounded shadow border border-yellow-500/30 font-bold flex items-center gap-1">🎟️ {s.price}pt</span>
                      ) : (
                        <span className="bg-emerald-900/80 text-emerald-300 text-xs px-2 py-0.5 rounded shadow border border-emerald-500/30 font-bold">🆓 Free</span>
                      )}
                      {s.ratingCount && s.ratingCount > 0 ? (
                        <span className="bg-slate-900/80 text-yellow-400 text-xs px-2 py-0.5 rounded shadow border border-slate-700 font-bold flex items-center gap-1">⭐ {(s.ratingSum / s.ratingCount).toFixed(1)}</span>
                      ) : (
                        <span className="bg-slate-900/80 text-slate-400 text-xs px-2 py-0.5 rounded shadow border border-slate-700">⭐ 未評価</span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2 line-clamp-2 leading-tight">{s.title}</h3>
                    <p className="text-xs text-slate-400 mb-4 flex items-center gap-2">
                       <span className="font-medium">{t.author}: <button onClick={()=>props.openUserProfile(s.authorId)} className="text-blue-400 hover:underline">{s.authorId.substring(0,6)}...</button></span>
                       <span className="text-slate-600">|</span>
                       <span>{t.play}:{s.playCount||0} / {t.view}:{s.viewCount||0}</span>
                    </p>
                    <p className="text-sm text-slate-300 mb-6 line-clamp-3 leading-relaxed flex-1">{s.description}</p>
                    
                    <div className="flex gap-2 mt-auto">
                      <button onClick={()=>props.setRoomConfigModal({ scenario: s, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: "none", aiModel: "lite", language: lang })} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg shadow-lg shadow-blue-900/50 transition-colors text-sm">{t.createRoom}</button>
                      <button onClick={()=>props.startTrialPlay(s)} className="px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-lg shadow transition-colors text-sm whitespace-nowrap">🤖 {t.trial}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Create (Created Scenarios) */}
          {activeTab === 'create' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                 <div>
                   <h3 className="text-xl font-bold text-emerald-400">{t.originalScenario}</h3>
                   <p className="text-sm text-slate-400 mt-1">{t.originalDesc}</p>
                 </div>
                 <button onClick={()=>{
                   props.setEditingScenario({ id: 's_'+Date.now(), title: "", description: "", system: "オリジナル", tags: "", setting: "", npcList: "", plot: "", prologue: "", epilogue: "", imageUrl: "", presetCharacters: [], ratingSum: 0, ratingCount: 0, authorId: props.currentUser.id, price: 0, playLimit: 1, giftLimit: 1, purchasedTickets: {}, playTime: 60, isPlayableByOthers: true, isTrialOk: false, itemVisibility: "none", requiredScenarioId: "", isBanned: false });
                   props.setCurrentView("scenarioEdit");
                 }} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/50 transition-transform active:scale-95 text-lg">
                   {t.newScenario}
                 </button>
              </div>

              <div className="space-y-4">
                 <h4 className="font-bold text-slate-400 pl-2">{t.myScenarios}</h4>
                 {localizedCreated.length === 0 && <div className="text-center text-slate-500 py-10 bg-slate-800/30 rounded-xl border border-slate-700 border-dashed">{t.noScenarios}</div>}
                 {localizedCreated.map(s => (
                   <div key={s.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-500 transition-colors">
                     <div className="flex gap-4 items-center w-full sm:w-auto">
                        {s.imageUrl ? <img src={s.imageUrl} alt="cover" className="w-20 h-20 rounded-lg object-cover shadow" /> : <div className="w-20 h-20 rounded-lg bg-slate-700 flex items-center justify-center shadow-inner"><span className="text-xs text-slate-500 font-bold">No Img</span></div>}
                        <div>
                          <div className="font-bold text-lg mb-1">{s.title || "名称未設定"}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-3">
                            {s.isBanned ? <span className="text-red-400 font-bold">⚠️ 修正依頼中 (非公開)</span> : <span className="text-emerald-400">🟢 公開中</span>}
                            <span>{t.play}: {s.playCount||0}</span>
                            <span>⭐ {(s.ratingCount||0)>0 ? (s.ratingSum!/s.ratingCount!).toFixed(1) : "-"}</span>
                          </div>
                        </div>
                     </div>
                     <div className="flex gap-2 w-full sm:w-auto">
                        {s.isBanned && <button onClick={()=>props.setScenarioAppealTarget(s)} className="flex-1 sm:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold rounded-lg text-sm shadow">再審査</button>}
                        <button onClick={()=>{ props.setEditingScenario(s); props.setCurrentView("scenarioEdit"); }} className="flex-1 sm:flex-none px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-sm shadow transition-colors">✏️ {t.edit}</button>
                        <button onClick={()=>props.deleteScenario(s.id!)} className="flex-1 sm:flex-none px-4 py-2 bg-red-900/80 hover:bg-red-800 text-red-200 font-bold rounded-lg text-sm shadow transition-colors">🗑️ {t.del}</button>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}