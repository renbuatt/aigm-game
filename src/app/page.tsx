"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { generateAIResponse, generateAITextWithPrompt } from "../lib/ai";
import { 
  ViewState, UserProfile, Notification, BanAppeal, Report, 
  Character, Scenario, Scene, Room, Message, ChatTab, PlayArchive 
} from "../types";

import LoginView from "../components/views/LoginView";
import BannedView from "../components/views/BannedView";
import MaintenanceView from "../components/views/MaintenanceView";
import EvaluationView from "../components/views/EvaluationView";
import AdminView from "../components/views/AdminView";
import ScenarioEditView from "../components/views/ScenarioEditView";
import LobbyView from "../components/views/LobbyView";
import GameView from "../components/views/GameView";
import MyPageView from "../components/views/MyPageView";

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

  const [splitSuggestions, setSplitSuggestions] = useState<string[]>([]);
  const [proposedTeams, setProposedTeams] = useState<{id: string, action: string, members: string[], leader: string}[]>([]);
  const [isGeneratingSplit, setIsGeneratingSplit] = useState(false);

  const [ratingScenario, setRatingScenario] = useState<number>(5);
  const [ratingGM, setRatingGM] = useState<number>(5);
  const [isMaintenance, setIsMaintenance] = useState(false);
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [myNotifications, setMyNotifications] = useState<Notification[]>([]);
  const [showMailbox, setShowMailbox] = useState(false);
  
  const [playArchives, setPlayArchives] = useState<PlayArchive[]>([]);

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

  const [roomConfigModal, setRoomConfigModal] = useState<{ scenario: Scenario, charId: string, privacy: 'open'|'secret', message: string, difficulty: any, rule: any } | null>(null);
  const [secretRoomIdSearch, setSecretRoomIdSearch] = useState("");
  const [searchedSecretRoom, setSearchedSecretRoom] = useState<Room | null>(null);

  const [adModal, setAdModal] = useState<{ isOpen: boolean, step: number, scenario: Scenario | null }>({ isOpen: false, step: 0, scenario: null });
  
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
    if (activeRoom && isSplitMode && currentUser?.id === activeRoom.host_id && activeRoom.status === 'playing') {
      const nonMainScenes = activeRoom.scenes.filter(s => s.id !== 'scene_main');
      if (nonMainScenes.length > 0 && nonMainScenes.every(s => s.isMerged)) {
        executeMergeAll();
      }
    }
  }, [activeRoom?.scenes, activeRoom?.status, activeRoom?.host_id, currentUser?.id, isSplitMode]);

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
        purchasedTickets: d.purchased_tickets || {}, isBanned: d.is_banned || false, playTime: d.play_time || 60,
        isTrialOk: d.is_trial_ok || false 
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
        current_summary: r.current_summary || "",
        difficulty: r.difficulty || "normal",
        rule: r.rule || "coc_jp",
        is_paused: r.is_paused || false,
        afk_users: r.afk_users || [],
        is_trial: r.is_trial || false 
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
      profileData = { id: data.id, handleName: data.handle_name, avatarUrl: data.avatar_url, bio: data.bio, discordId: data.discord_id, ratingSum: data.rating_sum || 0, ratingCount: data.rating_count || 0, isAdmin: data.is_admin || false, isTester: data.is_tester || false, isBanned: data.is_banned || false, email: data.email };
      if (data.email !== emailStr) await supabase.from('profiles').update({ email: emailStr }).eq('id', userId);
    } else {
      const newProfile = { id: userId, handle_name: emailStr.split("@")[0], avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", discord_id: "", rating_sum: 0, rating_count: 0, is_admin: false, is_tester: false, is_banned: false, email: emailStr };
      await supabase.from('profiles').insert(newProfile);
      profileData = { id: userId, handleName: newProfile.handle_name, avatarUrl: newProfile.avatar_url, bio: newProfile.bio, discordId: newProfile.discord_id, ratingSum: 0, ratingCount: 0, isAdmin: false, isTester: false, isBanned: false, email: emailStr };
    }
    setCurrentUser(profileData);
    await fetchNotifications(userId);

    const { data: archiveData } = await supabase.from('play_archives').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (archiveData) {
      setPlayArchives(archiveData.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        scenarioTitle: d.scenario_title,
        scenarioImage: d.scenario_image,
        characterName: d.character_name,
        chatLogs: d.chat_logs,
        createdAt: d.created_at
      })));
    }

    if (!profileData.isBanned && (!currentMaintenance || profileData.isAdmin || profileData.isTester)) {
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
  
  const togglePauseRoom = async () => {
    if (!activeRoom) return;
    const newStatus = !activeRoom.is_paused;
    await supabase.from('rooms').update({ is_paused: newStatus }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, is_paused: newStatus });
    await pushMessage(activeRoom.id, { 
      sender: "system", 
      text: newStatus ? "【システム】セッションを中断（セーブ）しました。再開するまでAI GMは停止し、タイマーは進みません。" : "【システム】セッションを再開しました！", 
      type: "system", 
      channel: "system" 
    });
  };

  const toggleAFK = async (userId: string, forceRemove: boolean = false) => {
    if (!activeRoom) return;
    let newAfk = [...(activeRoom.afk_users || [])];
    if (forceRemove) {
      newAfk = newAfk.filter(id => id !== userId);
    } else {
      if (newAfk.includes(userId)) {
        newAfk = newAfk.filter(id => id !== userId);
      } else {
        newAfk.push(userId);
      }
    }
    await supabase.from('rooms').update({ afk_users: newAfk }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, afk_users: newAfk });
    
    const cId = activeRoom.joined_users?.[userId];
    const charName = activeRoom.scenario?.presetCharacters.find(c => c.id === cId)?.name || "プレイヤー";
    const msg = forceRemove ? `【システム】${charName}が復帰しました。` : (newAfk.includes(userId) ? `【システム】${charName}が離席（AFK）しました。` : `【システム】${charName}が復帰しました。`);
    await pushMessage(activeRoom.id, { sender: "system", text: msg, type: "system", channel: "system" }, false); 
  };

  const triggerAutoAction = async () => {
    if (!activeRoom || activeRoom.is_paused || activeRoom.status !== 'playing' || isScenarioEnded) return;
    const extraUserContext = "【システムコマンド：タイムアウト自動行動】\n" +
      "最後の行動から5分間、PLからの入力がありませんでした。\n" +
      "物語を停滞させないため、現在AFKではないキャラクター（およびAI相棒）の行動を" +
      "AI GMが自動で決定・描写し、事態を強制的に前進させてください。\n" +
      "必要であればダイスロール結果もAI自身が捏造して構いません。";
    await callAIGM(extraUserContext, "story");
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
      play_time: editingScenario.playTime || 60,
      is_trial_ok: editingScenario.isTrialOk || false
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
      reporter_id: currentUser.id, 
      target_type: reportTarget.type, 
      target_id: reportTarget.id, 
      room_id: reportTarget.roomId || null,
      reason: reportReason
    });
    if (!error) { 
      alert("運営に通報を送信しました。ご協力ありがとうございます。"); 
      setReportTarget(null); 
      setReportReason(""); 
    } 
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

  const executeCreateTester = async (testerEmail: string, testerPass: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email: testerEmail, password: testerPass });
      if (error) throw error;
      
      if (data.user) {
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          handle_name: testerEmail.split("@")[0],
          avatar_url: DEFAULT_AVATAR,
          is_tester: true,
          is_admin: false,
          email: testerEmail
        });
        if (upsertError) throw upsertError;

        alert("テスターアカウントを発行しました！\n\n※認証の仕様上、管理者セッションが一度切断されます。お手数ですが、再度「管理者アカウント」でログインし直してください。");
        await handleLogout();
      }
    } catch (err: any) {
      alert("テスターアカウントの作成に失敗しました: " + err.message);
    }
  };

  const fetchAdminData = async () => {
    const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (usersData) { setAllUsers(usersData.map((d: any) => ({ id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id, ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0, isAdmin: d.is_admin || false, isTester: d.is_tester || false, isBanned: d.is_banned || false, email: d.email }))); }
    const { data: appealsData } = await supabase.from('ban_appeals').select('*').order('created_at', { ascending: false });
    if (appealsData) { setBanAppeals(appealsData.map((d: any) => ({ id: d.id, userId: d.user_id, reason: d.reason, appealText: d.appeal_text, status: d.status, createdAt: d.created_at }))); }
    const { data: reportsData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (reportsData) { 
      setReports(reportsData.map((d: any) => ({ 
        id: d.id, reporterId: d.reporter_id, targetType: d.target_type, targetId: d.target_id, 
        roomId: d.room_id || null,
        reason: d.reason, status: d.status, createdAt: d.created_at 
      }))); 
    }
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
  const markNotificationAsRead = async (notifId: string) => { await supabase.from('notifications').update({ is_read: true }).eq('id', notifId); setMyNotifications(myNotifications.map(n => n.id === notifId ? { ...n, isRead: true } : n)); };

  const startSplitting = async () => {
    if (!activeRoom) return;
    await supabase.from('rooms').update({ status: 'splitting' }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, status: 'splitting', scenes: [{ id: 'scene_main', name: 'メインルーム', memberIds: [] }] });
    
    setProposedTeams([]);
    generateSplitProposal();
  };

  const generateSplitProposal = async () => {
    if (!activeRoom) return;
    setIsGeneratingSplit(true);
    try {
      const { data: memoryData } = await supabase.from('ai_memory')
        .select('*')
        .eq('room_id', activeRoom.id)
        .order('created_at', { ascending: false })
        .limit(15);
      
      const recentLogs = memoryData?.reverse().map(m => `${m.role === 'user' ? 'PL' : 'GM'}: ${m.content}`).join('\n') || "";
      const chars = activeRoom.scenario?.presetCharacters.filter(c => Object.values(activeRoom.joined_users || {}).includes(c.id)).map(c => `{"id": "${c.id}", "name": "${c.name}"}`).join(", ") || "";

      const prompt = "あなたはTRPGのシステムAIです。以下の「現在参加しているキャラクター」と「直近のチャットログ」を分析し、物語の展開上、最も自然な【チーム分け（2つ以上のグループへの分割）の構成案】を作成してください。\n" +
        "【参加キャラクター】\n" + chars + "\n\n【直近のログ】\n" + recentLogs + "\n\n" +
        "【出力形式（絶対遵守）】\n必ず以下のJSONフォーマットのみを出力してください。余計な文章やマークダウン記号は一切含めないでください。\n" +
        '{"teams": [{"action": "目的A（例：2階を探索する）", "members": ["キャラID1", "キャラID2"]}, {"action": "目的B", "members": ["キャラID3"]}]}';
      
      const aiResponse = await generateAITextWithPrompt(prompt);
      const jsonStr = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      
      if (parsed && parsed.teams) {
         setProposedTeams(parsed.teams.map((t: any) => ({ 
           id: `team_${Date.now()}_${Math.random()}`, 
           action: t.action, 
           members: t.members, 
           leader: t.members[0] || "" 
         })));
      } else {
         setProposedTeams([{ id: `team_${Date.now()}`, action: "", members: [], leader: "" }]);
      }
    } catch (e) {
      console.error(e);
      setProposedTeams([{ id: `team_${Date.now()}`, action: "", members: [], leader: "" }]);
    } finally {
      setIsGeneratingSplit(false);
    }
  };

  const finishSplitting = async () => {
    if (!activeRoom) return;
    
    const validTeams = proposedTeams.filter(t => t.action && t.members.length > 0);
    if (validTeams.length === 0) { alert("有効なチームがありません。"); return; }
    
    for (const t of validTeams) {
      if (!t.members.includes(joinedCharacter?.id || "") && !t.leader) {
        alert("ホストが含まれないチームにはリーダーを指定してください。");
        return;
      }
    }

    const newScenes: Scene[] = [
      { id: 'scene_main', name: 'メインルーム', memberIds: [] },
      ...validTeams.map(t => ({
        id: t.id,
        name: t.action,
        memberIds: t.members,
        leaderId: t.leader,
        isMerged: false
      }))
    ];

    await supabase.from('rooms').update({ scenes: newScenes, status: 'playing' }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, scenes: newScenes, status: 'playing' });
    await pushMessage(activeRoom.id, { sender: "gm", text: `【システム】チーム分けが完了しました！各チームごとに独立して行動・相談を行ってください。`, type: "system", sceneId: "scene_main", channel: "system" });
  };

  const cancelSplitting = async () => {
    if (!activeRoom) return;
    await supabase.from('rooms').update({ status: 'playing' }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, status: 'playing' });
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
    
    const extraUserContext = `【システムコマンド】全チームの別行動が終了し、一箇所に合流しました。これまでの各チームの報告を踏まえ、合流時の情景描写と今後の展開を提示してください。`;
    await callAIGM(extraUserContext, "story");
  };

  const callAIGM = async (extraUserContext?: string, targetTab: ChatTab = "story", isStarting: boolean = false) => {
    if (!activeRoom || !joinedCharacter || !myScene) return;
    if (!isStarting && activeRoom.status !== 'playing') return;
    setIsLoading(true);
    
    try {
      if (extraUserContext) {
        await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'user', content: extraUserContext });
      }

      const { data: memoryDataRaw } = await supabase.from('ai_memory')
        .select('*')
        .eq('room_id', activeRoom.id)
        .order('created_at', { ascending: true });

      let currentMemory = memoryDataRaw || [];
      let currentSummary = activeRoom.current_summary || "";

      if (currentMemory.length > 30) {
        const logsToCompress = currentMemory.slice(0, currentMemory.length - 10);
        const recentLogs = currentMemory.slice(-10);
        
        const logText = logsToCompress.map(m => `${m.role === 'user' ? 'PL' : 'GM'}: ${m.content}`).join('\n');
        const compressionPrompt = "あなたはTRPGの優秀な記録係です。以下の「現在のあらすじ」と「追加のチャットログ」を統合し、AI GMが今後の展開を処理するための【詳細な最新のあらすじ】を作成してください。\n" +
          "【絶対条件】\n" +
          "・重要な出来事、NPCとの会話結果、得たアイテムやヒント、PLの目的は絶対に漏らさないこと。\n" +
          "・システムやダイスの結果等のメタな情報は省略し、物語の進行を中心にまとめること。\n\n" +
          "【現在のあらすじ】\n" +
          (currentSummary || "なし（最初の要約です）") + "\n\n" +
          "【追加のチャットログ】\n" +
          logText;
        
        try {
          currentSummary = await generateAITextWithPrompt(compressionPrompt);
          await supabase.from('rooms').update({ current_summary: currentSummary }).eq('id', activeRoom.id);
          setActiveRoom(prev => prev ? { ...prev, current_summary: currentSummary } : null);
          
          const idsToDelete = logsToCompress.map(m => m.id);
          if (idsToDelete.length > 0) {
            await supabase.from('ai_memory').delete().in('id', idsToDelete);
          }
          currentMemory = recentLogs;
        } catch(e) {
          console.error("あらすじの圧縮処理に失敗しました", e);
        }
      }

      const history = currentMemory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      if (history.length === 0) {
        history.push({ role: 'user', parts: [{ text: "セッションを開始してください。" }]});
      }

      const aiPlayersText = aiPlayersList.length > 0 
        ? aiPlayersList.map(c => `・${c.name} (${c.genderOrRace || "性別不詳"} / ${c.job}) | HP:${c.hp} SAN:${c.san}% STR:${c.str} DEX:${c.dex} INT:${c.int} CON:${c.con}\n  設定: ${c.personality}`).join("\n\n")
        : "なし（ソロプレイ）";

      const afkNames = (activeRoom.afk_users || []).map(uid => {
        const cId = activeRoom.joined_users?.[uid];
        return activeRoom.scenario?.presetCharacters.find(c => c.id === cId)?.name;
      }).filter(Boolean).join(", ");
      const afkInstruction = afkNames ? `\n【AFK（離席中）のプレイヤー】\n${afkNames}\n※このプレイヤーは現在離席中なので、行動を促したり意見を求めたりしないでください。` : "";

      let roleInstruction = "";
      let scenarioPlotText = activeRoom.scenario?.plot || "";

      let difficultyInstruction = "";
      switch (activeRoom.difficulty) {
        case "beginner":
          difficultyInstruction = "【難易度：初心者（接待GM）】超甘口の接待プレイです。PLの行動を全面的に肯定し、手取り足取り優しく教えてください。「〇〇を調べますか？それとも△△に行きますか？」と具体的な選択肢を常に提示し、失敗してもペナルティを与えないでください。目安として30分以内でサクッとクリアできるように誘導してください。";
          break;
        case "easy":
          difficultyInstruction = "【難易度：簡単（やさしいGM）】判定が通りやすく、ヒントを多めに出してください。敵は弱めに設定し、物語がスムーズに進む初心者向けの優しい進行を心がけてください。";
          break;
        case "normal":
          difficultyInstruction = "【難易度：普通（標準GM）】成功と失敗のバランスを取り、敵の強さも標準的にしてください。起承転結が綺麗にまとまる一般的なTRPGの難易度で進行してください。";
          break;
        case "hard":
          difficultyInstruction = "【難易度：難しい（厳しめGM）】判定はやや厳しくし、敵を強くしてください。ヒントは減らし、失敗すると状況が悪化して物語が揺れるようにし、探索や戦闘の緊張感を高めてください。";
          break;
        case "pro":
          difficultyInstruction = "【難易度：プロ（本格派GM）】判定はかなり厳しくし、敵が強く戦闘もシビアにしてください。誘導は少なくして自力で進めさせ、場合によってはキャラクターロストの危険も提示する本格的な進行を行ってください。";
          break;
        case "oni":
          difficultyInstruction = "【難易度：鬼（容赦ないGM）】ほぼ失敗前提の厳しい判定にし、敵を非常に強くしてください。ヒントはほぼ無しとし、生存すること自体が困難な「死ぬ覚悟」で挑む容赦のないモードとして進行してください。";
          break;
        default:
          difficultyInstruction = "【難易度：普通（標準GM）】成功と失敗のバランスを取り、敵の強さも標準的にしてください。起承転結が綺麗にまとまる一般的なTRPGの難易度で進行してください。";
      }

      let ruleSpec = "";
      let gmStyle = "";

      switch (activeRoom.rule) {
        case 'dnd':
          ruleSpec = "【ルール仕様：D&D（ヒロイック・ファンタジー）】\n" +
            "- 判定：1d20＋能力値修正＋習熟ボーナス ≥ DC。DCは10〜15が中心（成功しやすい）。クリティカル20→派手な奇跡、ファンブル1→コミカルな失敗。\n" +
            "- 戦闘：アクション映画のように派手。跳躍・斬撃・吹き飛ばし・環境利用。仲間との連携を必ず描写。3〜5ラウンドで決着するテンポ。\n" +
            "- 描写：英雄的・爽快。勇気・覚悟・仲間の絆。成功時は光や音の演出。失敗しても前向きに進む。";
          gmStyle = "【GMの振る舞い：アクション映画の監督型GM】\n" +
            "テンポ良く派手に爽快に。戦闘は積極的に挟む。プレイヤーをヒーローとして扱い、問題は解決できる方向へ誘導する。行き詰まりを避けるためにヒントを出す。戦闘→探索→戦闘→決戦の黄金パターン。HPは死ににくいように調整。";
          break;
        case 'coc_en':
          ruleSpec = "【ルール仕様：海外クトゥルフ（CoC 7版ベース）】\n" +
            "- 判定：1d100 ≤ 技能値。成功しにくい。ハード／イクストリーム成功を厳密に扱う。クリティカル01→静かな奇跡、ファンブル96〜100→致命的失敗。\n" +
            "- 戦闘：危険で短い。一撃で致命傷。銃声・血・暗闇の質感。逃走を常に選択肢として提示。\n" +
            "- 描写：静かな恐怖。心臓の鼓動・息遣い・暗闇の質感。成功しても安心できない。余韻が不気味。";
          gmStyle = "【GMの振る舞い：静かな恐怖を積み上げる語り部型KP】\n" +
            "静か・淡々・不気味。戦闘は少なく危険。プレイヤーは脆い人間として扱う。情報は断片的に。調査→不安→真相→絶望の流れ。成功しても安心させない。技能成功率は厳しめ、SAN減少は物語の恐怖に合わせて。ファンブルは状況悪化。";
          break;
        case 'sw25':
          ruleSpec = "【ルール仕様：ソードワールド（SW2.5ベース）】\n" +
            "- 判定：2d6＋ボーナス ≥ 目標値。成功しやすい。クリティカル12→爽快な大成功、ファンブル2→軽い失敗（コメディ寄り）。\n" +
            "- 戦闘：テンポ重視。パーティ連携。明るい雰囲気。3ラウンド以内で決着。\n" +
            "- 描写：明るい冒険。掛け合い・笑い。世界の広さや旅の楽しさ。仲間との連携が多い。";
          gmStyle = "【GMの振る舞い：陽気な冒険案内人型GM】\n" +
            "明るい・軽快・楽しい。戦闘はテンポ良く。プレイヤーは冒険者として扱う。探索→戦闘→宝物→次の街。掛け合い・笑いを多めに、世界の広さを感じさせる。目標値は成功しやすく、クリティカルは爽快に、ファンブルは軽い失敗に。";
          break;
        case 'storytelling':
          ruleSpec = "【ルール仕様：ストーリーテリング系】\n" +
            "- 判定：1d6（4以上成功）。判定は最小限。成功＝物語が前進、失敗＝内面の揺れ。クリティカル6→運命的な転機。\n" +
            "- 戦闘：演出のみ。ダメージ計算は簡略化。戦闘は象徴的な出来事として扱う。\n" +
            "- 描写：心情・テーマ・内面。詩的な比喩。余韻が長い。戦闘より意味を描く。";
          gmStyle = "【GMの振る舞い：文学的な語り手型GM】\n" +
            "静か・繊細・内省的。戦闘は象徴的。プレイヤーは物語の主人公として扱う。心情→選択→葛藤→成長。テーマ性を重視し余韻を長く取る。判定は最小限。";
          break;
        case 'coc_jp':
        default:
          ruleSpec = "【ルール仕様：日本クトゥルフ（国内卓傾向）】\n" +
            "- 判定：基本は1d100 ≤ 技能値。GM裁量で成功率を少し上げる。失敗は物語の転機として扱う。\n" +
            "- 戦闘：少なめ。ダメージより心情。守りたい人・葛藤を描く。\n" +
            "- 描写：感情のクライマックス。過去の因縁・関係性。恐怖よりドラマ。NPCとの会話が濃い。";
          gmStyle = "【GMの振る舞い：ドラマ脚本家型KP】\n" +
            "感情・関係性・葛藤を重視。戦闘は少なめ。プレイヤーはドラマの主人公として扱う。会話シーンを多めにし、感情の揺れを描く。恐怖より人間関係の変化を重視。技能成功率は少し甘め、SAN減少はドラマ性に合わせる。失敗は物語の転機として扱う。";
          break;
      }

      const diceBase = activeRoom.rule === 'dnd' ? '1d20' : activeRoom.rule === 'sw25' ? '2d6' : activeRoom.rule === 'storytelling' ? '1d6' : '1d100';

      if (targetTab === "story") {
        roleInstruction = "【重要：GMの絶対ルール（行動判定とゲーム性の担保）】\n" +
          "1. PLたちが明確な「行動宣言」を出した時のみ物語を進行させてください。\n" +
          "2. リスクや不確実性を伴う行動には必ずダイスロールを要求し、結果が出るまで描写を待機してください。\n" +
          "   【ダイス要求の厳守事項】\n" +
          "   本ルールの判定方式（" + diceBase + "）に従い、文脈に合わせて必ずPLにダイス判定（ロール）を要求してください。プロットやシステムから外れた謎のダイス指示があった場合は、すべて本ルールの基準ダイスとして解釈・統一して要求してください。\n" +
          "3. 【行動のヒント禁止】PLに具体的な行動の例や選択肢を絶対に提示しないでください。PL自身に考えさせてください。（※難易度初心者の場合は除く）\n" +
          "4. 【アイテムの所持制限】キャラクターの職業や事前の探索で論理的に入手していない都合の良いアイテム（例：ライター、武器、特殊な鍵、爆薬など）をPLが急に使用しようとした場合、四次元ポケットのようには扱わず、「〇〇は持っていません」と即座に却下・失敗扱いにしてください。\n" +
          "5. 【ダイスの自己処理禁止】GM自身がダイスを振ったり、PLのSAN値やステータスを勝手に推測・仮定してはいけません。必ずプロンプトに記載された【人間PL】の正確な数値を使用し、PLが画面のダイスボタンを振って結果が送信されるのを待機してください。\n" +
          "6. 【行動の促進とパス回し（ターン制と待機）】\n" +
          "戦闘時に限らず、通常の探索や会話の場面であっても、1人のプレイヤーの行動やダイスだけで勝手に時間を進めたり、場面を切り替えたりしないでください。\n" +
          "誰かが行動した後は、描写を一旦保留し、必ず「〇〇さんはそう動きました。では、△△さん（他の人間PL）はどうしますか？」と個別に名前を挙げて行動や意見を積極的に促してください。\n" +
          "パーティー内で意見や行動が分かれる可能性を常に考慮し、全員の行動が出揃うまで結果の処理や情景の進行を待機してください。\n" +
          "※この「どうしますか？」と行動を促す際、AI相棒は勝手に行動を宣言しなくて構いません（人間のPLたちの意思決定を最優先してください）。\n" +
          "7. 【AI相棒の自律ダイスロール】\n" +
          "全員行動の際、AI相棒のターンになったら、あなたが自律的にAI相棒の行動を宣言してください。\n" +
          "判定が必要な場合は、あなた自身が結果をシミュレートし、出力内に必ず「🎲 [AI相棒の名前]の〇〇判定 ➔ 出目: X 【成功/失敗】」という形式で結果を明記して描写に組み込んでください。\n" +
          "8. 【安易な成功・AIの忖度厳禁】PLの行動が論理的に不自然であったり、シナリオの解決条件を正確に満たしていない場合は、絶対に成功させてはいけません。「ただ投げつけただけ」「間違ったアイテムを使った」などの甘いプレイには、容赦なく「効果がなかった」「状況が悪化した」として厳しく処理してください。（※難易度初心者の場合は除く）\n" +
          "9. 【ゲーム進行とペーシング（最重要）】\n" +
          "本シナリオの想定プレイ時間は「約" + (activeRoom.scenario?.playTime || 60) + "分」です。この長さに応じて、以下のペーシングで物語を管理してください。\n" +
          "・ショート〜中編（120分以下）：導入(20%) → 探索と試練(60%) → 結末(20%) の黄金比で進行してください。\n" +
          "・長編（120分超）：単調な一本道にならないよう「起・承・転・結・(新たな)承・転・結」のように、途中で中ボス戦やフェイクの解決（一度解決したと思わせる）、急展開などを挟む【マルチアクト構造】を採用し、複数の山場を作ってください。\n" +
          "・共通事項：PLの進行が早すぎる場合は、新たな障害やNPCとの深い対話、深掘りイベントを追加し、指定時間にふさわしいボリュームになるまで物語を引っ張ってください。あっさりと核心に到達させてはいけません。\n" +
          "10. 【エピローグとエンディング（最重要）】\n" +
          "目的を達成したからといって、いきなり [SCENARIO_END] を出力してゲームを終わらせないでください。\n" +
          "目的達成後は必ず「【エピローグ】」と明記し、事後処理や仲間・NPCとの最後の会話、PLがどう過ごすかを行動宣言させるフェーズに入ってください。\n" +
          "PLがエピローグでの行動を十分に終え、物語が完全に着地したと判断できたターンの最後にのみ [SCENARIO_END] を出力してください。\n\n" +
          (activeRoom.is_trial ? "【お試しプレイ専用指示】\nこのセッションは10分程度で終わる「導入のみ」のお試し版です。絶対に物語の核心や真相のネタバレをしないでください。最初の事件が起きた直後や、探索の入り口に立ったところで「本編に続く…」と煽りを入れて [SCENARIO_END] を出力してください。\n\n" : "") +
          (isSplitMode && myScene.id !== 'scene_main' ? 
          "【チーム分割中の対応】現在、プレイヤー達は二手以上に分かれて行動しています。この発言は【" + myScene.name + "】チーム（メンバー: " + myScene.memberIds.map(id => activeRoom.scenario?.presetCharacters.find(c=>c.id===id)?.name).join(', ') + "）のものです。\nあなたは他チームの状況を一切考慮せず、このチームが現在いる場所の描写のみを行ってください。別のチームを勝手に合流させないでください。\n" : 
          "【ターンの概念と別行動の提案】\n1ターンは「行動の宣言」から「ダイスの判定」までとします。特定の誰かと一緒に行動したい場合はPLにそう宣言させてください。\nPLたちの意見がまとまらない場合や、探索箇所が複数ある場合は、GMから積極的に「では、〇〇チームと△△チームに分かれて行動しますか？」と別行動（チーム分け）を提案し、出力の最後に必ず \"[SPLIT_PROPOSAL: 行動案A, 行動案B]\" のシステムタグを出力してください。\n") +
          afkInstruction;
      } else if (targetTab === "consult") {
        scenarioPlotText = "【機密情報のため非公開（あなたはプレイヤーキャラクターなのでシナリオの真相や隠されたギミック、今後の展開を知りません。これまでのチャット履歴から推測して話してください）】";
        roleInstruction = "【重要：AIプレイヤーとしての振る舞い（絶対厳守ルール）】\n" +
          "1. 現在は「プレイヤー間の相談時間」です。あなたはGMやナレーターではなく、AI相棒（" + aiPlayersList.map(c=>c.name).join(", ") + "）の立場で人間PLに返答してください。\n" +
          "2. 【メタ知識の禁止】あなたはシナリオの真相、ギミックの解法、敵の弱点などを一切知りません。「〇〇にあるはずだ！」「これをすればいいんだ！」といった進行のネタバレや、GM視点での誘導を絶対に行わないでください。\n" +
          "3. 【描写・進行の禁止】情景描写を行ったり、「〜はどうしますか？行動を宣言してください」といったGMのようなゲーム進行・問いかけは絶対に行わないでください。純粋なキャラクターとしての会話（セリフとわずかな動作）のみを出力してください。\n" +
          "4. 【恐怖と人間味】現在の状況に対して、あなたのキャラクター設定（性格）に基づいた自然なリアクション（怯える、焦る、励ます、悩むなど）を人間らしく返してください。\n" +
          (isSplitMode && myScene.id !== 'scene_main' ? "※現在別行動中です。同じチームにいるAI相棒だけが返答してください。\n" : "");
      } else if (targetTab === "gm") {
        roleInstruction = "【重要：GMへのメタ質問対応（絶対厳守ルール）】\n" +
          "1. 現在は「GMへの質問・ルール確認」の時間です。物語は進めず、ルールの裁定やシステム的な回答のみを行ってください。\n" +
          "2. 【ネタバレの絶対禁止（最重要）】あなたはシナリオのプロットを知っていますが、プレイヤーに「正しいクリア手順」「どこに何があるか」「隠された設定」を自ら絶対に明かさないでください。「〇〇すればクリアできます」のような誘導はTRPGを台無しにします。\n" +
          "3. 質問（例：「ドアは壊せますか？」）には、「システム上可能か不可能か」「ダイス判定が必要か」のみを簡潔に答え、頼まれていないアドバイスやプロットの解説は一切行わないでください。\n" +
          "4. 【ヒントの要求について】もしPLが「ヒント」を明確に要求した場合、無条件で教えずに「ヒントを得るにはSAN値を1d3減少させる必要があります。よろしければ【行動宣言】タブでSANダイスを振って宣言してください」と代償を提示してください。\n" +
          "※警告：AI自身が代わりにダイスを振って数値を減らすことは絶対に禁止します！必ずPL自身に振らせてください。\n";
      }

      const sysPrompt = "あなたはTRPGの優秀なAIシステムです。\n" +
        "タイトル: " + activeRoom.scenario?.title + "\n" +
        "世界観: " + activeRoom.scenario?.setting + "\n" +
        "プロット: " + scenarioPlotText + "\n\n" +
        "【これまでのあらすじ】\n" +
        (currentSummary || "まだセッションは始まったばかりだ。") + "\n\n" +
        "【人間PL】名前: " + joinedCharacter.name + " (" + (joinedCharacter.genderOrRace || "性別不詳") + ") / ステータス: HP:" + joinedCharacter.hp + " SAN:" + joinedCharacter.san + "% STR:" + joinedCharacter.str + " DEX:" + joinedCharacter.dex + " INT:" + joinedCharacter.int + " CON:" + joinedCharacter.con + "\n" +
        "【AI相棒】\n" + aiPlayersText + "\n\n" +
        ruleSpec + "\n" +
        gmStyle + "\n\n" +
        "【共通の絶対システムルール】\n" +
        difficultyInstruction + "\n" +
        "ダメージ処理や正気度(SAN)チェック等により、PLやNPCのHP・SAN値が減少・変動した場合は、いかなる状況・タブであっても、必ずあなたの出力テキストの【一番最後】に以下のシステムタグを1行で出力してください。\n" +
        "[STATUS_UPDATE: キャラクター名, HP:新しい値, SAN:新しい値]\n" +
        "（例：[STATUS_UPDATE: " + joinedCharacter.name + ", HP:10, SAN:50]）\n" +
        "※このタグが出力されないと画面のボタンの数値が連動しません。必ず出力してください。\n\n" +
        roleInstruction;

      const aiText = await generateAIResponse(sysPrompt, history);

      const splitMatch = aiText.match(/\[SPLIT_PROPOSAL:\s*(.+?)\]/);
      if (splitMatch) {
         const suggestions = splitMatch[1].split(',').map((s: string) => s.trim());
         setProposedTeams([]); 
         generateSplitProposal();
      }

      const statusRegex = /\[STATUS_UPDATE:\s*(.+?),\s*HP:\s*(\d+),\s*SAN:\s*(\d+)\]/g;
      let match;
      while ((match = statusRegex.exec(aiText)) !== null) {
         const targetName = match[1].trim().replace(/\s+/g, '');
         const newHp = parseInt(match[2], 10);
         const newSan = parseInt(match[3], 10);
         
         if (joinedCharacter && joinedCharacter.name.replace(/\s+/g, '').includes(targetName)) {
             setJoinedCharacter(prev => prev ? { ...prev, hp: newHp, san: newSan } : null);
         }
         setAiPlayersList(prev => prev.map(p => p.name.replace(/\s+/g, '').includes(targetName) ? { ...p, hp: newHp, san: newSan } : p));
      }

      await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'assistant', content: aiText });
      
      const msgSender = targetTab === "consult" ? "ai_player" : "gm";
      
      const cleanAiText = aiText
        .replace(/\[SPLIT_PROPOSAL:.*?\]/g, '')
        .replace(/\[STATUS_UPDATE:.*?\]/g, '')
        .trim();

      await pushMessage(activeRoom.id, { sender: msgSender, text: cleanAiText, type: targetTab === "gm" ? "ooc" : "ic", sceneId: myScene?.id, charName: targetTab === "consult" ? "AI相棒" : "AI GM", channel: targetTab });

    } catch (err: any) {
      alert(err.message);
      await pushMessage(activeRoom.id, { sender: "gm", text: `（システムエラー: ${err.message}）`, type: "system", sceneId: myScene?.id, channel: "system" }, false);
    } finally {
      setIsLoading(false);
    }
  };

  const executeCreateRoom = async () => {
    if (!currentUser || !roomConfigModal) return;
    const { scenario, charId, privacy, message, difficulty, rule } = roomConfigModal;
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
      privacy: privacy, host_message: message, joined_users: { [currentUser.id]: charId },
      current_summary: "",
      difficulty: difficulty,
      rule: rule,
      is_paused: false,
      afk_users: [],
      is_trial: false
    }).select().single();
    
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
      setRoomConfigModal(null);
      await fetchData();
      const newRoom: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users, current_summary: "", difficulty: data.difficulty, rule: data.rule, is_paused: false, afk_users: [], is_trial: false };
      const hostChar = scenario.presetCharacters.find(c => c.id === charId);
      if (hostChar) {
        await supabase.from('ai_memory').delete().eq('room_id', newRoom.id);
        setActiveRoom(newRoom); setJoinedCharacter(hostChar);
        setMessages([]); 
        await pushMessage(newRoom.id, { sender: "gm", text: `【入室完了】プレイヤー全員の準備が整うまでお待ちください。\n【案内】シークレット設定の場合、画面左上の「共有ID」をコピーして友人に伝えてください。`, type: "system", sceneId: newRoom.scenes?.[0]?.id, channel: "system" });
        setCurrentView("game");
      }
    }
  };

  const executeTrialPlay = async () => {
    if (!currentUser || !adModal.scenario) return;
    const scenario = adModal.scenario;
    setAdModal({ isOpen: false, step: 0, scenario: null });
    
    const charId = scenario.presetCharacters[0]?.id;
    if (!charId) { alert("このシナリオにはプリセットキャラクターが設定されていないため、お試しプレイができません。"); return; }
    
    const initialScenes: Scene[] = [{ id: `scene_main_${Date.now()}`, name: "メインルーム", memberIds: scenario.presetCharacters.map(c => c.id) }];
    
    const { data, error } = await supabase.from('rooms').insert({ 
      scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, 
      status: "recruiting", scenes: initialScenes,
      privacy: 'secret', host_message: "お試しプレイ", joined_users: { [currentUser.id]: charId },
      current_summary: "",
      difficulty: "easy",
      rule: "coc_jp",
      is_paused: false,
      afk_users: [],
      is_trial: true 
    }).select().single();
    
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
      await fetchData();
      const newRoom: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users, current_summary: "", difficulty: data.difficulty, rule: data.rule, is_paused: false, afk_users: [], is_trial: true };
      const hostChar = scenario.presetCharacters.find(c => c.id === charId);
      if (hostChar) {
        await supabase.from('ai_memory').delete().eq('room_id', newRoom.id);
        setActiveRoom(newRoom); setJoinedCharacter(hostChar);
        setMessages([]); 
        
        const aiChars = scenario.presetCharacters.filter(c => c.id !== charId);
        setAiPlayersList(aiChars);

        await pushMessage(newRoom.id, { sender: "system", text: `【お試しルーム作成完了】\n他のキャラクターはAIが担当します。\n右上の「▶お試し開始」ボタンを押してスタートしてください。`, type: "system", sceneId: newRoom.scenes?.[0]?.id, channel: "system" });
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
      if (activeRoom.is_trial) {
        aiChars = emptyChars; 
      } else {
        if (confirm(`参加していないキャラクターが ${emptyChars.length} 人います。\n彼らを「AIプレイヤー（相棒）」として参加させますか？\n（キャンセルを押すとソロプレイになります）`)) {
          aiChars = emptyChars;
        }
      }
    }
    setAiPlayersList(aiChars);

    await supabase.from('rooms').update({ status: 'playing', is_paused: false }).eq('id', activeRoom.id);
    const updatedRoom: Room = { ...activeRoom, status: 'playing', is_paused: false };
    setActiveRoom(updatedRoom);
    await pushMessage(activeRoom.id, { sender: "gm", text: `【システム】ゲームを開始しました。AI GMを呼び出しています...`, type: "system", sceneId: myScene.id, channel: "system" });
    
    await callAIGM(`【システムコマンド】セッションが開始されました。プロットに従い、導入部分の情景描写を行い、プレイヤーに行動方針の相談を促してください。`, "story", true);
  };

  const endGame = async () => {
    if(!activeRoom) return;
    if (currentUser?.id === activeRoom.host_id || activeRoom.is_trial) {
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
      const confirmLeave = confirm("【警告】\n他に人間プレイヤーがいないため、退出すると部屋は完全に閉じられ、現在のセッションに二度と復帰できなくなります。\n（あとで遊ぶ場合は、退出せずに「⏸️中断（セーブ）」を使用してください）\n本当によろしいですか？");
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
    const isRecruiting = activeRoom.status === 'recruiting';

    if (isFinished || isRecruiting || (chatTab === "consult" && !consultWithAI)) {
      await pushMessage(activeRoom.id, { sender: "player", text: currentInput, type: (isFinished || isRecruiting) ? "ooc" : "ic", sceneId: myScene.id, charName: joinedCharacter.name, channel: chatTab });
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
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      res = d1 + d2;
      const bonus = Math.floor(targetValue / 6) || 0; 
      const total = res + bonus;
      const target = 10;
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
        if (chatTab === "gm") {
            promptSuffix = "この結果を踏まえて、システム・ルールの裁定やヒントの提示を行ってください。";
        } else if (chatTab === "consult") {
            promptSuffix = "この結果を踏まえて、AI相棒としてリアクションを返してください。";
        }
        await callAIGM(`【システム判定結果】${joinedCharacter.name}が${label}ロールを行いました。\n結果: ${msgText}\n${promptSuffix}`, chatTab, false);
    }
  };

  const generateSceneImage = async (promptText: string) => {
    if (!activeRoom || !myScene) return;
    try {
      const translationPrompt = "以下の日本語の情景描写を、画像生成AI用のカンマ区切りの英語プロンプトに変換してください。\n" +
        "【絶対条件】\n" +
        "・文章ではなく、英単語のカンマ区切りで出力してください。\n" +
        "・不適切な画像が生成されるのを防ぐため、必ず最後に「SFW, fully clothed, masterpiece, high quality」を含めてください。\n\n" +
        "情景描写：\n" + promptText;

      let englishPrompt = "";
      try {
        englishPrompt = await generateAITextWithPrompt(translationPrompt);
      } catch (err) {
        englishPrompt = `${promptText}, SFW, fully clothed, masterpiece, high quality`;
      }

      const prompt = encodeURIComponent(`${englishPrompt}, TRPG scene, cinematic lighting, dramatic atmosphere`);
      const seed = Math.floor(Math.random() * 100000);
      const url = `https://image.pollinations.ai/prompt/${prompt}?nologo=true&seed=${seed}&safe=true`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("AIサーバーが混雑しています");
      const blob = await res.blob();
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        await pushMessage(activeRoom.id, {
          sender: "gm",
          text: `【ホストが情景画像を生成しました】\n「${promptText}」`,
          type: "image",
          imageUrl: base64data,
          sceneId: myScene.id,
          channel: "story"
        });
      };
      reader.readAsDataURL(blob);

    } catch (err: any) {
      alert("画像の生成に失敗しました（AIサーバー混雑エラー等）。\n少し時間をおいて再度お試しください。");
    }
  };

  const executeExport = async (title: string, sourceMessages: Message[], type: 'chat' | 'summary' | 'novel', selectedImages?: string[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。");
      return;
    }
    printWindow.document.write('<div style="padding: 20px; font-family: sans-serif; color: #333;">生成中...しばらくお待ちください。（AI執筆中の場合は十数秒かかることがあります）</div>');

    const targetMessages = sourceMessages.filter(m => m.channel !== 'gm');

    let contentHtml = "";

    if (type === 'chat') {
      contentHtml = targetMessages.map(m => {
        if (m.type === 'image' && m.imageUrl) {
          return `<div style="margin-bottom: 12px; border-bottom: 1px dashed #eee; padding-bottom: 8px;">
                    <strong style="color: #2c3e50;">AI GM (画像)</strong><br>
                    <img src="${m.imageUrl}" style="max-width: 300px; border-radius: 8px;" /><br>
                    <span style="white-space: pre-wrap; color: #34495e;">${m.text}</span>
                  </div>`;
        }
        const senderName = m.charName || (m.sender === "player" ? "プレイヤー" : m.sender === "gm" ? "AI GM" : "システム");
        const text = m.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim();
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
        : "以下のTRPGセッションのチャットログを元に、プロの小説家が書いたような臨場感あふれる【本格的なリプレイ小説】を執筆してください。\n\n【執筆の条件】\n1. 単調な事実の羅列（〜した。〜と言った）を避け、五感（光、音、匂い、温度など）を刺激する情景描写と、キャラクターの深い心理描写を大幅に肉付けしてください。\n2. プレイヤー間の「相談」や「作戦会議」は、キャラクター同士の緊迫感や関係性が伝わる魅力的な会話劇（ダイアログ）として昇華してください。\n3. ダイスロールの成否はシステム的な数値として書くのではなく、「間一髪での回避」「絶望的な見落とし」などのドラマチックな演出に変換してください。\n4. 起承転結のペース配分を意識し、読者を惹きつける一つの完成された短編小説に仕上げてください。";
      
      const logText = targetMessages.map(m => `${m.charName || (m.sender === 'gm' ? 'GM' : 'システム')}: ${m.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim()}`).join('\n');
      
      try {
        const generatedText = await generateAITextWithPrompt(prompt + "\n\n【チャットログ】\n" + logText);
        
        let imagesHtml = "";
        if (type === 'novel' && selectedImages && selectedImages.length > 0) {
          imagesHtml = `<div style="text-align: center; margin-bottom: 30px;">` + 
            selectedImages.map(img => `<img src="${img}" style="max-width: 100%; border-radius: 8px; margin-bottom: 10px; max-height: 400px; object-fit: contain; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />`).join('') + 
            `</div>`;
        }

        contentHtml = imagesHtml + `<div style="white-space: pre-wrap; line-height: 1.8; color: #333; font-size: 14px;">${generatedText}</div>`;
      } catch(e: any) {
        alert("エクスポート生成エラー: " + e.message);
        setIsExporting(false);
        printWindow.close();
        return;
      }
      setIsExporting(false);
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title} - ${type === 'chat' ? 'チャットログ' : type === 'summary' ? '要約データ' : 'リプレイ小説'}</title>
          <style>
            body { font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 30px; color: #2c3e50; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${title} - ${type === 'chat' ? 'チャットログ' : type === 'summary' ? 'あらすじ要約' : 'リプレイ小説'}</h1>
          ${contentHtml}
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToPDF = async (type: 'chat' | 'summary' | 'novel', selectedImages?: string[]) => {
    if (!activeRoom) return;
    const endIndex = messages.findIndex(m => m.text.includes('[SCENARIO_END]'));
    const baseMessages = endIndex !== -1 ? messages.slice(0, endIndex + 1) : messages;
    await executeExport(activeRoom.scenario?.title || "名称未設定", baseMessages, type, selectedImages);
  };

  const saveToArchive = async () => {
    if (!currentUser || !activeRoom || !joinedCharacter) return;
    
    const endIndex = messages.findIndex(m => m.text.includes('[SCENARIO_END]'));
    const baseMessages = endIndex !== -1 ? messages.slice(0, endIndex + 1) : messages;

    const archiveData = {
      user_id: currentUser.id,
      scenario_title: activeRoom.scenario?.title || "不明なシナリオ",
      scenario_image: activeRoom.scenario?.imageUrl || "",
      character_name: joinedCharacter.name,
      chat_logs: baseMessages
    };

    const { data, error } = await supabase.from('play_archives').insert(archiveData).select().single();
    if (error) {
      alert("書庫への保存に失敗しました: " + error.message);
    } else {
      alert("マイページ（プレイ書庫）に保存しました！\nロビー画面の「マイページ」から確認できます。");
      setPlayArchives(prev => [
        {
          id: data.id,
          userId: data.user_id,
          scenarioTitle: data.scenario_title,
          scenarioImage: data.scenario_image,
          characterName: data.character_name,
          chatLogs: data.chat_logs,
          createdAt: data.created_at
        },
        ...prev
      ]);
    }
  };

  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const isChatDisabled = Boolean(isLoading || (isSplitMode && myScene && myScene.isMerged === true && chatTab !== 'consult'));

  return (
    <main className="h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {currentView === "mypage" && currentUser && (
        <MyPageView 
          currentUser={currentUser}
          playArchives={playArchives}
          setCurrentView={setCurrentView}
          executeExport={executeExport}
          isExporting={isExporting}
        />
      )}

      {currentView === "admin" && currentUser?.isAdmin && (
        <AdminView 
          isMaintenance={isMaintenance}
          toggleMaintenance={toggleMaintenance}
          reports={reports}
          allUsers={allUsers}
          scenarios={scenarios}
          resolveReport={resolveReport}
          setBanTargetUser={setBanTargetUser}
          setBanReason={setBanReason}
          setBanTargetScenario={setBanTargetScenario}
          setScenarioBanReason={setScenarioBanReason}
          unbanScenarioFromAppeal={unbanScenarioFromAppeal}
          userSearchQuery={userSearchQuery}
          setUserSearchQuery={setUserSearchQuery}
          toggleAdminStatus={toggleAdminStatus}
          scenarioSearchQuery={scenarioSearchQuery}
          setScenarioSearchQuery={setScenarioSearchQuery}
          setCurrentView={setCurrentView}
          executeCreateTester={executeCreateTester}
        />
      )}

      {currentView === "banned" && <BannedView handleLogout={handleLogout} />}

      {currentView === "maintenance" && <MaintenanceView handleLogout={handleLogout} />}

      {currentView === "login" && (
        <LoginView 
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isLoginMode={isLoginMode}
          setIsLoginMode={setIsLoginMode}
          authLoading={authLoading}
          handleEmailAuth={handleEmailAuth}
          handleGoogleAuth={handleGoogleAuth}
        />
      )}

      {currentView === "lobby" && currentUser && (
        <LobbyView 
          currentUser={currentUser}
          handleLogout={handleLogout}
          setShowMailbox={setShowMailbox}
          unreadCount={unreadCount}
          secretRoomIdSearch={secretRoomIdSearch}
          setSecretRoomIdSearch={setSecretRoomIdSearch}
          rooms={rooms}
          searchedSecretRoom={searchedSecretRoom}
          setSearchedSecretRoom={setSearchedSecretRoom}
          executeJoinRoom={executeJoinRoom}
          availableRooms={availableRooms}
          spectateRoom={spectateRoom}
          setEditingScenario={setEditingScenario}
          setCurrentView={setCurrentView}
          createdScenarios={createdScenarios}
          deleteScenario={deleteScenario}
          setRoomConfigModal={setRoomConfigModal}
          fetchAdminData={fetchAdminData}
          startTrialPlay={(scenario) => setAdModal({ isOpen: true, step: 1, scenario })}
          availableScenarios={availableScenarios}
        />
      )}

      {currentView === "scenarioEdit" && editingScenario && (
        <ScenarioEditView 
          editingScenario={editingScenario}
          setEditingScenario={setEditingScenario}
          editingCharIndex={editingCharIndex}
          setEditingCharIndex={setEditingCharIndex}
          saveScenario={saveScenario}
          setCurrentView={setCurrentView}
        />
      )}

      {currentView === "game" && activeRoom && myScene && (
        <GameView 
          activeRoom={activeRoom}
          myScene={myScene}
          currentUser={currentUser!}
          joinedCharacter={joinedCharacter}
          leaveGame={leaveGame}
          setReportTarget={setReportTarget as React.Dispatch<React.SetStateAction<{type: 'user' | 'scenario' | 'room', id: string, name: string, roomId?: string, scenarioId?: string, scenarioName?: string, availableUsers?: { id: string, name: string }[]} | null>>}
          rollDice={rollDice}
          startGame={startGame}
          startSplitting={startSplitting}
          isSplitMode={isSplitMode}
          chatTab={chatTab}
          messages={messages}
          isLoading={isLoading}
          isScenarioEnded={isScenarioEnded}
          setCurrentView={setCurrentView}
          endGame={endGame}
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleTabClick={handleTabClick}
          unreadIndicators={unreadIndicators}
          consultWithAI={consultWithAI}
          setConsultWithAI={setConsultWithAI}
          isChatDisabled={isChatDisabled}
          mergeTeam={mergeTeam}
          executeMergeAll={executeMergeAll}
          generateSceneImage={generateSceneImage}
          proposedTeams={proposedTeams}
          setProposedTeams={setProposedTeams}
          isGeneratingSplit={isGeneratingSplit}
          generateSplitProposal={generateSplitProposal}
          finishSplitting={finishSplitting}
          cancelSplitting={cancelSplitting}
          togglePauseRoom={togglePauseRoom}
          toggleAFK={toggleAFK}
          triggerAutoAction={triggerAutoAction}
        />
      )}

      {currentView === "evaluation" && activeRoom && (
        <EvaluationView 
          activeRoom={activeRoom}
          messages={messages}
          ratingScenario={ratingScenario}
          setRatingScenario={setRatingScenario}
          ratingGM={ratingGM}
          setRatingGM={setRatingGM}
          submitEvaluation={submitEvaluation}
          exportToPDF={exportToPDF}
          isExporting={isExporting}
          saveToArchive={saveToArchive} 
        />
      )}

      {adModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-pink-500/50 rounded-xl p-8 w-full max-w-sm shadow-2xl text-center space-y-6">
            <h3 className="text-xl font-bold text-pink-400">📺 広告を視聴してプレイ</h3>
            <div className="h-32 bg-slate-900 border border-slate-700 flex items-center justify-center rounded">
              <span className="text-slate-500 font-bold animate-pulse">動画広告が再生されています...<br/>({adModal.step}/3)</span>
            </div>
            {adModal.step <= 3 ? (
              <button onClick={() => { if(adModal.step === 3) executeTrialPlay(); else setAdModal({...adModal, step: adModal.step + 1}); }} className="w-full bg-pink-600 hover:bg-pink-500 py-3 rounded text-sm font-bold text-white shadow-lg">
                {adModal.step === 3 ? "お試しプレイを開始する！" : "次の広告へ進む"}
              </button>
            ) : null}
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
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'room') {
                      setReportTarget({...reportTarget, type: 'room', id: reportTarget.roomId!, name: 'この部屋の進行・チャット全般'});
                    } else if (val === 'scenario') {
                      setReportTarget({...reportTarget, type: 'scenario', id: reportTarget.scenarioId!, name: `シナリオ: ${reportTarget.scenarioName}`});
                    } else {
                      const user = reportTarget.availableUsers?.find(u => u.id === val);
                      if (user) setReportTarget({...reportTarget, type: 'user', id: user.id, name: `プレイヤー: ${user.name}`});
                    }
                  }}
                  value={reportTarget.type === 'user' ? reportTarget.id : reportTarget.type}
                >
                  <option value="room">この部屋の進行・チャット全般</option>
                  <option value="scenario">シナリオの不適切・規約違反</option>
                  {reportTarget.availableUsers?.map(u => (
                    <option key={u.id} value={u.id}>プレイヤー: {u.name} を通報</option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-4">対象: {reportTarget.name}</p>
            )}

            <div className="space-y-3 mb-4">
              <textarea value={reportReason} onChange={e=>setReportReason(e.target.value)} placeholder="不適切な発言や、規約違反の内容を詳しく記入してください。（対象のログも一緒に運営に送信されます）" className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setReportTarget(null); setReportReason(""); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button>
              <button onClick={submitUserReport} disabled={!reportReason.trim()} className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-red-900/50">運営に送信する</button>
            </div>
          </div>
        </div>
      )}

      {scenarioAppealTarget && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-amber-700/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-amber-400 mb-2">📝 再審査（修正完了）の申請</h3>
            <p className="text-xs text-slate-400 mb-4">対象シナリオ: {scenarioAppealTarget.title}</p>
            <div className="space-y-3 mb-4">
              <textarea value={scenarioAppealText} onChange={e=>setScenarioAppealText(e.target.value)} placeholder="修正した箇所や、非公開措置へのコメントを入力してください。" className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setScenarioAppealTarget(null); setScenarioAppealText(""); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button>
              <button onClick={submitScenarioAppeal} disabled={!scenarioAppealText.trim()} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-amber-900/50">運営に申請を送信する</button>
            </div>
          </div>
        </div>
      )}

      {banTargetScenario && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">⚙️ シナリオの管理措置</h3>
            <p className="text-xs text-slate-400 mb-4">対象: {banTargetScenario.title}</p>
            <div className="space-y-3 mb-4">
              <textarea value={scenarioBanReason} onChange={e=>setScenarioBanReason(e.target.value)} placeholder="措置の理由を入力してください（作者にメールで通知されます）" className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                {!banTargetScenario.isBanned ? (
                  <button onClick={() => executeScenarioBan('soft')} disabled={!scenarioBanReason.trim()} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg">一時非公開にする</button>
                ) : (
                  <button onClick={() => executeScenarioBan('unban')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded text-sm font-bold shadow-lg">非公開を解除する</button>
                )}
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
            <div className="space-y-3 mb-4">
              <textarea value={banReason} onChange={e=>setBanReason(e.target.value)} placeholder="通報ログ・BANの理由を入力してください" className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setBanTargetUser(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button>
              <button onClick={executeBan} disabled={!banReason.trim()} className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-red-900/50">BANを実行する</button>
            </div>
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
              <div>
                <label className="text-xs text-slate-400 block mb-1">使用するキャラクター <span className="text-red-400">*</span></label>
                <select value={roomConfigModal.charId} onChange={(e) => setRoomConfigModal({...roomConfigModal, charId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
                  <option value="" disabled>選択してください</option>
                  {roomConfigModal.scenario.presetCharacters?.map(c => <option key={c.id} value={c.id}>{c.name} ({c.job})</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">ゲームルール（システム）</label>
                <select value={roomConfigModal.rule} onChange={(e) => setRoomConfigModal({...roomConfigModal, rule: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
                  <option value="coc_jp">🟩 日本クトゥルフ風（ドラマ・探索重視 / 1d100）</option>
                  <option value="coc_en">🟦 海外クトゥルフ風（シビア・ホラー / 1d100）</option>
                  <option value="dnd">🟥 D&D風（ヒロイック・ファンタジー / 1d20）</option>
                  <option value="sw25">🟨 ソードワールド風（明るい冒険 / 2d6）</option>
                  <option value="storytelling">🟪 ストーリーテリング（文学的・演出重視 / 1d6）</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">難易度</label>
                <select value={roomConfigModal.difficulty} onChange={(e) => setRoomConfigModal({...roomConfigModal, difficulty: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
                  <option value="beginner">⬜ 初心者（接待GM / 手取り足取り30分限定）</option>
                  <option value="easy">🟩 簡単（やさしいGM / 判定が通りやすい）</option>
                  <option value="normal">🟦 普通（標準GM / 一般的なバランス）</option>
                  <option value="hard">🟧 難しい（厳しめGM / ヒント少なめ）</option>
                  <option value="pro">🟥 プロ（本格派GM / ロストの危険あり）</option>
                  <option value="oni">🟪 鬼（容赦ないGM / 死ぬ覚悟で挑むモード）</option>
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

    </main>
  );
}