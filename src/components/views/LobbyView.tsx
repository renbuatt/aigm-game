import React from "react";
import { ViewState, UserProfile, Room, Scenario, RoomDifficulty, GameRule } from "../../types";

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
  // ★ rule を追加
  setRoomConfigModal: React.Dispatch<React.SetStateAction<{ scenario: Scenario, charId: string, privacy: 'open'|'secret', message: string, difficulty: RoomDifficulty, rule: GameRule } | null>>;
  fetchAdminData: () => Promise<void>;
};

export default function LobbyView({
  currentUser, handleLogout, setShowMailbox, unreadCount, secretRoomIdSearch, setSecretRoomIdSearch,
  rooms, searchedSecretRoom, setSearchedSecretRoom, executeJoinRoom, availableRooms,
  spectateRoom, setEditingScenario, setCurrentView, createdScenarios, deleteScenario, setRoomConfigModal,
  fetchAdminData
}: Props) {
  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full min-h-0 overflow-y-auto">
      <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
        <div><h1 className="text-3xl font-extrabold text-emerald-400 mb-1">AI GM MORPG Lobby</h1></div>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView("mypage")} className="bg-amber-600/20 text-amber-400 border border-amber-500/50 hover:bg-amber-600/40 px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1 transition-colors">
            <span className="text-base">👑</span> プレイ書庫 (Premium)
          </button>
          
          <button onClick={() => setShowMailbox(true)} className="relative text-slate-300 hover:text-white p-2 text-xl">
            ✉️{unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1.5 rounded-full">{unreadCount}</span>}
          </button>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white underline">ログアウト</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-bold text-blue-400">🌐 募集中のセッション</h2>
            <div className="flex gap-2">
              <input type="text" placeholder="シークレット部屋ID" value={secretRoomIdSearch} onChange={e=>setSecretRoomIdSearch(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white w-40" />
              <button onClick={() => { const r = rooms.find(x => x.id === secretRoomIdSearch); if(r){ setSearchedSecretRoom(r); }else{ alert("部屋が見つかりません"); } }} className="bg-slate-700 px-3 py-1 rounded text-xs font-bold">検索</button>
            </div>
          </div>

          <div className="h-[500px] overflow-y-scroll space-y-4 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
            {searchedSecretRoom && (
              <div className="bg-indigo-900/40 border border-indigo-500/50 rounded-xl p-4 flex gap-4 mb-4 relative">
                <span className="absolute top-[-10px] left-4 bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full">検索結果</span>
                <img src={searchedSecretRoom.scenario?.imageUrl || NO_IMAGE_SCENARIO} className="w-24 h-24 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{searchedSecretRoom.scenario?.title}</h3>
                  <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                    <span>ホスト: {searchedSecretRoom.host_name}</span>
                    <span className="text-amber-400 font-bold ml-2">
                      ⭐ {searchedSecretRoom.scenario?.ratingCount ? (searchedSecretRoom.scenario.ratingSum / searchedSecretRoom.scenario.ratingCount).toFixed(1) : "未評価"}
                    </span>
                  </div>
                  {searchedSecretRoom.host_message && <p className="text-xs text-slate-300 italic mb-2">「{searchedSecretRoom.host_message}」</p>}
                  <div className="flex gap-2">
                    <select className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white flex-1" onChange={(e) => executeJoinRoom(searchedSecretRoom, e.target.value)} value="">
                      <option value="" disabled>参加するキャラクターを選択...</option>
                      {searchedSecretRoom.scenario?.presetCharacters.filter(c => !Object.values(searchedSecretRoom.joined_users || {}).includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={()=>setSearchedSecretRoom(null)} className="text-xs bg-slate-700 px-3 py-1 rounded">閉じる</button>
                  </div>
                </div>
              </div>
            )}

            {availableRooms.filter(r => r.privacy === 'open' || r.host_id === currentUser.id).length === 0 ? <p className="text-slate-400 text-sm p-4 text-center">現在募集中のセッションはありません。</p> : 
              availableRooms.filter(r => r.privacy === 'open' || r.host_id === currentUser.id).map((room) => {
              
              const isHost = room.host_id === currentUser.id;
              const takenIds = Object.values(room.joined_users || {});
              const availableChars = room.scenario?.presetCharacters.filter(c => !takenIds.includes(c.id)) || [];

              return (
                <div key={room.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4 hover:border-blue-500 relative">
                  <img src={room.scenario?.imageUrl || NO_IMAGE_SCENARIO} className="w-24 h-24 object-cover rounded" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        {room.privacy === 'secret' ? "🔒" : "🔓"} {room.scenario?.title}
                        {isHost && <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded ml-auto">あなたがホスト</span>}
                        {isHost && room.privacy === 'secret' && <span className="text-[10px] text-slate-400 select-all" title="友達に共有">ID: {room.id}</span>}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                      <span>ホスト: {room.host_name}</span>
                      <span className="text-amber-400 font-bold ml-2">
                        ⭐ {room.scenario?.ratingCount ? (room.scenario.ratingSum / room.scenario.ratingCount).toFixed(1) : "未評価"}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-white ${room.difficulty === 'easy' ? 'bg-green-600' : room.difficulty === 'normal' ? 'bg-blue-600' : room.difficulty === 'hard' ? 'bg-orange-600' : room.difficulty === 'pro' ? 'bg-red-600' : 'bg-purple-600'}`}>
                        {room.difficulty === 'easy' ? '🟩 簡単' : room.difficulty === 'normal' ? '🟦 普通' : room.difficulty === 'hard' ? '🟧 難しい' : room.difficulty === 'pro' ? '🟥 プロ' : '🟪 鬼'}
                      </span>
                      {/* ★ ルールバッジを表示 */}
                      <span className="px-1.5 py-0.5 rounded text-white bg-slate-700 border border-slate-500">
                        {room.rule === 'dnd' ? '🟥 D&D' : room.rule === 'coc_en' ? '🟦 CoC海外版' : room.rule === 'sw25' ? '🟨 SW2.5' : room.rule === 'storytelling' ? '🟪 ストテリ' : '🟩 CoC日本卓'}
                      </span>
                    </div>
                    {room.host_message && <p className="text-xs text-slate-300 italic mb-2">「{room.host_message}」</p>}
                    
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
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-blue-400">👤 プレイヤー情報</h2>
              {currentUser.isAdmin && (
                <button 
                  onClick={async () => { await fetchAdminData(); setCurrentView("admin"); }} 
                  className="text-[10px] bg-red-900/50 hover:bg-red-800 text-red-300 px-3 py-1 rounded font-bold border border-red-700/50 transition-colors"
                >
                  ⚙️ 管理画面を開く
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-4 items-center">
                <img src={currentUser.avatarUrl} className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-white flex items-center gap-1">{currentUser.handleName}</p>
                  <p className="text-[10px] text-slate-500 select-all mt-1">ID: {currentUser.id}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col shadow-lg border-t-2 border-t-emerald-500">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-emerald-400">📜 作成したシナリオ</h2>
              <button onClick={() => { setEditingScenario({ id: "", title: "", system: "", tags: "", setting: "", npcList: "", plot: "", imageUrl: "", presetCharacters: [], ratingSum: 0, ratingCount: 0, price: 500, playLimit: 1, giftLimit: 1, playTime: 60 }); setCurrentView("scenarioEdit"); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">＋ 新規作成</button>
            </div>
            {createdScenarios.length === 0 ? (
              <p className="text-xs text-slate-400 mt-2 text-center p-2 bg-slate-900 rounded border border-slate-700/50">作成したシナリオはありません。</p>
            ) : (
              <div className="max-h-[300px] overflow-y-scroll space-y-3 pr-2 custom-scrollbar">
                {createdScenarios.map(s => {
                  return (
                    <div key={s.id} className={`bg-slate-900 border rounded-lg p-3 flex flex-col gap-2 ${s.isBanned ? 'border-red-900/50 opacity-80' : 'border-slate-700'}`}>
                      <div className="flex items-start gap-3">
                        <img src={s.imageUrl || NO_IMAGE_SCENARIO} className="w-12 h-12 object-cover rounded border border-slate-600" />
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-white">{s.title}</h4>
                          <p className="text-[9px] text-emerald-400">目安: {s.playTime || 60}分</p>
                          <div className="flex gap-2 mt-2 items-center">
                            <button onClick={() => { setEditingScenario(s); setCurrentView("scenarioEdit"); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded text-white hover:bg-slate-600">編集</button>
                            <button onClick={() => deleteScenario(s.id)} className="text-[10px] bg-red-900/50 px-2 py-1 rounded text-red-300 hover:bg-red-800/80">削除</button>
                          </div>
                        </div>
                      </div>
                      {!s.isBanned && (
                        <button onClick={() => setRoomConfigModal({ scenario: s, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp" })} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded mt-2 shadow">
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
    </div>
  );
}