"use client";

import { useState, useEffect, useRef } from "react";
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

type Report = {
  id: string; reporterId: string; targetType: 'user' | 'scenario' | 'scenario_appeal'; targetId: string;
  reason: string; status: string; createdAt: string;
};

type Character = {
  id: string; name: string; job: string; personality: string; imageUrl: string;
  hp: number; san: number; str: number; dex: number; int: number; con: number; wis: number; cha: number;
};

type Scenario = {
  id: string; title: string; system: string; tags: string; setting: string;
  npcList: string; plot: string; imageUrl: string; presetCharacters: Character[];
  ratingSum: number; ratingCount: number;
  authorId?: string; price?: number; playLimit?: number; giftLimit?: number;
  purchasedTickets?: Record<string, number>;
  isBanned?: boolean; playTime?: number;
};

type Scene = { id: string; name: string; memberIds: string[]; leaderId?: string; isMerged?: boolean; };

type Room = { 
  id: string; scenario_id: string; scenario?: Scenario; 
  host_name: string; status: "recruiting" | "playing" | "splitting" | "finished"; scenes: Scene[]; 
  host_id?: string;
  privacy: "open" | "secret";      
  host_message: string;            
  joined_users: Record<string, string>; 
};

type Message = { sender: "player" | "gm" | "ai_player"; text: string; type?: "ic" | "ooc" | "system"; sceneId?: string; charName?: string; channel?: ChatTab | "system"; };
type ChatTab = "story" | "consult" | "gm";

const NO_IMAGE_SCENARIO = "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=400&q=80";
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
  
  const [charSelects, setCharSelects] = useState<Record<string, string>>({});
  const [giftInputs, setGiftInputs] = useState<Record<string, string>>({});

  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [joinedCharacter, setJoinedCharacter] = useState<Character | null>(null);
  const [aiPlayersList, setAiPlayersList] = useState<Character[]>([]); 
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatTab, setChatTab] = useState<ChatTab>("story");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [consultWithAI, setConsultWithAI] = useState<boolean>(true);

  // ★ チーム分け機能用のステート
  const [splitSuggestions, setSplitSuggestions] = useState<string[]>([]);
  const [draftAction, setDraftAction] = useState("");
  const [draftMembers, setDraftMembers] = useState<string[]>([""]);
  const [draftLeader, setDraftLeader] = useState<string>("");

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
  const [scenarioSearchQuery, setScenarioSearchQuery] = useState("");

  const [banTargetScenario, setBanTargetScenario] = useState<Scenario | null>(null);
  const [scenarioBanReason, setScenarioBanReason] = useState("");

  const [reports, setReports] = useState<Report[]>([]);
  const [reportTarget, setReportTarget] = useState<{type: 'user' | 'scenario', id: string, name: string} | null>(null);
  const [reportReason, setReportReason] = useState("");

  const [scenarioAppealTarget, setScenarioAppealTarget] = useState<Scenario | null>(null);
  const [scenarioAppealText, setScenarioAppealText] = useState("");

  const [roomConfigModal, setRoomConfigModal] = useState<{ scenario: Scenario, charId: string, privacy: 'open'|'secret', message: string } | null>(null);
  const [secretRoomIdSearch, setSecretRoomIdSearch] = useState("");
  const [searchedSecretRoom, setSearchedSecretRoom] = useState<Room | null>(null);
  
  const [shopScenarioId, setShopScenarioId] = useState<string>(""); 

  const [unreadIndicators, setUnreadIndicators] = useState({ story: false, consult: false, gm: false });
  const chatTabRef = useRef<ChatTab>(chatTab);
  const prevMessagesLength = useRef(0);

  const availableScenarios = scenarios.filter(s => !s.isBanned);
  const createdScenarios = availableScenarios.filter(s => s.authorId === currentUser?.id);
  const purchasedScenarios = availableScenarios.filter(s => s.authorId !== currentUser?.id && s.purchasedTickets && currentUser && s.purchasedTickets[currentUser.id] > 0);
  const availableRooms = rooms.filter(r => !r.scenario?.isBanned);

  const defaultScene: Scene = { id: "scene_main", name: "メインルーム", memberIds: [] };
  const myScene = activeRoom?.scenes?.find(s => joinedCharacter && s.memberIds.includes(joinedCharacter.id)) || activeRoom?.scenes?.[0] || defaultScene;
  const isSplitMode = activeRoom ? (activeRoom.scenes?.length > 1) : false;

  const isScenarioEnded = messages.some(m => m.text.includes('[SCENARIO_END]')) || activeRoom?.status === 'finished';

  const loadChatLogs = async (roomId: string) => {
    const { data } = await supabase.from('chat_logs').select('message').eq('room_id', roomId).order('id', { ascending: true });
    if (data && data.length > 0) {
      setMessages(data.map((d: any) => d.message));
    } else {
      setMessages([]);
    }
  };

  const pushMessage = async (roomId: string, msg: Message, save: boolean = true) => {
    setMessages(prev => {
      const isDuplicate = prev.some(m => JSON.stringify(m) === JSON.stringify(msg));
      if (isDuplicate) return prev;
      return [...prev, msg];
    });
    if (save && roomId) {
      await supabase.from('chat_logs').insert({ room_id: roomId, message: msg });
    }
  };

  useEffect(() => {
    if (currentView === "game" && activeRoom) {
      const chatChannel = supabase.channel(`chat_sync_${activeRoom.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_logs', filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
          const incomingMsg = payload.new.message;
          setMessages(prev => {
            const isDuplicate = prev.some(m => JSON.stringify(m) === JSON.stringify(incomingMsg));
            if (isDuplicate) return prev;
            return [...prev, incomingMsg];
          });
        })
        .subscribe();

      const roomChannel = supabase.channel(`room_sync_${activeRoom.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${activeRoom.id}` }, (payload) => {
          setActiveRoom(prev => {
            if (!prev) return payload.new as Room;
            // payload.new には joined_users などは入っているが scenario オブジェクトはないため、prevから引き継ぐ
            return { ...prev, ...payload.new, scenario: prev.scenario };
          });
        })
        .subscribe();

      return () => { supabase.removeChannel(chatChannel); supabase.removeChannel(roomChannel); };
    }
  }, [currentView, activeRoom?.id]);

  useEffect(() => { chatTabRef.current = chatTab; }, [chatTab]);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const newMsgs = messages.slice(prevMessagesLength.current);
      setUnreadIndicators(prev => {
        const next = { ...prev };
        let changed = false;
        newMsgs.forEach(m => {
          const isMySceneMsg = !m.sceneId || m.sceneId === 'scene_main' || m.sceneId === myScene?.id;
          if (isMySceneMsg && m.channel && m.channel !== "system" && m.channel !== chatTabRef.current) {
            next[m.channel as keyof typeof next] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
    prevMessagesLength.current = messages.length;
  }, [messages, myScene?.id]);

  useEffect(() => {
    if (isSplitMode && currentUser?.id === activeRoom?.host_id && activeRoom.status === 'playing') {
      const nonMainScenes = activeRoom.scenes.filter(s => s.id !== 'scene_main');
      if (nonMainScenes.length > 0 && nonMainScenes.every(s => s.isMerged)) {
        executeMergeAll();
      }
    }
  }, [activeRoom?.scenes]);

  const handleTabClick = (tab: ChatTab) => {
    setChatTab(tab);
    setUnreadIndicators(prev => ({ ...prev, [tab]: false }));
  };

  const fetchData = async () => {
    const { data: scData } = await supabase.from('scenarios').select('*').order('id', { ascending: false });
    let loadedScenarios: Scenario[] = [];
    if (scData && scData.length > 0) {
      loadedScenarios = scData.map((d: any) => ({
        id: d.id, title: d.title, system: d.system || "", tags: d.tags || "", setting: d.setting || "",
        npcList: d.npc_list || "", plot: d.plot || "", imageUrl: d.image_url || "", presetCharacters: d.preset_characters || [],
        ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0,
        authorId: d.author_id, price: d.price || 500, playLimit: d.play_limit || 1, giftLimit: d.gift_limit || 1,
        purchasedTickets: d.purchased_tickets || {}, isBanned: d.is_banned || false, playTime: d.play_time || 60 
      }));
      setScenarios(loadedScenarios);
    }
    const { data: rmData } = await supabase.from('rooms').select('*').neq('status', 'finished').order('id', { ascending: false });
    let formattedRooms: Room[] = [];
    if (rmData && loadedScenarios.length > 0) {
      formattedRooms = rmData.map((r: any) => ({
        id: r.id, scenario_id: r.scenario_id, scenario: loadedScenarios.find(s => s.id === r.scenario_id),
        host_name: r.host_name, host_id: r.host_id, status: r.status, scenes: r.scenes || [],
        privacy: r.privacy || "open", host_message: r.host_message || "", joined_users: r.joined_users || {}
      })).filter(r => r.scenario) as Room[];
      setRooms(formattedRooms);
    }
    return { loadedScenarios, formattedRooms };
  };

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if(data) setMyNotifications(data.map((d: any) => ({ id: d.id, userId: d.user_id, title: d.title, message: d.message, isRead: d.is_read, createdAt: d.created_at })));
  };

  const fetchProfile = async (userId: string, emailStr: string, currentMaintenance: boolean, roomsData: Room[]) => {
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

    if (!profileData.isBanned && !currentMaintenance) {
      // ★ 募集中の部屋も復帰対象に含めることでリロード時の離脱を防ぐ
      const activeMyRoom = roomsData.find(r => (r.status === 'playing' || r.status === 'splitting' || r.status === 'recruiting') && r.joined_users && r.joined_users[userId]);
      if (activeMyRoom && activeMyRoom.scenario) {
        const charId = activeMyRoom.joined_users[userId];
        const char = activeMyRoom.scenario.presetCharacters.find(c => c.id === charId);
        if (char) {
          setActiveRoom(activeMyRoom);
          setJoinedCharacter(char);
          const takenIds = Object.values(activeMyRoom.joined_users || {});
          const aiChars = activeMyRoom.scenario.presetCharacters.filter(c => !takenIds.includes(c.id));
          setAiPlayersList(aiChars);
          await loadChatLogs(activeMyRoom.id);
          setCurrentView("game");
          return;
        }
      }
      setCurrentView("lobby");
    } else if (profileData.isBanned) {
      setCurrentView("banned");
    } else {
      setCurrentView("maintenance");
    }
  };

  useEffect(() => {
    const initApp = async () => {
      const { data: appData } = await supabase.from('app_settings').select('*').eq('id', 1).single();
      const currentMaintenance = appData ? appData.is_maintenance : false;
      setIsMaintenance(currentMaintenance);
      const { formattedRooms } = await fetchData();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await fetchProfile(session.user.id, session.user.email || "", currentMaintenance, formattedRooms);
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
        const { formattedRooms } = await fetchData();
        if (data.user) await fetchProfile(data.user.id, email, isMaintenance, formattedRooms);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const { formattedRooms } = await fetchData();
        if (data.user) { alert("アカウントを作成しました！"); await fetchProfile(data.user.id, email, isMaintenance, formattedRooms); }
      }
    } catch (error: any) { alert("エラーが発生しました: " + error.message); } finally { setAuthLoading(false); }
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert("Googleログインの初期設定が未完了です: " + error.message);
    setAuthLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setCurrentView("login"); setActiveRoom(null); setJoinedCharacter(null); };
  
  const saveProfile = async () => {
    if (!editProfileData || !currentUser) return;
    const { error } = await supabase.from('profiles').upsert({ id: currentUser.id, handle_name: editProfileData.handleName, avatarUrl: editProfileData.avatarUrl, bio: editProfileData.bio, discord_id: editProfileData.discordId });
    if (!error) { setCurrentUser(editProfileData); setIsEditingProfile(false); }
  };

  const deleteScenario = async (id: string) => {
    if (!confirm("本当にこのシナリオを削除しますか？\n（※このシナリオで立てられた部屋も強制的に削除されます）")) return;
    await supabase.from('rooms').delete().eq('scenario_id', id);
    const { error } = await supabase.from('scenarios').delete().eq('id', id);
    if (error) { alert("削除に失敗しました: " + error.message); } 
    else { alert("シナリオを削除しました。"); await fetchData(); }
  };

  const saveScenario = async () => {
    if (!editingScenario || !currentUser) return;
    const dbData = { 
      title: editingScenario.title, system: editingScenario.system || "", tags: editingScenario.tags || "", setting: editingScenario.setting || "", 
      npc_list: editingScenario.npcList || "", plot: editingScenario.plot || "", image_url: editingScenario.imageUrl || "", preset_characters: editingScenario.presetCharacters,
      rating_sum: editingScenario.ratingSum, rating_count: editingScenario.ratingCount,
      author_id: currentUser.id, purchased_tickets: editingScenario.purchasedTickets || {},
      price: editingScenario.price || 500, play_limit: editingScenario.playLimit || 1, gift_limit: editingScenario.giftLimit || 1,
      play_time: editingScenario.playTime || 60
    };
    if (editingScenario.id && !editingScenario.id.startsWith('s')) {
      await supabase.from('scenarios').update(dbData).eq('id', editingScenario.id);
    } else {
      await supabase.from('scenarios').insert(dbData);
    }
    await fetchData();
    setCurrentView("lobby");
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

  const submitUserReport = async () => {
    if (!currentUser || !reportTarget || !reportReason.trim()) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: currentUser.id, target_type: reportTarget.type, target_id: reportTarget.id, reason: reportReason
    });
    if (!error) { alert("運営に通報を送信しました。ご協力ありがとうございます。"); setReportTarget(null); setReportReason(""); } 
    else { alert("エラーが発生しました: " + error.message); }
  };

  const submitScenarioAppeal = async () => {
    if (!currentUser || !scenarioAppealTarget || !scenarioAppealText.trim()) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: currentUser.id, target_type: 'scenario_appeal', target_id: scenarioAppealTarget.id, reason: scenarioAppealText
    });
    if (!error) { alert("運営に再審査（修正完了）の申請を送信しました。"); setScenarioAppealTarget(null); setScenarioAppealText(""); await fetchAdminData(); } 
    else { alert("エラーが発生しました: " + error.message); }
  };

  const handleBuyInEvaluation = async () => {
    if (!activeRoom || !activeRoom.scenario || !currentUser) return;
    const scenario = activeRoom.scenario;
    if (scenario.price && scenario.price > 0) {
      if (!confirm(`【決済システムへ遷移します】\n金額: ${scenario.price} G\n（※現在はデモのため、OKを押すと決済完了として処理を進めます。）`)) return;
    }
    const currentTickets = scenario.purchasedTickets || {};
    const addLimit = scenario.playLimit || 1;
    const newTickets = { ...currentTickets, [currentUser.id]: (currentTickets[currentUser.id] || 0) + addLimit };
    const { error } = await supabase.from('scenarios').update({ purchased_tickets: newTickets }).eq('id', scenario.id);
    if (!error) { alert(`「${scenario.title}」を購入しました！\nマイ・シナリオにプレイ権が ${addLimit} 回分追加されました。`); submitEvaluation(); } 
    else { alert("エラーが発生しました: " + error.message); }
  };

  const buyScenario = async (scenario: Scenario) => {
    if (!currentUser) return;
    if (confirm(`「${scenario.title}」のプレイチケットを ${scenario.price || 500} G で購入しますか？\n（※現在はテスト用のデモ決済です）`)) {
      const currentTickets = scenario.purchasedTickets || {};
      const addLimit = scenario.playLimit || 1;
      const newTickets = { ...currentTickets, [currentUser.id]: (currentTickets[currentUser.id] || 0) + addLimit };
      const { error } = await supabase.from('scenarios').update({ purchased_tickets: newTickets }).eq('id', scenario.id);
      if (!error) { alert(`プレイチケット（${addLimit}回分）の購入が完了しました！\n「マイ・シナリオ」から部屋を立てることができます。`); setShopScenarioId(""); await fetchData(); } 
      else { alert("エラーが発生しました: " + error.message); }
    }
  };

  const handleGiftTicket = async (scenario: Scenario) => {
    const targetUserId = giftInputs[scenario.id];
    if (!scenario || !targetUserId || !currentUser) return;
    const isAuthor = scenario.authorId === currentUser.id;
    const giftAmount = isAuthor ? (scenario.giftLimit || 1) : 1;
    const currentTickets = scenario.purchasedTickets || {};
    let myTickets = currentTickets[currentUser.id] || 0;
    if (!isAuthor && myTickets < giftAmount) { alert("プレゼントするチケットがありません。"); return; }
    const newTickets = { ...currentTickets };
    if (!isAuthor) newTickets[currentUser.id] = myTickets - giftAmount;
    newTickets[targetUserId] = (newTickets[targetUserId] || 0) + giftAmount;
    const { error } = await supabase.from('scenarios').update({ purchased_tickets: newTickets }).eq('id', scenario.id);
    if (!error) { alert(`対象のユーザーにプレイチケットを ${giftAmount} 回分プレゼントしました！`); setGiftInputs({ ...giftInputs, [scenario.id]: "" }); await fetchData(); } 
    else { alert("エラーが発生しました: " + error.message); }
  };

  // ★ 管理画面の関数をすべて復元！
  const fetchAdminData = async () => {
    const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (usersData) { setAllUsers(usersData.map((d: any) => ({ id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id, ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0, isAdmin: d.is_admin || false, isBanned: d.is_banned || false, email: d.email }))); }
    const { data: appealsData } = await supabase.from('ban_appeals').select('*').order('created_at', { ascending: false });
    if (appealsData) { setBanAppeals(appealsData.map((d: any) => ({ id: d.id, userId: d.user_id, reason: d.reason, appealText: d.appeal_text, status: d.status, createdAt: d.created_at }))); }
    const { data: reportsData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (reportsData) { setReports(reportsData.map((d: any) => ({ id: d.id, reporterId: d.reporter_id, targetType: d.target_type, targetId: d.target_id, reason: d.reason, status: d.status, createdAt: d.created_at }))); }
  };

  const toggleMaintenance = async () => { const newStatus = !isMaintenance; await supabase.from('app_settings').update({ is_maintenance: newStatus }).eq('id', 1); setIsMaintenance(newStatus); alert(`メンテナンスモードを ${newStatus ? "ON" : "OFF"} にしました。`); };
  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => { const newStatus = !currentStatus; await supabase.from('profiles').update({ is_admin: newStatus }).eq('id', userId); setAllUsers(allUsers.map(u => u.id === userId ? { ...u, isAdmin: newStatus } : u)); alert(newStatus ? "管理者権限を付与しました。" : "管理者権限を剥奪しました。"); };
  const executeBan = async () => { if(!banTargetUser || !banReason) return; await supabase.from('profiles').update({ is_banned: true }).eq('id', banTargetUser.id); await supabase.from('ban_appeals').insert({ user_id: banTargetUser.id, reason: banReason, status: 'banned' }); alert("BANを実行しました。"); setBanTargetUser(null); setBanReason(""); fetchAdminData(); };
  const unbanUser = async (userId: string) => { await supabase.from('profiles').update({ is_banned: false }).eq('id', userId); await supabase.from('ban_appeals').update({ status: 'resolved' }).eq('user_id', userId); alert("BANを解除しました。"); fetchAdminData(); };
  
  const executeScenarioBan = async (action: 'hard' | 'soft' | 'unban') => {
    if (!banTargetScenario) return;
    if (action === 'hard') {
      if(!scenarioBanReason.trim()) { alert("削除の理由を入力してください。"); return; }
      await supabase.from('rooms').delete().eq('scenario_id', banTargetScenario.id);
      const { error } = await supabase.from('scenarios').delete().eq('id', banTargetScenario.id);
      if (!error) {
        if (banTargetScenario.authorId) {
           await supabase.from('notifications').insert({ user_id: banTargetScenario.authorId, title: '【重要】シナリオ強制削除のお知らせ', message: `運営による巡回・通報の精査の結果、あなたが作成したシナリオ「${banTargetScenario.title}」は重大な利用規約違反と判断されたため、システムから完全に削除されました。\n\n【削除理由】\n${scenarioBanReason}` });
        }
        alert("シナリオを完全に削除し、警告メールを送信しました。");
      } else { alert("削除に失敗しました: " + error.message); }
    } else if (action === 'soft') {
      if(!scenarioBanReason.trim()) { alert("非公開の理由を入力してください。"); return; }
      const { error } = await supabase.from('scenarios').update({ is_banned: true }).eq('id', banTargetScenario.id);
      if (!error) {
        if (banTargetScenario.authorId) {
           await supabase.from('notifications').insert({ user_id: banTargetScenario.authorId, title: '【重要】シナリオ一時非公開のお知らせ', message: `あなたが作成したシナリオ「${banTargetScenario.title}」について、利用規約に抵触する恐れがあるため、一時的に非公開措置といたしました。（一般ユーザーからは見えなくなっています）\n\n【非公開の理由】\n${scenarioBanReason}\n\n内容を修正することで、再び公開設定に戻せる場合があります。` });
        }
        alert("シナリオを一時非公開にし、警告メールを送信しました。");
      } else { alert("非公開処理に失敗しました: " + error.message); }
    } else if (action === 'unban') {
      const { error } = await supabase.from('scenarios').update({ is_banned: false }).eq('id', banTargetScenario.id);
      if (!error) {
         if (banTargetScenario.authorId) {
           await supabase.from('notifications').insert({ user_id: banTargetScenario.authorId, title: '【お知らせ】シナリオの非公開措置が解除されました', message: `シナリオ「${banTargetScenario.title}」の非公開措置が解除され、再びプレイ可能になりました。` });
         }
         alert("シナリオの非公開設定を解除しました。");
      } else { alert("解除に失敗しました: " + error.message); }
    }
    setBanTargetScenario(null); setScenarioBanReason(""); await fetchData();
  };

  const unbanScenarioFromAppeal = async (reportId: string, scenarioId: string) => {
    const { error } = await supabase.from('scenarios').update({ is_banned: false }).eq('id', scenarioId);
    if (!error) {
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      const s = scenarios.find(x => x.id === scenarioId);
      if(s && s.authorId) {
        await supabase.from('notifications').insert({ user_id: s.authorId, title: '【お知らせ】シナリオの再審査が承認されました', message: `申請いただいたシナリオ「${s.title}」の修正内容が承認されました。非公開措置が解除され、再びプレイ可能になっています。` });
      }
      alert("シナリオの非公開を解除し、作者に通知しました。");
      await fetchAdminData(); await fetchData();
    } else { alert("エラーが発生しました: " + error.message); }
  };

  const resolveReport = async (reportId: string) => { await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId); fetchAdminData(); };
  const submitAppeal = async () => { if(!currentUser || !appealText) return; await supabase.from('ban_appeals').insert({ user_id: currentUser.id, reason: "不明", appeal_text: appealText, status: 'appealing' }); alert("調査依頼を送信しました。"); setAppealText(""); };
  const sendWarningNotification = async () => { if (!warningModalUser || !warningTitle || !warningText) return; await supabase.from('notifications').insert({ user_id: warningModalUser.id, title: warningTitle, message: warningText }); alert("警告通知を送信しました。"); setWarningModalUser(null); setWarningTitle(""); setWarningText(""); };
  const markNotificationAsRead = async (notifId: string) => { await supabase.from('notifications').update({ is_read: true }).eq('id', notifId); setMyNotifications(myNotifications.map(n => n.id === notifId ? { ...n, isRead: true } : n)); };


  // ==========================================
  // ★ チーム分け関連の処理群
  // ==========================================
  const startSplitting = () => {
    if (!activeRoom) return;
    supabase.from('rooms').update({ status: 'splitting' }).eq('id', activeRoom.id).then(() => {
      setActiveRoom({ ...activeRoom, status: 'splitting', scenes: [{ id: 'scene_main', name: 'メインルーム', memberIds: [] }] });
    });
    setDraftAction(splitSuggestions[0] || "");
    setDraftMembers([""]);
    setDraftLeader("");
  };

  const addTeamDraft = async () => {
    if (!activeRoom || !draftAction) return;
    const validMembers = draftMembers.filter(m => m !== "");
    if (validMembers.length === 0) { alert("メンバーを選択してください。"); return; }
    if (!draftLeader && validMembers.length > 0) { alert("リーダー（または代表者）を選択してください。"); return; }

    const newScene: Scene = {
      id: `team_${Date.now()}`, name: draftAction, memberIds: validMembers, leaderId: draftLeader, isMerged: false
    };

    const updatedScenes = [...activeRoom.scenes, newScene];
    await supabase.from('rooms').update({ scenes: updatedScenes }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, scenes: updatedScenes });

    setDraftAction(""); setDraftMembers([""]); setDraftLeader("");
  };

  const finishSplitting = async () => {
    if (!activeRoom) return;
    await supabase.from('rooms').update({ status: 'playing' }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, status: 'playing' });
    await pushMessage(activeRoom.id, { sender: "gm", text: `【システム】チーム分けが完了しました！各チームごとに独立して行動・相談を行ってください。`, type: "system", sceneId: "scene_main", channel: "system" });
  };

  const mergeTeam = async () => {
    if (!activeRoom || !myScene || myScene.id === 'scene_main') return;
    
    const updatedScenes = activeRoom.scenes.map(s => s.id === myScene.id ? { ...s, isMerged: true } : s);
    await supabase.from('rooms').update({ scenes: updatedScenes }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, scenes: updatedScenes });
    await pushMessage(activeRoom.id, { sender: "gm", text: `【システム】${myScene.name}チームはメインに合流するため待機します。全チームが合流するまでお待ちください。`, type: "system", sceneId: myScene.id, channel: "system" });
  };

  const executeMergeAll = async () => {
    if (!activeRoom) return;
    const allMemberIds = Object.keys(activeRoom.joined_users || {});
    const resetScenes: Scene[] = [{ id: 'scene_main', name: 'メインルーム', memberIds: allMemberIds }];
    
    await supabase.from('rooms').update({ scenes: resetScenes }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, scenes: resetScenes });

    await pushMessage(activeRoom.id, { sender: "gm", text: `【システム】全チームが合流しました！`, type: "system", sceneId: 'scene_main', channel: "system" });
    await callAIGM(`【システムコマンド】全チームの別行動が終了し、一箇所に合流しました。これまでの各チームの報告を踏まえ、合流時の情景描写と今後の展開を提示してください。`, "story");
  };


  // ==========================================
  // ★ ゲーム進行（AI連携・タブ分岐・自動終了検知）
  // ==========================================

  const callAIGM = async (extraUserContext?: string, targetTab: ChatTab = "story") => {
    if (!activeRoom || !joinedCharacter || !myScene) return;
    setIsLoading(true);
    
    try {
      if (extraUserContext) {
        await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'user', content: extraUserContext });
      }

      const { data: memoryData } = await supabase.from('ai_memory')
        .select('*')
        .eq('room_id', activeRoom.id)
        .order('created_at', { ascending: true });

      const history = (memoryData || []).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      if (history.length === 0) {
        history.push({ role: 'user', parts: [{ text: "セッションを開始してください。" }]});
      }

      const aiPlayersText = aiPlayersList.length > 0 
        ? aiPlayersList.map(c => `・${c.name} (${c.job}) | HP:${c.hp} SAN:${c.san}% STR:${c.str} DEX:${c.dex} INT:${c.int} CON:${c.con}\n  設定: ${c.personality}`).join("\n\n")
        : "なし（ソロプレイ）";

      let roleInstruction = "";
      if (targetTab === "story") {
        roleInstruction = `
【重要：GMの絶対ルール（行動判定と時間管理）】
1. PLたちが明確な「行動宣言」を出した時のみ物語を進行させてください。
2. リスクや不確実性を伴う行動には必ずダイスロールを要求し、結果が出るまで描写を待機してください。
3. 想定プレイ時間は約${activeRoom.scenario?.playTime || 60}分です。適切なペースでエンディングへ誘導してください。
4. 【エンディングの処理】物語が結末を迎えた場合、最後の情景描写の末尾に必ず [SCENARIO_END] というシステムタグを記述してください。

${isSplitMode && myScene.id !== 'scene_main' ? `
【チーム分割中の対応（超重要）】
現在、プレイヤー達は二手以上に分かれて行動しています。この発言は【${myScene.name}】チーム（メンバー: ${myScene.memberIds.map(id => activeRoom.scenario?.presetCharacters.find(c=>c.id===id)?.name).join(', ')}）のものです。
あなたは他チームの状況を一切考慮せず、このチームが現在いる場所の描写のみを行ってください。別のチームを勝手に合流させないでください。
` : `
【チーム分けの提案】
もし物語の展開上、PLたちが二手以上に分かれて行動すべき状況になった場合、GMとして分割を提案し、出力の最後に必ず "[SPLIT_PROPOSAL: 行動案A, 行動案B, 行動案C]" のようなシステムタグを含めてください（行動案は2〜4つ程度）。
`}
`;
      } else if (targetTab === "consult") {
        roleInstruction = `
【重要：AIプレイヤーとしての振る舞い】
現在は「プレイヤー間の相談時間」です。あなたはGMではなく、AI相棒（${aiPlayersList.map(c=>c.name).join(", ")}）の立場でPLに返答してください。
物語を勝手に進めず、彼らの性格に合わせた対話のみを行ってください。
${isSplitMode && myScene.id !== 'scene_main' ? `※現在別行動中です。同じチームにいるAI相棒だけが返答してください。` : ''}
`;
      } else if (targetTab === "gm") {
        roleInstruction = `【重要：GMへのメタ質問対応】現在は「GMへの質問・ルール確認」の時間です。物語は進めず、ルールの裁定などのシステム的な回答のみを行ってください。`;
      }

      const sysPrompt = `あなたはTRPGの優秀なAIシステムです。
タイトル: ${activeRoom.scenario?.title}
世界観: ${activeRoom.scenario?.setting}
プロット: ${activeRoom.scenario?.plot}
【人間PL】名前: ${joinedCharacter.name}
【AI相棒】\n${aiPlayersText}
${roleInstruction}`;

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini APIキーが設定されていません。");

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sysPrompt }] },
          contents: history,
          generationConfig: { temperature: 0.75 }
        })
      });
      
      if (!res.ok) {
        const errText = await res.text();
        let errorDetail = res.statusText;
        try { const errJson = JSON.parse(errText); if (errJson.error && errJson.error.message) errorDetail = errJson.error.message; } catch(e) {}
        throw new Error(`AIサーバーの応答エラーが発生しました。\n詳細: ${errorDetail || errText}`);
      }
      
      const resData = await res.json();
      const aiText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "（AIの返答がありません）";

      const splitMatch = aiText.match(/\[SPLIT_PROPOSAL:\s*(.+?)\]/);
      if (splitMatch) {
         const suggestions = splitMatch[1].split(',').map((s: string) => s.trim());
         setSplitSuggestions(suggestions);
      }

      await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'assistant', content: aiText });
      
      const msgSender = targetTab === "consult" ? "ai_player" : "gm";
      await pushMessage(activeRoom.id, { sender: msgSender, text: aiText.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').trim(), type: targetTab === "gm" ? "ooc" : "ic", sceneId: myScene?.id, charName: targetTab === "consult" ? "AI相棒" : "AI GM", channel: targetTab });

    } catch (err: any) {
      alert("AIエラー: " + err.message);
      await pushMessage(activeRoom.id, { sender: "gm", text: `（システムエラー: ${err.message}）`, type: "system", sceneId: myScene?.id, channel: "system" }, false);
    } finally {
      setIsLoading(false);
    }
  };

  const executeCreateRoom = async () => {
    if (!currentUser || !roomConfigModal) return;
    const { scenario, charId, privacy, message } = roomConfigModal;
    if (!charId) { alert("キャラクターを選択してください。"); return; }
    
    const isAuthor = scenario.authorId === currentUser.id;
    if (!isAuthor) {
      const currentTickets = scenario.purchasedTickets || {};
      const myTickets = currentTickets[currentUser.id] || 0;
      if (myTickets <= 0) { alert("プレイチケットがありません。"); return; }
      const newTickets = { ...currentTickets, [currentUser.id]: myTickets - 1 };
      const { error: ticketError } = await supabase.from('scenarios').update({ purchased_tickets: newTickets }).eq('id', scenario.id);
      if (ticketError) { alert("チケットの消費処理に失敗しました。"); return; }
    }

    const initialScenes: Scene[] = [{ id: `scene_main_${Date.now()}`, name: "メインルーム", memberIds: scenario.presetCharacters.map(c => c.id) }];
    
    const { data, error } = await supabase.from('rooms').insert({ 
      scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, 
      status: "recruiting", scenes: initialScenes,
      privacy: privacy, host_message: message, joined_users: { [currentUser.id]: charId }
    }).select().single();
    
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
      setRoomConfigModal(null);
      await fetchData();
      const newRoom: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users };
      const hostChar = scenario.presetCharacters.find(c => c.id === charId);
      if (hostChar) {
        setActiveRoom(newRoom); setJoinedCharacter(hostChar);
        setMessages([]); 
        await pushMessage(newRoom.id, { sender: "gm", text: `【入室完了】プレイヤー全員の準備が整うまでお待ちください。`, type: "system", sceneId: newRoom.scenes?.[0]?.id, channel: "system" });
        setCurrentView("game");
      }
    }
  };

  const executeJoinRoom = async (room: Room, charId: string) => {
    if (!currentUser || !room || !charId) return;
    
    const { data: latestRoom } = await supabase.from('rooms').select('joined_users').eq('id', room.id).single();
    const currentUsers = latestRoom?.joined_users || {};
    if (Object.values(currentUsers).includes(charId)) {
      alert("申し訳ありません、そのキャラクターは先ほど他のプレイヤーに選択されました！");
      await fetchData(); return;
    }

    const newUsers = { ...currentUsers, [currentUser.id]: charId };
    const { error } = await supabase.from('rooms').update({ joined_users: newUsers }).eq('id', room.id);
    if (error) { alert("入室エラー: " + error.message); return; }

    const char = room.scenario?.presetCharacters.find(c => c.id === charId);
    if (char) {
      const updatedRoom = { ...room, joined_users: newUsers };
      setActiveRoom(updatedRoom); setJoinedCharacter(char);
      await loadChatLogs(room.id);
      await pushMessage(room.id, { sender: "gm", text: `【入室完了】${char.name}として参加しました！ホストの開始をお待ちください。`, type: "system", sceneId: room.scenes?.[0]?.id, channel: "system" });
      setCurrentView("game");
    }
  };

  const spectateRoom = async (room: Room) => {
    setActiveRoom(room);
    setJoinedCharacter(null); 
    await loadChatLogs(room.id);
    await pushMessage(room.id, { sender: "gm", text: `【観戦モード】部屋に入室しました。チャットやダイスは使用できません。`, type: "system", sceneId: room.scenes?.[0]?.id, channel: "system" }, false);
    setCurrentView("game");
  };

  const startGame = async () => {
    if(!activeRoom || !activeRoom.scenario || !joinedCharacter || !myScene) return;
    
    let aiChars: Character[] = [];
    const takenIds = Object.values(activeRoom.joined_users || {});
    const emptyChars = activeRoom.scenario.presetCharacters.filter(c => !takenIds.includes(c.id));
    if (emptyChars.length > 0) {
      if (confirm(`参加していないキャラクターが ${emptyChars.length} 人います。\n彼らを「AIプレイヤー（相棒）」として参加させますか？\n（キャンセルを押すとソロプレイになります）`)) {
        aiChars = emptyChars;
      }
    }
    setAiPlayersList(aiChars);

    await supabase.from('rooms').update({ status: 'playing' }).eq('id', activeRoom.id);
    setActiveRoom({...activeRoom, status: 'playing'});
    await pushMessage(activeRoom.id, { sender: "gm", text: `【システム】ゲームを開始しました。AI GMを呼び出しています...`, type: "system", sceneId: myScene.id, channel: "system" });
    
    await callAIGM(`【システムコマンド】セッションが開始されました。プロットに従い、導入部分の情景描写を行い、プレイヤーに行動方針の相談を促してください。`, "story");
  };

  const endGame = async () => {
    if(!activeRoom) return;
    if (currentUser?.id === activeRoom.host_id) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
      setActiveRoom({...activeRoom, status: 'finished'});
      await pushMessage(activeRoom.id, { sender: "gm", text: `【システム】セッションが完了しました！\nこれより「感想戦モード」になります（AIは停止し、プレイヤー間のチャットのみ可能です）。お疲れ様でした！`, type: "system", sceneId: myScene?.id, channel: "system" });
    }
  };

  const leaveGame = async () => {
    if (!activeRoom || !currentUser) return;
    
    if (activeRoom.status === 'finished') {
       setCurrentView("evaluation");
       return;
    }

    if (!joinedCharacter) {
      setCurrentView("lobby"); setActiveRoom(null); return;
    }

    const isHost = activeRoom.host_id === currentUser.id;
    const isRecruiting = activeRoom.status === 'recruiting';
    const remainingPlayers = Object.keys(activeRoom.joined_users || {}).filter(id => id !== currentUser.id).length;

    if (isRecruiting) {
      const newUsers = { ...activeRoom.joined_users };
      delete newUsers[currentUser.id];
      await supabase.from('rooms').update({ joined_users: newUsers }).eq('id', activeRoom.id);
      if (isHost && remainingPlayers === 0) {
         await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
      }
      setCurrentView("lobby"); setActiveRoom(null); setJoinedCharacter(null); return;
    }

    if (remainingPlayers === 0) {
      const confirmLeave = confirm("【警告】\n他に人間プレイヤーがいないため、退出すると部屋は完全に閉じられ、現在のセッションに二度と復帰できなくなります。\n本当によろしいですか？");
      if (confirmLeave) {
        await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
        setCurrentView("lobby"); setActiveRoom(null); setJoinedCharacter(null); setAiPlayersList([]); setMessages([]); await fetchData(); 
      }
    } else {
      const confirmLeave = confirm("自分のキャラクターをAIに引き継がせて離脱します。よろしいですか？");
      if (confirmLeave) {
        const newUsers = { ...activeRoom.joined_users };
        delete newUsers[currentUser.id];
        await supabase.from('rooms').update({ joined_users: newUsers }).eq('id', activeRoom.id);
        setCurrentView("lobby"); setActiveRoom(null); setJoinedCharacter(null); setAiPlayersList([]); setMessages([]); await fetchData(); 
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeRoom || !joinedCharacter || !currentUser || !myScene) return;
    
    const currentInput = input;
    const isFinished = activeRoom.status === 'finished';

    if (isFinished || (chatTab === "consult" && !consultWithAI)) {
      await pushMessage(activeRoom.id, { sender: "player", text: currentInput, type: isFinished ? "ooc" : "ic", sceneId: myScene.id, charName: joinedCharacter.name, channel: chatTab });
      setInput("");
      return;
    }

    await pushMessage(activeRoom.id, { sender: "player", text: currentInput, type: chatTab === "story" ? "ic" : "ooc", sceneId: myScene.id, charName: joinedCharacter.name, channel: chatTab });
    setInput(""); 
    
    const teamPrefix = isSplitMode && myScene.id !== 'scene_main' ? `[${myScene.name}チーム - ${joinedCharacter.name}] ` : `${joinedCharacter.name}「`;
    const teamSuffix = isSplitMode && myScene.id !== 'scene_main' ? `` : `」`;

    let context = "";
    if (chatTab === "story") context = `【行動宣言】${teamPrefix}${currentInput}${teamSuffix}`;
    else if (chatTab === "consult") context = `【PL間相談】${teamPrefix}${currentInput}${teamSuffix}`;
    else context = `【GMへの質問】PL: ${currentInput}`;

    await callAIGM(context, chatTab);
  };

  const rollDice = async (targetValue: number, label: string, is1d100: boolean) => {
    if(!myScene || !activeRoom || isLoading || !joinedCharacter) return;
    let res = 0; let isSuccess = false; let msgText = "";

    if (is1d100) {
      res = Math.floor(Math.random() * 100) + 1;
      isSuccess = res <= targetValue;
      msgText = `🎲 ${label} (1d100 ≦ ${targetValue}%) ➔ 出目: ${res} 【${isSuccess ? "成功" : "失敗"}】`;
    } else {
      const d1 = Math.floor(Math.random() * 6) + 1; const d2 = Math.floor(Math.random() * 6) + 1; const d3 = Math.floor(Math.random() * 6) + 1;
      res = d1 + d2 + d3;
      isSuccess = res <= targetValue;
      msgText = `🎲 ${label} (3d6 ≦ ${targetValue}) ➔ 出目: ${res} [${d1},${d2},${d3}] 【${isSuccess ? "成功" : "失敗"}】`;
    }

    await pushMessage(activeRoom.id, { sender: "player", text: msgText, type: "ic", sceneId: myScene.id, charName: joinedCharacter.name, channel: "story" });
    
    if (activeRoom.status !== 'finished') {
        await callAIGM(`【システム判定結果】${joinedCharacter.name}が${label}ロールを行いました。\n結果: ${msgText}\nこの結果を踏まえてGMとして情景描写を行ってください。`, "story");
    }
  };

  const exportToPDF = async (type: 'chat' | 'summary' | 'novel') => {
    if (!activeRoom) return;

    const endIndex = messages.findIndex(m => m.text.includes('[SCENARIO_END]'));
    const baseMessages = endIndex !== -1 ? messages.slice(0, endIndex + 1) : messages;
    
    const targetMessages = baseMessages.filter(m => m.channel !== 'gm');

    let contentHtml = "";

    if (type === 'chat') {
      contentHtml = targetMessages.map(m => {
        const senderName = m.charName || (m.sender === "player" ? "プレイヤー" : m.sender === "gm" ? "AI GM" : "システム");
        const text = m.text.replace('[SCENARIO_END]', '').trim();
        if (!text) return "";
        return `<div style="margin-bottom: 12px; border-bottom: 1px dashed #eee; padding-bottom: 8px;">
                  <strong style="color: #2c3e50;">${senderName}</strong><br>
                  <span style="white-space: pre-wrap; color: #34495e;">${text}</span>
                </div>`;
      }).join('');
    } else {
      setIsExporting(true);
      
      const prompt = type === 'summary' 
        ? "以下のTRPGセッションのチャットログを読み込み、物語のあらすじ・結末として分かりやすく要約してください。\n※ログには「GMへの行動宣言」と「キャラクター同士の相談・会話」が含まれています。キャラクター同士の相談内容も物語の展開として要約に含めてください。"
        : "以下のTRPGセッションのチャットログを読み込み、セリフや情景描写を補完して臨場感あふれる小説形式に書き直してください。\n※ログには「GMへの行動宣言」と「キャラクター同士の相談・会話」が含まれています。キャラクターたちの作戦会議や掛け合いも、彼らの生きたセリフや心理描写として小説内に自然に盛り込んでください。";
      
      const logText = targetMessages.map(m => `${m.charName || (m.sender === 'gm' ? 'GM' : 'システム')}: ${m.text.replace('[SCENARIO_END]', '').trim()}`).join('\n');
      
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) throw new Error("APIキーが設定されていません。");

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt + "\n\n【チャットログ】\n" + logText }] }],
            generationConfig: { temperature: 0.7 }
          })
        });
        
        if (!res.ok) throw new Error("AIサーバーの応答エラー");
        const resData = await res.json();
        const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "生成に失敗しました。";
        contentHtml = `<div style="white-space: pre-wrap; line-height: 1.8; color: #333; font-size: 14px;">${generatedText}</div>`;
      } catch(e: any) {
        alert("エクスポート生成エラー: " + e.message);
        setIsExporting(false);
        return;
      }
      setIsExporting(false);
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${activeRoom.scenario?.title} - ${type === 'chat' ? 'チャットログ' : type === 'summary' ? '要約データ' : 'リプレイ小説'}</title>
            <style>
              body { font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
              h1 { font-size: 24px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 30px; color: #2c3e50; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>${activeRoom.scenario?.title} - ${type === 'chat' ? 'チャットログ' : type === 'summary' ? 'あらすじ要約' : 'リプレイ小説'}</h1>
            ${contentHtml}
            <script>
              setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert("ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。");
      setIsExporting(false);
    }
  };

  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  // ★ TypeScriptエラーを完全に解消するための変数
  const isChatDisabled = !!(isLoading || (isSplitMode && myScene?.isMerged === true && chatTab !== 'consult'));

  return (
    <main className="h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      
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
              <h3 className="font-bold text-red-400 mb-3">🚨 ユーザーからの通報一覧</h3>
              <div className="h-[250px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
                {reports.filter(r => r.status === 'pending' && r.targetType !== 'scenario_appeal').map(report => {
                  const reporter = allUsers.find(u => u.id === report.reporterId);
                  const targetName = report.targetType === 'user' 
                    ? allUsers.find(u => u.id === report.targetId)?.handleName || "不明なユーザー" 
                    : scenarios.find(s => s.id === report.targetId)?.title || "不明なシナリオ";

                  return (
                    <div key={report.id} className="bg-slate-800 p-4 rounded-lg border border-red-900/50 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-red-900 text-red-100 px-2 py-0.5 rounded font-bold">{report.targetType === 'user' ? "ユーザー通報" : "シナリオ通報"}</span>
                        <span className="text-[10px] text-slate-400">通報者: {reporter?.handleName || "不明"}</span>
                      </div>
                      <p className="text-sm font-bold text-white mt-1">対象: {targetName}</p>
                      <div className="text-xs text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                        <span className="text-amber-400 font-bold block mb-1">【通報理由】</span>{report.reason}
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        {report.targetType === 'user' ? (
                          <button onClick={() => { const u = allUsers.find(user => user.id === report.targetId); if(u){ setBanTargetUser(u); setBanReason(report.reason); } }} className="text-[10px] bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded font-bold shadow-lg">対象者をBANする</button>
                        ) : (
                          <button onClick={() => { const s = scenarios.find(sc => sc.id === report.targetId); if(s){ setBanTargetScenario(s); setScenarioBanReason(report.reason); } }} className="text-[10px] bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded font-bold shadow-lg">シナリオを管理(BAN)</button>
                        )}
                        <button onClick={() => resolveReport(report.id)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-bold">処置済みにする</button>
                      </div>
                    </div>
                  )
                })}
                {reports.filter(r => r.status === 'pending' && r.targetType !== 'scenario_appeal').length === 0 && <p className="text-xs text-slate-500">現在、未処理の通報はありません。</p>}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-amber-400 mb-3">🚨 シナリオ修正完了・再審査申請</h3>
              <div className="h-[250px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
                {reports.filter(r => r.targetType === 'scenario_appeal' && r.status === 'pending').map(report => {
                  const reporter = allUsers.find(u => u.id === report.reporterId);
                  const targetScenario = scenarios.find(s => s.id === report.targetId);
                  return (
                    <div key={report.id} className="bg-slate-800 p-4 rounded-lg border border-amber-900/50 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-amber-900 text-amber-100 px-2 py-0.5 rounded font-bold">再審査申請</span>
                        <span className="text-[10px] text-slate-400">申請者: {reporter?.handleName || "不明"}</span>
                      </div>
                      <p className="text-sm font-bold text-white mt-1">対象シナリオ: {targetScenario?.title || "不明なシナリオ"}</p>
                      <div className="text-xs text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                        <span className="text-emerald-400 font-bold block mb-1">【修正内容・コメント】</span>{report.reason}
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <button onClick={() => unbanScenarioFromAppeal(report.id, report.targetId)} className="text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded font-bold shadow-lg">非公開を解除(承認)</button>
                        <button onClick={() => resolveReport(report.id)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-bold">却下(処置済みにする)</button>
                      </div>
                    </div>
                  )
                })}
                {reports.filter(r => r.targetType === 'scenario_appeal' && r.status === 'pending').length === 0 && <p className="text-xs text-slate-500">現在、未処理の申請はありません。</p>}
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white mb-3">ユーザー管理</h3>
              <input type="text" placeholder="検索..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 mb-2" />
              <div className="h-[300px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
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

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-white mb-3">シナリオ管理＆治安維持</h3>
              <input type="text" placeholder="シナリオタイトルで検索..." value={scenarioSearchQuery} onChange={(e) => setScenarioSearchQuery(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 mb-2 shadow-inner" />
              <div className="h-[300px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
                {scenarios.filter(s => s.title.toLowerCase().includes(scenarioSearchQuery.toLowerCase())).map(scenario => {
                  const author = allUsers.find(u => u.id === scenario.authorId);
                  return (
                    <div key={scenario.id} className={`flex justify-between items-center p-4 rounded-lg border ${scenario.isBanned ? 'bg-amber-900/20 border-amber-600/50' : 'bg-slate-800 border-slate-700'}`}>
                      <div className="flex items-center gap-3">
                        <img src={scenario.imageUrl || NO_IMAGE_SCENARIO} className="w-10 h-10 object-cover rounded opacity-80" />
                        <div>
                          <p className="text-sm font-bold text-white">
                            {scenario.title} 
                            {scenario.isBanned && <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 ml-2 rounded font-bold">非公開中</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">作者: {author ? author.handleName : "不明"} | 評価: {scenario.ratingCount > 0 ? (scenario.ratingSum / scenario.ratingCount).toFixed(1) : "未評価"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setBanTargetScenario(scenario); setScenarioBanReason(""); }} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded font-bold shadow-lg">⚙️ 管理(削除/非公開)</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {roomConfigModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-emerald-700/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">🚪 部屋の作成: {roomConfigModal.scenario.title}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-slate-400 block mb-1">使用するキャラクター <span className="text-red-400">*</span></label>
                <select value={roomConfigModal.charId} onChange={(e) => setRoomConfigModal({...roomConfigModal, charId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
                  <option value="" disabled>選択してください</option>
                  {roomConfigModal.scenario.presetCharacters.map(c => <option key={c.id} value={c.id}>{c.name} ({c.job})</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">公開設定</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="radio" checked={roomConfigModal.privacy === 'open'} onChange={() => setRoomConfigModal({...roomConfigModal, privacy: 'open'})} /> 🔓 オープン（誰でも観戦可能）</label>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" checked={roomConfigModal.privacy === 'secret'} onChange={() => setRoomConfigModal({...roomConfigModal, privacy: 'secret'})} /> 🔒 シークレット（IDを知る人のみ）</label>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">ひとことメッセージ</label>
                <input type="text" value={roomConfigModal.message} onChange={(e) => setRoomConfigModal({...roomConfigModal, message: e.target.value})} placeholder="例：初心者歓迎！ゆっくり遊びましょう" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setRoomConfigModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button>
              <button onClick={executeCreateRoom} disabled={!roomConfigModal.charId} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-emerald-900/50">作成して入室</button>
            </div>
          </div>
        </div>
      )}

      {currentView === "lobby" && currentUser && (
        <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full min-h-0 overflow-y-auto">
          <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
            <div><h1 className="text-3xl font-extrabold text-emerald-400 mb-1">AI GM MORPG Lobby</h1></div>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowMailbox(true)} className="relative text-slate-300 hover:text-white p-2 text-xl">✉️{unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1.5 rounded-full">{unreadCount}</span>}</button>
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
                      <div className="text-xs text-slate-400 mb-2">ホスト: {searchedSecretRoom.host_name}</div>
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
                        <div className="text-xs text-slate-400 mb-2">ホスト: {room.host_name}</div>
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
                <div className="flex justify-between items-center mb-3"><h2 className="text-sm font-bold text-blue-400">👤 プレイヤー情報</h2></div>
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
                            <button onClick={() => setRoomConfigModal({ scenario: s, charId: "", privacy: "open", message: "" })} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded mt-2 shadow">
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><label className="text-[10px] text-slate-400 block mb-1">SAN (1〜100%)</label><input type="number" min="1" max="100" value={editingScenario.presetCharacters[editingCharIndex].san} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].san = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
                  <div><label className="text-[10px] text-slate-400 block mb-1">HP</label><input type="number" value={editingScenario.presetCharacters[editingCharIndex].hp} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].hp = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
                  <div><label className="text-[10px] text-slate-400 block mb-1">STR</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].str} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].str = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
                  <div><label className="text-[10px] text-slate-400 block mb-1">DEX</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].dex} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].dex = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
                  <div><label className="text-[10px] text-slate-400 block mb-1">INT</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].int} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].int = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
                  <div><label className="text-[10px] text-slate-400 block mb-1">CON</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].con} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].con = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
                </div>
              </div>
              <div><label className="text-xs text-slate-400 block mb-1">性格・特徴 (ハンドアウト内容)</label><textarea value={editingScenario.presetCharacters[editingCharIndex].personality} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].personality = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-24" /></div>
              <button onClick={() => setEditingCharIndex(null)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg mt-2">キャラクター設定を確定して戻る</button>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-bold text-amber-400 border-b border-slate-700 pb-2">基本設定</h3>
                <div><label className="text-xs text-amber-200 block mb-1">シナリオタイトル</label><input type="text" value={editingScenario.title} onChange={(e) => setEditingScenario({ ...editingScenario, title: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                  <div><label className="text-[10px] text-amber-200 block mb-1">販売価格 (G)</label><input type="number" min="0" value={editingScenario.price || 0} onChange={(e) => setEditingScenario({ ...editingScenario, price: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" /></div>
                  <div><label className="text-[10px] text-emerald-400 block mb-1">想定プレイ時間 (分)</label><input type="number" min="10" step="10" value={editingScenario.playTime || 60} onChange={(e) => setEditingScenario({ ...editingScenario, playTime: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-bold" /></div>
                </div>
                <div><label className="text-xs text-amber-200 block mb-1">世界観・設定</label><textarea value={editingScenario.setting || ""} onChange={(e) => setEditingScenario({ ...editingScenario, setting: e.target.value })} className="w-full h-16 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white" /></div>
                <div><label className="text-xs text-amber-200 block mb-1">NPC一覧</label><textarea value={editingScenario.npcList || ""} onChange={(e) => setEditingScenario({ ...editingScenario, npcList: e.target.value })} className="w-full h-16 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white" /></div>
                <div><label className="text-xs text-amber-200 block mb-1">プロット (AI GM用進行計画)</label><textarea value={editingScenario.plot} onChange={(e) => setEditingScenario({ ...editingScenario, plot: e.target.value })} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white" /></div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                    <h3 className="text-lg font-bold text-emerald-400">専用キャラクター (HO)</h3>
                    <button onClick={() => { const newChar: Character = { id: `c${Date.now()}`, name: "新規キャラ", job: "", personality: "", imageUrl: "", hp: 10, san: 50, str: 10, dex: 10, int: 10, con: 10, wis: 10, cha: 10 }; setEditingScenario({ ...editingScenario, presetCharacters: [...editingScenario.presetCharacters, newChar] }); setEditingCharIndex(editingScenario.presetCharacters.length); }} className="text-xs bg-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded">＋ 追加</button>
                  </div>
                  <div className="space-y-3">
                    {editingScenario.presetCharacters.map((char, idx) => (
                      <div key={char.id} className="flex items-center justify-between bg-slate-900 border border-slate-700 p-3 rounded-lg">
                        <div>
                          <p className="text-sm font-bold text-white">{char.name} ({char.job || "職業未設定"})</p>
                          <p className="text-[10px] text-slate-400">HP:{char.hp} | SAN:{char.san}% | STR:{char.str} DEX:{char.dex} INT:{char.int}</p>
                        </div>
                        <button onClick={() => setEditingCharIndex(idx)} className="text-xs bg-slate-700 px-3 py-2 rounded text-white hover:bg-slate-600">編集</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3"><button onClick={() => setCurrentView("lobby")} className="flex-1 bg-slate-700 text-white font-semibold py-3 rounded-lg">キャンセル</button><button onClick={saveScenario} className="flex-1 bg-amber-600 text-white font-semibold py-3 rounded-lg">保存する</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== 3. ゲームセッション画面 ==================== */}
      {currentView === "game" && activeRoom && myScene && (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 min-h-0 relative">
          
          {/* ★ ホスト専用：チーム分け設定モーダル（オーバーレイ） */}
          {activeRoom.status === 'splitting' && currentUser?.id === activeRoom.host_id && (
            <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-slate-800 border border-blue-500/50 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
                <h3 className="text-xl font-bold text-blue-400">👥 チーム編成</h3>
                <p className="text-xs text-slate-300 mb-2">※現在作成中のチームを設定してください。</p>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">チームの行動・目的地</label>
                  <input type="text" value={draftAction} onChange={e=>setDraftAction(e.target.value)} placeholder="例：管理室に行く" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">メンバー</label>
                  {draftMembers.map((m, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <select value={m} onChange={e => { const nm=[...draftMembers]; nm[i]=e.target.value; setDraftMembers(nm); }} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
                        <option value="" disabled>メンバーを選択...</option>
                        {Object.values(activeRoom.joined_users || {}).map(charId => {
                          const isAssigned = activeRoom.scenes.some(s => s.id !== 'scene_main' && s.memberIds.includes(charId));
                          if (isAssigned) return null;
                          const c = activeRoom.scenario?.presetCharacters.find(pc => pc.id === charId);
                          return c ? <option key={c.id} value={c.id}>{c.name}</option> : null;
                        })}
                      </select>
                      {i === draftMembers.length - 1 && <button onClick={()=>setDraftMembers([...draftMembers, ""])} className="bg-slate-700 px-3 rounded text-xs font-bold text-white">＋</button>}
                    </div>
                  ))}
                </div>
                {draftMembers.filter(m=>m!=="").length > 0 && !draftMembers.includes(joinedCharacter?.id || "") && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">このチームのリーダー</label>
                    <div className="flex gap-4">
                      {draftMembers.filter(m=>m!=="").map(m => {
                        const c = activeRoom.scenario?.presetCharacters.find(pc => pc.id === m);
                        if(!c) return null;
                        return <label key={m} className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="leader" value={m} checked={draftLeader===m} onChange={()=>setDraftLeader(m)} /> {c.name}</label>;
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={addTeamDraft} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded text-sm font-bold shadow-lg">このチームを確定して次へ</button>
                  <button onClick={finishSplitting} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded text-sm font-bold shadow-lg">編成を完了して再開する</button>
                </div>
              </div>
            </div>
          )}

          {/* ★ ゲスト用：チーム分け待機画面 */}
          {activeRoom.status === 'splitting' && currentUser?.id !== activeRoom.host_id && (
            <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl text-center">
                <h3 className="text-lg font-bold text-blue-400 mb-2 animate-pulse">ホストがチーム分けを行っています...</h3>
                <div className="space-y-2 mt-4 text-left">
                  {activeRoom.scenes.filter(s => s.id !== 'scene_main').map(s => (
                    <div key={s.id} className="bg-slate-900 border border-slate-700 p-3 rounded">
                      <span className="text-xs text-amber-400 font-bold bg-amber-900/30 px-2 py-0.5 rounded mr-2">{s.name}</span>
                      <span className="text-sm text-slate-300">
                        {s.memberIds.map(id => activeRoom.scenario?.presetCharacters.find(c=>c.id===id)?.name).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-4">
              <button onClick={leaveGame} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-bold shadow">🚪 離脱 / 終了</button>
              <button onClick={() => setReportTarget({type: 'scenario', id: activeRoom.scenario_id, name: activeRoom.scenario?.title || ""})} className="text-xs bg-slate-900 hover:bg-red-900/50 text-red-400 border border-slate-700 px-3 py-1.5 rounded font-bold">🚨 通報</button>
              
              <div className="flex flex-col ml-4">
                <span className="text-[10px] text-blue-400 font-bold border border-blue-500/50 bg-blue-900/30 px-2 py-0.5 rounded w-fit mb-1">
                  ROOM: {activeRoom.scenario?.title} (約{activeRoom.scenario?.playTime || 60}分)
                </span>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  {joinedCharacter ? joinedCharacter.name : "👁️ 観戦者"}
                  {isSplitMode && myScene.id !== 'scene_main' && <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded-full ml-2">{myScene.name} 班</span>}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {joinedCharacter && (
                <>
                  <button onClick={() => rollDice(joinedCharacter.san, "SAN", true)} className="bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 SAN({joinedCharacter.san}%)</button>
                  <button onClick={() => rollDice(joinedCharacter.str, "STR", false)} className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 STR({joinedCharacter.str})</button>
                  <button onClick={() => rollDice(joinedCharacter.dex, "DEX", false)} className="bg-green-700 hover:bg-green-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 DEX({joinedCharacter.dex})</button>
                  <button onClick={() => rollDice(joinedCharacter.int, "INT", false)} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 INT({joinedCharacter.int})</button>
                  <button onClick={() => rollDice(joinedCharacter.con, "CON", false)} className="bg-amber-700 hover:bg-amber-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 CON({joinedCharacter.con})</button>
                </>
              )}

              {/* ★ ゲーム開始ボタン */}
              {(currentUser?.id === activeRoom.host_id || currentUser?.handleName === activeRoom.host_name) && activeRoom.status === "recruiting" && joinedCharacter && (
                <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-4 py-2 rounded animate-pulse ml-2 shadow-lg shadow-emerald-900/50">▶ ゲーム開始</button>
              )}

              {/* ★ チーム分け開始ボタン */}
              {(currentUser?.id === activeRoom.host_id || currentUser?.handleName === activeRoom.host_name) && activeRoom.status === "playing" && !isScenarioEnded && !isSplitMode && (
                 <button onClick={startSplitting} className="bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg ml-2">👥 チーム分け</button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-scroll space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3 min-h-0">
            {messages.filter(msg => {
              if (msg.type === "system") return true;
              if (!isSplitMode) return msg.channel === chatTab;
              return (!msg.sceneId || msg.sceneId === 'scene_main' || msg.sceneId === myScene.id) && msg.channel === chatTab;
            }).map((msg, index) => {
              const isMe = msg.sender === "player";
              const isAIPlayer = msg.sender === "ai_player";
              const isSystem = msg.type === "system";
              
              const displayText = msg.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim();
              if (!displayText && !isSystem) return null;
              
              let bgColor = isMe ? "bg-blue-600/90 ml-auto" : (isAIPlayer ? "bg-indigo-600/80 mr-auto border-l-4 border-indigo-400" : "bg-slate-700/90 mr-auto border-l-4 border-emerald-500");
              if (isSystem) bgColor = "bg-slate-900/80 mx-auto border border-slate-700 text-center";

              return (
                <div key={index} className={`p-3 rounded-xl max-w-[85%] ${bgColor} text-white shadow-md`}>
                  <span className="text-[10px] opacity-60 block mb-1">
                    {msg.charName || (isMe && joinedCharacter ? joinedCharacter.name : (msg.sender === "gm" ? "AI GM" : "SYSTEM"))} 
                    {!isSystem && msg.type && ` [${msg.type.toUpperCase()}]`}
                  </span>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{displayText}</p>
                </div>
              )
            })}
            {isLoading && <div className="text-xs text-emerald-400 animate-pulse font-bold bg-slate-900/50 w-fit px-3 py-1 rounded">AI思考中...</div>}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2 shadow-lg">
            
            {isScenarioEnded && (
              activeRoom.status === 'finished' ? (
                <div className="bg-amber-900/50 border border-amber-500 rounded p-2 flex justify-between items-center mb-2">
                  <span className="text-amber-400 text-sm font-bold">🎉 感想戦モード（AIは停止しています）</span>
                  <button onClick={() => setCurrentView("evaluation")} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded shadow">
                    評価して退出する
                  </button>
                </div>
              ) : currentUser?.id === activeRoom.host_id ? (
                <button onClick={endGame} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl shadow-lg animate-pulse text-sm mb-2">
                  🎉 セッション完了！感想戦モードへ移行する
                </button>
              ) : (
                <div className="bg-amber-900/50 border border-amber-500 rounded p-2 text-center text-amber-400 text-sm font-bold mb-2">
                  🎉 エンディング到達！ホストの完了操作をお待ちください...
                </div>
              )
            )}

            {isSplitMode && myScene.isMerged && activeRoom.status === 'playing' && (
              <div className="bg-indigo-900/50 border border-indigo-500 rounded p-2 text-center text-indigo-300 text-sm font-bold mb-2">
                ⏳ {myScene.name}チームの行動を終了し、他チームの合流を待っています... (相談チャットのみ使用可能)
              </div>
            )}

            {joinedCharacter ? (
              activeRoom.status === 'finished' ? (
                <div className="flex gap-2 pt-1">
                  <div className="flex items-center justify-center bg-amber-600/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-lg text-xs font-bold">
                    🗣️ 感想戦
                  </div>
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} 
                    placeholder="他のプレイヤーとセッションの感想を語り合いましょう！（AIは反応しません）" 
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition" />
                  <button onClick={handleSend} disabled={isLoading} className="text-white px-6 py-2 rounded-lg text-sm font-bold shadow transition bg-amber-600 hover:bg-amber-500 disabled:opacity-50">送信</button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 border-b border-slate-700 pb-2 items-center overflow-x-auto whitespace-nowrap">
                    <button onClick={() => handleTabClick("story")} className={`relative text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "story" ? "bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500" : "text-slate-400 hover:text-white"}`}>
                      📖 {isSplitMode && myScene.id !== 'scene_main' ? 'チーム行動宣言 (GMへ)' : '行動宣言 (GMへ)'}
                      {unreadIndicators.story && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                    <button onClick={() => handleTabClick("consult")} className={`relative text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "consult" ? "bg-indigo-600/20 text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"}`}>
                      🗣️ 相談 (PL・AI相棒へ)
                      {unreadIndicators.consult && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                    <button onClick={() => handleTabClick("gm")} className={`relative text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "gm" ? "bg-amber-600/20 text-amber-400 border-b-2 border-amber-500" : "text-slate-400 hover:text-white"}`}>
                      ⚙️ GMへのメタ質問
                      {unreadIndicators.gm && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>

                    {chatTab === "consult" && !isScenarioEnded && (
                      <label className="ml-auto text-[10px] flex items-center gap-1.5 text-indigo-300 bg-slate-900 px-2 py-1 rounded border border-slate-600 cursor-pointer hover:bg-slate-800 transition">
                        <input type="checkbox" checked={consultWithAI} onChange={(e) => setConsultWithAI(e.target.checked)} className="accent-indigo-500 w-3 h-3" />
                        AI相棒にも意見を求める
                      </label>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-1">
                    {/* ★ チーム合流ボタン */}
                    {isSplitMode && myScene.id !== 'scene_main' && !myScene.isMerged && (currentUser?.id === myScene.leaderId || activeRoom.host_id === currentUser?.id) && (
                      <button onClick={mergeTeam} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg text-xs font-bold shadow-lg flex-shrink-0">
                        🚪 合流する
                      </button>
                    )}
                    
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} 
                      placeholder={chatTab === "story" ? "例：鍵穴を覗き込みます。" : (chatTab === "consult" ? (consultWithAI && !isScenarioEnded ? "例：ねえ、どうしようか？ (AI相棒が返答します)" : "例：PL同士の作戦会議メモ (AIは反応しません)") : "例：今の状況でもう一度目星は振れますか？")} 
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition" 
                      disabled={isChatDisabled}
                    />
                    <button onClick={handleSend} disabled={isChatDisabled} className={`text-white px-6 py-2 rounded-lg text-sm font-bold shadow transition ${chatTab === "story" ? "bg-emerald-600 hover:bg-emerald-500" : (chatTab === "consult" ? "bg-indigo-600 hover:bg-indigo-500" : "bg-amber-600 hover:bg-amber-500")} disabled:opacity-50`}>送信</button>
                  </div>
                </>
              )
            ) : (
              <div className="text-center p-2 text-slate-400 text-sm font-bold">あなたは観戦モードです（チャットは行えません）</div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 4. リザルト・評価画面 ==================== */}
      {currentView === "evaluation" && activeRoom && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full min-h-0 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6">
            <h1 className="text-2xl font-extrabold text-amber-400 text-center border-b border-slate-700 pb-4">セッション終了！お疲れ様でした</h1>
            
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-white mb-2">💾 思い出を保存する (PDF出力)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button onClick={() => exportToPDF('chat')} disabled={isExporting} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-2 rounded shadow disabled:opacity-50">そのままのチャット</button>
                <button onClick={() => exportToPDF('summary')} disabled={isExporting} className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-2 rounded shadow disabled:opacity-50">AI要約データ</button>
                <button onClick={() => exportToPDF('novel')} disabled={isExporting} className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold py-2 rounded shadow disabled:opacity-50">AIリプレイ小説化</button>
              </div>
              {isExporting && <p className="text-[10px] text-amber-400 animate-pulse text-center mt-2">AIが執筆しています... (数秒〜十数秒かかります)</p>}
            </div>

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
                <label className="text-sm text-white font-bold block mb-2">👑 プレイヤー（ホスト・GM）の評価: {activeRoom.host_name}</label>
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
          </div>
        </div>
      )}
    </main>
  );
}