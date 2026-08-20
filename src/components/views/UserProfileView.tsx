import React, { useState, useEffect } from "react";
import { ViewState, UserProfile, PlayArchive, Scenario, Room } from "../../types";
import { supabase } from "../../lib/supabase";

const NO_IMAGE_SCENARIO = "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=400&q=80";

type Props = {
  currentUser: UserProfile;
  targetUserId: string;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  allScenarios: Scenario[];
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  blockUser?: (targetId: string) => Promise<void>;
  unblockUser?: (targetId: string) => Promise<void>;
  addFriend?: (targetId: string) => Promise<void>;
  activeRooms?: Room[];
  openRoomConfigModal?: (scenario: Scenario) => void;
  openUserProfile?: (userId: string) => void;
};

export default function UserProfileView({
  currentUser, targetUserId, setCurrentView, allScenarios, updateProfile, 
  blockUser, unblockUser, addFriend, activeRooms = [], openRoomConfigModal, openUserProfile
}: Props) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [archives, setArchives] = useState<PlayArchive[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});

  const isMe = currentUser.id === targetUserId;
  const isBlocked = currentUser.blockedUserIds?.includes(targetUserId);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
      if (profileData) {
        setUser({
          id: profileData.id, handleName: profileData.handle_name, avatarUrl: profileData.avatar_url, bio: profileData.bio,
          discordId: profileData.discord_id, ratingSum: profileData.rating_sum || 0, ratingCount: profileData.rating_count || 0,
          isAdmin: profileData.is_admin, isTester: profileData.is_tester, isBanned: profileData.is_banned,
          email: profileData.email, friendIds: profileData.friend_ids || []
        });
        setEditData({
          handleName: profileData.handle_name, bio: profileData.bio, avatarUrl: profileData.avatar_url, discordId: profileData.discord_id
        });

        if (isMe && profileData.friend_ids && profileData.friend_ids.length > 0) {
          const { data: friendsData } = await supabase.from('profiles').select('*').in('id', profileData.friend_ids);
          if (friendsData) {
            setFriends(friendsData.map((d:any) => ({
              id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id, ratingSum: d.rating_sum, ratingCount: d.rating_count, isAdmin: d.is_admin, isTester: d.is_tester, isBanned: d.is_banned, email: d.email, friendIds: d.friend_ids
            })));
          }
        }
      }

      // ★ 履歴は最新5件のみ取得（書庫とは分ける）
      const { data: archiveData } = await supabase.from('play_archives').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(5);
      if (archiveData) {
        setArchives(archiveData.map((d: any) => ({
          id: d.id, userId: d.user_id, scenarioTitle: d.scenario_title, scenarioImage: d.scenario_image,
          characterName: d.character_name, chatLogs: d.chat_logs, createdAt: d.created_at,
          rule: d.rule, coPlayers: d.co_players
        })));
      }
      setLoading(false);
    };
    fetchUserData();
  }, [targetUserId, isMe, currentUser]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { alert("画像サイズは2MB以下にしてください。"); return; }
      const reader = new FileReader();
      reader.onloadend = () => setEditData({...editData, avatarUrl: reader.result as string});
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    await updateProfile(editData);
    if(user) setUser({...user, ...editData});
    setIsEditing(false);
  };

  if (loading || !user) {
    return <div className="flex-1 flex items-center justify-center h-full"><div className="animate-pulse text-emerald-400 font-bold">読み込み中...</div></div>;
  }

  const userScenarios = allScenarios.filter(s => s.authorId === targetUserId);
  const userActiveRooms = activeRooms.filter(r => r.host_id === targetUserId || Object.keys(r.joined_users || {}).includes(targetUserId));

  return (
    <div className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full min-h-0 overflow-y-auto custom-scrollbar">
      <header className="mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-emerald-400">👤 {isMe ? "マイページ" : "プロフィール"}</h2>
        <button onClick={() => setCurrentView("lobby")} className="text-sm bg-slate-700 px-4 py-2 rounded font-bold hover:bg-slate-600 transition-colors">ロビーに戻る</button>
      </header>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl mb-6">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img src={editData.avatarUrl} className="w-24 h-24 rounded-full object-cover border-4 border-slate-600 shadow" />
              <div>
                <label className="text-xs text-slate-400 block mb-1">アイコン画像の変更</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">プレイヤー名</label>
                <input type="text" value={editData.handleName} onChange={e=>setEditData({...editData, handleName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-bold" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Discord ID（任意）</label>
                <input type="text" value={editData.discordId || ""} onChange={e=>setEditData({...editData, discordId: e.target.value})} placeholder="ユーザー名#0000" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">ひとことコメント</label>
              <textarea value={editData.bio} onChange={e=>setEditData({...editData, bio: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm h-24" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-700 py-2 rounded font-bold hover:bg-slate-600 text-sm">キャンセル</button>
              <button onClick={saveProfile} className="flex-1 bg-emerald-600 py-2 rounded font-bold text-white shadow-lg hover:bg-emerald-500 text-sm">保存する</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6 items-start relative">
            <img src={user.avatarUrl} className="w-24 h-24 rounded-full object-cover border-4 border-slate-700 shadow" />
            <div className="flex-1 w-full">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">{user.handleName}</h3>
                  <p className="text-xs text-slate-500 mt-1 select-all">ID: {user.id}</p>
                </div>
                {isMe ? (
                  <button onClick={() => setIsEditing(true)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 text-xs rounded font-bold shadow">✏️ 編集</button>
                ) : (
                  <div className="flex gap-2">
                    {addFriend && !currentUser.friendIds?.includes(user.id) && (
                      <button onClick={() => addFriend(user.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs rounded font-bold shadow">🤝 友達追加</button>
                    )}
                    {blockUser && unblockUser && (
                      isBlocked ? (
                        <button onClick={() => unblockUser(user.id)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 text-xs rounded font-bold shadow">✅ ブロック解除</button>
                      ) : (
                        <button onClick={() => blockUser(user.id)} className="bg-red-900/50 hover:bg-red-800 border border-red-700 text-red-200 px-3 py-1.5 text-xs rounded font-bold shadow">🚫 ブロック</button>
                      )
                    )}
                  </div>
                )}
              </div>

              {user.discordId && (
                <div className="mt-3 inline-flex items-center gap-2 bg-indigo-900/30 border border-indigo-500/50 px-3 py-1.5 rounded-lg text-indigo-300 text-sm font-bold">
                  <span className="text-lg">👾</span> {user.discordId}
                </div>
              )}

              <div className="mt-4 bg-slate-900 border border-slate-700 p-4 rounded-lg text-sm text-slate-300">
                <span className="text-xs text-slate-500 font-bold block mb-1">ひとことコメント</span>
                {user.bio || "よろしくお願いします。"}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 友達リスト (自分のみ) */}
        {isMe && (
          <div>
            <h3 className="text-lg font-bold text-blue-400 mb-4 border-b border-slate-700 pb-2">🤝 友達リスト</h3>
            {friends.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-800 p-4 rounded text-center">まだ友達がいません。</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {friends.map(f => (
                  <div key={f.id} onClick={() => openUserProfile && openUserProfile(f.id)} className="bg-slate-800 border border-slate-700 p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:border-blue-500 transition-colors">
                    <img src={f.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{f.handleName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{f.bio}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 参加中のセッション */}
        <div>
          <h3 className="text-lg font-bold text-emerald-400 mb-4 border-b border-slate-700 pb-2">🎮 現在参加中のセッション</h3>
          {userActiveRooms.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-800 p-4 rounded text-center">参加中のセッションはありません。</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {userActiveRooms.map(r => (
                <div key={r.id} className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex gap-3">
                  <img src={r.scenario?.imageUrl || NO_IMAGE_SCENARIO} className="w-12 h-12 object-cover rounded" />
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{r.scenario?.title}</p>
                    <p className="text-[10px] text-slate-400 mt-1">ホスト: {r.host_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-end mb-4 border-b border-slate-700 pb-2">
          <h3 className="text-lg font-bold text-amber-400">📜 最近のプレイ履歴</h3>
          <p className="text-[10px] text-slate-500">※最新5件のみ表示。ログのエクスポートは「プレイ書庫」から行えます。</p>
        </div>
        {archives.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-800 p-4 rounded text-center">プレイ履歴がありません。</p>
        ) : (
          <div className="space-y-3">
            {archives.map(a => (
              <div key={a.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row gap-4">
                <img src={a.scenarioImage || NO_IMAGE_SCENARIO} className="w-16 h-16 object-cover rounded hidden sm:block" />
                <div className="flex-1">
                  <h4 className="font-bold text-white text-base">{a.scenarioTitle}</h4>
                  <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>📅 {new Date(a.createdAt).toLocaleString()}</span>
                    <span>👤 参加HN: {a.coPlayers && a.coPlayers.length > 0 ? a.coPlayers.join(", ") : "ソロプレイ"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-indigo-400 mb-4 border-b border-slate-700 pb-2">🎬 作成したシナリオ</h3>
        {userScenarios.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-800 p-4 rounded text-center">作成したシナリオはありません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userScenarios.map(s => (
              <div key={s.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex gap-3">
                  <img src={s.imageUrl || NO_IMAGE_SCENARIO} className="w-16 h-16 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white mb-1 truncate">{s.title}</h4>
                    <p className="text-[10px] text-slate-400">⭐ {(s.ratingSum / (s.ratingCount || 1)).toFixed(1)} / {s.playTime || 60}分</p>
                  </div>
                </div>
                {/* ★ 自分が公開しているシナリオなら部屋を立てられる */}
                {(isMe || s.isPlayableByOthers) && openRoomConfigModal && (
                  <button onClick={() => openRoomConfigModal(s)} className="w-full bg-emerald-600 hover:bg-emerald-500 py-1.5 rounded text-xs font-bold text-white shadow mt-auto transition-colors">
                    このシナリオで部屋を作る
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}