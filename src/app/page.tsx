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

// ★ playLimit (購入時に付与されるチケット回数) を追加
type Scenario = {
  id: string; title: string; system: string; tags: string; setting: string;
  npcList: string; plot: string; imageUrl: string; presetCharacters: Character[];
  ratingSum: number; ratingCount: number;
  authorId?: string; price?: number; playLimit?: number;
  purchasedTickets?: Record<string, number>;
};

type Scene = { id: string; name: string; memberIds: string[]; leaderId?: string; };

type Room = { 
  id: string; scenario_id: string; scenario?: Scenario; 
  host_name: string; status: "recruiting" | "playing" | "finished"; scenes: Scene[]; 
  host_id?: string;
};

type Message = { sender: "player" | "gm"; text: string; type?: "ic" | "ooc" | "system"; sceneId?: string; };

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
  const [grantUserId, setGrantUserId] = useState("");

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

  const [userSearchQuery, setUserSearchQuery] = useState("");

  // ★ 自分が作者、またはチケットを持っているシナリオだけをリスト化
  const myScenarios = scenarios.filter(s => s.authorId === currentUser?.id || (s.purchasedTickets && currentUser && s.purchasedTickets[currentUser.id] > 0));

  const activeScenario = myScenarios.find((s) => s.id === selectedScenarioId) || myScenarios[0];
  const defaultScene: Scene = { id: "scene_main", name: "メインルーム", memberIds: [] };
  const myScene = activeRoom?.scenes?.find(s => joinedCharacter && s.memberIds.includes(joinedCharacter.id)) || activeRoom?.scenes?.[0] || defaultScene;

  const myActiveRoom = rooms.find(r => currentUser && r.host_id === currentUser.id && r.status !== 'finished');

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
        ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0,
        authorId: d.author_id, price: d.price || 500, playLimit: d.play_limit || 1,
        purchasedTickets: d.purchased_tickets || {} 
      }));
      setScenarios(loadedScenarios);
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
    if (profileData.isBanned) setCurrentView("banned");
    else if (currentMaintenance && !profileData.isAdmin) setCurrentView("maintenance");
    else setCurrentView("lobby");
  };

  useEffect(() => {
    const initApp = async () => {
      const { data: appData } = await supabase.from('app_settings').select('*').eq('id', 1).single();
      const currentMaintenance = appData ? appData.is_maintenance : false;
      setIsMaintenance(currentMaintenance);
      await fetchData();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await fetchProfile(session.user.id, session.user.email || "", currentMaintenance);
      else if (currentMaintenance) setCurrentView("maintenance");
    };
    initApp();
  }, []);

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
    if (!editingScenario || !currentUser) return;
    const dbData = { 
      title: editingScenario.title, system: editingScenario.system, tags: editingScenario.tags, setting: editingScenario.setting, 
      npc_list: editingScenario.npcList, plot: editingScenario.plot, image_url: editingScenario.imageUrl, preset_characters: editingScenario.presetCharacters,
      rating_sum: editingScenario.ratingSum, rating_count: editingScenario.ratingCount,
      author_id: currentUser.id,
      purchased_tickets: editingScenario.purchasedTickets || {},
      price: editingScenario.price || 500,
      play_limit: editingScenario.playLimit || 1
    };
    if (editingScenario.id && !editingScenario.id.startsWith('s')) {
      await supabase.from('scenarios').update(dbData).eq('id', editingScenario.id);
    } else {
      await supabase.from('scenarios').insert(dbData);
    }
    await fetchData();
    setCurrentView("lobby");
  };

  // ★ 決済システムを考慮した購入フロー（評価画面から呼ばれる）
  const handleBuyInEvaluation = async () => {
    if (!activeRoom || !activeRoom.scenario || !currentUser) return;
    const scenario = activeRoom.scenario;

    if (scenario.price && scenario.price > 0) {
      if (!confirm(`【決済システムへ遷移します】\n金額: ${scenario.price} G\n（※現在はデモのため、OKを押すと決済完了として処理を進めます。）`)) {
        return;
      }
    }

    const currentTickets = scenario.purchasedTickets || {};
    const addLimit = scenario.playLimit || 1;
    const newTickets = { ...currentTickets, [currentUser.id]: (currentTickets[currentUser.id] || 0) + addLimit };

    const { error } = await supabase.from('scenarios').update({ purchased_tickets: newTickets }).eq('id', scenario.id);
    if (!error) {
      alert(`「${scenario.title}」を購入しました！\nマイ・シナリオにプレイ権が ${addLimit} 回分追加されました。`);
      submitEvaluation(); 
    } else {
      alert("エラーが発生しました: " + error.message);
    }
  };

  // ★ チケットプレゼント機能
  const handleGiftTicket = async () => {
    if (!activeScenario || !grantUserId || !currentUser) return;
    const isAuthor = activeScenario.authorId === currentUser.id;
    const currentTickets = activeScenario.purchasedTickets || {};
    let myTickets = currentTickets[currentUser.id] || 0;

    if (!isAuthor && myTickets <= 0) {
      alert("プレゼントするチケットがありません。"); return;
    }

    const newTickets = { ...currentTickets };
    if (!isAuthor) newTickets[currentUser.id] = myTickets - 1; // 自分が作者でない場合はチケット消費
    newTickets[grantUserId] = (newTickets[grantUserId] || 0) + 1; // 相手に付与

    const { error } = await supabase.from('scenarios').update({ purchased_tickets: newTickets }).eq('id', activeScenario.id);
    if (!error) {
      alert("対象のユーザーにプレイチケットを1回分プレゼントしました！");
      setGrantUserId("");
      await fetchData();
    } else { alert("エラーが発生しました: " + error.message); }
  };

  const fetchAdminData = async () => {
    const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (usersData) { setAllUsers(usersData.map((d: any) => ({ id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id, ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0, isAdmin: d.is_admin || false, isBanned: d.is_banned || false, email: d.email }))); }
    const { data: appealsData } = await supabase.from('ban_appeals').select('*').order('created_at', { ascending: false });
    if (appealsData) { setBanAppeals(appealsData.map((d: any) => ({ id: d.id, userId: d.user_id, reason: d.reason, appealText: d.appeal_text, status: d.status, createdAt: d.created_at }))); }
  };

  const toggleMaintenance = async () => { const newStatus = !isMaintenance; await supabase.from('app_settings').update({ is_maintenance: newStatus }).eq('id', 1); setIsMaintenance(newStatus); alert(`メンテナンスモードを ${newStatus ? "ON" : "OFF"} にしました。`); };
  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => { const newStatus = !currentStatus; await supabase.from('profiles').update({ is_admin: newStatus }).eq('id', userId); setAllUsers(allUsers.map(u => u.id === userId ? { ...u, isAdmin: newStatus } : u)); alert(newStatus ? "管理者権限を付与しました。" : "管理者権限を剥奪しました。"); };
  const executeBan = async () => { if(!banTargetUser || !banReason) return; await supabase.from('profiles').update({ is_banned: true }).eq('id', banTargetUser.id); await supabase.from('ban_appeals').insert({ user_id: banTargetUser.id, reason: banReason, status: 'banned' }); alert("BANを実行しました。"); setBanTargetUser(null); setBanReason(""); fetchAdminData(); };
  const unbanUser = async (userId: string) => { await supabase.from('profiles').update({ is_banned: false }).eq('id', userId); await supabase.from('ban_appeals').update({ status: 'resolved' }).eq('user_id', userId); alert("BANを解除しました。"); fetchAdminData(); };
  const submitAppeal = async () => { if(!currentUser || !appealText) return; await supabase.from('ban_appeals').insert({ user_id: currentUser.id, reason: "不明", appeal_text: appealText, status: 'appealing' }); alert("調査依頼を送信しました。"); setAppealText(""); };
  const sendWarningNotification = async () => { if (!warningModalUser || !warningTitle || !warningText) return; await supabase.from('notifications').insert({ user_id: warningModalUser.id, title: warningTitle, message: warningText }); alert("警告通知を送信しました。"); setWarningModalUser(null); setWarningTitle(""); setWarningText(""); };
  const markNotificationAsRead = async (notifId: string) => { await supabase.from('notifications').update({ is_read: true }).eq('id', notifId); setMyNotifications(myNotifications.map(n => n.id === notifId ? { ...n, isRead: true } : n)); };

  const handleCreateRoom = async () => {
    if (!currentUser || !activeScenario || !hostCharId) { alert("エラー: シナリオまたはキャラクターが選択されていません。"); return; }
    
    const isAuthor = activeScenario.authorId === currentUser.id;
    if (!isAuthor) {
      const currentTickets = activeScenario.purchasedTickets || {};
      const myTickets = currentTickets[currentUser.id] || 0;
      if (myTickets <= 0) { alert("プレイチケットがありません。"); return; }
      const newTickets = { ...currentTickets, [currentUser.id]: myTickets - 1 };
      const { error: ticketError } = await supabase.from('scenarios').update({ purchased_tickets: newTickets }).eq('id', activeScenario.id);
      if (ticketError) { alert("チケットの消費処理に失敗しました。"); return; }
    }

    const initialScenes: Scene[] = [{ id: `scene_main_${Date.now()}`, name: "メインルーム", memberIds: activeScenario.presetCharacters.map(c => c.id) }];
    const { data, error } = await supabase.from('rooms').insert({ scenario_id: activeScenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: initialScenes }).select().single();
    
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
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

  const handleSend = () => {
    if (!input.trim() || isLoading || !activeRoom || !joinedCharacter || !currentUser || !myScene) return;
    const userMsg: Message = { sender: "player", text: input, type: msgType, sceneId: myScene.id };
    setMessages((prev) => [...prev, userMsg]);
    setInput(""); setIsLoading(true);
    setTimeout(() => {
      const replyText = msgType === "ic" ? `AI GM「（${myScene.name}にて）行動を処理します…」` : `AI GM (OOC)「了解しました: ${userMsg.text}」`;
      setMessages((prev) => [...prev, { sender: "gm", text: replyText, type: msgType, sceneId: myScene.id }]);
      setIsLoading(false);
    }, 1000);
  };

  const roll1d100 = (targetValue: number, label: string) => {
    if(!myScene) return;
    const res = Math.floor(Math.random() * 100) + 1;
    const isSuccess = res <= targetValue;
    setMessages((prev) => [...prev, { sender: "player", text: `🎲 ${label} (1d100 ≦ ${targetValue}%) ➔ 出目: ${res} 【${isSuccess ? "成功" : "失敗"}】`, type: "ic", sceneId: myScene.id }]);
  };

  const roll3d6 = (targetValue: number, label: string) => {
    if(!myScene) return;
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    const res = d1 + d2 + d3;
    const isSuccess = res <= targetValue;
    setMessages((prev) => [...prev, { sender: "player", text: `🎲 ${label} (3d6 ≦ ${targetValue}) ➔ 出目: ${res} [${d1},${d2},${d3}] 【${isSuccess ? "成功" : "失敗"}】`, type: "ic", sceneId: myScene.id }]);
  };

  const submitEvaluation = async () => {
    if(!activeRoom || !activeRoom.scenario || !currentUser) return;
    const newScSum = activeRoom.scenario.ratingSum + ratingScenario;
    const newScCount = activeRoom.scenario.ratingCount + 1;
    await supabase.from('scenarios').update({ rating_sum: newScSum, rating_count: newScCount }).eq('id', activeRoom.scenario.id);
    if(activeRoom.host_id) {
      const { data: hostData } = await supabase.from('profiles').select('rating_sum, rating_count').eq('id', activeRoom.host_id).single();
      if(hostData) { await supabase.from('profiles').update({ rating_sum: (hostData.rating_sum || 0) + ratingGM, rating_count: (hostData.rating_count || 0) + 1 }).eq('id', activeRoom.host_id); }
    }
    alert("評価を送信しました！ロビーに戻ります。");
    setActiveRoom(null); setJoinedCharacter(null); await fetchData(); setCurrentView("lobby");
  };

  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  return (
    <main className="h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* ==================== 0. 各種モーダル等 ==================== */}
      {currentView === "banned" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full overflow-y-auto min-h-0">
          <div className="bg-slate-800 border border-red-700/50 rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6 relative mt-10">
            <h1 className="text-3xl font-extrabold text-red-500 border-b border-slate-700 pb-4">⛔ アカウント利用停止</h1>
            <p className="text-slate-300 text-sm leading-relaxed">規約違反によりアカウントが停止されています。</p>
            <button onClick={handleLogout} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl mt-4">ログアウト</button>
          </div>
        </div>
      )}

      {currentView === "maintenance" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full min-h-0 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center space-y-6">
            <h1 className="text-4xl font-extrabold text-amber-500 mb-2">🚧 メンテナンス中</h1>
            <p className="text-slate-300 text-sm leading-relaxed">現在システムメンテナンスを行っております。</p>
            <button onClick={handleLogout} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-xl mt-4">戻る</button>
          </div>
        </div>
      )}

      {currentView === "admin" && currentUser?.isAdmin && (
        <div className="flex-1 flex flex-col p-6 w-full overflow-y-auto min-h-0 max-w-5xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full shadow-2xl space-y-6 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-600 rounded-t-2xl"></div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-extrabold text-red-400">⚙️ システム管理画面</h1>
              <button onClick={() => setCurrentView("lobby")} className="text-xs text-slate-400 hover:text-white underline">← ロビーに戻る</button>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex justify-between items-center">
              <div><h3 className="font-bold text-white mb-1">メンテナンスモード</h3></div>
              <button onClick={toggleMaintenance} className={`px-4 py-2 rounded-lg font-bold text-sm ${isMaintenance ? 'bg-red-600' : 'bg-slate-700'}`}>{isMaintenance ? "🔴 メンテ中" : "🟢 稼働中"}</button>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white mb-3">ユーザー管理</h3>
              <input type="text" placeholder="検索..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 mb-2" />
              <div className="h-[400px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
                {allUsers.filter(u => u.handleName.toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))).map(user => (
                  <div key={user.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-3">
                      <img src={user.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-bold text-white">{user.handleName} {user.isAdmin && <span className="text-[10px] bg-red-900 px-1 rounded">管理</span>}</p>
                        <p className="text-[10px] text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleAdminStatus(user.id, user.isAdmin)} className="text-[10px] px-3 py-2 rounded bg-slate-700">権限変更</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showMailbox && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">✉️ 受信箱</h3><button onClick={() => setShowMailbox(false)} className="text-xl">×</button></div>
            <div className="h-[400px] overflow-y-scroll space-y-3 pr-2">
              {myNotifications.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">お知らせはありません。</p> : myNotifications.map(n => (
                <div key={n.id} className={`p-4 rounded-lg border ${n.isRead ? 'bg-slate-900 border-slate-700' : 'bg-slate-800 border-blue-500/50'}`}>
                  <h4 className="font-bold text-sm">{n.title}</h4>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap mt-2">{n.message}</p>
                  {!n.isRead && <button onClick={() => markNotificationAsRead(n.id)} className="text-[10px] bg-slate-700 px-3 py-1 rounded mt-3">既読にする</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 0. ログイン／新規登録 ==================== */}
      {currentView === "login" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full min-h-0 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h1 className="text-3xl font-extrabold text-emerald-400 mb-2 text-center">AI GM MORPG</h1>
            <p className="text-slate-400 text-sm text-center mb-8">ログインして冒険を始める</p>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="メールアドレス" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="パスワード" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white" />
              <button type="submit" disabled={authLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl">{isLoginMode ? "ログイン" : "新規登録してはじめる"}</button>
            </form>
            <div className="mt-4"><button onClick={handleGoogleAuth} disabled={authLoading} className="w-full bg-white text-slate-800 font-bold py-3 rounded-xl hover:bg-slate-200">Googleでログイン</button></div>
            <div className="text-center mt-6"><button onClick={() => setIsLoginMode(!isLoginMode)} type="button" className="text-sm text-emerald-400 underline">{isLoginMode ? "新規登録はこちら" : "ログインはこちら"}</button></div>
          </div>
        </div>
      )}

      {/* ==================== 1. ロビー画面 ==================== */}
      {currentView === "lobby" && currentUser && (
        <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full min-h-0 overflow-y-auto">
          <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
            <div><h1 className="text-3xl font-extrabold text-emerald-400 mb-1">AI GM MORPG Lobby</h1></div>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowMailbox(true)} className="relative text-slate-300 hover:text-white p-2 text-xl">✉️{unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1.5 rounded-full">{unreadCount}</span>}</button>
              {currentUser.isAdmin && <button onClick={() => { setCurrentView("admin"); fetchAdminData(); }} className="bg-red-900/50 text-red-300 text-xs px-3 py-1.5 rounded font-bold">⚙️ 管理画面</button>}
              <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white underline">ログアウト</button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h2 className="text-xl font-bold text-blue-400">🌐 募集中のセッション</h2>
              <div className="h-[500px] overflow-y-scroll space-y-4 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
                {rooms.length === 0 ? <p className="text-slate-400 text-sm p-4 text-center">現在募集中のセッションはありません。</p> : rooms.map((room) => {
                  return (
                    <div key={room.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4 hover:border-blue-500">
                      <img src={room.scenario?.imageUrl || NO_IMAGE_SCENARIO} className="w-24 h-24 object-cover rounded" />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">{room.scenario?.title} {room.host_id === currentUser.id && <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded ml-auto">あなたがホスト</span>}</h3>
                        <div className="text-xs text-slate-400 mb-2">ホスト: {room.host_name}</div>
                        <select className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white" onChange={(e) => { const char = room.scenario?.presetCharacters.find(c => c.id === e.target.value); if(char) handleJoinRoom(room, char); }} value="">
                          <option value="" disabled>参加するキャラクターを選択して入室/復帰...</option>
                          {room.scenario?.presetCharacters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
                <div className="flex justify-between items-center mb-3"><h2 className="text-sm font-bold text-blue-400">👤 プレイヤー情報</h2>{!isEditingProfile && <button onClick={() => { setEditProfileData(currentUser); setIsEditingProfile(true); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded">編集</button>}</div>
                {isEditingProfile && editProfileData ? (
                  <div className="space-y-3">
                    <input type="text" value={editProfileData.handleName} onChange={(e) => setEditProfileData({...editProfileData, handleName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm" placeholder="名前" />
                    <button onClick={saveProfile} className="w-full bg-blue-600 font-bold text-xs py-2 rounded">保存</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-4 items-center">
                      <img src={currentUser.avatarUrl} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <p className="font-bold text-white flex items-center gap-1">{currentUser.handleName}</p>
                        <p className="text-[10px] text-slate-500 select-all mt-1" title="クリックして選択・コピー">ID: {currentUser.id}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {myActiveRoom ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-center items-center h-48">
                  <span className="text-3xl mb-2">🚪</span>
                  <p className="text-sm font-bold text-amber-400 mb-2">進行中のセッションがあります</p>
                </div>
              ) : (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col shadow-lg border-t-2 border-t-emerald-500">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-sm font-bold text-emerald-400">📜 マイ・シナリオ</h2>
                    <button onClick={() => { setEditingScenario({ id: "", title: "", system: "", tags: "", setting: "", npcList: "", plot: "", imageUrl: "", presetCharacters: [], ratingSum: 0, ratingCount: 0 }); setCurrentView("scenarioEdit"); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">＋ 新規作成</button>
                  </div>

                  {myScenarios.length === 0 ? (
                    <p className="text-xs text-slate-400 mt-2 text-center p-2 bg-slate-900 rounded border border-slate-700/50">所有しているシナリオがありません。<br/>誰かのセッションを遊んだ後、購入できます。</p>
                  ) : (
                    <>
                      <select value={selectedScenarioId} onChange={(e) => setSelectedScenarioId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white mb-4">
                        {myScenarios.map(s => {
                          const isAuthor = s.authorId === currentUser?.id;
                          const ticketCount = isAuthor ? "∞" : (s.purchasedTickets?.[currentUser?.id] || 0);
                          return <option key={s.id} value={s.id}>{s.title} (プレイ権: {ticketCount} 回)</option>
                        })}
                      </select>
                      
                      {activeScenario && (
                        <div className="pt-3 border-t border-slate-700">
                          {activeScenario.presetCharacters.length === 0 ? (
                            <div className="bg-red-900/30 border border-red-500/50 p-3 rounded text-center"><p className="text-[10px] text-red-400">※キャラクターが登録されていません</p></div>
                          ) : (
                            <>
                              <select value={hostCharId} onChange={(e) => setHostCharId(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white mb-3">
                                <option value="" disabled>自分のキャラクターを選択...</option>
                                {activeScenario.presetCharacters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                              <button onClick={handleCreateRoom} disabled={!hostCharId} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white font-bold py-2 rounded">部屋を立てて入室 {activeScenario.authorId !== currentUser.id && "(-1 回)"}</button>
                            </>
                          )}

                          {/* ★ チケット・プレゼント機能 */}
                          <div className="mt-4 bg-slate-900 p-3 rounded-lg border border-slate-700">
                            <p className="text-xs text-emerald-400 font-bold mb-1">🎁 プレイ権をプレゼント</p>
                            <p className="text-[10px] text-slate-400 mb-2">{activeScenario.authorId === currentUser.id ? "あなたは作者なので無制限に渡せます" : "あなたのチケットを1回分消費して渡します"}</p>
                            <div className="flex gap-2">
                              <input type="text" value={grantUserId} onChange={e=>setGrantUserId(e.target.value)} placeholder="相手のIDをペースト" className="flex-1 bg-slate-800 border border-slate-600 rounded p-1.5 text-xs text-white" />
                              <button onClick={handleGiftTicket} disabled={!grantUserId} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white text-[10px] px-3 py-1.5 rounded font-bold">1回分渡す</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. シナリオ編集 ==================== */}
      {currentView === "scenarioEdit" && editingScenario && (
        <div className="flex-1 flex flex-col items-center p-6 max-w-4xl mx-auto w-full min-h-0 overflow-y-auto">
          <h2 className="text-2xl font-bold text-amber-400 mb-6 w-full">{editingScenario.id ? "シナリオ・セット編集" : "シナリオ・セット新規作成"}</h2>
          {editingCharIndex !== null ? (
            <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-emerald-400 mb-2 border-b border-slate-700 pb-2">キャラクター設定</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-400 block mb-1">名前</label><input type="text" value={editingScenario.presetCharacters[editingCharIndex].name} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].name = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                <div><label className="text-xs text-slate-400 block mb-1">職業</label><input type="text" value={editingScenario.presetCharacters[editingCharIndex].job} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].job = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
              </div>
              
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <h4 className="text-xs font-bold text-amber-400 mb-3">ステータス設定</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className="text-[10px] text-slate-400 block mb-1">SAN (1〜100%)</label><input type="number" min="1" max="100" value={editingScenario.presetCharacters[editingCharIndex].san} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].san = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white text-center" /></div>
                  <div><label className="text-[10px] text-slate-400 block mb-1">HP (自由値)</label><input type="number" value={editingScenario.presetCharacters[editingCharIndex].hp} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].hp = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white text-center" /></div>
                  <div><label className="text-[10px] text-slate-400 block mb-1">STR (3〜18)</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].str} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].str = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white text-center" /></div>
                  <div><label className="text-[10px] text-slate-400 block mb-1">DEX (3〜18)</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].dex} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].dex = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-white text-center" /></div>
                </div>
              </div>

              <div><label className="text-xs text-slate-400 block mb-1">性格・特徴 (ハンドアウト内容)</label><textarea value={editingScenario.presetCharacters[editingCharIndex].personality} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].personality = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-20" /></div>
              <button onClick={() => setEditingCharIndex(null)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg mt-2">シナリオ編集に戻る</button>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-bold text-amber-400 border-b border-slate-700 pb-2">基本設定</h3>
                <div><label className="text-sm text-amber-200 block mb-1">シナリオタイトル</label><input type="text" value={editingScenario.title} onChange={(e) => setEditingScenario({ ...editingScenario, title: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                
                {/* ★ シナリオ販売設定 */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div><label className="text-xs text-amber-200 block mb-1">販売価格 (G)</label><input type="number" min="0" value={editingScenario.price || 0} onChange={(e) => setEditingScenario({ ...editingScenario, price: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                  <div><label className="text-xs text-amber-200 block mb-1">購入時に付与するチケット (回数)</label><input type="number" min="1" value={editingScenario.playLimit || 1} onChange={(e) => setEditingScenario({ ...editingScenario, playLimit: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                </div>

                <div><label className="text-sm text-amber-200 block mb-1">プロット (AI用)</label><textarea value={editingScenario.plot} onChange={(e) => setEditingScenario({ ...editingScenario, plot: e.target.value })} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white" /></div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                    <h3 className="text-lg font-bold text-emerald-400">専用キャラクター (HO)</h3>
                    <button onClick={() => { const newChar: Character = { id: `c${Date.now()}`, name: "新規キャラ", job: "", personality: "", imageUrl: "", hp: 10, san: 50, str: 10, dex: 10, int: 10, con: 10, wis: 10, cha: 10 }; setEditingScenario({ ...editingScenario, presetCharacters: [...editingScenario.presetCharacters, newChar] }); setEditingCharIndex(editingScenario.presetCharacters.length); }} className="text-xs bg-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded">＋ 追加</button>
                  </div>
                  <div className="space-y-3">
                    {editingScenario.presetCharacters.map((char, idx) => (<div key={char.id} className="flex items-center gap-3 bg-slate-900 border border-slate-700 p-3 rounded-lg"><div className="flex-1"><p className="text-sm font-bold text-white">{char.name}</p></div><button onClick={() => setEditingCharIndex(idx)} className="text-xs bg-slate-700 px-3 py-2 rounded text-white">編集</button></div>))}
                  </div>
                </div>
                <div className="flex gap-3"><button onClick={() => setCurrentView("lobby")} className="flex-1 bg-slate-700 text-white font-semibold py-3 rounded-lg">キャンセル</button><button onClick={saveScenario} className="flex-1 bg-amber-600 text-white font-semibold py-3 rounded-lg">保存する</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== 3. ゲームセッション画面 ==================== */}
      {currentView === "game" && activeRoom && joinedCharacter && currentUser && myScene && (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 min-h-0 relative">
          <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView("lobby")} className="text-xs text-slate-400 hover:text-white underline">← 退出する</button>
              <div className="flex flex-col ml-4">
                <span className="text-[10px] text-blue-400 font-bold border border-blue-500/50 bg-blue-900/30 px-2 py-0.5 rounded w-fit mb-1">ROOM: {activeRoom.scenario?.title}</span>
                <span className="text-sm font-bold text-white flex items-center gap-2">{joinedCharacter.name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => roll1d100(joinedCharacter.san, "SAN")} className="bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 SAN ({joinedCharacter.san}%)</button>
              <button onClick={() => roll3d6(joinedCharacter.str, "STR")} className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg ml-2">🎲 STR ({joinedCharacter.str})</button>

              {currentUser.handleName === activeRoom.host_name && (
                <>
                  {activeRoom.status === "recruiting" && <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded animate-pulse ml-4">▶ ゲーム開始</button>}
                  {activeRoom.status === "playing" && <button onClick={endGame} className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded ml-4">■ 終了</button>}
                </>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-scroll space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3 min-h-0">
            {messages.map((msg, index) => (
              <div key={index} className={`p-3 rounded-xl max-w-[85%] ${msg.sender === "gm" ? "bg-slate-700/90 border-l-4 border-emerald-500 mr-auto text-slate-100" : "bg-blue-600/90 ml-auto text-right text-white"}`}>
                <span className="text-[10px] opacity-60 block mb-1">{msg.sender === "gm" ? "AI GM" : joinedCharacter.name} {msg.type && `[${msg.type.toUpperCase()}]`}</span>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
            {isLoading && <div className="text-xs text-emerald-400 animate-pulse">AI GMが処理中...</div>}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="行動を入力..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
              <button onClick={handleSend} disabled={isLoading} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">送信</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. リザルト・評価画面 ==================== */}
      {currentView === "evaluation" && activeRoom && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full min-h-0 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6">
            <h1 className="text-2xl font-extrabold text-amber-400 text-center border-b border-slate-700 pb-4">セッション終了！お疲れ様でした</h1>
            <p className="text-sm text-slate-400 text-center">次回のプレイをより良くするため、評価にご協力ください。</p>
            
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
              <div>
                <label className="text-sm text-white font-bold block mb-2">🎭 シナリオの評価: 「{activeRoom.scenario?.title}」</label>
                <div className="flex gap-2 text-2xl text-amber-500 cursor-pointer justify-center">
                  {[1,2,3,4,5].map(star => (
                    <span key={star} onClick={() => setRatingScenario(star)} className="hover:scale-125 transition">{star <= ratingScenario ? "★" : "☆"}</span>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-slate-700 pt-4">
                <label className="text-sm text-white font-bold block mb-2">👑 GM(ホスト)の評価: {activeRoom.host_name}</label>
                <div className="flex gap-2 text-2xl text-blue-400 cursor-pointer justify-center">
                  {[1,2,3,4,5].map(star => (
                    <span key={star} onClick={() => setRatingGM(star)} className="hover:scale-125 transition">{star <= ratingGM ? "★" : "☆"}</span>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={submitEvaluation} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl">
              評価を送信してロビーに戻る
            </button>

            {/* ★ 遊んだ人だけが買える「購入セクション」 */}
            {activeRoom.scenario?.authorId !== currentUser?.id && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mt-4 text-center border-t-2 border-t-emerald-500">
                <h3 className="font-bold text-emerald-400 mb-2">🎁 あなたもこのシナリオを回しませんか？</h3>
                <p className="text-xs text-slate-400 mb-4">このシナリオを購入すると、あなたもホストとして部屋を立てられるようになります。</p>
                <button onClick={handleBuyInEvaluation} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg">
                  シナリオを購入する ({activeRoom.scenario?.price || 0} G / {activeRoom.scenario?.playLimit || 1} 回分)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}