import React, { useState, useEffect } from "react";
import { UserProfile, Scenario, Room } from "../../types";
import { supabase } from "../../lib/supabase";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

type Props = {
  currentUser: UserProfile;
  targetUserId: string;
  setCurrentView: (view: any) => void;
  allScenarios: Scenario[];
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  blockUser: (targetId: string) => Promise<void>;
  unblockUser: (targetId: string) => Promise<void>;
  addFriend: (targetId: string) => Promise<void>;
  activeRooms: Room[];
  executeSpectateWithAd: (room: Room) => void;
  openRoomConfigModal: (scenario: Scenario) => void;
  openUserProfile: (userId: string) => void;
  uploadAvatar?: (file: File) => Promise<void>; // ★ 追加：アバターアップロード
};

export default function UserProfileView({
  currentUser, targetUserId, setCurrentView, allScenarios, updateProfile,
  blockUser, unblockUser, addFriend, activeRooms, executeSpectateWithAd,
  openRoomConfigModal, openUserProfile, uploadAvatar
}: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ handleName: "", bio: "", avatarUrl: "" });
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);

  const isMe = currentUser.id === targetUserId;
  const isBlocked = (currentUser.blockedUserIds || []).includes(targetUserId);
  const isFriend = (currentUser.friendIds || []).includes(targetUserId);

  useEffect(() => {
    const fetchTargetProfile = async () => {
      setIsLoading(true);
      const { data } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
      if (data) {
        const p: UserProfile = {
          id: data.id, handleName: data.handle_name, fullName: data.full_name, address: data.address,
          phone: data.phone, avatarUrl: data.avatar_url, bio: data.bio, discordId: data.discord_id,
          ratingSum: data.rating_sum || 0, ratingCount: data.rating_count || 0, isAdmin: data.is_admin || false,
          isTester: data.is_tester || false, isBanned: data.is_banned || false, email: data.email,
          friendIds: data.friend_ids || [], blockedUserIds: data.blocked_user_ids || [], points: data.points || 0
        };
        setProfile(p);
        setEditData({ handleName: p.handleName, bio: p.bio, avatarUrl: p.avatarUrl });

        if (p.friendIds && p.friendIds.length > 0) {
          const { data: fData } = await supabase.from('profiles').select('*').in('id', p.friendIds);
          if (fData) {
            setFriendsList(fData.map(d => ({
              id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id,
              ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0, isAdmin: d.is_admin || false,
              isTester: d.is_tester || false, isBanned: d.is_banned || false, email: d.email
            })));
          }
        } else {
          setFriendsList([]);
        }
      }
      setIsLoading(false);
    };
    fetchTargetProfile();
  }, [targetUserId]);

  const handleSaveProfile = async () => {
    await updateProfile(editData);
    if (profile) setProfile({ ...profile, ...editData });
    setIsEditing(false);
    alert("プロフィールを更新しました！");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && uploadAvatar) {
      await uploadAvatar(e.target.files[0]);
    }
  };

  if (isLoading || !profile) {
    return <div className="flex-1 flex items-center justify-center text-slate-400">読込中...</div>;
  }

  const userScenarios = allScenarios.filter(s => s.authorId === targetUserId && !s.isBanned);
  const userPlayingRoom = activeRooms.find(r => r.joined_users && Object.keys(r.joined_users).includes(targetUserId) && r.status === 'playing');

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <header className="mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
        <button onClick={() => setCurrentView("lobby")} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
          ← ロビーに戻る
        </button>
        {isMe && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-xs font-bold shadow">
            ✏️ プロフィール編集
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左側：プロフィールカード */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col items-center text-center">
          <img src={profile.avatarUrl || DEFAULT_AVATAR} className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-slate-600 mb-4" />
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            {profile.handleName}
            {profile.isAdmin && <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded">管理者</span>}
            {profile.isTester && <span className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded">テスター</span>}
          </h2>
          <p className="text-xs text-amber-400 font-bold mb-4">
            ⭐ 評価: {profile.ratingCount ? (profile.ratingSum / profile.ratingCount).toFixed(1) : "未評価"} ({profile.ratingCount}回)
          </p>

          <p className="text-xs text-slate-300 bg-slate-900 p-4 rounded-lg border border-slate-700/50 w-full text-left whitespace-pre-wrap mb-6">
            {profile.bio || "自己紹介はありません。"}
          </p>

          {!isMe && (
            <div className="flex flex-col gap-2 w-full">
              {!isFriend && (
                <button onClick={() => addFriend(profile.id)} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-xs font-bold shadow transition-colors">
                  🤝 友達に追加する
                </button>
              )}
              {isBlocked ? (
                <button onClick={() => unblockUser(profile.id)} className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded text-xs font-bold text-slate-300 transition-colors">
                  ブロック解除
                </button>
              ) : (
                <button onClick={() => blockUser(profile.id)} className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-300 py-2 rounded text-xs font-bold transition-colors">
                  🚫 このユーザーをブロック
                </button>
              )}
            </div>
          )}

          {userPlayingRoom && (
            <div className="mt-6 w-full bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg text-left">
              <p className="text-[10px] text-indigo-300 font-bold mb-1">🎮 現在セッション中</p>
              <p className="text-xs text-white font-bold truncate">{userPlayingRoom.scenario?.title}</p>
              <button onClick={() => executeSpectateWithAd(userPlayingRoom)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] py-1.5 rounded font-bold mt-2 shadow">
                👁️ セッションを観戦する
              </button>
            </div>
          )}
        </div>

        {/* 右側：公開シナリオと友達リスト */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 編集モーダル */}
          {isEditing && (
            <div className="bg-slate-800 border border-blue-500/50 rounded-xl p-6 shadow-xl mb-6">
              <h3 className="text-lg font-bold text-blue-400 mb-4 border-b border-slate-700 pb-2">✏️ プロフィールの編集</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">表示名</label>
                  <input type="text" value={editData.handleName} onChange={e=>setEditData({...editData, handleName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
                </div>
                
                {/* ★ 追加：ファイルからの画像アップロード */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">アイコン画像</label>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <img src={editData.avatarUrl || DEFAULT_AVATAR} className="w-14 h-14 rounded-full object-cover border border-slate-600 shrink-0" />
                    <div className="flex-1 w-full">
                      <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer mb-2" />
                      <input type="text" value={editData.avatarUrl} onChange={e=>setEditData({...editData, avatarUrl: e.target.value})} placeholder="または画像URLを直接入力..." className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">自己紹介</label>
                  <textarea value={editData.bio} onChange={e=>setEditData({...editData, bio: e.target.value})} rows={4} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded text-xs font-bold">キャンセル</button>
                  <button onClick={handleSaveProfile} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded text-xs font-bold shadow">変更を保存</button>
                </div>
              </div>
            </div>
          )}

          {/* 公開しているシナリオ */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
              📜 公開しているシナリオ ({userScenarios.length}本)
            </h3>
            {userScenarios.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">公開されているシナリオはありません。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userScenarios.map(s => (
                  <div key={s.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex gap-3">
                    <img src={s.imageUrl} className="w-16 h-16 object-cover rounded border border-slate-700 shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white truncate">{s.title}</h4>
                        <p className="text-[10px] text-amber-400 mt-0.5">⭐ {s.ratingCount ? (s.ratingSum / s.ratingCount).toFixed(1) : "未評価"}</p>
                      </div>
                      <button onClick={() => openRoomConfigModal(s)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] py-1 rounded font-bold mt-2 shadow">
                        部屋を作る
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 友達リスト */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
              🤝 友達リスト ({friendsList.length}人)
            </h3>
            {friendsList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">登録されている友達はいません。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {friendsList.map(f => (
                  <div key={f.id} onClick={() => openUserProfile(f.id)} className="bg-slate-900 border border-slate-700 hover:border-blue-500 rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors">
                    <img src={f.avatarUrl || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{f.handleName}</h4>
                      <p className="text-[9px] text-slate-400 truncate">{f.bio || "ひとことなし"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}