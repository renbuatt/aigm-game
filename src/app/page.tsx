"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// --- Supabaseクライアント ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 型定義 ---
type ViewState = "login" | "lobby" | "scenarioEdit" | "game" | "evaluation" | "admin" | "maintenance" | "banned";

type UserProfile = { 
  id: string; handleName: string; avatarUrl: string; bio: string; discordId?: string;
  ratingSum: number; ratingCount: number; isAdmin: boolean; isBanned: boolean; email?: string;
};

type Notification = {
  id: string; userId: string; title: string; message: string; isRead: boolean; createdAt: string;
};

type BanAppeal = {
  id: string; userId: string; reason: string; appealText: string; status: string; createdAt: string;
};

type Character = {
  id: string; name: string; job: string; personality: string; imageUrl: string;
  hp: number; san: number; str: number; dex: number; int: number; con: number; wis: number; cha: number;
};

type Scenario = {
  id: string; title: string; system: string; tags: string; setting: string;
  npcList: string; plot: string; imageUrl: string; presetCharacters: Character[];
  ratingSum: number; ratingCount: number;
};

type Scene = { id: string; name: string; memberIds: string[]; leaderId?: string; };

type Room = { 
  id: string; scenario_id: string; scenario?: Scenario; 
  host_name: string; status: "recruiting" | "playing" | "finished"; scenes: Scene[]; 
  host_id?: string;
};

type Message = { sender: "player" | "gm"; text: string; type?: "ic" | "ooc" | "system"; sceneId?: string; };
type LobbyMessage = { id: string; senderName: string; text: string; time: string; isSystem?: boolean; };

const NO_IMAGE_SCENARIO = "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=400&q=80";
const NO_IMAGE_CHAR = "https://images.unsplash.com/photo-1544502062-f82887f03d1c?auto=format&fit=crop&w=200&q=80";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewState>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<UserProfile | null>(null);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [editingCharIndex, setEditingCharIndex] = useState<number | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  
  const [hostCharId, setHostCharId] = useState<string>("");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [joinedCharacter, setJoinedCharacter] = useState<Character | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [msgType, setMsgType] = useState<"ic" | "ooc">("ic");
  const [isLoading, setIsLoading] = useState(false);

  const [ratingScenario, setRatingScenario] = useState<number>(5);
  const [ratingGM, setRatingGM] = useState<number>(5);
  const [isMaintenance, setIsMaintenance] = useState(false);
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [myNotifications, setMyNotifications] = useState<Notification[]>([]);
  const [showMailbox, setShowMailbox] = useState(false);
  
  const [warningModalUser, setWarningModalUser] = useState<UserProfile | null>(null);
  const [warningTitle, setWarningTitle] = useState("");
  const [warningText, setWarningText] = useState("");

  const [banTargetUser, setBanTargetUser] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banAppeals, setBanAppeals] = useState<BanAppeal[]>([]);
  const [appealText, setAppealText] = useState("");

  // ★ ユーザー検索用ステート
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];
  const defaultScene: Scene = { id: "scene_main", name: "メインルーム", memberIds: [] };
  const myScene = activeRoom?.scenes?.find(s => joinedCharacter && s.memberIds.includes(joinedCharacter.id)) || activeRoom?.scenes?.[0] || defaultScene;

  // ==========================================
  // 画像アップロード・データ取得処理
  // ==========================================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, folder: string): Promise<string | null> => {
    if (!e.target.files || e.target.files.length === 0) return null;
    const file = e.target.files[0];
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('images').upload(fileName, file);
    if (error) { alert("アップロード失敗: " + error.message); return null; }
    return supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
  };

  const fetchData = async () => {
    const { data: scData } = await supabase.from('scenarios').select('*').order('id', { ascending: false });
    let loadedScenarios: Scenario[] = [];
    if (scData && scData.length > 0) {
      loadedScenarios = scData.map((d: any) => ({
        id: d.id, title: d.title, system: d.system, tags: d.tags, setting: d.setting,
        npcList: d.npc_list, plot: d.plot, imageUrl: d.image_url, presetCharacters: d.preset_characters || [],
        ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0
      }));
      setScenarios(loadedScenarios);
      if(!selectedScenarioId) setSelectedScenarioId(loadedScenarios[0].id);
    }
    const { data: rmData } = await supabase.from('rooms').select('*').neq('status', 'finished').order('id', { ascending: false });
    if (rmData && loadedScenarios.length > 0) {
      const formattedRooms = rmData.map((r: any) => ({
        id: r.id, scenario_id: r.scenario_id, scenario: loadedScenarios.find(s => s.id === r.scenario_id),
        host_name: r.host_name, host_id: r.host_id, status: r.status, scenes: r.scenes || []
      })).filter(r => r.scenario) as Room[];
      setRooms(formattedRooms);
    }
  };

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if(data) setMyNotifications(data.map((d: any) => ({ id: d.id, userId: d.user_id, title: d.title, message: d.message, isRead: d.is_read, createdAt: d.created_at })));
  };

  const fetchProfile = async (userId: string, emailStr: string, currentMaintenance: boolean) => {
    let profileData: UserProfile;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (data) {
      profileData = { id: data.id, handleName: data.handle_name, avatarUrl: data.avatar_url, bio: data.bio, discordId: data.discord_id, ratingSum: data.rating_sum || 0, ratingCount: data.rating_count || 0, isAdmin: data.is_admin || false, isBanned: data.is_banned || false, email: data.email };
      if (data.email !== emailStr) await supabase.from('profiles').update({ email: emailStr }).eq('id', userId);
    } else {
      const newProfile = { id: userId, handle_name: emailStr.split("@")[0], avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", discord_id: "", rating_sum: 0, rating_count: 0, is_admin: false, is_banned: false, email: emailStr };
      await supabase.from('profiles').insert(newProfile);
      profileData = { id: userId, handleName: newProfile.handle_name, avatarUrl: newProfile.avatar_url, bio: newProfile.bio, discordId: newProfile.discord_id, ratingSum: 0, ratingCount: 0, isAdmin: false, isBanned: false, email: emailStr };
    }
    
    setCurrentUser(profileData);
    await fetchNotifications(userId);

    if (profileData.isBanned) {
      setCurrentView("banned");
    } else if (currentMaintenance && !profileData.isAdmin) {
      setCurrentView("maintenance");
    } else {
      setCurrentView("lobby");
    }
  };

  useEffect(() => {
    const initApp = async () => {
      const { data: appData } = await supabase.from('app_settings').select('*').eq('id', 1).single();
      const currentMaintenance = appData ? appData.is_maintenance : false;
      setIsMaintenance(currentMaintenance);

      await fetchData();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email || "", currentMaintenance);
      } else {
        if (currentMaintenance) setCurrentView("maintenance");
      }
    };
    initApp();
  }, []);

  // ==========================================
  // 認証・プロフィール保存
  // ==========================================
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthLoading(true);
    try {
      if (isLoginMode) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await fetchProfile(data.user.id, email, isMaintenance);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) { alert("アカウントを作成しました！"); await fetchProfile(data.user.id, email, isMaintenance); }
      }
    } catch (error: any) { alert("エラーが発生しました: " + error.message); } finally { setAuthLoading(false); }
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert("Googleログインの初期設定が未完了です: " + error.message);
    setAuthLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setCurrentView("login"); };
  
  const saveProfile = async () => {
    if (!editProfileData || !currentUser) return;
    const { error } = await supabase.from('profiles').upsert({ id: currentUser.id, handle_name: editProfileData.handleName, avatarUrl: editProfileData.avatarUrl, bio: editProfileData.bio, discord_id: editProfileData.discordId });
    if (!error) { setCurrentUser(editProfileData); setIsEditingProfile(false); }
  };

  const saveScenario = async () => {
    if (!editingScenario) return;
    const dbData = { 
      title: editingScenario.title, system: editingScenario.system, tags: editingScenario.tags, setting: editingScenario.setting, 
      npc_list: editingScenario.npcList, plot: editingScenario.plot, image_url: editingScenario.imageUrl, preset_characters: editingScenario.presetCharacters,
      rating_sum: editingScenario.ratingSum, rating_count: editingScenario.ratingCount
    };
    if (editingScenario.id && !editingScenario.id.startsWith('s')) {
      await supabase.from('scenarios').update(dbData).eq('id', editingScenario.id);
    } else {
      await supabase.from('scenarios').insert(dbData);
    }
    await fetchData();
    setCurrentView("lobby");
  };

  // ==========================================
  // 管理画面処理 (BAN・通知)
  // ==========================================
  const fetchAdminData = async () => {
    const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (usersData) {
      setAllUsers(usersData.map((d: any) => ({
        id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id, 
        ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0, isAdmin: d.is_admin || false, isBanned: d.is_banned || false, email: d.email
      })));
    }
    const { data: appealsData } = await supabase.from('ban_appeals').select('*').order('created_at', { ascending: false });
    if (appealsData) {
      setBanAppeals(appealsData.map((d: any) => ({ id: d.id, userId: d.user_id, reason: d.reason, appealText: d.appeal_text, status: d.status, createdAt: d.created_at })));
    }
  };

  const toggleMaintenance = async () => {
    const newStatus = !isMaintenance;
    const { error } = await supabase.from('app_settings').update({ is_maintenance: newStatus }).eq('id', 1);
    if (!error) { setIsMaintenance(newStatus); alert(`メンテナンスモードを ${newStatus ? "ON" : "OFF"} にしました。`); }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.from('profiles').update({ is_admin: newStatus }).eq('id', userId);
    if (!error) {
      setAllUsers(allUsers.map(u => u.id === userId ? { ...u, isAdmin: newStatus } : u));
      alert(newStatus ? "管理者権限を付与しました。" : "管理者権限を剥奪しました。");
    }
  };

  const executeBan = async () => {
    if(!banTargetUser || !banReason) return;
    await supabase.from('profiles').update({ is_banned: true }).eq('id', banTargetUser.id);
    await supabase.from('ban_appeals').insert({ user_id: banTargetUser.id, reason: banReason, status: 'banned' });
    await supabase.from('notifications').insert({ user_id: banTargetUser.id, title: '【重要】アカウント利用停止のお知らせ', message: `利用規約への違反が確認されたため、アカウントを停止しました。\n\n【BAN理由/通報内容】\n${banReason}` });
    
    alert("BANを実行しました。対象者の内部ログを保存し、通知を送信しました。");
    setBanTargetUser(null); setBanReason(""); fetchAdminData();
  };

  const unbanUser = async (userId: string) => {
    await supabase.from('profiles').update({ is_banned: false }).eq('id', userId);
    await supabase.from('ban_appeals').update({ status: 'resolved' }).eq('user_id', userId);
    alert("アカウントを復活（BAN解除）しました。");
    fetchAdminData();
  };

  const submitAppeal = async () => {
    if(!currentUser || !appealText) return;
    const { data } = await supabase.from('ban_appeals').select('*').eq('user_id', currentUser.id).eq('status', 'banned').order('created_at', {ascending: false}).limit(1);
    if(data && data.length > 0) {
       await supabase.from('ban_appeals').update({ appeal_text: appealText, status: 'appealing' }).eq('id', data[0].id);
    } else {
       await supabase.from('ban_appeals').insert({ user_id: currentUser.id, reason: "不明", appeal_text: appealText, status: 'appealing' });
    }
    alert("調査依頼を送信しました。運営の精査をお待ちください。");
    setAppealText("");
  };

  const sendWarningNotification = async () => {
    if (!warningModalUser || !warningTitle || !warningText) return;
    const { error } = await supabase.from('notifications').insert({ user_id: warningModalUser.id, title: warningTitle, message: warningText });
    if (!error) { alert("警告通知を送信しました。"); setWarningModalUser(null); setWarningTitle(""); setWarningText(""); }
  };

  const markNotificationAsRead = async (notifId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setMyNotifications(myNotifications.map(n => n.id === notifId ? { ...n, isRead: true } : n));
  };

  // ==========================================
  // ロビー機能・ゲーム進行処理
  // ==========================================
  const handleCreateRoom = async () => {
    if (!currentUser || !activeScenario || !hostCharId) return;
    const initialScenes: Scene[] = [{ id: `scene_main_${Date.now()}`, name: "メインルーム", memberIds: activeScenario.presetCharacters.map(c => c.id) }];
    const { data, error } = await supabase.from('rooms').insert({ scenario_id: activeScenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: initialScenes }).select().single();
    if (!error && data) {
      await fetchData();
      const newRoom: Room = { id: data.id, scenario_id: data.scenario_id, scenario: activeScenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes };
      const hostChar = activeScenario.presetCharacters.find(c => c.id === hostCharId);
      if (hostChar) handleJoinRoom(newRoom, hostChar);
    }
  };

  const handleJoinRoom = (room: Room, character: Character) => {
    if (!currentUser) return;
    setActiveRoom(room); setJoinedCharacter(character);
    setMessages([{ sender: "gm", text: `【入室完了】プレイヤー全員の準備が整うまでお待ちください。`, type: "system", sceneId: room.scenes?.[0]?.id }]);
    setCurrentView("game");
  };

  const startGame = async () => {
    if(!activeRoom) return;
    await supabase.from('rooms').update({ status: 'playing' }).eq('id', activeRoom.id);
    setActiveRoom({...activeRoom, status: 'playing'});
    setMessages(prev => [...prev, { sender: "gm", text: `【システム】ホストがゲームを開始しました。\nAI GM「これよりセッションを開始します。」`, type: "system", sceneId: myScene.id }]);
  };

  const endGame = async () => {
    if(!activeRoom) return;
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
    setMessages(prev => [...prev, { sender: "gm", text: `【システム】セッションが終了しました。お疲れ様でした！評価画面へ移動します...`, type: "system", sceneId: myScene.id }]);
    setTimeout(() => { setCurrentView("evaluation"); }, 3000);
  };

  const submitEvaluation = async () => {
    if(!activeRoom || !activeRoom.scenario || !currentUser) return;
    const newScSum = activeRoom.scenario.ratingSum + ratingScenario;
    const newScCount = activeRoom.scenario.ratingCount + 1;
    await supabase.from('scenarios').update({ rating_sum: newScSum, rating_count: newScCount }).eq('id', activeRoom.scenario.id);

    if(activeRoom.host_id) {
      const { data: hostData } = await supabase.from('profiles').select('rating_sum, rating_count').eq('id', activeRoom.host_id).single();
      if(hostData) {
        await supabase.from('profiles').update({ rating_sum: (hostData.rating_sum || 0) + ratingGM, rating_count: (hostData.rating_count || 0) + 1 }).eq('id', activeRoom.host_id);
      }
    }
    alert("評価を送信しました！ロビーに戻ります。");
    setActiveRoom(null); setJoinedCharacter(null); await fetchData(); setCurrentView("lobby");
  };

  // ==========================================
  // レンダリング
  // ==========================================
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  return (
    <main className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* ==================== 0. アカウント停止画面 ==================== */}
      {currentView === "banned" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full overflow-y-auto custom-scrollbar">
          <div className="bg-slate-800 border border-red-700/50 rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6 relative mt-10">
            <div className="flex justify-between items-center border-b border-slate-700 pb-4">
              <h1 className="text-3xl font-extrabold text-red-500">⛔ アカウント利用停止</h1>
              <button onClick={() => setShowMailbox(true)} className="relative text-slate-300 hover:text-white p-2 text-2xl bg-slate-900 rounded-lg border border-slate-700">
                ✉️
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
              </button>
            </div>
            
            <p className="text-slate-300 text-sm leading-relaxed">
              利用規約への違反（通報など）が確認されたため、現在このアカウントは一時的に利用を停止されています。<br/>
              停止の理由や詳細は、右上の「受信箱」から運営からの通知をご確認ください。
            </p>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mt-4">
              <h3 className="font-bold text-amber-500 mb-2">📝 調査依頼（異議申し立て）</h3>
              <p className="text-xs text-slate-400 mb-3">冤罪や誤解がある場合、こちらから当時の状況や理由を送信して再調査を依頼できます。</p>
              <textarea value={appealText} onChange={e => setAppealText(e.target.value)} placeholder="当時の状況や、身の潔白を証明する理由を詳しくご記入ください" className="w-full h-32 bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white mb-3" />
              <button onClick={submitAppeal} disabled={!appealText.trim()} className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 text-white font-bold py-2 rounded">調査を依頼する</button>
            </div>

            <button onClick={handleLogout} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl mt-4">ログアウト</button>
          </div>
        </div>
      )}

      {/* ==================== 0. メンテナンス画面 ==================== */}
      {currentView === "maintenance" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center space-y-6">
            <h1 className="text-4xl font-extrabold text-amber-500 mb-2">🚧 メンテナンス中</h1>
            <p className="text-slate-300 text-sm leading-relaxed">現在システムメンテナンスを行っております。</p>
            <button onClick={handleLogout} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-xl mt-4">ログイン画面に戻る</button>
          </div>
        </div>
      )}

      {/* ==================== 0. 管理画面 ==================== */}
      {currentView === "admin" && currentUser?.isAdmin && (
        <div className="flex-1 flex flex-col p-6 w-full overflow-y-auto max-w-5xl mx-auto custom-scrollbar">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-extrabold text-red-400 flex items-center gap-2">⚙️ システム管理画面</h1>
              <button onClick={() => setCurrentView("lobby")} className="text-xs text-slate-400 hover:text-white underline">← ロビーに戻る</button>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white mb-1">メンテナンスモード</h3>
                <p className="text-[10px] text-slate-400">ONにすると一般ユーザーを遮断します。</p>
              </div>
              <button onClick={toggleMaintenance} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${isMaintenance ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-slate-700 text-slate-300'}`}>
                {isMaintenance ? "🔴 メンテ中" : "🟢 稼働中"}
              </button>
            </div>

            {/* ★ 調査依頼（異議申し立て）リスト */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white mb-1">🚨 調査依頼（BAN異議申し立て）</h3>
              <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {banAppeals.filter(a => a.status === 'appealing').map(appeal => {
                  const u = allUsers.find(user => user.id === appeal.userId);
                  return (
                    <div key={appeal.id} className="bg-slate-800 p-4 rounded-lg border border-amber-500/50 flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-amber-400 mb-2">申立人: {u?.handleName || "不明"}</p>
                        <div className="text-xs text-slate-300 bg-slate-900 p-2 rounded mb-2 border border-slate-700">
                          <span className="text-red-400 font-bold block mb-1">【BAN理由 / 通報ログ】</span>{appeal.reason}
                        </div>
                        <div className="text-xs text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                          <span className="text-blue-400 font-bold block mb-1">【ユーザーの主張・言い訳】</span>{appeal.appealText}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 justify-center w-full md:w-32">
                        <button onClick={() => unbanUser(appeal.userId)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded font-bold shadow-lg shadow-emerald-900/50">復活 (BAN解除)</button>
                      </div>
                    </div>
                  )
                })}
                {banAppeals.filter(a => a.status === 'appealing').length === 0 && <p className="text-xs text-slate-500">現在、調査依頼はありません。</p>}
              </div>
            </div>

            {/* ユーザー管理 */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white mb-3">ユーザー管理＆治安維持</h3>

              {/* ★ ユーザー検索窓 */}
              <input 
                type="text" 
                placeholder="ユーザー名、メールアドレス、Discord IDで検索..." 
                value={userSearchQuery} 
                onChange={(e) => setUserSearchQuery(e.target.value)} 
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 mb-2 shadow-inner" 
              />

              {/* ★ 管理画面ユーザー一覧のスクロール */}
              <div className="max-h-[500px] overflow-y-auto space-y-3 custom-scrollbar pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
                {allUsers.filter(u => 
                  u.handleName.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                  (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) || 
                  (u.discordId && u.discordId.toLowerCase().includes(userSearchQuery.toLowerCase()))
                ).map(user => (
                  <div key={user.id} className={`flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800 p-4 rounded-lg border ${user.isBanned ? 'border-red-500/50 bg-red-950/20' : 'border-slate-700'}`}>
                    <div className="flex items-center gap-3 mb-3 md:mb-0">
                      <img src={user.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-bold text-white flex items-center gap-2">
                          {user.handleName} {user.isAdmin && <span className="text-[10px] bg-red-900 text-white px-1 rounded">管理</span>}
                          {user.isBanned && <span className="text-[10px] bg-red-600 text-white px-1 rounded animate-pulse">BAN</span>}
                        </p>
                        <p className="text-[10px] text-slate-400">Email: {user.email || "未登録"} | Discord: {user.discordId || "未登録"}</p>
                        <p className="text-[10px] text-amber-400">★ 評価: {user.ratingCount > 0 ? (user.ratingSum / user.ratingCount).toFixed(1) : "新規"} ({user.ratingCount}件)</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => { setWarningModalUser(user); setWarningTitle("【運営より】利用規約違反に関する警告"); }} className="flex-1 md:flex-none text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded font-bold shadow-lg shadow-amber-900/50">
                        ⚠️ 警告
                      </button>
                      <button 
                        onClick={() => { if (user.isBanned) unbanUser(user.id); else { setBanTargetUser(user); setBanReason(""); } }} 
                        disabled={user.id === currentUser.id} 
                        className={`flex-1 md:flex-none text-[10px] px-3 py-2 rounded font-bold disabled:opacity-50 ${user.isBanned ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-700 hover:bg-red-600 text-white shadow-lg shadow-red-900/50'}`}
                      >
                        {user.isBanned ? "BAN解除" : "⛔ BAN"}
                      </button>
                      <button onClick={() => toggleAdminStatus(user.id, user.isAdmin)} disabled={user.id === currentUser.id} className={`flex-1 md:flex-none text-[10px] px-3 py-2 rounded font-bold disabled:opacity-50 ${user.isAdmin ? 'bg-red-900/50 text-red-300' : 'bg-slate-700 text-slate-300'}`}>
                        {user.isAdmin ? "👑 管理者" : "👤 一般"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ★ BAN実行モーダル (Admin) */}
      {banTargetUser && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-700/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-red-500 mb-2">⛔ ユーザーをBANする</h3>
            <p className="text-xs text-slate-400 mb-4">対象: {banTargetUser.handleName} ({banTargetUser.email})</p>
            <div className="space-y-3 mb-4">
              <textarea value={banReason} onChange={e=>setBanReason(e.target.value)} placeholder="通報ログ・BANの理由を入力してください（※ユーザーへの通知と内部資料になります）" className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setBanTargetUser(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button>
              <button onClick={executeBan} disabled={!banReason.trim()} className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-red-900/50">BANを実行する</button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 警告送信モーダル (Admin) */}
      {warningModalUser && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-amber-500 mb-2">ユーザーへの通知送信</h3>
            <p className="text-xs text-slate-400 mb-4">宛先: {warningModalUser.handleName} ({warningModalUser.email})</p>
            <div className="space-y-3 mb-4">
              <input type="text" value={warningTitle} onChange={e=>setWarningTitle(e.target.value)} placeholder="件名" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
              <textarea value={warningText} onChange={e=>setWarningText(e.target.value)} placeholder="通知内容・違反内容を入力" className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setWarningModalUser(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button>
              <button onClick={sendWarningNotification} className="flex-1 bg-amber-600 hover:bg-amber-500 py-3 rounded text-sm font-bold shadow-lg shadow-amber-900/50">送信する</button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 受信箱モーダル (Global) */}
      {showMailbox && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">✉️ 受信箱</h3>
              <button onClick={() => setShowMailbox(false)} className="text-slate-400 hover:text-white font-bold text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
              {myNotifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">現在お知らせはありません。</p>
              ) : (
                myNotifications.map(n => (
                  <div key={n.id} className={`p-4 rounded-lg border ${n.isRead ? 'bg-slate-900 border-slate-700' : 'bg-slate-800 border-blue-500/50 relative overflow-hidden'}`}>
                    {!n.isRead && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>}
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-white text-sm">{n.title}</h4>
                      <span className="text-[10px] text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{n.message}</p>
                    {!n.isRead && (
                      <button onClick={() => markNotificationAsRead(n.id)} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded mt-3 text-slate-300 transition">既読にする</button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 0. ログイン／新規登録 ==================== */}
      {currentView === "login" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h1 className="text-3xl font-extrabold text-emerald-400 mb-2 text-center">AI GM MORPG</h1>
            <p className="text-slate-400 text-sm text-center mb-8">ログインして冒険を始める</p>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="メールアドレス" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="パスワード" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white" />
              <button type="submit" disabled={authLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl">{isLoginMode ? "ログイン" : "新規登録してはじめる"}</button>
            </form>

            <div className="mt-4">
              <button onClick={handleGoogleAuth} disabled={authLoading} className="w-full bg-white text-slate-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Googleでログイン
              </button>
            </div>

            <div className="text-center mt-6">
              <button onClick={() => setIsLoginMode(!isLoginMode)} type="button" className="text-sm text-emerald-400 hover:text-emerald-300 underline">
                {isLoginMode ? "新規登録はこちら" : "ログインはこちら"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 1. ロビー画面 ==================== */}
      {currentView === "lobby" && currentUser && (
        <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
          <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
            <div>
              <h1 className="text-3xl font-extrabold text-emerald-400 mb-1">AI GM MORPG Lobby</h1>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowMailbox(true)} className="relative text-slate-300 hover:text-white p-2 text-xl">
                ✉️
                {unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
              </button>

              {currentUser.isAdmin && (
                <button onClick={() => { setCurrentView("admin"); fetchAdminData(); }} className="bg-red-900/50 hover:bg-red-800/80 border border-red-500/50 text-red-300 text-xs px-3 py-1.5 rounded font-bold shadow-lg shadow-red-900/30">
                  ⚙️ 管理画面
                </button>
              )}
              <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white underline">ログアウト</button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ★ ロビー画面の部屋リストのスクロール */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h2 className="text-xl font-bold text-blue-400">🌐 募集中のセッション</h2>
              <div className="max-h-[600px] overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {rooms.length === 0 ? (
                  <p className="text-slate-400 text-sm p-4 bg-slate-800 rounded-xl border border-slate-700">現在募集中のセッションはありません。</p>
                ) : (
                  rooms.map((room) => {
                    const scRating = room.scenario?.ratingCount ? (room.scenario.ratingSum / room.scenario.ratingCount).toFixed(1) : "未評価";
                    const isWarning = room.scenario?.ratingCount && (room.scenario.ratingSum / room.scenario.ratingCount) < 3.0;

                    return (
                      <div key={room.id} className={`bg-slate-800 border rounded-xl p-4 flex gap-4 ${isWarning ? 'border-red-500/50 bg-red-950/20' : 'border-slate-700 hover:border-blue-500'}`}>
                        <img src={room.scenario?.imageUrl || NO_IMAGE_SCENARIO} className="w-24 h-24 object-cover rounded" />
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            {room.scenario?.title}
                            {isWarning && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">⚠️ 注意: 評価が低めです</span>}
                          </h3>
                          <div className="text-xs text-slate-400 mb-2">ホスト: {room.host_name} | シナリオ評価: ★ {scRating}</div>
                          <select className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white" onChange={(e) => { const char = room.scenario?.presetCharacters.find(c => c.id === e.target.value); if(char) handleJoinRoom(room, char); }} defaultValue="">
                            <option value="" disabled>参加するキャラクターを選択...</option>
                            {room.scenario?.presetCharacters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
                <div className="flex justify-between items-center mb-3"><h2 className="text-sm font-bold text-blue-400">👤 プレイヤー情報</h2>{!isEditingProfile && <button onClick={() => { setEditProfileData(currentUser); setIsEditingProfile(true); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded">編集</button>}</div>
                {isEditingProfile && editProfileData ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={editProfileData.avatarUrl || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                      <input type="file" accept="image/*" onChange={async (e) => { const url = await handleImageUpload(e, 'avatars'); if(url) setEditProfileData({...editProfileData, avatarUrl: url}); }} className="text-xs text-slate-400 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500" />
                    </div>
                    <input type="text" value={editProfileData.handleName} onChange={(e) => setEditProfileData({...editProfileData, handleName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm" placeholder="名前" />
                    <input type="text" placeholder="Discord ID (username#1234)" value={editProfileData.discordId || ""} onChange={(e) => setEditProfileData({...editProfileData, discordId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm" />
                    <textarea value={editProfileData.bio} onChange={(e) => setEditProfileData({...editProfileData, bio: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm h-16 outline-none" placeholder="自己紹介" />
                    <button onClick={saveProfile} className="w-full bg-blue-600 font-bold text-xs py-2 rounded">保存</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-4 items-center">
                      <img src={currentUser.avatarUrl} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <p className="font-bold text-white flex items-center gap-1">
                          {currentUser.handleName}
                          {currentUser.isAdmin && <span className="text-[10px] bg-red-900/50 text-red-300 border border-red-500/50 px-1.5 py-0.5 rounded">管理</span>}
                        </p>
                        <p className="text-[10px] text-amber-400">★ 評価: {currentUser.ratingCount > 0 ? (currentUser.ratingSum / currentUser.ratingCount).toFixed(1) : "新規"}</p>
                        {currentUser.discordId && <p className="text-[10px] text-indigo-400 mt-0.5">Discord: {currentUser.discordId}</p>}
                      </div>
                    </div>
                    {currentUser.bio && <p className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded mt-2 border border-slate-700/50 whitespace-pre-wrap">{currentUser.bio}</p>}
                  </div>
                )}
              </div>
              
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold text-amber-400">📜 シナリオを立てる</h2>
                  <button onClick={() => { 
                    setEditingScenario({ id: "", title: "", system: "", tags: "", setting: "", npcList: "", plot: "", imageUrl: "", presetCharacters: [], ratingSum: 0, ratingCount: 0 }); 
                    setCurrentView("scenarioEdit"); 
                  }} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">＋ 新規作成</button>
                </div>
                <select value={selectedScenarioId} onChange={(e) => setSelectedScenarioId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white mb-4">
                  {scenarios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
                {activeScenario && (
                  <div>
                    <select value={hostCharId} onChange={(e) => setHostCharId(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white mb-3">
                      <option value="" disabled>自分のキャラクターを選択...</option>
                      {activeScenario.presetCharacters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={handleCreateRoom} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded">部屋を立てて入室</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. シナリオ編集 ==================== */}
      {currentView === "scenarioEdit" && editingScenario && (
        <div className="flex-1 flex flex-col items-center p-6 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar">
          <h2 className="text-2xl font-bold text-amber-400 mb-6 w-full">{editingScenario.id ? "シナリオ・セット編集" : "シナリオ・セット新規作成"}</h2>
          {editingCharIndex !== null ? (
            <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-emerald-400 mb-2 border-b border-slate-700 pb-2">キャラクター設定</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-xs text-slate-400 block mb-1">名前</label><input type="text" value={editingScenario.presetCharacters[editingCharIndex].name} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].name = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" /></div><div><label className="text-xs text-slate-400 block mb-1">職業</label><input type="text" value={editingScenario.presetCharacters[editingCharIndex].job} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].job = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" /></div></div>
              
              <div>
                <label className="text-xs text-slate-400 block mb-1">キャラクター画像</label>
                <div className="flex items-center gap-3">
                  <img src={editingScenario.presetCharacters[editingCharIndex].imageUrl || NO_IMAGE_CHAR} className="w-12 h-12 object-cover rounded border border-slate-700" />
                  <input type="file" accept="image/*" onChange={async (e) => { const url = await handleImageUpload(e, 'characters'); if(url) { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].imageUrl = url; setEditingScenario({ ...editingScenario, presetCharacters: newC }); } }} className="text-xs text-slate-400 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-600/30 file:text-emerald-400 hover:file:bg-emerald-600/50" />
                </div>
              </div>

              <div><label className="text-xs text-slate-400 block mb-1">性格・特徴 (ハンドアウト内容)</label><textarea value={editingScenario.presetCharacters[editingCharIndex].personality} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].personality = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-20 outline-none focus:border-emerald-500" /></div>
              
              <button onClick={() => setEditingCharIndex(null)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition mt-2">シナリオ編集に戻る</button>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-bold text-amber-400 border-b border-slate-700 pb-2">基本設定</h3>
                <div><label className="text-sm text-amber-200 block mb-1">シナリオタイトル</label><input type="text" value={editingScenario.title} onChange={(e) => setEditingScenario({ ...editingScenario, title: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" /></div>
                
                <div>
                  <label className="text-sm text-amber-200 block mb-1">パッケージ画像</label>
                  <div className="flex flex-col gap-2">
                    <img src={editingScenario.imageUrl || NO_IMAGE_SCENARIO} className="w-full h-32 object-cover rounded-lg border border-slate-700" />
                    <input type="file" accept="image/*" onChange={async (e) => { const url = await handleImageUpload(e, 'scenarios'); if(url) setEditingScenario({ ...editingScenario, imageUrl: url }); }} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600/30 file:text-amber-400 hover:file:bg-amber-600/50 w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4"><div><label className="text-sm text-amber-200 block mb-1">システム</label><input type="text" value={editingScenario.system} onChange={(e) => setEditingScenario({ ...editingScenario, system: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" /></div><div><label className="text-sm text-amber-200 block mb-1">タグ</label><input type="text" value={editingScenario.tags} onChange={(e) => setEditingScenario({ ...editingScenario, tags: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" /></div></div>
                <div><label className="text-sm text-amber-200 block mb-1">世界観・設定</label><textarea value={editingScenario.setting} onChange={(e) => setEditingScenario({ ...editingScenario, setting: e.target.value })} className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500" /></div>
                <div><label className="text-sm text-amber-200 block mb-1">NPC一覧</label><textarea value={editingScenario.npcList} onChange={(e) => setEditingScenario({ ...editingScenario, npcList: e.target.value })} className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500" /></div>
                <div><label className="text-sm text-amber-200 block mb-1">プロット (AI用)</label><textarea value={editingScenario.plot} onChange={(e) => setEditingScenario({ ...editingScenario, plot: e.target.value })} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500" /></div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2"><h3 className="text-lg font-bold text-emerald-400">専用キャラクター (HO)</h3><button onClick={() => { const newChar: Character = { id: `c${Date.now()}`, name: "新規キャラ", job: "", personality: "", imageUrl: "", hp: 10, san: 50, str: 50, dex: 50, int: 50, con: 50, wis: 50, cha: 50 }; setEditingScenario({ ...editingScenario, presetCharacters: [...editingScenario.presetCharacters, newChar] }); setEditingCharIndex(editingScenario.presetCharacters.length); }} className="text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 px-3 py-1.5 rounded transition">＋ 追加</button></div>
                  <div className="space-y-3">
                    {editingScenario.presetCharacters.map((char, idx) => (<div key={char.id} className="flex items-center gap-3 bg-slate-900 border border-slate-700 p-3 rounded-lg"><img src={char.imageUrl || NO_IMAGE_CHAR} alt="char" className="w-12 h-12 object-cover rounded border border-slate-600" /><div className="flex-1"><p className="text-sm font-bold text-white">{char.name}</p><p className="text-[10px] text-slate-400">{char.job}</p></div><button onClick={() => setEditingCharIndex(idx)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-white transition">編集</button><button onClick={() => { const newC = editingScenario.presetCharacters.filter((_, i) => i !== idx); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="text-xs text-red-400 hover:text-red-300 px-2 py-2">削除</button></div>))}
                  </div>
                </div>
                <div className="flex gap-3"><button onClick={() => setCurrentView("lobby")} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition">キャンセル</button><button onClick={saveScenario} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg transition shadow-lg shadow-amber-900/50">シナリオ一式を保存する</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== 3. ゲームセッション画面 ==================== */}
      {currentView === "game" && activeRoom && joinedCharacter && currentUser && myScene && (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 h-full relative">
          <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-blue-400 font-bold border border-blue-500/50 bg-blue-900/30 px-2 py-0.5 rounded w-fit mb-1">ROOM: {activeRoom.scenario?.title} ({activeRoom.status})</span>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <img src={joinedCharacter.imageUrl || NO_IMAGE_CHAR} className="w-5 h-5 rounded-full" /> {joinedCharacter.name}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {currentUser.handleName === activeRoom.host_name && (
                <>
                  {activeRoom.status === "recruiting" && (
                    <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded mr-2 animate-pulse shadow-lg shadow-emerald-900/50">▶ ゲーム開始 (AI起動)</button>
                  )}
                  {activeRoom.status === "playing" && (
                    <button onClick={endGame} className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded mr-2 shadow-lg shadow-red-900/50">■ ゲーム終了＆評価へ</button>
                  )}
                </>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3">
            {messages.map((msg, index) => (
              <div key={index} className={`p-3 rounded-xl max-w-[85%] ${msg.sender === "gm" ? "bg-slate-700/90 border-l-4 border-emerald-500 mr-auto text-slate-100" : "bg-blue-600/90 ml-auto text-right text-white"}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== 4. リザルト・評価画面 ==================== */}
      {currentView === "evaluation" && activeRoom && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6">
            <h1 className="text-2xl font-extrabold text-amber-400 text-center border-b border-slate-700 pb-4">セッション終了！お疲れ様でした</h1>
            <p className="text-sm text-slate-400 text-center">次回のプレイをより良くするため、評価にご協力ください。</p>
            
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
              <div>
                <label className="text-sm text-white font-bold block mb-2">🎭 シナリオの評価: 「{activeRoom.scenario?.title}」</label>
                <div className="flex gap-2 text-2xl text-amber-500 cursor-pointer justify-center">
                  {[1,2,3,4,5].map(star => (
                    <span key={star} onClick={() => setRatingScenario(star)} className="hover:scale-125 transition">
                      {star <= ratingScenario ? "★" : "☆"}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-slate-700 pt-4">
                <label className="text-sm text-white font-bold block mb-2">👑 GM(ホスト)の評価: {activeRoom.host_name}</label>
                <div className="flex gap-2 text-2xl text-blue-400 cursor-pointer justify-center">
                  {[1,2,3,4,5].map(star => (
                    <span key={star} onClick={() => setRatingGM(star)} className="hover:scale-125 transition">
                      {star <= ratingGM ? "★" : "☆"}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={submitEvaluation} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/50 text-lg transition">
              評価を送信してロビーに戻る
            </button>
          </div>
        </div>
      )}
    </main>
  );
}