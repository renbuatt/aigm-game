import React, { useState, useEffect } from "react";
import { ViewState, UserProfile, PlayArchive, Scenario } from "../../types";
import { supabase } from "../../lib/supabase";

type Props = {
  currentUser: UserProfile;
  targetUserId: string;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  executeExport: (title: string, messages: any[], type: 'chat' | 'summary' | 'novel', images?: string[]) => Promise<void>;
  isExporting: boolean;
  allScenarios: Scenario[];
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>; // ★追加
};

export default function UserProfileView({ currentUser, targetUserId, setCurrentView, executeExport, isExporting, allScenarios, updateProfile }: Props) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [archives, setArchives] = useState<PlayArchive[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // ★ 編集用のState
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const isMe = currentUser.id === targetUserId;

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

        if (isMe && profileData.friend_ids && profileData.friend_ids.length > 0) {
          const { data: friendsData } = await supabase.from('profiles').select('*').in('id', profileData.friend_ids);
          if (friendsData) {
            setFriends(friendsData.map((d:any) => ({
              id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id, ratingSum: d.rating_sum, ratingCount: d.rating_count, isAdmin: d.is_admin, isTester: d.is_tester, isBanned: d.is_banned, email: d.email, friendIds: d.friend_ids
            })));
          }
        }
      }

      const { data: archiveData } = await supabase.from('play_archives').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false });
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
  }, [targetUserId, isMe, currentUser]); // currentUserの変更時も再取得

  const startEdit = () => {
    if (!user) return;
    setEditName(user.handleName);
    setEditBio(user.bio);
    setEditAvatar(user.avatarUrl);
    setIsEditing(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 2MB以上の画像は弾く
      if (file.size > 2 * 1024 * 1024) {
        alert("画像サイズは2MB以下にしてください。");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    await updateProfile({ handleName: editName, bio: editBio, avatarUrl: editAvatar });
    setIsEditing(false);
  };

  if (loading || !user) {
    return <div className="flex-1 flex items-center justify-center h-full"><div className="animate-pulse text-emerald-400 font-bold">読み込み中...</div></div>;
  }

  const userScenarios = allScenarios.filter(s => s.authorId === targetUserId);

  return (
    <div className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full min-h-0 overflow-y-auto custom-scrollbar">
      <header className="mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-emerald-400">👤 ユーザープロフィール</h2>
        <button onClick={() => setCurrentView("lobby")} className="text-sm bg-slate-700 px-4 py-2 rounded font-bold hover:bg-slate-600 transition-colors">ロビーに戻る</button>
      </header>

      {/* ★ プロフィール表示エリア */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl mb-6">
        {isEditing ? (
          // 編集モード
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img src={editAvatar} className="w-24 h-24 rounded-full object-cover border-4 border-slate-600 shadow" />
              <div>
                <label className="text-xs text-slate-400 block mb-1">アイコン画像の変更</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">ハンドルネーム</label>
              <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-bold" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">ひとことコメント</label>
              <textarea value={editBio} onChange={e=>setEditBio(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm h-24" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-700 py-2 rounded font-bold hover:bg-slate-600 text-sm">キャンセル</button>
              <button onClick={saveProfile} className="flex-1 bg-emerald-600 py-2 rounded font-bold text-white shadow-lg hover:bg-emerald-500 text-sm">保存する</button>
            </div>
          </div>
        ) : (
          // 通常表示モード
          <div className="flex gap-6 items-start relative">
            {isMe && (
              <button onClick={startEdit} className="absolute top-0 right-0 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 text-xs rounded font-bold shadow">
                ✏️ プロフィールを編集
              </button>
            )}
            <img src={user.avatarUrl} className="w-24 h-24 rounded-full object-cover border-4 border-slate-700 shadow" />
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">{user.handleName}</h3>
              <p className="text-xs text-slate-500 mt-1 select-all">ID: {user.id}</p>
              <div className="mt-4 bg-slate-900 border border-slate-700 p-4 rounded-lg text-sm text-slate-300">
                <span className="text-xs text-slate-500 font-bold block mb-1">ひとことコメント</span>
                {user.bio}
              </div>
            </div>
          </div>
        )}
      </div>

      {isMe && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-blue-400 mb-4 border-b border-slate-700 pb-2">🤝 友達リスト (あなたのみ表示)</h3>
          {friends.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-800 p-4 rounded text-center">まだ友達がいません。セッション終了後に同じ部屋のプレイヤーを登録できます！</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map(f => (
                <div key={f.id} className="bg-slate-800 border border-slate-700 p-3 rounded-lg flex items-center gap-3">
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

      <div className="mb-8">
        <h3 className="text-lg font-bold text-amber-400 mb-4 border-b border-slate-700 pb-2">📜 プレイ履歴</h3>
        {archives.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-800 p-4 rounded text-center">プレイ履歴がありません。</p>
        ) : (
          <div className="space-y-4">
            {archives.map(a => (
              <div key={a.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row gap-4">
                <img src={a.scenarioImage || "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=150&q=80"} className="w-16 h-16 object-cover rounded hidden sm:block" />
                <div className="flex-1">
                  <h4 className="font-bold text-white text-lg">{a.scenarioTitle}</h4>
                  <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>📅 {new Date(a.createdAt).toLocaleString()}</span>
                    <span>🎲 {a.rule === 'coc_jp' ? 'CoC日本卓' : a.rule === 'dnd' ? 'D&D' : a.rule === 'sw25' ? 'SW2.5' : a.rule === 'storytelling' ? 'ストテリ' : a.rule === 'coc_en' ? 'CoC海外版' : '不明'}</span>
                    <span>👤 参加HN: {a.coPlayers && a.coPlayers.length > 0 ? a.coPlayers.join(", ") : "ソロプレイ"}</span>
                  </div>
                  {isMe && (
                     <div className="mt-3 flex gap-2">
                       <button onClick={() => executeExport(`${a.scenarioTitle}_chat`, a.chatLogs, 'chat')} disabled={isExporting} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded font-bold transition shadow">💬 ログ出力</button>
                       <button onClick={() => executeExport(`${a.scenarioTitle}_novel`, a.chatLogs, 'novel', a.chatLogs.filter(m=>m.type==='image').map(m=>m.imageUrl!))} disabled={isExporting} className="text-xs bg-amber-700 hover:bg-amber-600 px-3 py-1.5 rounded font-bold transition shadow">📖 小説化</button>
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-emerald-400 mb-4 border-b border-slate-700 pb-2">🎬 公開マイシナリオ</h3>
        {userScenarios.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-800 p-4 rounded text-center">作成したシナリオはありません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userScenarios.map(s => (
              <div key={s.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex gap-4">
                <img src={s.imageUrl || "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=150&q=80"} className="w-16 h-16 object-cover rounded" />
                <div>
                  <h4 className="font-bold text-sm text-white mb-1">{s.title}</h4>
                  <p className="text-[10px] text-slate-400">⭐ {(s.ratingSum / (s.ratingCount || 1)).toFixed(1)} / {s.playTime || 60}分</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}