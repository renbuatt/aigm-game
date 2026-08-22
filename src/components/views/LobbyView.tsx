import React, { useState } from "react";
import { ViewState, UserProfile, Room, Scenario, PlayArchive, Character } from "../../types";

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
  setRoomConfigModal: React.Dispatch<React.SetStateAction<any>>;
  fetchAdminData: () => Promise<void>;
  startTrialPlay: (scenario: Scenario) => void;
  availableScenarios: Scenario[];
  openUserProfile: (userId: string) => void;
  setScenarioAppealTarget: React.Dispatch<React.SetStateAction<Scenario | null>>;
  playArchives: PlayArchive[];
  setShowTicketModal: React.Dispatch<React.SetStateAction<boolean>>;
  exchangeTicketWithPoints: (type: 'bronze'|'item'|'silver'|'gold'|'platinum'|'diamond', cost: number) => Promise<void>;
  appLanguage?: "ja" | "en" | "zh"; // ★多言語対応
};

export default function LobbyView({
  currentUser, handleLogout, setShowMailbox, unreadCount,
  secretRoomIdSearch, setSecretRoomIdSearch, rooms, searchedSecretRoom, setSearchedSecretRoom,
  executeJoinRoom, availableRooms, spectateRoom, setEditingScenario, setCurrentView,
  createdScenarios, deleteScenario, setRoomConfigModal, fetchAdminData, startTrialPlay,
  availableScenarios, openUserProfile, setScenarioAppealTarget, playArchives,
  setShowTicketModal, exchangeTicketWithPoints, appLanguage
}: Props) {
  const [activeTab, setActiveTab] = useState<'rooms' | 'scenarios' | 'myScenarios'>('rooms');
  const [selectedRoomToJoin, setSelectedRoomToJoin] = useState<Room | null>(null);
  const [selectedCharIdToJoin, setSelectedCharIdToJoin] = useState<string>("");

  // ★ 言語ごとのUI辞書
  const lang = appLanguage || "ja";
  const t = {
    ja: { lobby: "TRPG ロビー", rooms: "募集中の部屋", scenarios: "公式・公開シナリオ", myScenarios: "マイシナリオ", create: "シナリオ作成", mypage: "マイページ", library: "書庫", logout: "ログアウト", store: "チケット購入", searchRoom: "ホストから教えられたIDを入力", search: "検索", host: "ホスト", players: "参加者", spectate: "観戦する", join: "参加する", author: "作者", play: "プレイ回数", view: "観戦数", createRoom: "このシナリオで部屋を作る", trial: "無料お試しプレイ (ソロ)", details: "詳細を見る", edit: "編集", del: "削除", selectChar: "入室するキャラクターを選択", noRooms: "現在募集中の部屋はありません。", noScenarios: "まだ作成されたシナリオはありません。", newScenario: "新しいシナリオを作成する", secretFound: "🔍 検索結果 (シークレット)", recruiting: "募集中", playing: "プレイ中", official: "公式", userCreated: "ユーザー作成", playTime: "約", mins: "分", full: "満室", slots: "枠 空き", cancel: "キャンセル", confirmJoin: "決定して入室", roomName: "部屋", taken: "※他のプレイヤーが選択済み", appeal: "再審査を申請", underReview: "非公開措置中", secretMode: "シークレット部屋IDで入室", defaultMessage: "よろしくお願いします！" },
    en: { lobby: "TRPG Lobby", rooms: "Open Rooms", scenarios: "Official/Public Scenarios", myScenarios: "My Scenarios", create: "Create", mypage: "My Page", library: "Library", logout: "Logout", store: "Ticket Store", searchRoom: "Enter Room ID from Host", search: "Search", host: "Host", players: "Players", spectate: "Spectate", join: "Join", author: "Author", play: "Plays", view: "Views", createRoom: "Create Room", trial: "Free Trial (Solo)", details: "Details", edit: "Edit", del: "Delete", selectChar: "Select a Character to Join", noRooms: "No rooms are currently open.", noScenarios: "No scenarios have been created yet.", newScenario: "Create New Scenario", secretFound: "🔍 Search Result (Secret)", recruiting: "Recruiting", playing: "Playing", official: "Official", userCreated: "User Created", playTime: "~", mins: "mins", full: "Full", slots: "slots open", cancel: "Cancel", confirmJoin: "Confirm & Join", roomName: "Room", taken: "*Already taken", appeal: "Appeal", underReview: "Under Review", secretMode: "Join via Secret ID", defaultMessage: "Let's play!" },
    zh: { lobby: "TRPG 大厅", rooms: "开放房间", scenarios: "官方/公开剧本", myScenarios: "我的剧本", create: "创建剧本", mypage: "我的主页", library: "游玩记录", logout: "登出", store: "购买门票", searchRoom: "输入房主提供的房间 ID", search: "搜索", host: "房主", players: "玩家", spectate: "观战", join: "加入", author: "作者", play: "游玩次数", view: "观战次数", createRoom: "创建房间", trial: "免费试玩 (单人)", details: "查看详情", edit: "编辑", del: "删除", selectChar: "选择角色加入", noRooms: "当前没有开放的房间。", noScenarios: "目前还没有创建任何剧本。", newScenario: "创建新剧本", secretFound: "🔍 搜索结果 (私密)", recruiting: "招募中", playing: "游戏中", official: "官方", userCreated: "用户创建", playTime: "约", mins: "分钟", full: "满员", slots: "个空位", cancel: "取消", confirmJoin: "确认加入", roomName: "房间", taken: "※已被其他玩家选择", appeal: "申请复审", underReview: "审核中", secretMode: "通过私密ID加入", defaultMessage: "请多关照！" }
  }[lang];

  // ★ シナリオデータを指定言語に自動翻訳（代入）する関数（undefined保護済み）
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

  // 表示用に翻訳済みのリストを生成 & タイトルに言語バッジを付与
  const localizedScenarios = availableScenarios.map(s => getTScen(s)!);
  const localizedRooms = availableRooms.map(r => {
    const sc = getTScen(r.scenario);
    let langBadge = "🇯🇵 ";
    if (r.language === 'en') langBadge = "🇺🇸 EN | ";
    else if (r.language === 'zh') langBadge = "🇨🇳 ZH | ";
    if (sc) sc.title = `${langBadge}${sc.title}`;
    return { ...r, scenario: sc };
  });
  const localizedCreated = createdScenarios.map(s => getTScen(s)!);

  const handleSearchSecretRoom = () => {
    if (!secretRoomIdSearch.trim()) return;
    const found = rooms.find(r => r.id === secretRoomIdSearch.trim() && r.privacy === 'secret');
    if (found) {
      setSearchedSecretRoom(found);
    } else {
      alert("指定されたIDのシークレット部屋は見つかりませんでした。");
      setSearchedSecretRoom(null);
    }
  };

  const getAiModelName = (modelId: string) => {
    switch(modelId) {
      case 'lite': return '🟤 Gemini 3.5 Flash Lite';
      case 'flash': return '⚪ Gemini 3.6 Flash';
      case 'pro': return '🟡 Gemini 3.1 Pro';
      case 'claude': return '🟣 Claude Sonnet 5';
      case 'opus': return '💎 Claude Opus 5';
      default: return '🟤 Gemini 3.5 Flash Lite';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      
      {/* ヘッダーエリア */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 shadow-md flex-shrink-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => openUserProfile(currentUser.id)} className="relative group cursor-pointer">
              <img src={currentUser.avatarUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover border-2 border-slate-600 group-hover:border-emerald-500 transition" />
            </button>
            <div>
              <p className="font-bold text-white flex items-center gap-2">
                {currentUser.handleName}
                <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">ID: {currentUser.id.substring(0, 8)}...</span>
              </p>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setShowTicketModal(true)} className="text-[10px] bg-yellow-600/20 text-yellow-500 border border-yellow-500/50 px-2 py-0.5 rounded font-bold hover:bg-yellow-600/40 transition">
                  🪙 {currentUser.points || 0} pt
                </button>
                <button onClick={() => setCurrentView("library")} className="text-[10px] bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 px-2 py-0.5 rounded font-bold hover:bg-indigo-600/40 transition">
                  📚 {t.library} ({playArchives.length})
                </button>
              </div>
            </div>
          </div>

          {/* チケット所持状況 */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-md custom-scrollbar">
             <button onClick={() => setShowTicketModal(true)} className="flex flex-col items-center justify-center bg-stone-800 border border-stone-600 rounded px-2 py-1 min-w-[50px] hover:bg-stone-700">
               <span className="text-[8px] text-stone-400 font-bold">ブロンズ</span>
               <span className="text-sm font-bold text-stone-200">{currentUser.ticketsBronze || 0}</span>
             </button>
             <button onClick={() => setShowTicketModal(true)} className="flex flex-col items-center justify-center bg-slate-700 border border-slate-500 rounded px-2 py-1 min-w-[50px] hover:bg-slate-600">
               <span className="text-[8px] text-slate-300 font-bold">シルバー</span>
               <span className="text-sm font-bold text-white">{currentUser.ticketsSilver || 0}</span>
             </button>
             <button onClick={() => setShowTicketModal(true)} className="flex flex-col items-center justify-center bg-amber-900/50 border border-amber-600 rounded px-2 py-1 min-w-[50px] hover:bg-amber-800/50">
               <span className="text-[8px] text-amber-400 font-bold">ゴールド</span>
               <span className="text-sm font-bold text-amber-200">{currentUser.ticketsGold || 0}</span>
             </button>
             <button onClick={() => setShowTicketModal(true)} className="flex flex-col items-center justify-center bg-indigo-900/50 border border-indigo-500 rounded px-2 py-1 min-w-[50px] hover:bg-indigo-800/50">
               <span className="text-[8px] text-indigo-300 font-bold">プラチナ</span>
               <span className="text-sm font-bold text-indigo-100">{currentUser.ticketsPlatinum || 0}</span>
             </button>
             <button onClick={() => setShowTicketModal(true)} className="flex flex-col items-center justify-center bg-fuchsia-900/40 border border-fuchsia-500 rounded px-2 py-1 min-w-[50px] hover:bg-fuchsia-800/40">
               <span className="text-[8px] text-fuchsia-300 font-bold">ダイヤ</span>
               <span className="text-sm font-bold text-fuchsia-100">{currentUser.ticketsDiamond || 0}</span>
             </button>
             <div className="w-px h-6 bg-slate-600 mx-1"></div>
             <button onClick={() => setShowTicketModal(true)} className="flex flex-col items-center justify-center bg-emerald-900/30 border border-emerald-600 rounded px-2 py-1 min-w-[50px] hover:bg-emerald-800/30">
               <span className="text-[8px] text-emerald-400 font-bold">アイテム</span>
               <span className="text-sm font-bold text-emerald-200">{currentUser.ticketsItem || 0}</span>
             </button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowMailbox(true)} className="relative bg-slate-700 hover:bg-slate-600 text-white p-2 rounded shadow">
              ✉️
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse">{unreadCount}</span>}
            </button>
            {currentUser.isAdmin && (
              <button onClick={() => { fetchAdminData(); setCurrentView("admin"); }} className="bg-red-900/80 hover:bg-red-700 text-white text-xs px-3 py-2 rounded font-bold shadow border border-red-500/50 transition">
                ⚙️ 管理
              </button>
            )}
            <button onClick={handleLogout} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded font-bold shadow transition">
              {t.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col max-w-6xl mx-auto w-full p-4 gap-4">
        
        {/* タブ切り替え */}
        <div className="flex gap-2 border-b border-slate-700 pb-2 flex-shrink-0 overflow-x-auto">
          <button onClick={() => setActiveTab('rooms')} className={`px-4 py-2 font-bold text-sm rounded-t-lg transition whitespace-nowrap ${activeTab === 'rooms' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}>
            🚪 {t.rooms} ({availableRooms.filter(r => r.status === 'recruiting' && r.privacy === 'open').length})
          </button>
          <button onClick={() => setActiveTab('scenarios')} className={`px-4 py-2 font-bold text-sm rounded-t-lg transition whitespace-nowrap ${activeTab === 'scenarios' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}>
            📚 {t.scenarios} ({availableScenarios.length})
          </button>
          <button onClick={() => setActiveTab('myScenarios')} className={`px-4 py-2 font-bold text-sm rounded-t-lg transition whitespace-nowrap ${activeTab === 'myScenarios' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800'}`}>
            📝 {t.myScenarios} ({createdScenarios.length})
          </button>
        </div>

        {/* メインコンテンツエリア */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
          
          {/* ==========================================================
              募集中の部屋 タブ
          ========================================================== */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              
              {/* シークレット部屋検索 */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow flex flex-col md:flex-row gap-3 items-center">
                <span className="text-sm font-bold text-slate-300 whitespace-nowrap">🔒 {t.secretMode}</span>
                <input 
                  type="text" 
                  value={secretRoomIdSearch} 
                  onChange={(e) => setSecretRoomIdSearch(e.target.value)} 
                  placeholder={t.searchRoom} 
                  className="flex-1 bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                />
                <button onClick={handleSearchSecretRoom} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm font-bold whitespace-nowrap transition">
                  {t.search}
                </button>
              </div>

              {searchedSecretRoom && (
                <div className="bg-indigo-900/30 border border-indigo-500/50 rounded-xl p-4 shadow animate-fade-in">
                  <h4 className="text-indigo-400 font-bold mb-2">{t.secretFound}</h4>
                  <div className="flex justify-between items-center bg-slate-800 p-3 rounded">
                    <div>
                      <p className="font-bold text-white text-lg">{getTScen(searchedSecretRoom.scenario)?.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{t.host}: {searchedSecretRoom.host_name} | AI: {getAiModelName(searchedSecretRoom.ai_model || 'lite')}</p>
                    </div>
                    <button onClick={() => setSelectedRoomToJoin(searchedSecretRoom)} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded font-bold shadow text-sm">
                      {t.join}
                    </button>
                  </div>
                </div>
              )}

              {/* 公開部屋リスト */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localizedRooms.filter(r => r.privacy === 'open').length === 0 ? (
                  <div className="col-span-full py-12 text-center bg-slate-800/50 border border-slate-700 rounded-xl">
                    <p className="text-slate-400">{t.noRooms}</p>
                  </div>
                ) : (
                  localizedRooms.filter(r => r.privacy === 'open').map(room => {
                    const sc = room.scenario;
                    if (!sc) return null;
                    const takenIds = Object.values(room.joined_users || {});
                    const availableChars = sc.presetCharacters.filter(c => !takenIds.includes(c.id));
                    const isFull = availableChars.length === 0;

                    return (
                      <div key={room.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg hover:border-slate-500 transition duration-300 flex flex-col">
                        <div className="h-24 relative">
                          <img src={sc.imageUrl || NO_IMAGE_SCENARIO} className="w-full h-full object-cover opacity-60" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                          <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow ${room.status === 'recruiting' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                              {room.status === 'recruiting' ? t.recruiting : t.playing}
                            </span>
                            <span className="text-[10px] bg-slate-900/80 text-slate-300 px-2 py-0.5 rounded border border-slate-600">
                              {getAiModelName(room.ai_model || 'lite')}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className="font-bold text-white text-lg line-clamp-1 mb-1">{sc.title}</h3>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded">{t.host}: {room.host_name}</span>
                            {room.isWarning && <span className="text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded border border-red-500/30">⚠️ ブロックユーザー在室</span>}
                          </div>
                          <p className="text-xs text-slate-300 line-clamp-2 mb-4 bg-slate-900/50 p-2 rounded italic">
                            "{room.host_message || t.defaultMessage}"
                          </p>
                          
                          <div className="mt-auto pt-3 border-t border-slate-700 flex gap-2">
                            {room.status === 'recruiting' ? (
                              isFull ? (
                                <button disabled className="flex-1 bg-slate-700 text-slate-500 py-2 rounded text-sm font-bold cursor-not-allowed">{t.full}</button>
                              ) : (
                                <button onClick={() => setSelectedRoomToJoin(room)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-sm font-bold text-white shadow">
                                  {t.join} ({availableChars.length}{t.slots})
                                </button>
                              )
                            ) : (
                              <button onClick={() => spectateRoom(room)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm font-bold text-white shadow">
                                👁️ {t.spectate}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ==========================================================
              公式・公開シナリオ タブ
          ========================================================== */}
          {activeTab === 'scenarios' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {localizedScenarios.length === 0 && <div className="col-span-full py-12 text-center bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400">{t.noScenarios}</div>}
              {localizedScenarios.map(sc => (
                <div key={sc.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg hover:border-slate-500 transition duration-300 flex flex-col group">
                  <div className="h-36 relative overflow-hidden">
                    <img src={sc.imageUrl || NO_IMAGE_SCENARIO} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {sc.authorId === null && <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">{t.official}</div>}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-white text-lg line-clamp-1 mb-1">{sc.title}</h3>
                    <p className="text-xs text-slate-400 mb-2">{t.author}: {sc.authorId ? t.userCreated : t.official} | ⏱️ {t.playTime}{sc.playTime || 60}{t.mins}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {sc.tags?.split(',').map((tag, i) => <span key={i} className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">#{tag.trim()}</span>)}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-3 mb-4">{sc.setting}</p>
                    
                    <div className="mt-auto flex flex-col gap-2">
                      <button onClick={() => setRoomConfigModal({ scenario: sc, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: "all", aiModel: "lite" })} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-sm font-bold shadow text-white">
                        🚪 {t.createRoom}
                      </button>
                      {sc.presetCharacters && sc.presetCharacters.length > 0 && (
                        <button onClick={() => startTrialPlay(sc)} className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm font-bold shadow text-slate-300 border border-slate-600">
                          ✨ {t.trial}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ==========================================================
              マイシナリオ タブ
          ========================================================== */}
          {activeTab === 'myScenarios' && (
            <div className="space-y-6">
              <button onClick={() => { setEditingScenario({ id: `s_${Date.now()}`, title: "新規シナリオ", system: "", tags: "", setting: "", npcList: "", plot: "", prologue: "", epilogue: "", imageUrl: "", presetCharacters: [], ratingSum: 0, ratingCount: 0, authorId: currentUser.id, purchasedTickets: {}, price: 0, playLimit: 1, giftLimit: 1, playTime: 60, isPlayableByOthers: false, isTrialOk: false, itemVisibility: "none", requiredScenarioId: "", playCount: 0, viewCount: 0 }); setCurrentView("scenarioEdit"); }} className="w-full bg-slate-800 border-2 border-dashed border-emerald-500/50 hover:bg-slate-800/80 hover:border-emerald-500 text-emerald-400 py-6 rounded-xl text-lg font-bold transition">
                ＋ {t.newScenario}
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localizedCreated.length === 0 && <div className="col-span-full py-12 text-center bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400">{t.noScenarios}</div>}
                {localizedCreated.map(sc => (
                  <div key={sc.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-lg">
                    <img src={sc.imageUrl || NO_IMAGE_SCENARIO} className="w-24 h-24 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-white text-lg line-clamp-1">{sc.title}</h3>
                          {sc.isBanned && <span className="text-[10px] bg-red-900/80 text-red-300 px-2 py-0.5 rounded border border-red-500 whitespace-nowrap">{t.underReview}</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{t.play}: {sc.playCount || 0} | {t.view}: {sc.viewCount || 0}</p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => { setEditingScenario(sc); setCurrentView("scenarioEdit"); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-1.5 rounded text-xs font-bold text-white shadow">
                          ✏️ {t.edit}
                        </button>
                        <button onClick={() => deleteScenario(sc.id!)} className="bg-red-900/50 hover:bg-red-800 text-red-300 px-3 py-1.5 rounded text-xs font-bold shadow">
                          {t.del}
                        </button>
                        {sc.isBanned && (
                          <button onClick={() => setScenarioAppealTarget(sc)} className="bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow">
                            {t.appeal}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================================
          キャラクター選択（入室）モーダル
      ========================================================== */}
      {selectedRoomToJoin && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-emerald-700/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-emerald-400 mb-4 border-b border-slate-700 pb-2">🚪 {t.selectChar}</h3>
            <p className="text-sm text-slate-300 mb-4">{t.roomName}: <span className="font-bold text-white">{selectedRoomToJoin.scenario?.title}</span></p>
            
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {selectedRoomToJoin.scenario?.presetCharacters.map(char => {
                const isTaken = Object.values(selectedRoomToJoin.joined_users || {}).includes(char.id);
                return (
                  <label key={char.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${isTaken ? 'bg-slate-900 border-slate-700 opacity-50 cursor-not-allowed' : (selectedCharIdToJoin === char.id ? 'bg-emerald-900/30 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:bg-slate-700')}`}>
                    <input 
                      type="radio" 
                      name="charSelect" 
                      value={char.id} 
                      disabled={isTaken}
                      checked={selectedCharIdToJoin === char.id}
                      onChange={(e) => setSelectedCharIdToJoin(e.target.value)}
                      className="hidden"
                    />
                    <img src={char.imageUrl || NO_IMAGE_SCENARIO} className="w-12 h-12 rounded object-cover" />
                    <div>
                      <p className="font-bold text-sm text-white">{char.name} <span className="text-[10px] text-slate-400 font-normal">({char.job})</span></p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{char.personality}</p>
                      {isTaken && <p className="text-[10px] text-red-400 font-bold mt-0.5">{t.taken}</p>}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setSelectedRoomToJoin(null); setSelectedCharIdToJoin(""); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold text-white">{t.cancel}</button>
              <button 
                onClick={() => {
                  if (selectedCharIdToJoin) {
                    executeJoinRoom(selectedRoomToJoin, selectedCharIdToJoin);
                    setSelectedRoomToJoin(null);
                    setSelectedCharIdToJoin("");
                  }
                }} 
                disabled={!selectedCharIdToJoin} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold text-white shadow-lg"
              >
                {t.confirmJoin}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}