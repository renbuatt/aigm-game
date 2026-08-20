import React, { useState, useEffect } from "react";
import { ViewState, UserProfile, Scenario, Room } from "../../types";
import { supabase } from "../../lib/supabase";

type Props = {
  currentUser: UserProfile;
  targetUserId: string;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  allScenarios: Scenario[];
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  blockUser: (targetId: string) => Promise<void>;
  unblockUser: (targetId: string) => Promise<void>;
  addFriend: (targetId: string) => Promise<void>;
  activeRooms: Room[];
  executeSpectateWithAd: (room: Room) => void;
  openRoomConfigModal: (scenario: Scenario) => void;
  openUserProfile: (userId: string) => void;
};

export default function UserProfileView({
  currentUser,
  targetUserId,
  setCurrentView,
  allScenarios,
  updateProfile,
  blockUser,
  unblockUser,
  addFriend,
  activeRooms,
  executeSpectateWithAd,
  openRoomConfigModal,
  openUserProfile
}: Props) {
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'friends' | 'scenarios'>('profile');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const isMe = currentUser.id === targetUserId;

  useEffect(() => {
    const fetchUser = async () => {
      if (isMe) {
        setTargetUser(currentUser);
        setEditName(currentUser.handleName);
        setEditBio(currentUser.bio || "");
        setEditAvatar(currentUser.avatarUrl || "");
      } else {
        const { data } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
        if (data) {
          setTargetUser({
            id: data.id, handleName: data.handle_name, avatarUrl: data.avatar_url,
            bio: data.bio, discordId: data.discord_id, ratingSum: data.rating_sum || 0,
            ratingCount: data.rating_count || 0, isAdmin: data.is_admin, isTester: data.is_tester,
            isBanned: data.is_banned, email: data.email, friendIds: data.friend_ids || [], blockedUserIds: data.blocked_user_ids || []
          });
        }
      }
    };
    fetchUser();
  }, [targetUserId, isMe, currentUser]);

  useEffect(() => {
    const fetchFriends = async () => {
      const fIds = targetUser?.friendIds || [];
      if (fIds.length > 0) {
        const { data } = await supabase.from('profiles').select('*').in('id', fIds);
        if (data) {
          setFriends(data.map((d: any) => ({
            id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id,
            ratingSum: d.rating_sum, ratingCount: d.rating_count, isAdmin: d.is_admin, isTester: d.is_tester,
            isBanned: d.is_banned, email: d.email
          })));
        }
      } else {
        setFriends([]);
      }
    };
    if (targetUser && activeTab === 'friends') fetchFriends();
  }, [targetUser, activeTab]);

  const handleSave = async () => {
    await updateProfile({ handleName: editName, bio: editBio, avatarUrl: editAvatar });
    setIsEditing(false);
  };

  if (!targetUser) return <div className="p-8 text-center text-white">読み込み中...</div>;

  const isFriend = currentUser.friendIds?.includes(targetUser.id);
  const isBlocked = currentUser.blockedUserIds?.includes(targetUser.id);
  const userScenarios = allScenarios.filter(s => s.authorId === targetUser.id && !s.isBanned);

  return (
    <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full min-h-0 overflow-y-auto custom-scrollbar">
      <header className="mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-emerald-400">👤 プロフィール</h2>
        <button onClick={() => setCurrentView("lobby")} className="text-sm bg-slate-700 px-4 py-2 rounded font-bold hover:bg-slate-600 transition-colors">戻る</button>
      </header>

      {/* プロフィールカード */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg mb-6 relative">
        <div className="flex items-start gap-6">
          <img src={targetUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} className="w-24 h-24 rounded-full object-cover border-4 border-slate-700 shadow-md" />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-white">{targetUser.handleName}</h3>
              {!isMe && (
                <div className="flex gap-2">
                  {!isFriend && !isBlocked && (
                    <button onClick={() => addFriend(targetUser.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded font-bold shadow">＋ 友達追加</button>
                  )}
                  {isBlocked ? (
                    <button onClick={() => unblockUser(targetUser.id)} className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-1.5 rounded font-bold shadow">ブロック解除</button>
                  ) : (
                    <button onClick={() => blockUser(targetUser.id)} className="bg-red-900/80 hover:bg-red-800 text-red-200 text-xs px-3 py-1.5 rounded font-bold shadow border border-red-500/50">ブロック</button>
                  )}
                </div>
              )}
              {isMe && !isEditing && (
                <button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded font-bold shadow">編集</button>
              )}
            </div>
            <div className="mt-4 text-slate-300 whitespace-pre-wrap text-sm">
              {targetUser.bio || "自己紹介はまだありません。"}
            </div>
          </div>
        </div>

        {/* 編集モード */}
        {isEditing && isMe && (
          <div className="mt-6 border-t border-slate-700 pt-6 space-y-4">
            <div><label className="text-xs text-slate-400 block mb-1">表示名</label><input type="text" value={editName} onChange={e=>setEditName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" /></div>
            <div><label className="text-xs text-slate-400 block mb-1">アイコン画像URL</label><input type="text" value={editAvatar} onChange={e=>setEditAvatar(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" /></div>
            <div><label className="text-xs text-slate-400 block mb-1">自己紹介</label><textarea value={editBio} onChange={e=>setEditBio(e.target.value)} className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" /></div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm font-bold">キャンセル</button>
              <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-sm font-bold shadow">保存</button>
            </div>
          </div>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-2 border-b border-slate-700 mb-4">
        <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'profile' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>基本情報</button>
        <button onClick={() => setActiveTab('scenarios')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'scenarios' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'}`}>作成シナリオ ({userScenarios.length})</button>
        <button onClick={() => setActiveTab('friends')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'friends' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}>友達 ({targetUser.friendIds?.length || 0})</button>
      </div>

      {/* タブコンテンツ：基本情報 */}
      {activeTab === 'profile' && (
         <div className="text-slate-400 text-sm py-4">
            <p>評価スコア: {(targetUser.ratingSum / (targetUser.ratingCount || 1)).toFixed(1)} / 5.0 (レビュー数: {targetUser.ratingCount})</p>
         </div>
      )}

      {/* タブコンテンツ：作成シナリオ */}
      {activeTab === 'scenarios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userScenarios.length === 0 ? (
            <div className="text-slate-500 col-span-2 text-center py-8">作成したシナリオはありません。</div>
          ) : (
            userScenarios.map(s => (
              <div key={s.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow flex flex-col justify-between">
                <div>
                  <h4 className="text-md font-bold text-white mb-2">{s.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{s.setting}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => openRoomConfigModal(s)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded font-bold shadow">部屋を立てる</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* タブコンテンツ：友達 */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {friends.length === 0 ? (
            <div className="text-slate-500 text-center py-8">友達はまだいません。</div>
          ) : (
            friends.map(f => {
              // 友達が参加している部屋をリアルタイム検索
              const playingRoom = activeRooms.find(r => Object.keys(r.joined_users || {}).includes(f.id));
              
              return (
                <div key={f.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between shadow">
                  <div className="flex items-center gap-3 cursor-pointer group" onClick={() => openUserProfile(f.id)}>
                    <img src={f.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} className="w-12 h-12 rounded-full object-cover border border-slate-600 group-hover:border-emerald-500 transition-colors" />
                    <div>
                      <p className="font-bold text-white group-hover:text-emerald-400 transition">{f.handleName}</p>
                      <p className="text-xs text-slate-400 truncate w-48">{f.bio}</p>
                    </div>
                  </div>

                  {playingRoom && playingRoom.scenario ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] bg-indigo-900/50 border border-indigo-500/50 text-indigo-300 px-2 py-0.5 rounded font-bold animate-pulse">
                        🎮 プレイ中: {playingRoom.scenario.title}
                      </span>
                      {playingRoom.privacy === 'open' ? (
                        <button onClick={() => executeSpectateWithAd(playingRoom)} className="text-[10px] bg-pink-600 hover:bg-pink-500 text-white px-3 py-1 rounded shadow flex items-center gap-1">
                          📺 広告を見て観戦する
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 border border-slate-600 bg-slate-800 px-2 py-0.5 rounded">🔒 シークレット部屋</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500">オフライン</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}