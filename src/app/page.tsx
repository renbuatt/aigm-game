"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { generateAIResponse, generateAITextWithPrompt } from "../lib/ai";
import { 
  ViewState, UserProfile, Notification, BanAppeal, Report, 
  Character, Scenario, Scene, Room, Message, ChatTab, PlayArchive 
} from "../types";

import LoginView from "../components/views/LoginView";
import SignupView from "../components/views/SignupView";
import OnboardingView from "../components/views/OnboardingView";
import BannedView from "../components/views/BannedView";
import MaintenanceView from "../components/views/MaintenanceView";
import EvaluationView from "../components/views/EvaluationView";
import AdminView from "../components/views/AdminView";
import ScenarioEditView from "../components/views/ScenarioEditView";
import LobbyView from "../components/views/LobbyView";
import GameView from "../components/views/GameView";
import UserProfileView from "../components/views/UserProfileView";
import LibraryView from "../components/views/LibraryView";

const NO_IMAGE_SCENARIO = "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=400&q=80";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewState>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [targetUserId, setTargetUserId] = useState<string>(""); 

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [editingCharIndex, setEditingCharIndex] = useState<number | null>(null);
  
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

  const [proposedTeams, setProposedTeams] = useState<{id: string, action: string, members: string[], leader: string}[]>([]);
  const [isGeneratingSplit, setIsGeneratingSplit] = useState(false);

  const [ratingScenario, setRatingScenario] = useState<number>(5);
  const [ratingGM, setRatingGM] = useState<number>(5);
  const [isMaintenance, setIsMaintenance] = useState(false);
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [myNotifications, setMyNotifications] = useState<Notification[]>([]);
  const [showMailbox, setShowMailbox] = useState(false);

  const [banTargetUser, setBanTargetUser] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banAppeals, setBanAppeals] = useState<BanAppeal[]>([]);
  const [appealText, setAppealText] = useState("");

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [scenarioSearchQuery, setScenarioSearchQuery] = useState("");

  const [banTargetScenario, setBanTargetScenario] = useState<Scenario | null>(null);
  const [scenarioBanReason, setScenarioBanReason] = useState("");

  const [reports, setReports] = useState<Report[]>([]);
  const [reportTarget, setReportTarget] = useState<{ type: 'user' | 'scenario' | 'room'; id: string; name: string; roomId?: string; scenarioId?: string; scenarioName?: string; availableUsers?: { id: string, name: string }[]; } | null>(null);
  const [reportReason, setReportReason] = useState("");

  const [scenarioAppealTarget, setScenarioAppealTarget] = useState<Scenario | null>(null);
  const [scenarioAppealText, setScenarioAppealText] = useState("");

  const [roomConfigModal, setRoomConfigModal] = useState<{ scenario: Scenario, charId: string, privacy: 'open'|'secret', message: string, difficulty: any, rule: any, itemVisibility: "all"|"self"|"none" } | null>(null);
  const [secretRoomIdSearch, setSecretRoomIdSearch] = useState("");
  const [searchedSecretRoom, setSearchedSecretRoom] = useState<Room | null>(null);

  const [adModal, setAdModal] = useState<{ isOpen: boolean, step: number, scenario: Scenario | null }>({ isOpen: false, step: 0, scenario: null });
  
  const [unreadIndicators, setUnreadIndicators] = useState({ story: false, consult: false, gm: false });
  const chatTabRef = useRef<ChatTab>(chatTab);
  const prevMessagesLength = useRef(0);
  const [playArchives, setPlayArchives] = useState<PlayArchive[]>([]);

  const availableScenarios = scenarios.filter(s => !s.isBanned);
  const createdScenarios = scenarios.filter(s => s.authorId === currentUser?.id);
  const availableRooms = rooms.filter(r => !r.scenario?.isBanned);

  const defaultScene: Scene = { id: "scene_main", name: "メインルーム", memberIds: [] };
  const myScene = activeRoom?.scenes?.find(s => joinedCharacter && s.memberIds.includes(joinedCharacter.id)) || activeRoom?.scenes?.[0] || defaultScene;
  const isSplitMode = activeRoom ? (activeRoom.scenes?.length > 1) : false;

  const isScenarioEnded = messages.some(m => m.text.includes('[SCENARIO_END]')) || activeRoom?.status === 'finished';

  const openUserProfile = (userId: string) => {
    setTargetUserId(userId);
    setCurrentView("userProfile");
  };

  const addFriend = async (targetId: string) => {
    if (!currentUser) return;
    if (currentUser.friendIds?.includes(targetId)) {
      alert("既に友達に登録されています。");
      return;
    }
    const newFriends = [...(currentUser.friendIds || []), targetId];
    const { error } = await supabase.from('profiles').update({ friend_ids: newFriends }).eq('id', currentUser.id);
    if (!error) {
      setCurrentUser({ ...currentUser, friendIds: newFriends });
      alert("友達に追加しました！");
    } else {
      alert("エラーが発生しました: " + error.message);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const { error } = await supabase.from('profiles').update({
      handle_name: updates.handleName,
      bio: updates.bio,
      avatar_url: updates.avatarUrl
    }).eq('id', currentUser.id);
    
    if (error) {
      alert("プロフィールの更新に失敗しました: " + error.message);
    } else {
      setCurrentUser({ ...currentUser, ...updates });
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", "page_view", {
        page_title: currentView,
        page_location: window.location.href + "?view=" + currentView,
        page_path: "/?view=" + currentView,
      });
    }
  }, [currentView]);

  const loadChatLogs = async (roomId: string) => {
    const { data } = await supabase.from('chat_logs').select('message').eq('room_id', roomId).order('id', { ascending: true });
    if (data && data.length > 0) setMessages(data.map((d: any) => d.message));
    else setMessages([]);
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
            if (prev.some(m => JSON.stringify(m) === JSON.stringify(incomingMsg))) return prev;
            return [...prev, incomingMsg];
          });
        }).subscribe();

      const roomChannel = supabase.channel(`room_sync_${activeRoom.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${activeRoom.id}` }, (payload) => {
          setActiveRoom(prev => prev ? { ...prev, ...payload.new, scenario: prev.scenario } : payload.new as Room);
        }).subscribe();

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
    if (activeRoom && isSplitMode && currentUser?.id === activeRoom.host_id && activeRoom.status === 'playing') {
      const nonMainScenes = activeRoom.scenes.filter(s => s.id !== 'scene_main');
      if (nonMainScenes.length > 0 && nonMainScenes.every(s => s.isMerged)) {
        executeMergeAll();
      }
    }
  }, [activeRoom?.scenes, activeRoom?.status, activeRoom?.host_id, currentUser?.id, isSplitMode]);

  const fetchData = async () => {
    const { data: scData } = await supabase.from('scenarios').select('*').order('id', { ascending: false });
    let loadedScenarios: Scenario[] = [];
    if (scData && scData.length > 0) {
      loadedScenarios = scData.map((d: any) => ({
        id: d.id, title: d.title, system: d.system || "", tags: d.tags || "", setting: d.setting || "",
        npcList: d.npc_list || "", plot: d.plot || "", prologue: d.prologue || "", epilogue: d.epilogue || "",
        imageUrl: d.image_url || "", presetCharacters: d.preset_characters || [],
        ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0,
        authorId: d.author_id, price: d.price || 500, playLimit: d.play_limit || 1, giftLimit: d.gift_limit || 1,
        purchasedTickets: d.purchased_tickets || {}, isBanned: d.is_banned || false, playTime: d.play_time || 60,
        isPlayableByOthers: d.is_playable_by_others || false, isTrialOk: d.is_trial_ok || false, itemVisibility: d.item_visibility || "none"
      }));
      setScenarios(loadedScenarios);
    }
    const { data: rmData } = await supabase.from('rooms').select('*').neq('status', 'finished').order('id', { ascending: false });
    let formattedRooms: Room[] = [];
    if (rmData && loadedScenarios.length > 0) {
      formattedRooms = rmData.map((r: any) => ({
        id: r.id, scenario_id: r.scenario_id, scenario: loadedScenarios.find(s => s.id === r.scenario_id),
        host_name: r.host_name, host_id: r.host_id, status: r.status, scenes: r.scenes || [],
        privacy: r.privacy || "open", host_message: r.host_message || "", joined_users: r.joined_users || {},
        current_summary: r.current_summary || "", difficulty: r.difficulty || "normal", rule: r.rule || "coc_jp",
        is_paused: r.is_paused || false, afk_users: r.afk_users || [], is_trial: r.is_trial || false,
        item_visibility: r.item_visibility || "none", inventories: r.inventories || {},
        current_chapter_index: r.current_chapter_index || 0
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
    let profileData: UserProfile | null = null;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    const isProfileComplete = data && data.full_name && data.address && data.phone;

    if (!isProfileComplete) {
      setEmail(emailStr); 
      setCurrentView("onboarding");
      return;
    }

    if (data) {
      profileData = { id: data.id, handleName: data.handle_name, fullName: data.full_name, address: data.address, phone: data.phone, avatarUrl: data.avatar_url, bio: data.bio, discordId: data.discord_id, ratingSum: data.rating_sum || 0, ratingCount: data.rating_count || 0, isAdmin: data.is_admin || false, isTester: data.is_tester || false, isBanned: data.is_banned || false, email: data.email, friendIds: data.friend_ids || [] };
      if (data.email !== emailStr) await supabase.from('profiles').update({ email: emailStr }).eq('id', userId);
    } 

    if (!profileData) return;

    setCurrentUser(profileData);
    await fetchNotifications(userId);

    const { data: archiveData } = await supabase.from('play_archives').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (archiveData) {
      setPlayArchives(archiveData.map((d: any) => ({
        id: d.id, userId: d.user_id, scenarioTitle: d.scenario_title, scenarioImage: d.scenario_image,
        characterName: d.character_name, chatLogs: d.chat_logs, createdAt: d.created_at, rule: d.rule, coPlayers: d.co_players, novels: d.novels || {}, characters: d.characters || []
      })));
    }

    if (!profileData.isBanned && (!currentMaintenance || profileData.isAdmin || profileData.isTester)) {
      const activeMyRoom = roomsData.find(r => (r.status === 'playing' || r.status === 'splitting' || r.status === 'recruiting') && r.joined_users && r.joined_users[userId]);
      if (activeMyRoom && activeMyRoom.scenario) {
        const charId = activeMyRoom.joined_users[userId];
        const char = activeMyRoom.scenario.presetCharacters.find(c => c.id === charId);
        if (char) {
          setActiveRoom(activeMyRoom); setJoinedCharacter(char);
          const takenIds = Object.values(activeMyRoom.joined_users || {});
          setAiPlayersList(activeMyRoom.scenario.presetCharacters.filter(c => !takenIds.includes(c.id)));
          await loadChatLogs(activeMyRoom.id);
          setCurrentView("game"); return;
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
      
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email || "", currentMaintenance, formattedRooms);
      }
    };
    initApp();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { formattedRooms } = await fetchData();
      if (data.user) await fetchProfile(data.user.id, email, isMaintenance, formattedRooms);
    } catch (error: any) { alert("ログインエラー: " + error.message); } finally { setAuthLoading(false); }
  };

  const handleEmailSignUp = async (e: React.FormEvent, name: string, addr: string, phone: string) => {
    e.preventDefault();
    if (!email || !password || !name || !addr || !phone) return;
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: data.user.id, handle_name: name.split(" ")[0] || email.split("@")[0], full_name: name, address: addr, phone: phone,
          avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", email: email
        });
        if (upsertError) throw upsertError;
        alert("アカウントを作成しました！");
        const { formattedRooms } = await fetchData();
        await fetchProfile(data.user.id, email, isMaintenance, formattedRooms);
      }
    } catch (error: any) { alert("登録エラー: " + error.message); } finally { setAuthLoading(false); }
  };

  const handleProfileSetup = async (name: string, addr: string, phone: string) => {
    setAuthLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("セッションが見つかりません。");
      
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: session.user.id, handle_name: name.split(" ")[0] || session.user.email?.split("@")[0], full_name: name, address: addr, phone: phone,
        avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", email: session.user.email
      });
      if (upsertError) throw upsertError;
      
      alert("登録が完了しました！");
      const { formattedRooms } = await fetchData();
      await fetchProfile(session.user.id, session.user.email || "", isMaintenance, formattedRooms);
    } catch (error: any) { alert("登録エラー: " + error.message); } finally { setAuthLoading(false); }
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert("Googleログインの初期設定が未完了です: " + error.message);
    setAuthLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setCurrentView("login"); setActiveRoom(null); setJoinedCharacter(null); };

  const togglePauseRoom = async () => {
    if (!activeRoom) return;
    const newStatus = !activeRoom.is_paused;
    await supabase.from('rooms').update({ is_paused: newStatus }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, is_paused: newStatus });
    await pushMessage(activeRoom.id, { sender: "system", text: newStatus ? "【システム】セッションを中断（セーブ）しました。再開するまでAI GMは停止し、タイマーは進みません。" : "【システム】セッションを再開しました！", type: "system", channel: "system" });
  };

  const toggleAFK = async (userId: string, forceRemove: boolean = false) => {
    if (!activeRoom) return;
    let newAfk = [...(activeRoom.afk_users || [])];
    if (forceRemove) newAfk = newAfk.filter(id => id !== userId);
    else if (newAfk.includes(userId)) newAfk = newAfk.filter(id => id !== userId);
    else newAfk.push(userId);
    
    await supabase.from('rooms').update({ afk_users: newAfk }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, afk_users: newAfk });
    
    const cId = activeRoom.joined_users?.[userId];
    const charName = activeRoom.scenario?.presetCharacters.find(c => c.id === cId)?.name || "プレイヤー";
    const msg = forceRemove ? `【システム】${charName}が復帰しました。` : (newAfk.includes(userId) ? `【システム】${charName}が離席（AFK）しました。` : `【システム】${charName}が復帰しました。`);
    await pushMessage(activeRoom.id, { sender: "system", text: msg, type: "system", channel: "system" }, false); 
  };

  const triggerAutoAction = async () => {
    if (!activeRoom || activeRoom.is_paused || activeRoom.status !== 'playing' || isScenarioEnded) return;
    const extraUserContext = ["【システムコマンド：タイムアウト自動行動】", "最後の行動から5分間、PLからの入力がありませんでした。", "物語の進行を促すため、現在AFKではないキャラクター（およびAI相棒）の行動をAI GMが自動で決定・描写し、事態を強制的に前進させてください。", "必要であればダイスロール結果もAI自身が捏造して構いません。"].join('\n');
    await callAIGM(extraUserContext, "story");
  };

  const deleteScenario = async (id: string) => {
    if (!confirm("本当にこのシナリオを削除しますか？\n（※このシナリオで立てられた部屋も強制的に削除されます）")) return;
    await supabase.from('rooms').delete().eq('scenario_id', id);
    const { error } = await supabase.from('scenarios').delete().eq('id', id);
    if (error) alert("削除に失敗しました: " + error.message);
    else { alert("シナリオを削除しました。"); await fetchData(); }
  };

  const saveScenario = async () => {
    if (!editingScenario || !currentUser) return;
    const dbData = { 
      title: editingScenario.title, system: editingScenario.system || "", tags: editingScenario.tags || "", setting: editingScenario.setting || "", 
      npc_list: editingScenario.npcList || "", plot: editingScenario.plot || "", prologue: editingScenario.prologue || "", epilogue: editingScenario.epilogue || "",
      image_url: editingScenario.imageUrl || "", preset_characters: editingScenario.presetCharacters,
      rating_sum: editingScenario.ratingSum, rating_count: editingScenario.ratingCount, author_id: currentUser.id, purchased_tickets: editingScenario.purchasedTickets || {},
      price: editingScenario.price || 500, play_limit: editingScenario.playLimit || 1, gift_limit: editingScenario.giftLimit || 1, play_time: editingScenario.playTime || 60,
      is_playable_by_others: editingScenario.isPlayableByOthers || false, is_trial_ok: editingScenario.isTrialOk || false, item_visibility: editingScenario.itemVisibility || "none"
    };
    if (editingScenario.id && !editingScenario.id.startsWith('s')) {
      const { error } = await supabase.from('scenarios').update(dbData).eq('id', editingScenario.id);
      if (error) { alert("保存に失敗しました: " + error.message); return; }
    } else {
      const { error } = await supabase.from('scenarios').insert(dbData);
      if (error) { alert("作成に失敗しました: " + error.message); return; }
    }
    alert("シナリオを保存しました！"); await fetchData(); setCurrentView("lobby");
  };

  const submitEvaluation = async () => {
    if(!activeRoom || !activeRoom.scenario || !currentUser) return;
    const newScSum = activeRoom.scenario.ratingSum + ratingScenario;
    const newScCount = activeRoom.scenario.ratingCount + 1;
    await supabase.from('scenarios').update({ rating_sum: newScSum, rating_count: newScCount }).eq('id', activeRoom.scenario.id);
    if(activeRoom.host_id) {
      const { data: hostData } = await supabase.from('profiles').select('rating_sum, rating_count').eq('id', activeRoom.host_id).single();
      if(hostData) await supabase.from('profiles').update({ rating_sum: (hostData.rating_sum || 0) + ratingGM, rating_count: (hostData.rating_count || 0) + 1 }).eq('id', activeRoom.host_id);
    }
    alert("評価を送信しました！ロビーに戻ります。");
    setActiveRoom(null); setJoinedCharacter(null); await fetchData(); setCurrentView("lobby");
  };

  const submitUserReport = async () => {
    if (!currentUser || !reportTarget || !reportReason.trim()) return;
    const { error } = await supabase.from('reports').insert({ reporter_id: currentUser.id, target_type: reportTarget.type, target_id: reportTarget.id, room_id: reportTarget.roomId || null, reason: reportReason });
    if (!error) { alert("運営に通報を送信しました。ご協力ありがとうございます。"); setReportTarget(null); setReportReason(""); } 
    else alert("エラーが発生しました: " + error.message);
  };

  const submitScenarioAppeal = async () => {
    if (!currentUser || !scenarioAppealTarget || !scenarioAppealText.trim()) return;
    const { error } = await supabase.from('reports').insert({ reporter_id: currentUser.id, target_type: 'scenario_appeal', target_id: scenarioAppealTarget.id, reason: scenarioAppealText });
    if (!error) { alert("運営に再審査（修正完了）の申請を送信しました。"); setScenarioAppealTarget(null); setScenarioAppealText(""); await fetchAdminData(); } 
    else alert("エラーが発生しました: " + error.message);
  };

  const executeCreateTester = async (testerEmail: string, testerPass: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email: testerEmail, password: testerPass });
      if (error) throw error;
      if (data.user) {
        const { error: upsertError } = await supabase.from('profiles').upsert({ id: data.user.id, handle_name: testerEmail.split("@")[0], avatar_url: DEFAULT_AVATAR, is_tester: true, is_admin: false, email: testerEmail });
        if (upsertError) throw upsertError;
        alert("テスターアカウントを発行しました！\n\n※認証の仕様上、管理者セッションが一度切断されます。お手数ですが、再度「管理者アカウント」でログインし直してください。");
        await handleLogout();
      }
    } catch (err: any) { alert("テスターアカウントの作成に失敗しました: " + err.message); }
  };

  const fetchAdminData = async () => {
    const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (usersData) setAllUsers(usersData.map((d: any) => ({ id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id, ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0, isAdmin: d.is_admin || false, isTester: d.is_tester || false, isBanned: d.is_banned || false, email: d.email })));
    const { data: appealsData } = await supabase.from('ban_appeals').select('*').order('created_at', { ascending: false });
    if (appealsData) setBanAppeals(appealsData.map((d: any) => ({ id: d.id, userId: d.user_id, reason: d.reason, appealText: d.appeal_text, status: d.status, createdAt: d.created_at })));
    const { data: reportsData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (reportsData) setReports(reportsData.map((d: any) => ({ id: d.id, reporterId: d.reporter_id, targetType: d.target_type, targetId: d.target_id, roomId: d.room_id || null, reason: d.reason, status: d.status, createdAt: d.created_at })));
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
        if (banTargetScenario.authorId) await supabase.from('notifications').insert({ user_id: banTargetScenario.authorId, title: '【重要】シナリオ強制削除のお知らせ', message: `運営による巡回・通報の精査の結果、あなたが作成したシナリオ「${banTargetScenario.title}」は重大な利用規約違反と判断されたため、システムから完全に削除されました。\n\n【削除理由】\n${scenarioBanReason}` });
        alert("シナリオを完全に削除し、警告メールを送信しました。");
      } else alert("削除に失敗しました: " + error.message);
    } else if (action === 'soft') {
      if(!scenarioBanReason.trim()) { alert("非公開の理由を入力してください。"); return; }
      const { error } = await supabase.from('scenarios').update({ is_banned: true }).eq('id', banTargetScenario.id);
      if (!error) {
        if (banTargetScenario.authorId) await supabase.from('notifications').insert({ user_id: banTargetScenario.authorId, title: '【重要】シナリオ一時非公開のお知らせ', message: `あなたが作成したシナリオ「${banTargetScenario.title}」について、利用規約に抵触する恐れがあるため、一時的に非公開措置といたしました。\n\n【非公開の理由】\n${scenarioBanReason}` });
        alert("シナリオを一時非公開にし、警告メールを送信しました。");
      } else alert("非公開処理に失敗しました: " + error.message);
    } else if (action === 'unban') {
      const { error } = await supabase.from('scenarios').update({ is_banned: false }).eq('id', banTargetScenario.id);
      if (!error) {
         if (banTargetScenario.authorId) await supabase.from('notifications').insert({ user_id: banTargetScenario.authorId, title: '【お知らせ】シナリオの非公開措置が解除されました', message: `シナリオ「${banTargetScenario.title}」の非公開措置が解除され、再びプレイ可能になりました。` });
         alert("シナリオの非公開設定を解除しました。");
      } else alert("解除に失敗しました: " + error.message);
    }
    setBanTargetScenario(null); setScenarioBanReason(""); await fetchData();
  };

  const unbanScenarioFromAppeal = async (reportId: string, scenarioId: string) => {
    const { error } = await supabase.from('scenarios').update({ is_banned: false }).eq('id', scenarioId);
    if (!error) {
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      const s = scenarios.find(x => x.id === scenarioId);
      if(s && s.authorId) await supabase.from('notifications').insert({ user_id: s.authorId, title: '【お知らせ】シナリオの再審査が承認されました', message: `申請いただいたシナリオ「${s.title}」の非公開措置が解除されました。` });
      alert("シナリオの非公開を解除し、作者に通知しました。"); await fetchAdminData(); await fetchData();
    } else alert("エラーが発生しました: " + error.message);
  };

  const resolveReport = async (reportId: string) => { await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId); fetchAdminData(); };
  const submitAppeal = async () => { if(!currentUser || !appealText) return; await supabase.from('ban_appeals').insert({ user_id: currentUser.id, reason: "不明", appeal_text: appealText, status: 'appealing' }); alert("調査依頼を送信しました。"); setAppealText(""); };
  const markNotificationAsRead = async (notifId: string) => { await supabase.from('notifications').update({ is_read: true }).eq('id', notifId); setMyNotifications(myNotifications.map(n => n.id === notifId ? { ...n, isRead: true } : n)); };

  const startSplitting = async () => {
    if (!activeRoom) return;
    await supabase.from('rooms').update({ status: 'splitting' }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, status: 'splitting', scenes: [{ id: 'scene_main', name: 'メインルーム', memberIds: [] }] });
    setProposedTeams([]); generateSplitProposal();
  };

  const generateSplitProposal = async () => {
    if (!activeRoom) return;
    setIsGeneratingSplit(true);
    try {
      const { data: memoryData } = await supabase.from('ai_memory').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: false }).limit(15);
      const recentLogs = memoryData?.reverse().map(m => `${m.role === 'user' ? 'PL' : 'GM'}: ${m.content}`).join('\n') || "";
      const chars = activeRoom.scenario?.presetCharacters.filter(c => Object.values(activeRoom.joined_users || {}).includes(c.id)).map(c => `{"id": "${c.id}", "name": "${c.name}"}`).join(", ") || "";
      const prompt = ["あなたはTRPGのシステムAIです。以下の「現在参加しているキャラクター」と「直近のチャットログ」を分析し、物語の展開上、最も自然な【チーム分け（2つ以上のグループへの分割）の構成案】を作成してください。","【参加キャラクター】",chars,"","【直近のログ】",recentLogs,"","【出力形式（絶対遵守）】","必ず以下のJSONフォーマットのみを出力してください。余計な文章やマークダウン記号は一切含めないでください。",'{"teams": [{"action": "目的A", "members": ["キャラID1"]}, {"action": "目的B", "members": ["キャラID3"]}]}'].join('\n');
      const aiResponse = await generateAITextWithPrompt(prompt);
      const jsonStr = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.teams) setProposedTeams(parsed.teams.map((t: any) => ({ id: `team_${Date.now()}_${Math.random()}`, action: t.action, members: t.members, leader: t.members[0] || "" })));
      else setProposedTeams([{ id: `team_${Date.now()}`, action: "", members: [], leader: "" }]);
    } catch (e) {
      setProposedTeams([{ id: `team_${Date.now()}`, action: "", members: [], leader: "" }]);
    } finally { setIsGeneratingSplit(false); }
  };

  const finishSplitting = async () => {
    if (!activeRoom) return;
    const validTeams = proposedTeams.filter(t => t.action && t.members.length > 0);
    if (validTeams.length === 0) { alert("有効なチームがありません。"); return; }
    for (const t of validTeams) { if (!t.members.includes(joinedCharacter?.id || "") && !t.leader) { alert("ホストが含まれないチームにはリーダーを指定してください。"); return; } }
    const newScenes: Scene[] = [{ id: 'scene_main', name: 'メインルーム', memberIds: [] }, ...validTeams.map(t => ({ id: t.id, name: t.action, memberIds: t.members, leaderId: t.leader, isMerged: false }))];
    await supabase.from('rooms').update({ scenes: newScenes, status: 'playing' }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, scenes: newScenes, status: 'playing' });
    await pushMessage(activeRoom.id, { sender: "system", text: `【システム】チーム分けが完了しました！各チームごとに独立して行動・相談を行ってください。`, type: "system", sceneId: "scene_main", channel: "system" });
  };

  const cancelSplitting = async () => { if (!activeRoom) return; await supabase.from('rooms').update({ status: 'playing' }).eq('id', activeRoom.id); setActiveRoom({ ...activeRoom, status: 'playing' }); };

  const mergeTeam = async () => {
    if (!activeRoom || !myScene || myScene.id === 'scene_main') return;
    const updatedScenes = activeRoom.scenes.map(s => s.id === myScene.id ? { ...s, isMerged: true } : s);
    await supabase.from('rooms').update({ scenes: updatedScenes }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, scenes: updatedScenes });
    await pushMessage(activeRoom.id, { sender: "system", text: `【システム】${myScene.name}チームはメインに合流するため待機します。全チームが合流するまでお待ちください。`, type: "system", sceneId: myScene.id, channel: "system" });
  };

  const executeMergeAll = async () => {
    if (!activeRoom) return;
    const allMemberIds = Object.keys(activeRoom.joined_users || {});
    const resetScenes: Scene[] = [{ id: 'scene_main', name: 'メインルーム', memberIds: allMemberIds }];
    await supabase.from('rooms').update({ scenes: resetScenes }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, scenes: resetScenes });
    await pushMessage(activeRoom.id, { sender: "system", text: `【システム】全チームが合流しました！`, type: "system", sceneId: 'scene_main', channel: "system" });
    const extraUserContext = ["【システムコマンド】全チームの別行動が終了し、一箇所に合流しました。","これまでの各チームの報告を踏まえ、合流時の情景描写と今後の展開を提示してください。"].join('\n');
    await callAIGM(extraUserContext, "story");
  };

  const executeCreateRoom = async () => {
    if (!currentUser || !roomConfigModal) return;
    const { scenario, charId, privacy, message, difficulty, rule, itemVisibility } = roomConfigModal;
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

    const hostChar = scenario.presetCharacters.find(c => c.id === charId);
    if (!hostChar) return;

    const initialScenes: Scene[] = [{ id: `scene_main_${Date.now()}`, name: "メインルーム", memberIds: scenario.presetCharacters.map(c => c.id) }];
    const initialInventories: Record<string, string> = {};
    scenario.presetCharacters.forEach(c => { initialInventories[c.id] = c.items || "特になし"; });

    const { data, error } = await supabase.from('rooms').insert({ 
      scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: initialScenes,
      privacy: privacy, host_message: message, joined_users: { [currentUser.id]: charId }, current_summary: "", difficulty: difficulty, rule: rule,
      is_paused: false, afk_users: [], is_trial: false, item_visibility: itemVisibility, inventories: initialInventories,
      current_chapter_index: 0
    }).select().single();
    
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
      setRoomConfigModal(null); await fetchData();
      const newRoom: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users, current_summary: "", difficulty: data.difficulty, rule: data.rule, is_paused: false, afk_users: [], is_trial: false, item_visibility: data.item_visibility, inventories: data.inventories, current_chapter_index: 0 };
      await supabase.from('ai_memory').delete().eq('room_id', newRoom.id);
      setActiveRoom(newRoom); setJoinedCharacter(hostChar); setMessages([]); 
      await pushMessage(newRoom.id, { sender: "system", text: `【入室完了】プレイヤー全員の準備が整うまでお待ちください。\n【案内】シークレット設定の場合、画面左上の「共有ID」をコピーして友人に伝えてください。`, type: "system", sceneId: newRoom.scenes?.[0]?.id, channel: "system" });
      setCurrentView("game");
    }
  };

  const executeTrialPlay = async () => {
    if (!currentUser || !adModal.scenario) return;
    const scenario = adModal.scenario;
    setAdModal({ isOpen: false, step: 0, scenario: null });
    
    const charId = scenario.presetCharacters[0]?.id;
    if (!charId) { alert("このシナリオにはプリセットキャラクターが設定されていないため、お試しプレイができません。"); return; }
    const hostChar = scenario.presetCharacters[0];
    
    const initialScenes: Scene[] = [{ id: `scene_main_${Date.now()}`, name: "メインルーム", memberIds: scenario.presetCharacters.map(c => c.id) }];
    const initialInventories: Record<string, string> = {};
    scenario.presetCharacters.forEach(c => { initialInventories[c.id] = c.items || "特になし"; });

    const { data, error } = await supabase.from('rooms').insert({ 
      scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: initialScenes,
      privacy: 'secret', host_message: "お試しプレイ", joined_users: { [currentUser.id]: charId }, current_summary: "", difficulty: "normal", rule: "coc_jp",
      is_paused: false, afk_users: [], is_trial: true, item_visibility: "none", inventories: initialInventories,
      current_chapter_index: 0
    }).select().single();
    
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
      await fetchData();
      const newRoom: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users, current_summary: "", difficulty: data.difficulty, rule: data.rule, is_paused: false, afk_users: [], is_trial: true, item_visibility: "none", inventories: data.inventories, current_chapter_index: 0 };
      await supabase.from('ai_memory').delete().eq('room_id', newRoom.id);
      setActiveRoom(newRoom); setJoinedCharacter(hostChar); setMessages([]); 
      const aiChars = scenario.presetCharacters.filter(c => c.id !== charId); setAiPlayersList(aiChars);
      await pushMessage(newRoom.id, { sender: "system", text: `【お試しルーム作成完了】\n他のキャラクターはAIが担当します。\n右上の「▶お試し開始」ボタンを押してスタートしてください。`, type: "system", sceneId: newRoom.scenes?.[0]?.id, channel: "system" });
      setCurrentView("game");
    }
  };

  const executeJoinRoom = async (room: Room, charId: string) => {
    if (!currentUser || !room || !charId) return;
    const { data: latestRoom } = await supabase.from('rooms').select('joined_users, inventories').eq('id', room.id).single();
    const currentUsers = latestRoom?.joined_users || {};
    const currentInventories = latestRoom?.inventories || {};

    if (Object.values(currentUsers).includes(charId)) { alert("申し訳ありません、そのキャラクターは先ほど他のプレイヤーに選択されました！"); await fetchData(); return; }

    const char = room.scenario?.presetCharacters.find(c => c.id === charId);
    if (!char) return;

    const newUsers = { ...currentUsers, [currentUser.id]: charId };
    const newInventories = { ...currentInventories, [currentUser.id]: char.items || "" };

    const { error } = await supabase.from('rooms').update({ joined_users: newUsers, inventories: newInventories }).eq('id', room.id);
    if (error) { alert("入室エラー: " + error.message); return; }

    const updatedRoom = { ...room, joined_users: newUsers, inventories: newInventories };
    setActiveRoom(updatedRoom); setJoinedCharacter(char); await loadChatLogs(room.id);
    await pushMessage(room.id, { sender: "system", text: `【入室完了】${char.name}として参加しました！ホストの開始をお待ちください。`, type: "system", sceneId: room.scenes?.[0]?.id, channel: "system" });
    setCurrentView("game");
  };

  const spectateRoom = async (room: Room) => {
    setActiveRoom(room); setJoinedCharacter(null); await loadChatLogs(room.id);
    await pushMessage(room.id, { sender: "system", text: `【観戦モード】部屋に入室しました。チャットやダイスは使用できません。`, type: "system", sceneId: room.scenes?.[0]?.id, channel: "system" }, false);
    setCurrentView("game");
  };

  const startGame = async () => {
    if(!activeRoom || !activeRoom.scenario || !joinedCharacter || !myScene) return;
    let aiChars: Character[] = [];
    const takenIds = Object.values(activeRoom.joined_users || {});
    const emptyChars = activeRoom.scenario.presetCharacters.filter(c => !takenIds.includes(c.id));
    if (emptyChars.length > 0) {
      if (activeRoom.is_trial) aiChars = emptyChars; 
      else if (confirm(`参加していないキャラクターが ${emptyChars.length} 人います。\n彼らを「AIプレイヤー（相棒）」として参加させますか？\n（キャンセルを押すとソロプレイになります）`)) aiChars = emptyChars;
    }
    setAiPlayersList(aiChars);

    await supabase.from('rooms').update({ status: 'playing', is_paused: false }).eq('id', activeRoom.id);
    const updatedRoom: Room = { ...activeRoom, status: 'playing', is_paused: false };
    setActiveRoom(updatedRoom);
    await pushMessage(activeRoom.id, { sender: "system", text: `【システム】ゲームを開始しました。AI GMを呼び出しています...`, type: "system", sceneId: myScene.id, channel: "system" });
    
    const extraUserContext = `【システムコマンド】セッションが開始されました。\n以下の【設定されたプロローグ情報】に従い（無ければ本編プロットから推測して）、導入部分の情景描写を行ってください。\n\n【設定されたプロローグ情報】\n${activeRoom.scenario.prologue || "特になし"}\n\nまた、この導入部において、事態の把握や最初の試練として【必ずプレイヤー全員が最低1回はダイス判定を行わなければならない状況】を発生させてください。`;
    await callAIGM(extraUserContext, "story", true);
  };

  const endGame = async () => {
    if(!activeRoom) return;
    if (currentUser?.id === activeRoom.host_id || activeRoom.is_trial) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
      setActiveRoom({...activeRoom, status: 'finished'});
      await pushMessage(activeRoom.id, { sender: "system", text: `【システム】セッションが完了しました！\nこれより「感想戦モード」になります（AIは停止し、プレイヤー間のチャットのみ可能です）。お疲れ様でした！`, type: "system", sceneId: myScene?.id, channel: "system" });
    }
  };

  const leaveGame = async () => {
    if (!activeRoom || !currentUser) return;
    if (activeRoom.status === 'finished') { setCurrentView("evaluation"); return; }
    if (!joinedCharacter) { setCurrentView("lobby"); setActiveRoom(null); await fetchData(); return; }

    const isHost = activeRoom.host_id === currentUser.id;
    const isRecruiting = activeRoom.status === 'recruiting';
    const remainingPlayers = Object.keys(activeRoom.joined_users || {}).filter(id => id !== currentUser.id).length;

    if (isRecruiting) {
      const newUsers = { ...activeRoom.joined_users };
      delete newUsers[currentUser.id];
      await supabase.from('rooms').update({ joined_users: newUsers }).eq('id', activeRoom.id);
      if (isHost && remainingPlayers === 0) await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
      setCurrentView("lobby"); setActiveRoom(null); setJoinedCharacter(null); await fetchData(); return;
    }

    if (remainingPlayers === 0) {
      if (confirm("【警告】\n他に人間プレイヤーがいないため、退出すると部屋は完全に閉じられ、現在のセッションに二度と復帰できなくなります。\n（あとで遊ぶ場合は、退出せずに「⏸️中断（セーブ）」を使用してください）\n本当によろしいですか？")) {
        await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
        setCurrentView("lobby"); setActiveRoom(null); setJoinedCharacter(null); setAiPlayersList([]); setMessages([]); await fetchData(); 
      }
    } else {
      if (confirm("自分のキャラクターをAIに引き継がせて離脱します。よろしいですか？")) {
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
    const isRecruiting = activeRoom.status === 'recruiting';

    if (isFinished || isRecruiting || (chatTab === "consult" && !consultWithAI)) {
      await pushMessage(activeRoom.id, { sender: "player", text: currentInput, type: (isFinished || isRecruiting) ? "ooc" : "ic", sceneId: myScene.id, charName: joinedCharacter.name, channel: chatTab });
      setInput(""); return;
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

  const rollDice = async (targetValue: number, label: string, is1d100: boolean = false) => {
    if(!myScene || !activeRoom || isLoading || !joinedCharacter) return;
    let res = 0; let isSuccess = false; let msgText = "";
    const rule = activeRoom.rule || "coc_jp";

    if (rule === "dnd") {
      res = Math.floor(Math.random() * 20) + 1;
      const modifier = Math.floor((targetValue - 10) / 2) || 0;
      const total = res + modifier;
      const dc = 12; 
      isSuccess = total >= dc;
      if (res === 20) isSuccess = true;
      if (res === 1) isSuccess = false;
      const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
      msgText = `🎲 ${label}判定 (1d20${modStr}) ➔ 出目: ${res} (計: ${total}) vs DC${dc} 【${isSuccess ? "成功" : "失敗"}】`;
      if (res === 20) msgText += " ✨クリティカル！";
      if (res === 1) msgText += " 💀ファンブル！";
    } else if (rule === "sw25") {
      const d1 = Math.floor(Math.random() * 6) + 1; const d2 = Math.floor(Math.random() * 6) + 1;
      res = d1 + d2;
      const bonus = Math.floor(targetValue / 6) || 0; 
      const total = res + bonus; const target = 10;
      isSuccess = total >= target;
      if (res === 12) isSuccess = true;
      if (res === 2) isSuccess = false;
      const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
      msgText = `🎲 ${label}判定 (2d6${bonusStr}) ➔ 出目: ${res}[${d1},${d2}] (計: ${total}) vs 目標${target} 【${isSuccess ? "成功" : "失敗"}】`;
      if (res === 12) msgText += " ✨クリティカル！";
      if (res === 2) msgText += " 💀ファンブル！";
    } else if (rule === "storytelling") {
      res = Math.floor(Math.random() * 6) + 1;
      isSuccess = res >= 4;
      msgText = `🎲 ${label}判定 (1d6) ➔ 出目: ${res} 【${isSuccess ? "成功" : "失敗"}】`;
      if (res === 6) msgText += " ✨奇跡の転機！";
    } else {
      if (is1d100) {
        res = Math.floor(Math.random() * 100) + 1;
        isSuccess = res <= targetValue;
        msgText = `🎲 ${label} (1d100 ≦ ${targetValue}%) ➔ 出目: ${res} 【${isSuccess ? "成功" : "失敗"}】`;
        if (rule === "coc_en" && res === 1) msgText += " ✨クリティカル！";
        if (rule === "coc_en" && res >= 96) msgText += " 💀ファンブル！";
      } else {
        const d1 = Math.floor(Math.random() * 6) + 1; const d2 = Math.floor(Math.random() * 6) + 1; const d3 = Math.floor(Math.random() * 6) + 1;
        res = d1 + d2 + d3;
        isSuccess = res <= targetValue;
        msgText = `🎲 ${label} (3d6 ≦ ${targetValue}) ➔ 出目: ${res} [${d1},${d2},${d3}] 【${isSuccess ? "成功" : "失敗"}】`;
      }
    }

    const isRecruiting = activeRoom.status === 'recruiting';
    const msgType = (chatTab === "gm" || isRecruiting) ? "ooc" : "ic";

    await pushMessage(activeRoom.id, { sender: "player", text: msgText, type: msgType, sceneId: myScene.id, charName: joinedCharacter.name, channel: chatTab });
    
    if (!isRecruiting && activeRoom.status === 'playing') {
        let promptSuffix = "この結果を踏まえてGMとして情景描写を行ってください。";
        if (chatTab === "gm") promptSuffix = "この結果を踏まえて、システム・ルールの裁定やヒントの提示を行ってください。";
        else if (chatTab === "consult") promptSuffix = "この結果を踏まえて、AI相棒としてリアクションを返してください。";
        await callAIGM(`【システム判定結果】${joinedCharacter.name}が${label}ロールを行いました。\n結果: ${msgText}\n${promptSuffix}`, chatTab, false);
    }
  };

  const generateSceneImage = async (promptText: string) => {
    if (!activeRoom || !myScene) return;
    try {
      const translationPrompt = ["以下の日本語の情景描写を、画像生成AI用のカンマ区切りの英語プロンプトに変換してください。","【絶対条件】","・文章ではなく、英単語のカンマ区切りで出力してください。","・不適切な画像が生成されるのを防ぐため、必ず最後に「SFW, fully clothed, masterpiece, high quality」を含めてください。","","情景描写：",promptText].join('\n');
      let englishPrompt = "";
      try { englishPrompt = await generateAITextWithPrompt(translationPrompt); } catch (err) { englishPrompt = `${promptText}, SFW, fully clothed, masterpiece, high quality`; }
      const prompt = encodeURIComponent(`${englishPrompt}, TRPG scene, cinematic lighting, dramatic atmosphere`);
      const seed = Math.floor(Math.random() * 100000);
      const url = `https://image.pollinations.ai/prompt/${prompt}?nologo=true&seed=${seed}&safe=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("AIサーバーが混雑しています");
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        await pushMessage(activeRoom.id, { sender: "gm", text: `【ホストが情景画像を生成しました】\n「${promptText}」`, type: "image", imageUrl: base64data, sceneId: myScene.id, channel: "story" });
      };
      reader.readAsDataURL(blob);
    } catch (err: any) { alert("画像の生成に失敗しました（AIサーバー混雑エラー等）。\n少し時間をおいて再度お試しください。"); }
  };

  const executeExport = async (title: string, sourceMessages: Message[], type: 'chat' | 'summary' | 'novel', options?: { archiveId?: string, modelName?: string, viewPoint?: 'third' | 'first', myCharacterName?: string, scenarioImage?: string, createdAt?: string, coPlayers?: string[], characters?: Character[] }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert("ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。"); return; }
    printWindow.document.write('<div style="padding: 20px; font-family: sans-serif; color: #333;">生成中...しばらくお待ちください。（AI執筆中の場合は数十秒かかることがあります）</div>');

    const targetMessages = sourceMessages.filter(m => m.channel !== 'gm');
    let contentHtml = "";

    const commonStyle = `
      <style>
        body { font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .page { background: #fff; max-width: 800px; margin: 20px auto; padding: 60px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px; }
        .page-break { page-break-before: always; margin-top: 40px; padding-top: 40px; border-top: 2px dashed #ccc; }
        @media print { body { background: #fff; } .page { box-shadow: none; margin: 0; padding: 0; } .page-break { border-top: none; padding-top: 0; margin-top: 0; } }
        .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; }
        .cover img { max-width: 80%; max-height: 50vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); margin-bottom: 30px; }
        .cover h1 { font-size: 36px; margin-bottom: 20px; color: #2c3e50; }
        .cover .meta { font-size: 16px; color: #666; line-height: 1.6; }
        
        .character-intro { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 40px; }
        .character-intro img { width: 140px; height: 140px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); flex-shrink: 0; }
        .character-info h3 { margin: 0 0 10px 0; font-size: 22px; color: #2c3e50; border-bottom: 2px solid #10b981; padding-bottom: 5px; }
        .character-info p { margin: 0; color: #444; font-size: 14px; white-space: pre-wrap; line-height: 1.7; }
        .no-image { width: 140px; height: 140px; background: #eee; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; flex-shrink: 0; }

        .novel-body { white-space: pre-wrap; line-height: 1.9; color: #333; font-size: 15px; }
        .novel-image { text-align: center; margin: 40px 0; }
        .novel-image img { max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      </style>
    `;

    const coverHtml = `
      <div class="cover">
        ${options?.scenarioImage ? `<img src="${options.scenarioImage}" />` : ''}
        <h1>${title}</h1>
        <div class="meta">
          <p>プレイ日時: ${options?.createdAt ? new Date(options.createdAt).toLocaleString() : '不明'}</p>
          <p>参加プレイヤー: ${options?.coPlayers?.length ? options.coPlayers.join(', ') : 'ソロプレイ'}</p>
        </div>
      </div>
    `;

    // ★ 古いデータの救済措置を含めたキャラクターHTML生成ロジック
    const generateCharsHtml = (introMap: Record<string, string> = {}) => {
      let charsToRender = options?.characters;

      // 古いアーカイブ等でキャラクター情報がない場合は、AIが抽出した introMap からダミーを構築する
      if (!charsToRender || charsToRender.length === 0) {
        const extractedNames = Object.keys(introMap);
        if (extractedNames.length === 0) return ''; // 万が一AIが紹介文を作らなかった場合はスキップ
        charsToRender = extractedNames.map(name => ({
          id: name,
          name: name,
          job: '探索者',
          personality: introMap[name],
          imageUrl: '',
          hp: 0, san: 0, str: 0, dex: 0, int: 0, con: 0, wis: 0, cha: 0,
          playerName: 'プレイヤー' // HNが不明なため仮置き
        }));
      }

      const chunkSize = 3;
      const chunks = [];
      for (let i = 0; i < charsToRender.length; i += chunkSize) {
        chunks.push(charsToRender.slice(i, i + chunkSize));
      }
      
      return chunks.map((chunk, chunkIdx) => `
        <div class="page-break">
          ${chunkIdx === 0 ? '<h2 style="text-align: center; margin-bottom: 40px; font-size: 24px; color: #2c3e50;">登場キャラクター</h2>' : ''}
          ${chunk.map(c => {
            // AIの出力と実際のキャラ名が少し違ってもマッチするように検索
            const matchedKey = Object.keys(introMap).find(k => k.includes(c.name) || c.name.includes(k));
            const introText = matchedKey ? introMap[matchedKey] : (c.personality || '情報なし');
            const playerName = c.playerName ? c.playerName : 'AI相棒';
            
            return `
              <div class="character-intro">
                ${c.imageUrl ? `<img src="${c.imageUrl}" />` : `<div class="no-image">No Image</div>`}
                <div class="character-info">
                  <h3>${c.name} <span style="font-size:14px; font-weight:normal; color:#666;">（PL: ${playerName}）</span></h3>
                  <p><strong>【特徴・活躍】</strong><br/>${introText}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `).join('');
    };

    if (type === 'chat') {
      const chatHtml = targetMessages.map(m => {
        if (m.type === 'image' && m.imageUrl) {
          return `<div style="margin-bottom: 12px; border-bottom: 1px dashed #eee; padding-bottom: 8px;"><strong style="color: #2c3e50;">AI GM (画像)</strong><br><img src="${m.imageUrl}" style="max-width: 300px; border-radius: 8px;" /><br><span style="white-space: pre-wrap; color: #34495e;">${m.text}</span></div>`;
        }
        const senderName = m.charName || (m.sender === "player" ? "プレイヤー" : m.sender === "gm" ? "AI GM" : "システム");
        const text = m.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim();
        if (!text) return "";
        return `<div style="margin-bottom: 12px; border-bottom: 1px dashed #eee; padding-bottom: 8px;"><strong style="color: #2c3e50;">${senderName}</strong><br><span style="white-space: pre-wrap; color: #34495e;">${text}</span></div>`;
      }).join('');
      
      // チャットログ出力時は introMap は空のまま（元の設定を使用）
      contentHtml = `
        ${commonStyle}
        <div class="page">
          ${coverHtml}
          ${generateCharsHtml()}
          <div class="page-break">
            <h2 style="text-align: center; margin-bottom: 40px; font-size: 24px; color: #2c3e50;">チャットログ</h2>
            ${chatHtml}
          </div>
        </div>
      `;
    } else {
      setIsExporting(true);
      
      let imageCounter = 0;
      const imagesList: string[] = [];

      const logTextForAI = targetMessages.map(m => {
        if (m.type === 'image' && m.imageUrl) {
          imagesList.push(m.imageUrl);
          imageCounter++;
          return `[IMAGE_ID: ${imageCounter}] (ここに情景画像が生成されました: ${m.text})`;
        }
        return `${m.charName || (m.sender === 'gm' ? 'GM' : 'システム')}: ${m.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim()}`;
      }).join('\n');

      const viewpointInstruction = options?.viewPoint === 'first' && options?.myCharacterName
        ? `1. 単調な事実の羅列を避け、五感を刺激する情景描写と心理描写を大幅に肉付けすること。また、【${options.myCharacterName}】の視点（一人称）で物語を描写すること。`
        : `1. 単調な事実の羅列を避け、五感を刺激する情景描写と心理描写を大幅に肉付けすること。神の視点（第三者視点）で物語を描写すること。`;

      // 過去データの救済用：登場キャラクターの名前をログから無理やり抽出してAIに紹介文を作らせる
      const uniqueCharNames = Array.from(new Set(targetMessages.filter(m => m.sender === 'player' || m.sender === 'ai_player').map(m => m.charName).filter(Boolean)));
      const charNamesStr = uniqueCharNames.length > 0 ? `登場キャラクター（${uniqueCharNames.join('、')}）` : '各キャラクター';

      const prompt = type === 'summary' 
        ? ["以下のTRPGセッションのチャットログを読み込み、物語のあらすじ・結末として分かりやすく要約してください。","※ログには「GMへの行動宣言」と「キャラクター同士の相談・会話」が含まれています。キャラクター同士の相談内容も物語の展開として要約に含めてください。"].join('\n')
        : [
            "以下のTRPGセッションのチャットログを元に、プロの小説家が書いたような臨場感あふれる【本格的なリプレイ小説】を執筆してください。",
            "",
            "【執筆の条件】",
            viewpointInstruction,
            "2. プレイヤー間の相談は魅力的な会話劇として昇華すること。",
            "3. ダイスロールの成否はドラマチックな演出に変換すること。",
            "4. 読者を惹きつける一つの完成された短編小説に仕上げること。",
            "5. 【重要】チャットログ内に [IMAGE_ID: X] というマーカーがあった場合、そのまま `[IMAGE_ID: X]` と出力すること。",
            `6. 【超重要】本編の前に、必ず以下のマーカーを使って${charNamesStr}の紹介文（設定とチャットログでのプレイスタイルを統合した100文字程度の要約）を全員分出力してください。`,
            "マーカーの形式： [CHAR_INTRO: キャラクター名] 紹介文",
            "7. 全員分の紹介文を出力し終えたら、必ず [NOVEL_START] というマーカーを置き、そこから本編を書き始めてください。"
          ].join('\n');
      
      try {
        const generatedText = await generateAITextWithPrompt(prompt + "\n\n【チャットログ】\n" + logTextForAI);
        
        let introMap: Record<string, string> = {};
        let finalNovelText = generatedText;

        if (generatedText.includes('[NOVEL_START]')) {
          const parts = generatedText.split('[NOVEL_START]');
          const introPart = parts[0];
          finalNovelText = parts[1].trim();

          const introRegex = /\[CHAR_INTRO:\s*(.+?)\]([\s\S]*?)(?=\[CHAR_INTRO:|$)/g;
          let m;
          while ((m = introRegex.exec(introPart)) !== null) {
            introMap[m[1].trim()] = m[2].trim();
          }
        }

        imagesList.forEach((imgUrl, idx) => {
          const imgTag = `</div><div class="novel-image"><img src="${imgUrl}" /></div><div class="novel-body">`;
          finalNovelText = finalNovelText.replace(new RegExp(`\\[IMAGE_ID:\\s*${idx + 1}\\]`, 'g'), imgTag);
        });

        contentHtml = `
          ${commonStyle}
          <div class="page">
            ${coverHtml}
            ${generateCharsHtml(introMap)}
            <div class="page-break">
              <h2 style="text-align: center; margin-bottom: 40px; font-size: 24px; color: #2c3e50;">本編</h2>
              <div class="novel-body">${finalNovelText}</div>
            </div>
          </div>
        `;

        if (options?.archiveId && type === 'novel' && options.modelName) {
          const archive = playArchives.find(a => a.id === options.archiveId);
          if (archive) {
            const updatedNovels = { ...(archive.novels || {}), [options.modelName]: contentHtml }; 
            await supabase.from('play_archives').update({ novels: updatedNovels }).eq('id', options.archiveId);
            setPlayArchives(prev => prev.map(a => a.id === options.archiveId ? { ...a, novels: updatedNovels } : a));
          }
        }
      } catch(e: any) { alert("エクスポート生成エラー: " + e.message); setIsExporting(false); printWindow.close(); return; }
      setIsExporting(false);
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} - ${type === 'chat' ? 'チャットログ' : type === 'summary' ? '要約データ' : 'リプレイ小説'}</title></head><body>${contentHtml}<script>setTimeout(() => { if('${type}' === 'chat') { window.print(); window.close(); } }, 500);</script></body></html>
    `);
    printWindow.document.close();
  };

  const exportToPDF = async (type: 'chat' | 'summary' | 'novel', viewPoint: 'third' | 'first' = 'third') => {
    if (!activeRoom) return;
    const endIndex = messages.findIndex(m => m.text.includes('[SCENARIO_END]'));
    const baseMessages = endIndex !== -1 ? messages.slice(0, endIndex + 1) : messages;

    const userIds = Object.keys(activeRoom.joined_users || {});
    const { data: profiles } = await supabase.from('profiles').select('id, handle_name').in('id', userIds);
    const profileMap: Record<string, string> = {};
    if (profiles) {
      profiles.forEach(p => { profileMap[p.id] = p.handle_name; });
    }

    const charactersWithPlayers = activeRoom.scenario?.presetCharacters.map(c => {
      const uid = Object.keys(activeRoom.joined_users || {}).find(k => activeRoom.joined_users![k] === c.id);
      return { ...c, playerName: uid ? profileMap[uid] : 'AI相棒' };
    }) || [];

    await executeExport(
      activeRoom.scenario?.title || "名称未設定", 
      baseMessages, 
      type, 
      {
        scenarioImage: activeRoom.scenario?.imageUrl,
        createdAt: new Date().toISOString(),
        coPlayers: Object.values(profileMap).filter(name => name !== currentUser?.handleName),
        characters: charactersWithPlayers,
        viewPoint: viewPoint,
        myCharacterName: joinedCharacter?.name
      }
    );
  };

  const saveToArchive = async () => {
    if (!currentUser || !activeRoom || !joinedCharacter) return;
    const endIndex = messages.findIndex(m => m.text.includes('[SCENARIO_END]'));
    const baseMessages = endIndex !== -1 ? messages.slice(0, endIndex + 1) : messages;

    const userIds = Object.keys(activeRoom.joined_users || {});
    const { data: profiles } = await supabase.from('profiles').select('id, handle_name').in('id', userIds);
    const profileMap: Record<string, string> = {};
    if (profiles) {
      profiles.forEach(p => { profileMap[p.id] = p.handle_name; });
    }
    const coPlayers = Object.values(profileMap).filter(name => name !== currentUser?.handleName);

    const charactersWithPlayers = activeRoom.scenario?.presetCharacters.map(c => {
      const uid = Object.keys(activeRoom.joined_users || {}).find(k => activeRoom.joined_users![k] === c.id);
      return { ...c, playerName: uid ? profileMap[uid] : 'AI相棒' };
    }) || [];

    const archiveData = { 
      user_id: currentUser.id, 
      scenario_title: activeRoom.scenario?.title || "不明なシナリオ", 
      scenario_image: activeRoom.scenario?.imageUrl || "", 
      character_name: joinedCharacter.name, 
      chat_logs: baseMessages,
      rule: activeRoom.rule,
      co_players: coPlayers,
      characters: charactersWithPlayers 
    };
    
    const { error } = await supabase.from('play_archives').insert(archiveData);
    if (error) { alert("書庫への保存に失敗しました: " + error.message); } 
    else {
      alert("プレイ履歴に保存しました！\nユーザーページからいつでも確認できます。");
    }
  };

  const updateInventory = async (newItems: string) => {
    if (!activeRoom || !currentUser) return;
    const newInventories = { ...activeRoom.inventories, [currentUser.id]: newItems };
    await supabase.from('rooms').update({ inventories: newInventories }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, inventories: newInventories });
  };

  const handleTabClick = (tab: ChatTab) => {
    setChatTab(tab); setUnreadIndicators(prev => ({ ...prev, [tab]: false }));
  };

  const leaveGameAndCreateRoom = async (scenario: Scenario) => {
    if (!activeRoom || !currentUser) return;
    const { data } = await supabase.from('rooms').select('joined_users').eq('id', activeRoom.id).single();
    if (data) {
      const newUsers = { ...data.joined_users };
      delete newUsers[currentUser.id];
      await supabase.from('rooms').update({ joined_users: newUsers }).eq('id', activeRoom.id);
    }
    setActiveRoom(null); setJoinedCharacter(null); setAiPlayersList([]); setMessages([]); setCurrentView("lobby");
    setRoomConfigModal({ scenario, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: "all" });
  };

  const callAIGM = async (extraUserContext?: string, targetTab: ChatTab = "story", isStarting: boolean = false) => {
    if (!activeRoom || !joinedCharacter || !myScene) return;
    if (!isStarting && activeRoom.status !== 'playing') return;
    setIsLoading(true);
    
    try {
      if (extraUserContext) await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'user', content: extraUserContext });
      const { data: memoryDataRaw } = await supabase.from('ai_memory').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: true });
      let currentMemory = memoryDataRaw || [];
      let currentSummary = activeRoom.current_summary || "";

      if (currentMemory.length > 30) {
        const logsToCompress = currentMemory.slice(0, currentMemory.length - 10);
        const recentLogs = currentMemory.slice(-10);
        const logText = logsToCompress.map(m => `${m.role === 'user' ? 'PL' : 'GM'}: ${m.content}`).join('\n');
        const compressionPrompt = ["あなたはTRPGの優秀な記録係です。以下の「現在のあらすじ」と「追加のチャットログ」を統合し、AI GMが今後の展開を処理するための【詳細な最新のあらすじ】を作成してください。","【絶対条件】","・重要な出来事、NPCとの会話結果、得たアイテムやヒント、PLの目的は絶対に漏らさないこと。","・システムやダイスの結果等のメタな情報は省略し、物語の進行を中心にまとめること。","","【現在のあらすじ】",currentSummary || "なし（最初の要約です）","","【追加のチャットログ】",logText].join('\n');
        try {
          currentSummary = await generateAITextWithPrompt(compressionPrompt);
          await supabase.from('rooms').update({ current_summary: currentSummary }).eq('id', activeRoom.id);
          setActiveRoom(prev => prev ? { ...prev, current_summary: currentSummary } : null);
          const idsToDelete = logsToCompress.map(m => m.id);
          if (idsToDelete.length > 0) await supabase.from('ai_memory').delete().in('id', idsToDelete);
          currentMemory = recentLogs;
        } catch(e) {}
      }

      const history = currentMemory.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      if (history.length === 0) history.push({ role: 'user', parts: [{ text: "セッションを開始してください。" }]});

      const aiPlayersText = aiPlayersList.length > 0 ? aiPlayersList.map(c => `・${c.name} (${c.genderOrRace || "性別不詳"}) | HP:${c.hp} SAN:${c.san}% STR:${c.str} DEX:${c.dex} INT:${c.int} CON:${c.con}\n  設定: ${c.personality}`).join("\n\n") : "なし（ソロプレイ）";
      const afkNames = (activeRoom.afk_users || []).map(uid => { const cId = activeRoom.joined_users?.[uid]; return activeRoom.scenario?.presetCharacters.find(c => c.id === cId)?.name; }).filter(Boolean).join(", ");
      const afkInstruction = afkNames ? `\n【AFK（離席中）のプレイヤー】\n${afkNames}\n※このプレイヤーは現在離席中なので、行動を促したり意見を求めたりしないでください。` : "";

      const inventoryTextLines: string[] = [];
      if (activeRoom.item_visibility && activeRoom.item_visibility !== 'none') {
        inventoryTextLines.push("","【現在の全キャラクターの所持アイテム】");
        activeRoom.scenario?.presetCharacters.forEach(c => {
           const items = activeRoom.inventories?.[c.id] || c.items || "特になし";
           inventoryTextLines.push(`・${c.name}: ${items}`);
        });
        inventoryTextLines.push("");
      }
      const inventoryText = inventoryTextLines.join('\n');

      let chapters: {title: string, content: string}[] = [];
      try {
        const parsed = JSON.parse(activeRoom.scenario?.plot || "");
        if (Array.isArray(parsed)) chapters = parsed;
      } catch(e) {
        chapters = [{ title: "本編", content: activeRoom.scenario?.plot || "" }];
      }
      
      const currentChapIndex = activeRoom.current_chapter_index || 0;
      const currentChapter = chapters[currentChapIndex] || chapters[chapters.length - 1];
      const isLastChapter = currentChapIndex >= chapters.length - 1;

      const chapterProgress = chapters.map((c, idx) => {
        if (idx < currentChapIndex) return `[クリア済] 第${idx + 1}章: ${c.title}`;
        if (idx === currentChapIndex) return `[★現在進行中] 第${idx + 1}章: ${c.title}`;
        return `[未到達（ネタバレ厳禁）] 第${idx + 1}章: ${c.title}`;
      }).join('\n');

      let scenarioPlotText = `【物語の全体構成（全${chapters.length}章）】\n${chapterProgress}\n\n【現在（第${currentChapIndex + 1}章）のプロット・台本】\n${currentChapter.content}`;

      let difficultyInstruction = "";
      switch (activeRoom.difficulty) {
        case "beginner": difficultyInstruction = "【難易度：初心者】超甘口の接待プレイです。失敗してもペナルティを与えないでください。30分以内でクリアできるよう誘導してください。"; break;
        case "easy": difficultyInstruction = "【難易度：簡単】判定が通りやすく、ヒントを多めに出してください。"; break;
        case "normal": difficultyInstruction = "【難易度：普通】成功と失敗のバランスを取り、標準的に進行してください。"; break;
        case "hard": difficultyInstruction = "【難易度：難しい】判定はやや厳しく、ヒントは減らし、失敗すると状況が悪化するようにしてください。"; break;
        case "pro": difficultyInstruction = "【難易度：プロ】判定はかなり厳しくし、ロストの危険も提示する本格的な進行を行ってください。"; break;
        case "oni": difficultyInstruction = "【難易度：鬼】ほぼ失敗前提の厳しい判定にし、生存自体が困難な容赦のない進行をしてください。"; break;
        default: difficultyInstruction = "【難易度：普通】成功と失敗のバランスを取り、標準的に進行してください。";
      }

      let ruleSpecLines: string[] = []; let gmStyleLines: string[] = [];
      switch (activeRoom.rule) {
        case 'dnd':
          ruleSpecLines = ["【ルール仕様：D&D風】", "- 判定：1d20＋能力値修正＋習熟ボーナス ≥ DC。", "- 戦闘：アクション映画のように派手。"];
          gmStyleLines = ["【GMの振る舞い：アクション映画の監督型GM】", "テンポ良く派手に爽快に。"]; break;
        case 'coc_en':
          ruleSpecLines = ["【ルール仕様：海外CoC風】", "- 判定：1d100 ≤ 技能値。", "- 描写：静かな恐怖。"];
          gmStyleLines = ["【GMの振る舞い：静かな恐怖を積み上げる語り部型KP】", "静か・淡々・不気味。"]; break;
        case 'sw25':
          ruleSpecLines = ["【ルール仕様：ソードワールド風】", "- 判定：2d6＋ボーナス ≥ 目標値。"];
          gmStyleLines = ["【GMの振る舞い：陽気な冒険案内人型GM】", "明るい・軽快・楽しい。"]; break;
        case 'storytelling':
          ruleSpecLines = ["【ルール仕様：ストーリーテリング系】", "- 判定：1d6（4以上成功）。"];
          gmStyleLines = ["【GMの振る舞い：文学的な語り手型GM】", "静か・繊細・内省的。"]; break;
        case 'coc_jp': default:
          ruleSpecLines = ["【ルール仕様：日本CoC風】", "- 判定：1d100 ≤ 技能値。"];
          gmStyleLines = ["【GMの振る舞い：ドラマ脚本家型KP】", "感情・関係性・葛藤を重視。"]; break;
      }
      const ruleSpec = ruleSpecLines.join('\n'); const gmStyle = gmStyleLines.join('\n');
      const diceBase = activeRoom.rule === 'dnd' ? '1d20' : activeRoom.rule === 'sw25' ? '2d6' : activeRoom.rule === 'storytelling' ? '1d6' : '1d100';

      let roleInstructionLines: string[] = [];
      if (targetTab === "story") {
        roleInstructionLines = [
          "【重要：GMの絶対ルール】",
          "1. PLたちが明確な「行動宣言」を出した時のみ物語を進行させてください。",
          `2. リスクを伴う行動には必ず判定（${diceBase}）を要求し、結果が出るまで描写を待機してください。`,
          "3. 【行動のヒント禁止】PLに具体的な選択肢を提示しないでください。（初心者難易度を除く）",
          "4. 【アイテムの厳格な管理（四次元ポケット禁止）】上記の【現在の全キャラクターの所持アイテム】に記載されていないアイテムを使おうとした場合は即座に却下してください。",
          "5. 【ダイスの自己処理禁止】GM自身がダイスを振らないでください。",
          "6. 誰かが行動した後は、必ず「〇〇さんはそう動きました。では、△△さんはどうしますか？」と他の人間PLに行動を促し、全員の行動が出揃うまで待機してください。",
          "7. 【AI相棒の自律ダイスロール】全員行動の際、AI相棒のターンになったら自律的にAI相棒の行動を宣言し、結果をシミュレートして「🎲 [名前]の〇〇判定 ➔ 出目: X 【成功/失敗】」と出力してください。",
          "8. 不自然な行動や間違ったアイテムの使用は容赦なく失敗扱い・状況悪化させてください。",
          `9. 想定プレイ時間は「約${activeRoom.scenario?.playTime || 60}分」です。ペース配分を意識し、早すぎる場合は障害を追加してください。`,
          "10. 【プロローグ（導入）について】セッション開始直後の導入フェーズでは、設定されたプロローグ情報があればそれに従い、無ければ本編プロットから推測して自動生成してください。",
          "【設定されたプロローグ】: " + (activeRoom.scenario?.prologue || "特になし"),
          "この導入部において、必ずプレイヤー全員が最低1回はダイス判定を行わなければならない状況を作ってください。",
          "11. 【エピローグとエンディング（最重要）】目的を達成しても、いきなり [SCENARIO_END] を出力しないでください。目的達成後は必ず「【エピローグ】」と明記し、これまでの展開を踏まえて相応しい結末を動的に生成し、事後処理を行わせてください。エピローグ内で必ずプレイヤー全員に最後のダイス判定を行わせる状況を作り、PLがエピローグでの行動を終えたと判断できたターンの最後にのみ [SCENARIO_END] を出力してください。",
          "12. 【所持アイテムの自動更新】探索等でアイテムを入手・消費した場合は、文章の最後に [INVENTORY_UPDATE: キャラクター名, アイテムA, アイテムB...] と出力してください。"
        ];

        if (!isLastChapter) {
           roleInstructionLines.push("13. 【チャプター進行（超重要）】現在のチャプターの目的が完全に達成された場合、必ず出力の最後に [CHAPTER_CLEAR] というタグを出力してください。");
        }

        if (activeRoom.is_trial) {
          roleInstructionLines.push(
            "【お試しプレイ専用指示（絶対厳守ルール）】",
            "このセッションは約10分程度のお試し版です。以下のルールを絶対に守ってください。",
            "1. 【ネタバレの完全禁止】物語の核心などのネタバレは一切行わないでください。",
            "2. 【ダイスロールの強制】必ずセッション内で1回はPLにダイス判定を行わせてください。",
            "3. 【クリフハンガーでの強制終了】一番物語が面白く盛り上がってきた絶頂のタイミングを見計らって、プレイヤーの行動を待たずにバッサリと物語を強制終了させてください。",
            "4. 終了の際は「――この先は本編でお楽しみください！」と期待を煽り、ターンの最後に必ず [SCENARIO_END] を出力してください。"
          );
        }
        if (isSplitMode && myScene.id !== 'scene_main') roleInstructionLines.push(`【チーム分割中の対応】この発言は【${myScene.name}】チームのものです。他チームの状況は考慮せず、勝手に合流させないでください。`);
        else roleInstructionLines.push("【別行動の提案】PLたちの意見が分かれた場合は、GMから積極的に別行動（チーム分け）を提案し、出力の最後に \"[SPLIT_PROPOSAL: 行動案A, 行動案B]\" のタグを出力してください。");
        roleInstructionLines.push(afkInstruction);

      } else if (targetTab === "consult") {
        scenarioPlotText = "【機密情報のため非公開（あなたはPLなので真相を知りません）】";
        roleInstructionLines = [
          "【重要：AIプレイヤーとしての振る舞い】",
          `1. あなたはAI相棒（${aiPlayersList.map(c=>c.name).join(", ")}）の立場で人間PLに返答してください。`,
          "2. 【メタ知識の禁止】真相や解法などのネタバレ・誘導を絶対に行わないでください。",
          "3. 【描写・進行の禁止】情景描写やGMのような進行は行わず、キャラクターとしての会話のみを出力してください。",
          "4. 状況に対して自然なリアクション（怯える、焦るなど）を人間らしく返してください。",
          (isSplitMode && myScene.id !== 'scene_main' ? "※現在別行動中です。同じチームにいるAI相棒だけが返答してください。" : "")
        ];
      } else if (targetTab === "gm") {
        roleInstructionLines = [
          "【重要：GMへのメタ質問対応】",
          "1. 物語は進めず、ルールの裁定やシステム的な回答のみを行ってください。",
          "2. 正しいクリア手順などのネタバレは自ら絶対に明かさないでください。",
          "3. 質問には簡潔に答え、頼まれていないアドバイスは行わないでください。",
          "4. ヒントを要求された場合は「SAN値を1d3減少させる必要があります。行動宣言タブでSANダイスを振ってください」と代償を提示し、AI自身がダイスを振らないでください。"
        ];
      }

      const roleInstruction = roleInstructionLines.join('\n');
      const sysPrompt = ["あなたはTRPGの優秀なAIシステムです。", `タイトル: ${activeRoom.scenario?.title}`, `世界観: ${activeRoom.scenario?.setting}`, `プロット: ${scenarioPlotText}`, "", "【これまでのあらすじ】", currentSummary || "まだセッションは始まったばかりだ。", "", `【人間PL】名前: ${joinedCharacter.name} (${joinedCharacter.genderOrRace || "性別不詳"}) / ステータス: HP:${joinedCharacter.hp} SAN:${joinedCharacter.san}% STR:${joinedCharacter.str} DEX:${joinedCharacter.dex} INT:${joinedCharacter.int} CON:${joinedCharacter.con}`, inventoryText, "【AI相棒】", aiPlayersText, "", ruleSpec, gmStyle, "", "【共通ルール】", difficultyInstruction, "HP・SAN値が減少・変動した場合は必ず出力の最後に [STATUS_UPDATE: キャラ名, HP:値, SAN:値] を出力してください。", "", roleInstruction].join('\n');

      const aiText = await generateAIResponse(sysPrompt, history);
      const splitMatch = aiText.match(/\[SPLIT_PROPOSAL:\s*(.+?)\]/);
      if (splitMatch) { setProposedTeams([]); generateSplitProposal(); }

      const statusRegex = /\[STATUS_UPDATE:\s*(.+?),\s*HP:\s*(\d+),\s*SAN:\s*(\d+)\]/g;
      let match;
      while ((match = statusRegex.exec(aiText)) !== null) {
         const targetName = match[1].trim().replace(/\s+/g, '');
         const newHp = parseInt(match[2], 10); const newSan = parseInt(match[3], 10);
         if (joinedCharacter && joinedCharacter.name.replace(/\s+/g, '').includes(targetName)) setJoinedCharacter(prev => prev ? { ...prev, hp: newHp, san: newSan } : null);
         setAiPlayersList(prev => prev.map(p => p.name.replace(/\s+/g, '').includes(targetName) ? { ...p, hp: newHp, san: newSan } : p));
      }

      const invRegex = /\[INVENTORY_UPDATE:\s*([^,]+),\s*(.+)\]/g;
      let invMatch;
      let newInventories = { ...(activeRoom.inventories || {}) };
      let invUpdated = false;
      while ((invMatch = invRegex.exec(aiText)) !== null) {
         const targetName = invMatch[1].trim().replace(/\s+/g, '');
         const newItems = invMatch[2].trim();
         const char = activeRoom.scenario?.presetCharacters.find(c => c.name.replace(/\s+/g, '').includes(targetName));
         if (char) { newInventories[char.id] = newItems; invUpdated = true; }
      }
      if (invUpdated) {
         await supabase.from('rooms').update({ inventories: newInventories }).eq('id', activeRoom.id);
         setActiveRoom(prev => prev ? { ...prev, inventories: newInventories } : null);
      }

      let cleanAiText = aiText.replace(/\[SPLIT_PROPOSAL:.*?\]/g, '').replace(/\[STATUS_UPDATE:.*?\]/g, '').replace(/\[INVENTORY_UPDATE:.*?\]/g, '').trim();
      let isChapterCleared = false;
      if (cleanAiText.includes('[CHAPTER_CLEAR]')) {
         cleanAiText = cleanAiText.replace(/\[CHAPTER_CLEAR\]/g, '').trim();
         isChapterCleared = true;
      }

      await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'assistant', content: aiText });
      const msgSender = targetTab === "consult" ? "ai_player" : "gm";
      await pushMessage(activeRoom.id, { sender: msgSender, text: cleanAiText, type: targetTab === "gm" ? "ooc" : "ic", sceneId: myScene?.id, charName: targetTab === "consult" ? "AI相棒" : "AI GM", channel: targetTab });

      if (isChapterCleared && !isLastChapter) {
         const nextIndex = currentChapIndex + 1;
         await supabase.from('rooms').update({ current_chapter_index: nextIndex }).eq('id', activeRoom.id);
         setActiveRoom(prev => prev ? { ...prev, current_chapter_index: nextIndex } : null);
         await pushMessage(activeRoom.id, { sender: "system", text: `【システム】チャプター「${currentChapter.title}」をクリアしました！\n物語は次章「${chapters[nextIndex].title}」へ進行します...`, type: "system", sceneId: myScene?.id, channel: "system" }, false);
         
         await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'user', content: `【システム情報：第${nextIndex+1}章（${chapters[nextIndex].title}）に突入しました。これまでの状況を踏まえ、次の展開を描写してください】` });
      }

    } catch (err: any) { alert(err.message); await pushMessage(activeRoom.id, { sender: "system", text: `（システムエラー: ${err.message}）`, type: "system", sceneId: myScene?.id, channel: "system" }, false); } finally { setIsLoading(false); }
  };

  const unreadCount = myNotifications.filter(n => !n.isRead).length;
  const isChatDisabled = Boolean(isLoading || (isSplitMode && myScene && myScene.isMerged === true && chatTab !== 'consult'));

  return (
    <main className="h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {currentView === "library" && currentUser && (
        <LibraryView 
          currentUser={currentUser} 
          playArchives={playArchives} 
          setCurrentView={setCurrentView} 
          executeExport={executeExport} 
          isExporting={isExporting} 
        />
      )}

      {currentView === "userProfile" && currentUser && (
        <UserProfileView 
          currentUser={currentUser} 
          targetUserId={targetUserId} 
          setCurrentView={setCurrentView} 
          executeExport={executeExport} 
          isExporting={isExporting} 
          allScenarios={scenarios} 
          updateProfile={updateProfile}
        />
      )}

      {currentView === "admin" && currentUser?.isAdmin && <AdminView isMaintenance={isMaintenance} toggleMaintenance={toggleMaintenance} reports={reports} allUsers={allUsers} scenarios={scenarios} resolveReport={resolveReport} setBanTargetUser={setBanTargetUser} setBanReason={setBanReason} setBanTargetScenario={setBanTargetScenario} setScenarioBanReason={setScenarioBanReason} unbanScenarioFromAppeal={unbanScenarioFromAppeal} userSearchQuery={userSearchQuery} setUserSearchQuery={setUserSearchQuery} toggleAdminStatus={toggleAdminStatus} scenarioSearchQuery={scenarioSearchQuery} setScenarioSearchQuery={setScenarioSearchQuery} setCurrentView={setCurrentView} executeCreateTester={executeCreateTester} />}
      {currentView === "banned" && <BannedView handleLogout={handleLogout} />}
      {currentView === "maintenance" && <MaintenanceView handleLogout={handleLogout} />}
      
      {currentView === "login" && <LoginView email={email} setEmail={setEmail} password={password} setPassword={setPassword} authLoading={authLoading} handleEmailAuth={handleEmailAuth} handleGoogleAuth={handleGoogleAuth} setCurrentView={setCurrentView} isMaintenance={isMaintenance} />}
      {currentView === "signup" && <SignupView email={email} setEmail={setEmail} password={password} setPassword={setPassword} authLoading={authLoading} handleEmailSignUp={handleEmailSignUp} handleGoogleAuth={handleGoogleAuth} setCurrentView={setCurrentView} isMaintenance={isMaintenance} />}
      
      {currentView === "onboarding" && <OnboardingView authLoading={authLoading} handleProfileSetup={handleProfileSetup} handleLogout={handleLogout} email={email} />}

      {currentView === "lobby" && currentUser && (
        <LobbyView 
          currentUser={currentUser} handleLogout={handleLogout} setShowMailbox={setShowMailbox} unreadCount={unreadCount} secretRoomIdSearch={secretRoomIdSearch} setSecretRoomIdSearch={setSecretRoomIdSearch} rooms={rooms} searchedSecretRoom={searchedSecretRoom} setSearchedSecretRoom={setSearchedSecretRoom} executeJoinRoom={executeJoinRoom} availableRooms={availableRooms} spectateRoom={spectateRoom} setEditingScenario={setEditingScenario} setCurrentView={setCurrentView} createdScenarios={createdScenarios} deleteScenario={deleteScenario} setRoomConfigModal={setRoomConfigModal} fetchAdminData={fetchAdminData} startTrialPlay={(scenario) => setAdModal({ isOpen: true, step: 1, scenario })} availableScenarios={availableScenarios} openUserProfile={openUserProfile} setScenarioAppealTarget={setScenarioAppealTarget}
        />
      )}
      
      {currentView === "scenarioEdit" && editingScenario && <ScenarioEditView editingScenario={editingScenario} setEditingScenario={setEditingScenario} editingCharIndex={editingCharIndex} setEditingCharIndex={setEditingCharIndex} saveScenario={saveScenario} setCurrentView={setCurrentView} />}
      
      {currentView === "game" && activeRoom && myScene && (
        <GameView 
          activeRoom={activeRoom} myScene={myScene} currentUser={currentUser!} joinedCharacter={joinedCharacter} leaveGame={leaveGame} setReportTarget={setReportTarget as React.Dispatch<React.SetStateAction<{type: 'user' | 'scenario' | 'room', id: string, name: string, roomId?: string, scenarioId?: string, scenarioName?: string, availableUsers?: { id: string, name: string }[]} | null>>} rollDice={rollDice} startGame={startGame} startSplitting={startSplitting} isSplitMode={isSplitMode} chatTab={chatTab} messages={messages} isLoading={isLoading} isScenarioEnded={isScenarioEnded} setCurrentView={setCurrentView} endGame={endGame} input={input} setInput={setInput} handleSend={handleSend} handleTabClick={handleTabClick} unreadIndicators={unreadIndicators} consultWithAI={consultWithAI} setConsultWithAI={setConsultWithAI} isChatDisabled={isChatDisabled} mergeTeam={mergeTeam} executeMergeAll={executeMergeAll} generateSceneImage={generateSceneImage} proposedTeams={proposedTeams} setProposedTeams={setProposedTeams} isGeneratingSplit={isGeneratingSplit} generateSplitProposal={generateSplitProposal} finishSplitting={finishSplitting} cancelSplitting={cancelSplitting} togglePauseRoom={togglePauseRoom} toggleAFK={toggleAFK} triggerAutoAction={triggerAutoAction} updateInventory={updateInventory} openRoomConfigModal={leaveGameAndCreateRoom} aiPlayersList={aiPlayersList} 
        />
      )}
      
      {currentView === "evaluation" && activeRoom && (
        <EvaluationView 
          activeRoom={activeRoom} messages={messages} ratingScenario={ratingScenario} setRatingScenario={setRatingScenario} ratingGM={ratingGM} setRatingGM={setRatingGM} submitEvaluation={submitEvaluation} exportToPDF={exportToPDF} isExporting={isExporting} saveToArchive={saveToArchive} currentUser={currentUser!} addFriend={addFriend} openUserProfile={openUserProfile}
        />
      )}

      {adModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-pink-500/50 rounded-xl p-8 w-full max-w-sm shadow-2xl text-center space-y-6">
            <h3 className="text-xl font-bold text-pink-400">📺 広告を視聴してプレイ</h3>
            <div className="h-32 bg-slate-900 border border-slate-700 flex items-center justify-center rounded">
              <span className="text-slate-500 font-bold animate-pulse">動画広告が再生されています...<br/>({adModal.step}/3)</span>
            </div>
            {adModal.step <= 3 ? <button onClick={() => { if(adModal.step === 3) executeTrialPlay(); else setAdModal({...adModal, step: adModal.step + 1}); }} className="w-full bg-pink-600 hover:bg-pink-500 py-3 rounded text-sm font-bold text-white shadow-lg">{adModal.step === 3 ? "お試しプレイを開始する！" : "次の広告へ進む"}</button> : null}
            <button onClick={() => setAdModal({ isOpen: false, step: 0, scenario: null })} className="text-xs text-slate-400 hover:text-white underline">キャンセル</button>
          </div>
        </div>
      )}

      {reportTarget && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-700/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-4">🚩 通報する</h3>
            {reportTarget.roomId ? (
              <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-1">通報対象を選択</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" onChange={(e) => { const val = e.target.value; if (val === 'room') { setReportTarget({...reportTarget, type: 'room', id: reportTarget.roomId!, name: 'この部屋の進行・チャット全般'}); } else if (val === 'scenario') { setReportTarget({...reportTarget, type: 'scenario', id: reportTarget.scenarioId!, name: `シナリオ: ${reportTarget.scenarioName}`}); } else { const user = reportTarget.availableUsers?.find(u => u.id === val); if (user) setReportTarget({...reportTarget, type: 'user', id: user.id, name: `プレイヤー: ${user.name}`}); } }} value={reportTarget.type === 'user' ? reportTarget.id : reportTarget.type}>
                  <option value="room">この部屋の進行・チャット全般</option><option value="scenario">シナリオの不適切・規約違反</option>{reportTarget.availableUsers?.map(u => <option key={u.id} value={u.id}>プレイヤー: {u.name} を通報</option>)}
                </select>
              </div>
            ) : <p className="text-xs text-slate-400 mb-4">対象: {reportTarget.name}</p>}
            <div className="space-y-3 mb-4"><textarea value={reportReason} onChange={e=>setReportReason(e.target.value)} placeholder="不適切な発言や、規約違反の内容を詳しく記入してください。（対象のログも一緒に運営に送信されます）" className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white" /></div>
            <div className="flex gap-4"><button onClick={() => { setReportTarget(null); setReportReason(""); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button><button onClick={submitUserReport} disabled={!reportReason.trim()} className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-red-900/50">運営に送信する</button></div>
          </div>
        </div>
      )}

      {scenarioAppealTarget && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-amber-700/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-amber-400 mb-2">📝 再審査（修正完了）の申請</h3>
            <p className="text-xs text-slate-400 mb-4">対象シナリオ: {scenarioAppealTarget.title}</p>
            <div className="space-y-3 mb-4"><textarea value={scenarioAppealText} onChange={e=>setScenarioAppealText(e.target.value)} placeholder="修正した箇所や、非公開措置へのコメントを入力してください。" className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white" /></div>
            <div className="flex gap-4"><button onClick={() => { setScenarioAppealTarget(null); setScenarioAppealText(""); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button><button onClick={submitScenarioAppeal} disabled={!scenarioAppealText.trim()} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-amber-900/50">運営に申請を送信する</button></div>
          </div>
        </div>
      )}

      {banTargetScenario && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">⚙️ シナリオの管理措置</h3>
            <p className="text-xs text-slate-400 mb-4">対象: {banTargetScenario.title}</p>
            <div className="space-y-3 mb-4"><textarea value={scenarioBanReason} onChange={e=>setScenarioBanReason(e.target.value)} placeholder="措置の理由を入力してください（作者にメールで通知されます）" className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white" /></div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                {!banTargetScenario.isBanned ? <button onClick={() => executeScenarioBan('soft')} disabled={!scenarioBanReason.trim()} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg">一時非公開にする</button> : <button onClick={() => executeScenarioBan('unban')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded text-sm font-bold shadow-lg">非公開を解除する</button>}
                <button onClick={() => executeScenarioBan('hard')} disabled={!scenarioBanReason.trim()} className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg">完全に削除する</button>
              </div>
              <button onClick={() => setBanTargetScenario(null)} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold mt-2">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {banTargetUser && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-700/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-red-500 mb-2">⛔ ユーザーをBANする</h3>
            <p className="text-xs text-slate-400 mb-4">対象: {banTargetUser.handleName} ({banTargetUser.email})</p>
            <div className="space-y-3 mb-4"><textarea value={banReason} onChange={e=>setBanReason(e.target.value)} placeholder="通報ログ・BANの理由を入力してください" className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white" /></div>
            <div className="flex gap-4"><button onClick={() => setBanTargetUser(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button><button onClick={executeBan} disabled={!banReason.trim()} className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-red-900/50">BANを実行する</button></div>
          </div>
        </div>
      )}

      {showMailbox && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
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

      {roomConfigModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-emerald-700/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">🚪 部屋の作成: {roomConfigModal.scenario.title}</h3>
            <div className="space-y-4 mb-6">
              <div><label className="text-xs text-slate-400 block mb-1">使用するキャラクター <span className="text-red-400">*</span></label><select value={roomConfigModal.charId} onChange={(e) => setRoomConfigModal({...roomConfigModal, charId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"><option value="" disabled>選択してください</option>{roomConfigModal.scenario.presetCharacters?.map(c => <option key={c.id} value={c.id}>{c.name} ({c.job})</option>)}</select></div>
              <div><label className="text-xs text-slate-400 block mb-1">ゲームルール（システム）</label><select value={roomConfigModal.rule} onChange={(e) => setRoomConfigModal({...roomConfigModal, rule: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"><option value="coc_jp">🟩 日本クトゥルフ風（ドラマ・探索重視 / 1d100）</option><option value="coc_en">🟦 海外クトゥルフ風（シビア・ホラー / 1d100）</option><option value="dnd">🟥 D&D風（ヒロイック・ファンタジー / 1d20）</option><option value="sw25">🟨 ソードワールド風（明るい冒険 / 2d6）</option><option value="storytelling">🟪 ストーリーテリング（文学的・演出重視 / 1d6）</option></select></div>
              <div><label className="text-xs text-slate-400 block mb-1">難易度</label><select value={roomConfigModal.difficulty} onChange={(e) => setRoomConfigModal({...roomConfigModal, difficulty: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"><option value="beginner">⬜ 初心者（接待GM / 手取り足取り30分限定）</option><option value="easy">🟩 簡単（やさしいGM / 判定が通りやすい）</option><option value="normal">🟦 普通（標準GM / 一般的なバランス）</option><option value="hard">🟧 難しい（厳しめGM / ヒント少なめ）</option><option value="pro">🟥 プロ（本格派GM / ロストの危険あり）</option><option value="oni">🟪 鬼（容赦ないGM / 死ぬ覚悟で挑むモード）</option></select></div>
              <div><label className="text-xs text-slate-400 block mb-1">公開設定</label><div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input type="radio" checked={roomConfigModal.privacy === 'open'} onChange={() => setRoomConfigModal({...roomConfigModal, privacy: 'open'})} /> 🔓 オープン（誰でも観戦可能）</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={roomConfigModal.privacy === 'secret'} onChange={() => setRoomConfigModal({...roomConfigModal, privacy: 'secret'})} /> 🔒 シークレット（IDを知る人のみ）</label></div></div>
              <div><label className="text-xs text-slate-400 block mb-1">アイテム表示機能</label><select value={roomConfigModal.itemVisibility} onChange={(e) => setRoomConfigModal({...roomConfigModal, itemVisibility: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"><option value="none">非表示</option><option value="self">自分の所持品のみ表示</option><option value="all">パーティー全員の所持品を表示</option></select></div>
              <div><label className="text-xs text-slate-400 block mb-1 mt-2">ひとことメッセージ</label><input type="text" value={roomConfigModal.message} onChange={(e) => setRoomConfigModal({...roomConfigModal, message: e.target.value})} placeholder="例：初心者歓迎！ゆっくり遊びましょう" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" /></div>
            </div>
            <div className="flex gap-4"><button onClick={() => setRoomConfigModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button><button onClick={executeCreateRoom} disabled={!roomConfigModal.charId} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-emerald-900/50">作成して入室</button></div>
          </div>
        </div>
      )}
    </main>
  );
}