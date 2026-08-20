import React, { useState } from "react";
import { UserProfile, Scenario, Room, ViewState } from "../../types";

type Props = {
  currentUser: UserProfile;
  targetUserId: string;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  executeExport: (title: string, messages: any[], type: 'chat' | 'summary' | 'novel', options?: any) => Promise<void>;
  isExporting: boolean;
  allScenarios: Scenario[];
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  blockUser?: (targetId: string) => Promise<void>;
  unblockUser?: (targetId: string) => Promise<void>;
  activeRooms?: Room[];
  executeSpectateWithAd?: (room: Room) => void;
  openRoomConfigModal?: (scenario: Scenario) => void;
};

export default function UserProfileView({
  currentUser,
  targetUserId,
  setCurrentView,
  allScenarios,
  updateProfile,
  blockUser,
  unblockUser,
  activeRooms = [],
  executeSpectateWithAd,
  openRoomConfigModal
}: Props) {
  const isMyProfile = currentUser.id === targetUserId;
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfile>>({
    handleName: currentUser.handleName,
    bio: currentUser.bio,
    avatarUrl: currentUser.avatarUrl,
    discordId: currentUser.discordId // ★ Discord ID
  });

  const handleSave = async () => {
    await updateProfile(editData);
    setIsEditing(false);
  };

  const createdScenarios = allScenarios.filter(s => s.authorId === targetUserId);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 custom-scrollbar bg-slate-900">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-100">
          {isMyProfile ? "マイページ（プロフィール）" : "ユーザープロフィール"}
        </h2>
        <button 
          onClick={() => setCurrentView("lobby")} 
          className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm font-bold text-white shadow"
        >
          ◀ ロビーに戻る
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl mb-6">
        <div className="flex items-start gap-6">
          <img 
            src={isMyProfile ? currentUser.avatarUrl : (editData.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80")} 
            alt="アバター" 
            className="w-24 h-24 rounded-full object-cover border-4 border-slate-600 shadow-md"
          />
          <div className="flex-1">
            {isEditing && isMyProfile ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">プレイヤー名</label>
                  <input 
                    type="text" 
                    value={editData.handleName || ""} 
                    onChange={e => setEditData({...editData, handleName: e.target.value})} 
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">アバター画像URL</label>
                  <input 
                    type="text" 
                    value={editData.avatarUrl || ""} 
                    onChange={e => setEditData({...editData, avatarUrl: e.target.value})} 
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" 
                  />
                </div>
                {/* ★ Discord IDの入力欄を復活 */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Discord ID（任意）</label>
                  <input 
                    type="text" 
                    value={editData.discordId || ""} 
                    onChange={e => setEditData({...editData, discordId: e.target.value})} 
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" 
                    placeholder="ユーザー名#0000"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">自己紹介</label>
                  <textarea 
                    value={editData.bio || ""} 
                    onChange={e => setEditData({...editData, bio: e.target.value})} 
                    className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" 
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsEditing(false)} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm font-bold shadow">キャンセル</button>
                  <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-sm font-bold shadow-lg">保存する</button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{isMyProfile ? currentUser.handleName : "プレイヤー"}</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap mb-4 bg-slate-900/50 p-3 rounded border border-slate-700">
                  {isMyProfile ? currentUser.bio : "よろしくお願いします。"}
                </p>
                {/* ★ Discord IDの表示 */}
                {(isMyProfile ? currentUser.discordId : editData.discordId) && (
                  <p className="text-xs text-indigo-400 font-bold mb-4 flex items-center gap-1">
                    <span className="bg-indigo-900/50 px-2 py-1 rounded border border-indigo-700/50">
                      Discord: {isMyProfile ? currentUser.discordId : editData.discordId}
                    </span>
                  </p>
                )}
                
                {isMyProfile && (
                  <button onClick={() => setIsEditing(true)} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm font-bold text-white shadow transition-colors">
                    ✏️ プロフィールを編集
                  </button>
                )}
                {!isMyProfile && blockUser && (
                   <button onClick={() => blockUser(targetUserId)} className="bg-red-900/50 hover:bg-red-800 border border-red-700 px-4 py-2 rounded text-sm font-bold text-red-200 shadow transition-colors mt-2">
                     🚫 このユーザーをブロックする
                   </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-emerald-400 border-b border-slate-700 pb-2 mb-4">
        {isMyProfile ? "あなたが作成したシナリオ" : "このユーザーの作成シナリオ"}
      </h3>
      {createdScenarios.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-10 bg-slate-800/50 rounded-xl border border-slate-700/50">
          作成されたシナリオはまだありません。
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {createdScenarios.map(scenario => (
            <div key={scenario.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow flex flex-col group">
              <div className="h-32 overflow-hidden relative">
                <img src={scenario.imageUrl || "https://images.unsplash.com/photo-1614729939124-03290b5609ce"} alt={scenario.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-bold backdrop-blur-sm">
                  ★ {(scenario.ratingSum / (scenario.ratingCount || 1)).toFixed(1)} ({scenario.ratingCount || 0})
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h4 className="text-base font-bold text-white mb-2 line-clamp-1">{scenario.title}</h4>
                <div className="flex gap-1 mb-3 flex-wrap">
                  {scenario.tags.split(',').slice(0, 3).map((tag, i) => (
                    <span key={i} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{tag.trim()}</span>
                  ))}
                </div>
                <div className="mt-auto pt-3 border-t border-slate-700">
                  <button onClick={() => openRoomConfigModal && openRoomConfigModal(scenario)} className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-sm font-bold text-white shadow transition-colors">
                    このシナリオで部屋を作る
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}