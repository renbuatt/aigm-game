"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { generateAIResponse, generateAITextWithPrompt, generateFreeImage, generatePremiumImage } from "../lib/ai";
import { getGMSystemPrompt, getNovelPrompt } from "../lib/prompts";
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
  const [blockedMeIds, setBlockedMeIds] = useState<string[]>([]); 

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
  const [isTicketSystemEnabled, setIsTicketSystemEnabled] = useState(false);
  const [geminiFlashModel, setGeminiFlashModel] = useState<'3.5-lite' | '3.6'>('3.5-lite');
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [myNotifications, setMyNotifications] = useState<Notification[]>([]);
  const [showMailbox, setShowMailbox] = useState(false);

  // 管理画面用アクション
  const [adminActionUser, setAdminActionUser] = useState<UserProfile | null>(null);
  const [adminTicketType, setAdminTicketType] = useState("silver");
  const [adminTicketAmount, setAdminTicketAmount] = useState(1);
  const [adminMailBody, setAdminMailBody] = useState("");

  const [banTargetUser, setBanTargetUser] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banAppeals, setBanAppeals] = useState<BanAppeal[]>([]);
  const [appealText, setAppealText] = useState("");

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [scenarioSearchQuery, setScenarioSearchQuery] = useState("");

  const [banTargetScenario, setBanTargetScenario] = useState<Scenario | null>(null);
  const [scenarioBanReason, setScenarioBanReason] = useState("");

  const [reports, setReports] = useState<Report[]>([]);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const [reportReason, setReportReason] = useState("");

  const [scenarioAppealTarget, setScenarioAppealTarget] = useState<Scenario | null>(null);
  const [scenarioAppealText, setScenarioAppealText] = useState("");

  const [roomConfigModal, setRoomConfigModal] = useState<any>(null);
  const [novelSettingsModal, setNovelSettingsModal] = useState<any>(null);
  const [secretRoomIdSearch, setSecretRoomIdSearch] = useState("");
  const [searchedSecretRoom, setSearchedSecretRoom] = useState<Room | null>(null);

  const [adModal, setAdModal] = useState<any>({ isOpen: false, step: 0, scenario: null, room: null, type: 'trial' });
  const [showTicketModal, setShowTicketModal] = useState(false);
  
  const [unreadIndicators, setUnreadIndicators] = useState({ story: false, consult: false, gm: false });
  const chatTabRef = useRef<ChatTab>(chatTab);
  const prevMessagesLength = useRef(0);
  const [playArchives, setPlayArchives] = useState<PlayArchive[]>([]);

  // 広告視聴（ログインボーナス）用のステート
  const [adViewInfo, setAdViewInfo] = useState({ count: 0, date: "" });

  const isRequestingRef = useRef(false);

  const availableScenarios = scenarios.filter((s: any) => !s.isBanned);
  const createdScenarios = scenarios.filter((s: any) => s.authorId === currentUser?.id);
  const availableRoomsRaw = rooms.filter((r: any) => !r.scenario?.isBanned);

  const availableRooms = availableRoomsRaw.map((room: any) => {
    if (!currentUser) return room;
    const hostId = room.host_id;
    const joinedUserIds = Object.keys(room.joined_users || {});
    const myBlockedIds = currentUser.blockedUserIds || [];

    if (myBlockedIds.includes(hostId)) return null;
    if (joinedUserIds.some((id: string) => myBlockedIds.includes(id))) return null;
    if (blockedMeIds.includes(hostId)) return null;

    const isWarning = joinedUserIds.some((id: string) => blockedMeIds.includes(id));
    return { ...room, isWarning };
  }).filter(Boolean) as Room[];

  const defaultScene: Scene = { id: "scene_main", name: "メインルーム", memberIds: [] };
  const myScene = activeRoom?.scenes?.find((s: any) => joinedCharacter && s.memberIds.includes(joinedCharacter.id)) || activeRoom?.scenes?.[0] || defaultScene;
  const isSplitMode = activeRoom ? (activeRoom.scenes?.length > 1) : false;
  const isScenarioEnded = messages.some((m: any) => m.text.includes('[SCENARIO_END]')) || activeRoom?.status === 'finished';

  const handleOpenRoomConfig = (scenario: Scenario) => {
    setRoomConfigModal({ scenario, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: "all", aiModel: "lite" });
    setCurrentView("lobby");
  };

  const openUserProfile = (userId: string) => { setTargetUserId(userId); setCurrentView("userProfile"); };

  const addFriend = async (targetId: string) => {
    if (!currentUser) return;
    if (currentUser.friendIds?.includes(targetId)) { alert("既に友達に登録されています。"); return; }
    const newFriends = [...(currentUser.friendIds || []), targetId];
    const { error } = await supabase.from('profiles').update({ friend_ids: newFriends }).eq('id', currentUser.id);
    if (!error) { setCurrentUser({ ...currentUser, friendIds: newFriends }); alert("友達に追加しました！"); } 
    else { alert("エラーが発生しました: " + error.message); }
  };

  const blockUser = async (targetId: string) => {
    if (!currentUser) return;
    if (confirm("このユーザーをブロックしますか？\n（お互いに作成した部屋が見えなくなり、あなたが参加している部屋も相手から見えなくなります）")) {
      const newBlocked = [...(currentUser.blockedUserIds || []), targetId];
      const newFriends = (currentUser.friendIds || []).filter((id: string) => id !== targetId);
      const { error } = await supabase.from('profiles').update({ blocked_user_ids: newBlocked, friend_ids: newFriends }).eq('id', currentUser.id);
      if (!error) { setCurrentUser({ ...currentUser, blockedUserIds: newBlocked, friendIds: newFriends }); alert("ブロックしました。"); }
    }
  };

  const unblockUser = async (targetId: string) => {
    if (!currentUser) return;
    const newBlocked = (currentUser.blockedUserIds || []).filter((id: string) => id !== targetId);
    const { error } = await supabase.from('profiles').update({ blocked_user_ids: newBlocked }).eq('id', currentUser.id);
    if (!error) { setCurrentUser({ ...currentUser, blockedUserIds: newBlocked }); alert("ブロックを解除しました。"); }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const { error } = await supabase.from('profiles').update({ handle_name: updates.handleName, bio: updates.bio, avatar_url: updates.avatarUrl }).eq('id', currentUser.id);
    if (error) alert("プロフィールの更新に失敗しました: " + error.message);
    else setCurrentUser({ ...currentUser, ...updates });
  };

  const loadChatLogs = async (roomId: string) => {
    const { data } = await supabase.from('chat_logs').select('message').eq('room_id', roomId).order('id', { ascending: true });
    if (data && data.length > 0) setMessages(data.map((d: any) => d.message));
    else setMessages([]);
  };

  const pushMessage = async (roomId: string, msg: Message, save: boolean = true) => {
    setMessages(prev => {
      const isDuplicate = prev.some((m: any) => JSON.stringify(m) === JSON.stringify(msg));
      if (isDuplicate) return prev;
      return [...prev, msg];
    });
    if (save && roomId) { await supabase.from('chat_logs').insert({ room_id: roomId, message: msg }); }
  };

  useEffect(() => {
    if (currentView === "game" && activeRoom) {
      const chatChannel = supabase.channel(`chat_sync_${activeRoom.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_logs', filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
          const incomingMsg = payload.new.message;
          setMessages(prev => {
            if (prev.some((m: any) => JSON.stringify(m) === JSON.stringify(incomingMsg))) return prev;
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
        newMsgs.forEach((m: any) => {
          const isMySceneMsg = !m.sceneId || m.sceneId === 'scene_main' || m.sceneId === myScene?.id;
          if (isMySceneMsg && m.channel && m.channel !== "system" && m.channel !== chatTabRef.current) {
            next[m.channel as keyof typeof next] = true; changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
    prevMessagesLength.current = messages.length;
  }, [messages, myScene?.id]);

  useEffect(() => {
    if (activeRoom && isSplitMode && currentUser?.id === activeRoom.host_id && activeRoom.status === 'playing') {
      const nonMainScenes = activeRoom.scenes.filter((s: any) => s.id !== 'scene_main');
      if (nonMainScenes.length > 0 && nonMainScenes.every((s: any) => s.isMerged)) executeMergeAll();
    }
  }, [activeRoom?.scenes, activeRoom?.status, activeRoom?.host_id, currentUser?.id, isSplitMode]);

  const fetchData = async () => {
    const { data: scData } = await supabase.from('scenarios').select('*').order('id', { ascending: false });
    let loadedScenarios: Scenario[] = [];
    if (scData && scData.length > 0) {
      loadedScenarios = scData.map((d: any) => ({
        id: d.id, title: d.title, system: d.system || "", tags: d.tags || "", setting: d.setting || "",
        npcList: d.npc_list || "", plot: d.plot || "", prologue: d.prologue || "", epilogue: d.epilogue || "",
        imageUrl: d.image_url || "", presetCharacters: d.preset_characters || [], ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0,
        authorId: d.author_id, price: d.price || 500, playLimit: d.play_limit || 1, giftLimit: d.gift_limit || 1,
        purchasedTickets: d.purchased_tickets || {}, isBanned: d.is_banned || false, playTime: d.play_time || 60,
        isPlayableByOthers: d.is_playable_by_others || false, isTrialOk: d.is_trial_ok || false, itemVisibility: d.item_visibility || "none",
        requiredScenarioId: d.required_scenario_id || "", playCount: d.play_count || 0, viewCount: d.view_count || 0
      }));
      setScenarios(loadedScenarios);
    }
    const { data: rmData } = await supabase.from('rooms').select('*').neq('status', 'finished').order('id', { ascending: false });
    let formattedRooms: Room[] = [];
    if (rmData && loadedScenarios.length > 0) {
      formattedRooms = rmData.map((r: any) => ({
        id: r.id, scenario_id: r.scenario_id, scenario: loadedScenarios.find((s: any) => s.id === r.scenario_id),
        host_name: r.host_name, host_id: r.host_id, status: r.status, scenes: r.scenes || [],
        privacy: r.privacy || "open", host_message: r.host_message || "", joined_users: r.joined_users || {},
        current_summary: r.current_summary || "", difficulty: r.difficulty || "normal", rule: r.rule || "coc_jp",
        is_paused: r.is_paused || false, afk_users: r.afk_users || [], is_trial: r.is_trial || false,
        item_visibility: r.item_visibility || "none", inventories: r.inventories || {},
        current_chapter_index: r.current_chapter_index || 0, spectator_ids: r.spectator_ids || [], ai_model: r.ai_model || 'flash',
        error_refunded: r.error_refunded || false
      })).filter((r: any) => r.scenario) as Room[];
      setRooms(formattedRooms);
    }
    return { loadedScenarios, formattedRooms };
  };

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if(data) setMyNotifications(data.map((d: any) => ({ id: d.id, userId: d.user_id, title: d.title, message: d.message, isRead: d.is_read, createdAt: d.created_at })));
  };

  const fetchProfile = async (userId: string, emailStr: string, currentMaintenance: boolean, roomsData: Room[]) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!data || !data.full_name) { setEmail(emailStr); setCurrentView("onboarding"); return; }
    
    // 広告視聴履歴の更新チェック
    const today = new Date().toLocaleDateString('ja-JP');
    let vCount = data.ad_view_count || 0;
    let vDate = data.last_ad_view_date || "";
    if (vDate !== today) { vCount = 0; vDate = today; }
    setAdViewInfo({ count: vCount, date: vDate });

    const profileData: UserProfile = { 
      id: data.id, handleName: data.handle_name, fullName: data.full_name, address: data.address, phone: data.phone, avatarUrl: data.avatar_url, bio: data.bio, discordId: data.discord_id, ratingSum: data.rating_sum || 0, ratingCount: data.rating_count || 0, isAdmin: data.is_admin || false, isTester: data.is_tester || false, isBanned: data.is_banned || false, email: data.email, friendIds: data.friend_ids || [], blockedUserIds: data.blocked_user_ids || [],
      points: data.points || 0, ticketsNormal: data.tickets_normal || 0, ticketsBronze: data.tickets_bronze || 0, ticketsSilver: data.tickets_silver || 0, ticketsGold: data.tickets_gold || 0, ticketsPlatinum: data.tickets_platinum || 0, ticketsDiamond: data.tickets_diamond || 0, ticketsItem: data.tickets_item || 0, imageGenCredits: data.image_gen_credits || 0
    };
    if (data.email !== emailStr) await supabase.from('profiles').update({ email: emailStr }).eq('id', userId);
    setCurrentUser(profileData); await fetchNotifications(userId);

    const { data: blockedMeData } = await supabase.from('profiles').select('id').contains('blocked_user_ids', [userId]);
    setBlockedMeIds(blockedMeData ? blockedMeData.map((d: any) => d.id) : []);

    const { data: archiveData } = await supabase.from('play_archives').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (archiveData) {
      setPlayArchives(archiveData.map((d: any) => ({
        id: d.id, userId: d.user_id, scenarioId: d.scenario_id, scenarioTitle: d.scenario_title, scenarioImage: d.scenario_image,
        characterName: d.character_name, chatLogs: d.chat_logs, createdAt: d.created_at, rule: d.rule, coPlayers: d.co_players, novels: d.novels || {}, characters: d.characters || []
      })));
    }

    if (!profileData.isBanned && (!currentMaintenance || profileData.isAdmin || profileData.isTester)) {
      const activeMyRoom = roomsData.find((r: any) => (r.status === 'playing' || r.status === 'splitting' || r.status === 'recruiting') && r.joined_users && r.joined_users[userId]);
      if (activeMyRoom && activeMyRoom.scenario) {
        const charId = activeMyRoom.joined_users[userId];
        const char = activeMyRoom.scenario.presetCharacters.find((c: any) => c.id === charId);
        if (char) {
          setActiveRoom(activeMyRoom); setJoinedCharacter(char);
          const takenIds = Object.values(activeMyRoom.joined_users || {});
          setAiPlayersList(activeMyRoom.scenario.presetCharacters.filter((c: any) => !takenIds.includes(c.id)));
          await loadChatLogs(activeMyRoom.id); setCurrentView("game"); return;
        }
      }
      setCurrentView("lobby");
    } else if (profileData.isBanned) { setCurrentView("banned"); } 
    else { setCurrentView("maintenance"); }
  };

  useEffect(() => {
    const initApp = async () => {
      const { data: appData } = await supabase.from('app_settings').select('*').eq('id', 1).single();
      const currentMaintenance = appData ? appData.is_maintenance : false;
      const currentTicketSystem = appData ? appData.is_ticket_system_enabled : false;
      const currentFlashModel = appData?.gemini_flash_model || '3.5-lite';
      setIsMaintenance(currentMaintenance); setIsTicketSystemEnabled(currentTicketSystem); setGeminiFlashModel(currentFlashModel);

      const { formattedRooms } = await fetchData();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await fetchProfile(session.user.id, session.user.email || "", currentMaintenance, formattedRooms);
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
        const { error: upsertError } = await supabase.from('profiles').upsert({ id: data.user.id, handle_name: name.split(" ")[0] || email.split("@")[0], full_name: name, address: addr, phone: phone, avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", email: email });
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
      const { error: upsertError } = await supabase.from('profiles').upsert({ id: session.user.id, handle_name: name.split(" ")[0] || session.user.email?.split("@")[0], full_name: name, address: addr, phone: phone, avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", email: session.user.email });
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
    if (forceRemove) newAfk = newAfk.filter((id: string) => id !== userId);
    else if (newAfk.includes(userId)) newAfk = newAfk.filter((id: string) => id !== userId);
    else newAfk.push(userId);
    await supabase.from('rooms').update({ afk_users: newAfk }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, afk_users: newAfk });
    const cId = activeRoom.joined_users?.[userId];
    const charName = activeRoom.scenario?.presetCharacters.find((c: any) => c.id === cId)?.name || "プレイヤー";
    const msg = forceRemove ? `【システム】${charName}が復帰しました。` : (newAfk.includes(userId) ? `【システム】${charName}が離席（AFK）しました。` : `【システム】${charName}が復帰しました。`);
    await pushMessage(activeRoom.id, { sender: "system", text: msg, type: "system", channel: "system" }, false); 
  };

  const kickUser = async (uid: string) => {
    if (!activeRoom || !currentUser || activeRoom.host_id !== currentUser.id) return;
    if (!confirm("このユーザーを部屋から強制退出させますか？")) return;
    const newUsers = { ...activeRoom.joined_users };
    const charId = newUsers[uid];
    delete newUsers[uid];
    let newAfk = [...(activeRoom.afk_users || [])].filter((id: string) => id !== uid);
    await supabase.from('rooms').update({ joined_users: newUsers, afk_users: newAfk }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, joined_users: newUsers, afk_users: newAfk });
    const charName = activeRoom.scenario?.presetCharacters.find((c: any) => c.id === charId)?.name || "プレイヤー";
    await pushMessage(activeRoom.id, { sender: "system", text: `【システム】一定時間応答がなかったため、ホストによって ${charName} が追放されました。残りの役割はAIが引き継ぎます。`, type: "system", channel: "system" }, true);
  };

  const triggerAutoAction = async () => {
    if (!activeRoom || activeRoom.is_paused || activeRoom.status !== 'playing' || isScenarioEnded || isRequestingRef.current) return;
    isRequestingRef.current = true; setIsLoading(true);
    try {
      const extraUserContext = ["【システムコマンド：タイムアウト自動行動】", "最後の行動から5分間、PLからの入力がありませんでした。", "物語の進行を促すため、現在AFKではないキャラクター（およびAI相棒）の行動をAI GMが自動で決定・描写し、事態を強制的に前進させてください。", "必要であればダイスロール結果もAI自身が捏造して構いません。"].join('\n');
      await callAIGM(extraUserContext, "story");
    } finally { isRequestingRef.current = false; setIsLoading(false); }
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
      price: editingScenario.price || 500, play_limit: editingScenario.playLimit || 1, giftLimit: editingScenario.giftLimit || 1, play_time: editingScenario.playTime || 60,
      is_playable_by_others: editingScenario.isPlayableByOthers || false, is_trial_ok: editingScenario.isTrialOk || false, item_visibility: editingScenario.itemVisibility || "none",
      required_scenario_id: editingScenario.requiredScenarioId || ""
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
  const toggleTicketSystem = async () => { const newStatus = !isTicketSystemEnabled; await supabase.from('app_settings').update({ is_ticket_system_enabled: newStatus }).eq('id', 1); setIsTicketSystemEnabled(newStatus); alert(`チケットシステムを ${newStatus ? "ON" : "OFF"} にしました。`); };
  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => { const newStatus = !currentStatus; await supabase.from('profiles').update({ is_admin: newStatus }).eq('id', userId); setAllUsers(allUsers.map((u: any) => u.id === userId ? { ...u, isAdmin: newStatus } : u)); alert(newStatus ? "管理者権限を付与しました。" : "管理者権限を剥奪しました。"); };
  const toggleTesterStatus = async (userId: string, currentStatus: boolean) => { const newStatus = !currentStatus; await supabase.from('profiles').update({ is_tester: newStatus }).eq('id', userId); setAllUsers(allUsers.map((u: any) => u.id === userId ? { ...u, isTester: newStatus } : u)); alert(newStatus ? "テスター権限を付与しました。" : "テスター権限を剥奪しました。"); };
  
  const toggleGeminiFlashModel = async (newModel: '3.5-lite' | '3.6') => { 
    const { error } = await supabase.from('app_settings').update({ gemini_flash_model: newModel }).eq('id', 1); 
    if (error) { alert(`設定の保存に失敗しました。\nエラー詳細: ${error.message}`); }
    setGeminiFlashModel(newModel); 
    alert(`Gemini Flashの裏側モデルを ${newModel === '3.5-lite' ? '3.5 Flash Lite (軽量版)' : '3.6 Flash (通常版)'} に変更しました。`); 
  };

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
      const s = scenarios.find((x: any) => x.id === scenarioId);
      if(s && s.authorId) await supabase.from('notifications').insert({ user_id: s.authorId, title: '【お知らせ】シナリオの再審査が承認されました', message: `申請いただいたシナリオ「${s.title}」の非公開措置が解除されました。` });
      alert("シナリオの非公開を解除し、作者に通知しました。"); await fetchAdminData(); await fetchData();
    } else alert("エラーが発生しました: " + error.message);
  };

  const resolveReport = async (reportId: string) => { await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId); fetchAdminData(); };
  const submitAppeal = async () => { if(!currentUser || !appealText) return; await supabase.from('ban_appeals').insert({ user_id: currentUser.id, reason: "不明", appeal_text: appealText, status: 'appealing' }); alert("調査依頼を送信しました。"); setAppealText(""); };
  const markNotificationAsRead = async (notifId: string) => { await supabase.from('notifications').update({ is_read: true }).eq('id', notifId); setMyNotifications(myNotifications.map((n: any) => n.id === notifId ? { ...n, isRead: true } : n)); };
  
  const grantTickets = async () => {
    if (!adminActionUser || !adminTicketAmount) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', adminActionUser.id).single();
    if (!data) return;
    let key = 'tickets_silver';
    if (adminTicketType === 'bronze') key = 'tickets_bronze';
    if (adminTicketType === 'gold') key = 'tickets_gold';
    if (adminTicketType === 'platinum') key = 'tickets_platinum';
    if (adminTicketType === 'diamond') key = 'tickets_diamond';
    if (adminTicketType === 'item') key = 'tickets_item';
    const currentVal = data[key] || 0;
    const { error } = await supabase.from('profiles').update({ [key]: currentVal + Number(adminTicketAmount) }).eq('id', adminActionUser.id);
    if (error) { alert("付与失敗: " + error.message); return; }
    await supabase.from('notifications').insert({ user_id: adminActionUser.id, title: '🎁 チケット付与のお知らせ', message: `運営よりチケットが配布されました。\n・${adminTicketType}チケット × ${adminTicketAmount}枚` });
    alert("チケットを付与しました！"); setAdminActionUser(null);
  };

  const sendMail = async () => {
    if (!adminActionUser || !adminMailBody.trim()) return;
    const { error } = await supabase.from('notifications').insert({ user_id: adminActionUser.id, title: '✉️ 運営からのお知らせ', message: adminMailBody });
    if (error) alert("送信失敗: " + error.message);
    else { alert("メールを送信しました！"); setAdminMailBody(""); setAdminActionUser(null); }
  };

  const exchangeTicketWithPoints = async (type: 'bronze'|'item'|'silver'|'gold'|'platinum'|'diamond', cost: number) => {
    if (!currentUser) return;
    if ((currentUser.points || 0) < cost) { alert("ポイントが足りません！"); return; }
    if (!confirm(`${cost} ptを消費してチケットを交換しますか？`)) return;

    const updates: any = { points: currentUser.points! - cost };
    if (type === 'bronze') updates.tickets_bronze = (currentUser.ticketsBronze || 0) + 1;
    if (type === 'item') updates.tickets_item = (currentUser.ticketsItem || 0) + 1;
    if (type === 'silver') updates.tickets_silver = (currentUser.ticketsSilver || 0) + 1;
    if (type === 'gold') updates.tickets_gold = (currentUser.ticketsGold || 0) + 1;
    if (type === 'platinum') updates.tickets_platinum = (currentUser.ticketsPlatinum || 0) + 1;
    if (type === 'diamond') updates.tickets_diamond = (currentUser.ticketsDiamond || 0) + 1;

    const { error } = await supabase.from('profiles').update(updates).eq('id', currentUser.id);
    if (error) { alert("交換に失敗しました: " + error.message); return; }

    setCurrentUser({
      ...currentUser, points: updates.points,
      ticketsBronze: type === 'bronze' ? (currentUser.ticketsBronze || 0) + 1 : currentUser.ticketsBronze,
      ticketsItem: type === 'item' ? (currentUser.ticketsItem || 0) + 1 : currentUser.ticketsItem,
      ticketsSilver: type === 'silver' ? (currentUser.ticketsSilver || 0) + 1 : currentUser.ticketsSilver,
      ticketsGold: type === 'gold' ? (currentUser.ticketsGold || 0) + 1 : currentUser.ticketsGold,
      ticketsPlatinum: type === 'platinum' ? (currentUser.ticketsPlatinum || 0) + 1 : currentUser.ticketsPlatinum,
      ticketsDiamond: type === 'diamond' ? (currentUser.ticketsDiamond || 0) + 1 : currentUser.ticketsDiamond,
    });
    alert("チケットを交換しました！");
  };

  const generateSceneImage = async (imageType: 'free' | 'premium') => {
    if (!activeRoom || !myScene || !currentUser || isRequestingRef.current) return;
    isRequestingRef.current = true; setIsLoading(true);
    try {
      if (imageType === 'premium') {
        if (isTicketSystemEnabled) {
          if ((currentUser.imageGenCredits || 0) < 1) { alert("画像生成の回数がありません。「チャージ」ボタンから補充してください。"); isRequestingRef.current = false; setIsLoading(false); return; }
          const { error } = await supabase.from('profiles').update({ image_gen_credits: (currentUser.imageGenCredits || 0) - 1 }).eq('id', currentUser.id);
          if (!error) setCurrentUser(prev => prev ? { ...prev, imageGenCredits: (prev.imageGenCredits || 0) - 1 } : null);
        }
      }
      const { data: memoryData } = await supabase.from('ai_memory').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: false }).limit(10);
      const recentLogs = memoryData?.reverse().map((m: any) => `${m.role === 'user' ? 'PL' : 'GM'}: ${m.content}`).join('\n') || "";
      const autoPromptReq = ["あなたはTRPGの情景描写AIです。以下の直近のログから、現在の「場所、雰囲気、見えているもの」を1〜2文の簡潔な日本語で描写してください。キャラクターのセリフや行動ではなく、空間のビジュアルに焦点を当ててください。","【直近のログ】",recentLogs].join('\n');
      const targetPrompt = await generateAITextWithPrompt(autoPromptReq, 'lite', 400, 0.7);
      const translationPrompt = ["以下の日本語の情景描写を、画像生成AI用のカンマ区切りの英語プロンプトに変換してください。","【絶対条件】","・文章ではなく、英単語のカンマ区切りで出力してください。","・不適切な画像が生成されるのを防ぐため、必ず最後に「SFW, fully clothed, masterpiece, high quality」を含めてください。","","情景描写：",targetPrompt].join('\n');
      let englishPrompt = "";
      try { englishPrompt = await generateAITextWithPrompt(translationPrompt, 'lite', 200, 0.3); } catch (err) { englishPrompt = `${targetPrompt}, SFW, fully clothed, masterpiece, high quality`; }
      let base64data = "";
      if (imageType === 'free') base64data = await generateFreeImage(englishPrompt);
      else base64data = await generatePremiumImage(englishPrompt);
      await pushMessage(activeRoom.id, { sender: "gm", text: `【ホストが情景画像を生成しました】\n「${targetPrompt}」`, type: "image", imageUrl: base64data, sceneId: myScene.id, channel: "story" });
    } catch (err: any) { alert("画像の生成に失敗しました。\n少し時間をおいて再度お試しください。"); } finally { isRequestingRef.current = false; setIsLoading(false); }
  };

  const startSplitting = async () => {
    if (!activeRoom || isRequestingRef.current) return;
    isRequestingRef.current = true; setIsLoading(true);
    try {
      await supabase.from('rooms').update({ status: 'splitting' }).eq('id', activeRoom.id);
      setActiveRoom({ ...activeRoom, status: 'splitting', scenes: [{ id: 'scene_main', name: 'メインルーム', memberIds: [] }] });
      setProposedTeams([]); await generateSplitProposal();
    } finally { isRequestingRef.current = false; setIsLoading(false); }
  };

  const generateSplitProposal = async () => {
    if (!activeRoom) return;
    setIsGeneratingSplit(true);
    try {
      const { data: memoryData } = await supabase.from('ai_memory').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: false }).limit(15);
      const recentLogs = memoryData?.reverse().map((m: any) => `${m.role === 'user' ? 'PL' : 'GM'}: ${m.content}`).join('\n') || "";
      const chars = activeRoom.scenario?.presetCharacters.filter((c: any) => Object.values(activeRoom.joined_users || {}).includes(c.id)).map((c: any) => `{"id": "${c.id}", "name": "${c.name}"}`).join(", ") || "";
      const prompt = ["あなたはTRPGのシステムAIです。以下の「現在参加しているキャラクター」と「直近のチャットログ」を分析し、物語の展開上、最も自然な【チーム分け（2つ以上のグループへの分割）の構成案】を作成してください。","【参加キャラクター】",chars,"","【直近のログ】",recentLogs,"","【出力形式（絶対遵守）】","必ず以下のJSONフォーマットのみを出力してください。余計な文章やマークダウン記号は一切含めないでください。",'{"teams": [{"action": "目的A", "members": ["キャラID1"]}, {"action": "目的B", "members": ["キャラID3"]}]}'].join('\n');
      const aiResponse = await generateAITextWithPrompt(prompt, 'lite', 800, 0.3);
      const jsonStr = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.teams) setProposedTeams(parsed.teams.map((t: any) => ({ id: `team_${Date.now()}_${Math.random()}`, action: t.action, members: t.members, leader: t.members[0] || "" })));
      else setProposedTeams([{ id: `team_${Date.now()}`, action: "", members: [], leader: "" }]);
    } catch (e) { setProposedTeams([{ id: `team_${Date.now()}`, action: "", members: [], leader: "" }]); } finally { setIsGeneratingSplit(false); }
  };

  const finishSplitting = async () => {
    if (!activeRoom || isRequestingRef.current) return;
    const validTeams = proposedTeams.filter((t: any) => t.action && t.members.length > 0);
    if (validTeams.length === 0) { alert("有効なチームがありません。"); return; }
    for (const t of validTeams) { if (!t.members.includes(joinedCharacter?.id || "") && !t.leader) { alert("ホストが含まれないチームにはリーダーを指定してください。"); return; } }
    isRequestingRef.current = true; setIsLoading(true);
    try {
      const newScenes: Scene[] = [{ id: 'scene_main', name: 'メインルーム', memberIds: [] }, ...validTeams.map((t: any) => ({ id: t.id, name: t.action, memberIds: t.members, leaderId: t.leader, isMerged: false }))];
      await supabase.from('rooms').update({ scenes: newScenes, status: 'playing' }).eq('id', activeRoom.id);
      setActiveRoom({ ...activeRoom, scenes: newScenes, status: 'playing' });
      await pushMessage(activeRoom.id, { sender: "system", text: `【システム】チーム分けが完了しました！各チームごとに独立して行動・相談を行ってください。`, type: "system", sceneId: "scene_main", channel: "system" });
    } finally { isRequestingRef.current = false; setIsLoading(false); }
  };

  const cancelSplitting = async () => { if (!activeRoom) return; await supabase.from('rooms').update({ status: 'playing' }).eq('id', activeRoom.id); setActiveRoom({ ...activeRoom, status: 'playing' }); };

  const mergeTeam = async () => {
    if (!activeRoom || !myScene || myScene.id === 'scene_main' || isRequestingRef.current) return;
    isRequestingRef.current = true; setIsLoading(true);
    try {
      const updatedScenes = activeRoom.scenes.map((s: any) => s.id === myScene.id ? { ...s, isMerged: true } : s);
      await supabase.from('rooms').update({ scenes: updatedScenes }).eq('id', activeRoom.id);
      setActiveRoom({ ...activeRoom, scenes: updatedScenes });
      await pushMessage(activeRoom.id, { sender: "system", text: `【システム】${myScene.name}チームはメインに合流するため待機します。全チームが合流するまでお待ちください。`, type: "system", sceneId: myScene.id, channel: "system" });
    } finally { isRequestingRef.current = false; setIsLoading(false); }
  };

  const executeMergeAll = async () => {
    if (!activeRoom || isRequestingRef.current) return;
    isRequestingRef.current = true; setIsLoading(true);
    try {
      const allMemberIds = Object.keys(activeRoom.joined_users || {});
      const resetScenes: Scene[] = [{ id: 'scene_main', name: 'メインルーム', memberIds: allMemberIds }];
      await supabase.from('rooms').update({ scenes: resetScenes }).eq('id', activeRoom.id);
      setActiveRoom({ ...activeRoom, scenes: resetScenes });
      await pushMessage(activeRoom.id, { sender: "system", text: `【システム】全チームが合流しました！`, type: "system", sceneId: 'scene_main', channel: "system" });
      const extraUserContext = ["【システムコマンド】全チームの別行動が終了し、一箇所に合流しました。","これまでの各チームの報告を踏まえ、合流時の情景描写と今後の展開を提示してください。"].join('\n');
      await callAIGM(extraUserContext, "story");
    } finally { isRequestingRef.current = false; setIsLoading(false); }
  };

  const executeCreateRoom = async () => {
    if (!currentUser || !roomConfigModal) return;
    const { scenario, charId, privacy, message, difficulty, rule, itemVisibility, aiModel } = roomConfigModal;
    if (!charId) { alert("キャラクターを選択してください。"); return; }
    
    const isAuthor = scenario.authorId === currentUser.id;

    if (isTicketSystemEnabled && !isAuthor) {
      let requiredTicketKey = ''; let currentTickets = 0; let costName = '';
      if (aiModel === 'lite') { requiredTicketKey = 'tickets_bronze'; currentTickets = currentUser.ticketsBronze || 0; costName = 'ブロンズ'; }
      if (aiModel === 'flash') { requiredTicketKey = 'tickets_silver'; currentTickets = currentUser.ticketsSilver || 0; costName = 'シルバー'; }
      if (aiModel === 'pro') { requiredTicketKey = 'tickets_gold'; currentTickets = currentUser.ticketsGold || 0; costName = 'ゴールド'; }
      if (aiModel === 'claude') { requiredTicketKey = 'tickets_platinum'; currentTickets = currentUser.ticketsPlatinum || 0; costName = 'プラチナ'; }
      if (aiModel === 'opus') { requiredTicketKey = 'tickets_diamond'; currentTickets = currentUser.ticketsDiamond || 0; costName = 'ダイヤモンド'; }

      if (currentTickets < 1) {
        alert(`チケットが足りません！\n（${costName}チケットが1枚必要です）\nロビーの「チケット購入ストア」から入手してください。`);
        setShowTicketModal(true); return;
      }
      const { error: tErr } = await supabase.from('profiles').update({ [requiredTicketKey]: currentTickets - 1 }).eq('id', currentUser.id);
      if (tErr) { alert("チケットの消費処理に失敗しました。"); return; }

      setCurrentUser(prev => prev ? { 
        ...prev, ticketsBronze: aiModel === 'lite' ? (prev.ticketsBronze || 0) - 1 : prev.ticketsBronze, ticketsSilver: aiModel === 'flash' ? (prev.ticketsSilver || 0) - 1 : prev.ticketsSilver, ticketsGold: aiModel === 'pro' ? (prev.ticketsGold || 0) - 1 : prev.ticketsGold, ticketsPlatinum: aiModel === 'claude' ? (prev.ticketsPlatinum || 0) - 1 : prev.ticketsPlatinum, ticketsDiamond: aiModel === 'opus' ? (prev.ticketsDiamond || 0) - 1 : prev.ticketsDiamond
      } : null);
    }

    const hostChar = scenario.presetCharacters.find((c: any) => c.id === charId);
    if (!hostChar) return;

    const initialScenes: Scene[] = [{ id: `scene_main_${Date.now()}`, name: "メインルーム", memberIds: scenario.presetCharacters.map((c: any) => c.id) }];
    const initialInventories: Record<string, string> = {};
    scenario.presetCharacters.forEach((c: any) => { initialInventories[c.id] = c.items || "特になし"; });

    const { data, error } = await supabase.from('rooms').insert({ 
      scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: initialScenes, privacy: privacy, host_message: message, joined_users: { [currentUser.id]: charId }, current_summary: "", difficulty: difficulty, rule: rule, is_paused: false, afk_users: [], is_trial: false, item_visibility: itemVisibility, inventories: initialInventories, current_chapter_index: 0, ai_model: aiModel, error_refunded: false
    }).select().single();
    
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
      const currentSc = scenarios.find((s: any) => s.id === scenario.id);
      if (currentSc) await supabase.from('scenarios').update({ play_count: (currentSc.playCount || 0) + 1 }).eq('id', scenario.id);
      setRoomConfigModal(null); await fetchData();
      const newRoom: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users, current_summary: "", difficulty: data.difficulty, rule: data.rule, is_paused: false, afk_users: [], is_trial: false, item_visibility: data.item_visibility, inventories: data.inventories, current_chapter_index: 0, ai_model: data.ai_model, error_refunded: false };
      await supabase.from('ai_memory').delete().eq('room_id', newRoom.id);
      setActiveRoom(newRoom); setJoinedCharacter(hostChar); setMessages([]); 
      await pushMessage(newRoom.id, { sender: "system", text: `【入室完了】プレイヤー全員の準備が整うまでお待ちください。\n【案内】シークレット設定の場合、画面左上の「共有ID」をコピーして友人に伝えてください。`, type: "system", sceneId: newRoom.scenes?.[0]?.id, channel: "system" });
      setCurrentView("game");
    }
  };

  const executeTrialPlay = async () => {
    if (!currentUser || !adModal.scenario) return;
    const scenario = adModal.scenario;
    setAdModal({ isOpen: false, step: 0, scenario: null, room: null, type: 'trial' });

    const charId = scenario.presetCharacters[0]?.id;
    if (!charId) { alert("このシナリオにはプリセットキャラクターが設定されていないため、お試しプレイができません。"); return; }
    const hostChar = scenario.presetCharacters[0];
    
    const initialScenes: Scene[] = [{ id: `scene_main_${Date.now()}`, name: "メインルーム", memberIds: scenario.presetCharacters.map((c: any) => c.id) }];
    const initialInventories: Record<string, string> = {};
    scenario.presetCharacters.forEach((c: any) => { initialInventories[c.id] = c.items || "特になし"; });

    const { data, error } = await supabase.from('rooms').insert({ 
      scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: initialScenes, privacy: 'secret', host_message: "お試しプレイ", joined_users: { [currentUser.id]: charId }, current_summary: "", difficulty: "normal", rule: "coc_jp", is_paused: false, afk_users: [], is_trial: true, item_visibility: "none", inventories: initialInventories, current_chapter_index: 0, ai_model: 'lite', error_refunded: false 
    }).select().single();
    
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
      const currentSc = scenarios.find((s: any) => s.id === scenario.id);
      if (currentSc) await supabase.from('scenarios').update({ play_count: (currentSc.playCount || 0) + 1 }).eq('id', scenario.id);
      await fetchData();
      const newRoom: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users, current_summary: "", difficulty: data.difficulty, rule: data.rule, is_paused: false, afk_users: [], is_trial: true, item_visibility: "none", inventories: data.inventories, current_chapter_index: 0, ai_model: data.ai_model, error_refunded: false };
      await supabase.from('ai_memory').delete().eq('room_id', newRoom.id);
      setActiveRoom(newRoom); setJoinedCharacter(hostChar); setMessages([]); 
      const aiChars = scenario.presetCharacters.filter((c: any) => c.id !== charId); setAiPlayersList(aiChars);
      await pushMessage(newRoom.id, { sender: "system", text: `【お試しルーム作成完了】\n他のキャラクターはAIが担当します。\n右上の「▶お試し開始」ボタンを押してスタートしてください。`, type: "system", sceneId: newRoom.scenes?.[0]?.id, channel: "system" });
      setCurrentView("game");
    }
  };

  const executeJoinRoom = async (room: Room, charId: string) => {
    if (!currentUser || !room || !charId) return;

    const isAuthor = room.scenario?.authorId === currentUser.id;
    if (isTicketSystemEnabled && !isAuthor && !room.is_trial) {
      let requiredTicketKey = ''; let currentTickets = 0; let costName = '';
      if (room.ai_model === 'lite') { requiredTicketKey = 'tickets_bronze'; currentTickets = currentUser.ticketsBronze || 0; costName = 'ブロンズ'; }
      if (room.ai_model === 'flash') { requiredTicketKey = 'tickets_silver'; currentTickets = currentUser.ticketsSilver || 0; costName = 'シルバー'; }
      if (room.ai_model === 'pro') { requiredTicketKey = 'tickets_gold'; currentTickets = currentUser.ticketsGold || 0; costName = 'ゴールド'; }
      if (room.ai_model === 'claude') { requiredTicketKey = 'tickets_platinum'; currentTickets = currentUser.ticketsPlatinum || 0; costName = 'プラチナ'; }
      if (room.ai_model === 'opus') { requiredTicketKey = 'tickets_diamond'; currentTickets = currentUser.ticketsDiamond || 0; costName = 'ダイヤモンド'; }

      if (currentTickets < 1) { alert(`入室するためのチケットが足りません！\n（${costName}チケットが1枚必要です）\nロビーの「チケット購入ストア」から入手してください。`); setShowTicketModal(true); return; }
      if (!confirm(`この部屋に入室するには ${costName}チケット を1枚消費します。よろしいですか？`)) return;
      const { error: tErr } = await supabase.from('profiles').update({ [requiredTicketKey]: currentTickets - 1 }).eq('id', currentUser.id);
      if (tErr) { alert("チケットの消費処理に失敗しました。"); return; }
      setCurrentUser(prev => prev ? { 
        ...prev, ticketsBronze: room.ai_model === 'lite' ? (prev.ticketsBronze || 0) - 1 : prev.ticketsBronze, ticketsSilver: room.ai_model === 'flash' ? (prev.ticketsSilver || 0) - 1 : prev.ticketsSilver, ticketsGold: room.ai_model === 'pro' ? (prev.ticketsGold || 0) - 1 : prev.ticketsGold, ticketsPlatinum: room.ai_model === 'claude' ? (prev.ticketsPlatinum || 0) - 1 : prev.ticketsPlatinum, ticketsDiamond: room.ai_model === 'opus' ? (prev.ticketsDiamond || 0) - 1 : prev.ticketsDiamond
      } : null);
    }

    const { data: latestRoom } = await supabase.from('rooms').select('joined_users, inventories').eq('id', room.id).single();
    const currentUsers = latestRoom?.joined_users || {};
    const currentInventories = latestRoom?.inventories || {};

    if (Object.values(currentUsers).includes(charId)) { alert("申し訳ありません、そのキャラクターは先ほど他のプレイヤーに選択されました！"); await fetchData(); return; }

    const char = room.scenario?.presetCharacters.find((c: any) => c.id === charId);
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
    if (!currentUser) return;
    const newSpectators = [...(room.spectator_ids || []), currentUser.id];
    await supabase.from('rooms').update({ spectator_ids: newSpectators }).eq('id', room.id);
    const currentSc = scenarios.find((s: any) => s.id === room.scenario_id);
    if (currentSc) await supabase.from('scenarios').update({ view_count: (currentSc.viewCount || 0) + 1 }).eq('id', room.scenario_id);

    setActiveRoom({ ...room, spectator_ids: newSpectators }); setJoinedCharacter(null); await loadChatLogs(room.id);
    await pushMessage(room.id, { sender: "system", text: `【観戦モード】部屋に入室しました。チャットやダイスは使用できません。`, type: "system", sceneId: room.scenes?.[0]?.id, channel: "system" }, false);
    setCurrentView("game");
  };

  const startGame = async () => {
    if(!activeRoom || !activeRoom.scenario || !joinedCharacter || !myScene || isRequestingRef.current) return;
    isRequestingRef.current = true; setIsLoading(true);
    try {
      let aiChars: Character[] = [];
      const takenIds = Object.values(activeRoom.joined_users || {});
      const emptyChars = activeRoom.scenario.presetCharacters.filter((c: any) => !takenIds.includes(c.id));
      if (['pro', 'claude', 'opus'].includes(activeRoom.ai_model || '')) {
         if (emptyChars.length > 0 && !activeRoom.is_trial) alert("【お知らせ】ゴールド以上の部屋では、AIプレイヤーの参加はできません。");
      } else {
         if (emptyChars.length > 0) {
           if (activeRoom.is_trial) aiChars = emptyChars; 
           else if (confirm(`参加していないキャラクターが ${emptyChars.length} 人います。\n彼らを「AIプレイヤー（相棒）」として参加させますか？`)) aiChars = emptyChars;
         }
      }
      setAiPlayersList(aiChars);
      await supabase.from('rooms').update({ status: 'playing', is_paused: false }).eq('id', activeRoom.id);
      setActiveRoom({ ...activeRoom, status: 'playing', is_paused: false });
      await pushMessage(activeRoom.id, { sender: "system", text: `【システム】ゲームを開始しました。AI GMを呼び出しています...`, type: "system", sceneId: myScene.id, channel: "system" });
      const extraUserContext = `【システムコマンド】セッションが開始されました。\n以下の【設定されたプロローグ情報】に従い導入部分の情景描写を行ってください。\n\n【設定されたプロローグ情報】\n${activeRoom.scenario.prologue || "特になし"}\n\nまた、この導入部において、事態の把握や最初の試練として【必ずプレイヤー全員が最低1回はダイス判定を行わなければならない状況】を発生させてください。`;
      await callAIGM(extraUserContext, "story", true);
    } finally { isRequestingRef.current = false; setIsLoading(false); }
  };

  const endGame = async () => {
    if(!activeRoom) return;
    if (currentUser?.id === activeRoom.host_id || activeRoom.is_trial) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
      setActiveRoom({...activeRoom, status: 'finished'});
      await pushMessage(activeRoom.id, { sender: "system", text: `【システム】セッションが完了しました！\nこれより「感想戦モード」になります。`, type: "system", sceneId: myScene?.id, channel: "system" });
    }
  };

  const leaveGame = async () => {
    if (!activeRoom || !currentUser) return;
    if (activeRoom.status === 'finished') { setCurrentView("evaluation"); return; }
    if (!joinedCharacter) { 
      const newSpectators = (activeRoom.spectator_ids || []).filter((id: string) => id !== currentUser.id);
      await supabase.from('rooms').update({ spectator_ids: newSpectators }).eq('id', activeRoom.id);
      setCurrentView("lobby"); setActiveRoom(null); await fetchData(); return; 
    }

    const isHost = activeRoom.host_id === currentUser.id;
    const isRecruiting = activeRoom.status === 'recruiting';
    const remainingPlayers = Object.keys(activeRoom.joined_users || {}).filter((id: string) => id !== currentUser.id).length;

    if (isRecruiting) {
      const newUsers = { ...activeRoom.joined_users };
      delete newUsers[currentUser.id];
      await supabase.from('rooms').update({ joined_users: newUsers }).eq('id', activeRoom.id);
      if (isHost && remainingPlayers === 0) await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
      setCurrentView("lobby"); setActiveRoom(null); setJoinedCharacter(null); await fetchData(); return;
    }

    if (remainingPlayers === 0) {
      if (confirm("【警告】他に人間プレイヤーがいないため、退出すると部屋は完全に閉じられます。本当によろしいですか？")) {
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
    if (!input.trim() || isRequestingRef.current || !activeRoom || !joinedCharacter || !currentUser || !myScene) return;
    isRequestingRef.current = true; setIsLoading(true);
    try {
      const currentInput = input; setInput(""); 
      const isFinished = activeRoom.status === 'finished';
      const isRecruiting = activeRoom.status === 'recruiting';

      if (isFinished || isRecruiting || (chatTab === "consult" && !consultWithAI)) {
        await pushMessage(activeRoom.id, { sender: "player", text: currentInput, type: (isFinished || isRecruiting) ? "ooc" : "ic", sceneId: myScene.id, charName: joinedCharacter.name, channel: chatTab });
        return; 
      }
      await pushMessage(activeRoom.id, { sender: "player", text: currentInput, type: chatTab === "story" ? "ic" : "ooc", sceneId: myScene.id, charName: joinedCharacter.name, channel: chatTab });
      
      const teamPrefix = isSplitMode && myScene.id !== 'scene_main' ? `[${myScene.name}チーム - ${joinedCharacter.name}] ` : `${joinedCharacter.name}「`;
      const teamSuffix = isSplitMode && myScene.id !== 'scene_main' ? `` : `」`;
      let context = "";
      if (chatTab === "story") context = `【行動宣言】${teamPrefix}${currentInput}${teamSuffix}`;
      else if (chatTab === "consult") context = `【PL間相談】${teamPrefix}${currentInput}${teamSuffix}`;
      else context = `【GMへの質問】PL: ${currentInput}`;

      await callAIGM(context, chatTab);
    } finally { isRequestingRef.current = false; setIsLoading(false); }
  };

  const rollDice = async (targetValue: number, label: string, is1d100: boolean = false) => {
    if(!myScene || !activeRoom || isRequestingRef.current || !joinedCharacter) return;
    isRequestingRef.current = true; setIsLoading(true);
    try {
      let res = 0; let isSuccess = false; let msgText = "";
      const rule = activeRoom.rule || "coc_jp";

      if (rule === "dnd") {
        res = Math.floor(Math.random() * 20) + 1;
        const modifier = Math.floor((targetValue - 10) / 2) || 0;
        const total = res + modifier; const dc = 12; 
        isSuccess = total >= dc;
        if (res === 20) isSuccess = true; if (res === 1) isSuccess = false;
        const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
        msgText = `🎲 ${label}判定 (1d20${modStr}) ➔ 出目: ${res} (計: ${total}) vs DC${dc} 【${isSuccess ? "成功" : "失敗"}】`;
      } else if (rule === "sw25") {
        const d1 = Math.floor(Math.random() * 6) + 1; const d2 = Math.floor(Math.random() * 6) + 1;
        res = d1 + d2; const bonus = Math.floor(targetValue / 6) || 0; 
        const total = res + bonus; const target = 10;
        isSuccess = total >= target; const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
        msgText = `🎲 ${label}判定 (2d6${bonusStr}) ➔ 出目: ${res}[${d1},${d2}] (計: ${total}) vs 目標${target} 【${isSuccess ? "成功" : "失敗"}】`;
      } else if (rule === "storytelling") {
        res = Math.floor(Math.random() * 6) + 1; isSuccess = res >= 4;
        msgText = `🎲 ${label}判定 (1d6) ➔ 出目: ${res} 【${isSuccess ? "成功" : "失敗"}】`;
      } else {
        if (is1d100) {
          res = Math.floor(Math.random() * 100) + 1; isSuccess = res <= targetValue;
          msgText = `🎲 ${label} (1d100 ≦ ${targetValue}%) ➔ 出目: ${res} 【${isSuccess ? "成功" : "失敗"}】`;
        } else {
          const d1 = Math.floor(Math.random() * 6) + 1; const d2 = Math.floor(Math.random() * 6) + 1; const d3 = Math.floor(Math.random() * 6) + 1;
          res = d1 + d2 + d3; isSuccess = res <= targetValue;
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
          
          let diceModel = 'flash'; // ダイス判定用デフォルト
          if (['claude', 'opus', 'pro', 'flash'].includes(activeRoom.ai_model || '')) diceModel = 'flash';
          else diceModel = 'lite';
          
          await callAIGM(`【システム判定結果】${joinedCharacter.name}が${label}ロールを行いました。\n結果: ${msgText}\n${promptSuffix}`, chatTab, false, diceModel);
      }
    } finally { isRequestingRef.current = false; setIsLoading(false); }
  };

  const callAIGM = async (extraUserContext?: string, targetTab: ChatTab = "story", isStarting: boolean = false, forcedModel?: string) => {
    if (!activeRoom || !joinedCharacter || !myScene) return;
    if (!isStarting && activeRoom.status !== 'playing') return;
    setIsLoading(true);
    
    try {
      if (extraUserContext) await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'user', content: extraUserContext });
      const { data: memoryDataRaw } = await supabase.from('ai_memory').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: true });
      let currentMemory = memoryDataRaw || [];
      let currentSummary = activeRoom.current_summary || "";

      // ----------------------------------------------------
      // ★ 裏側のシステム処理（あらすじ圧縮等）
      // ----------------------------------------------------
      const contextLimit = 15;
      const compressionThreshold = contextLimit + 5; 

      if (currentMemory.length > compressionThreshold) {
        const logsToCompress = currentMemory.slice(0, currentMemory.length - contextLimit);
        const recentLogs = currentMemory.slice(-contextLimit);
        const logText = logsToCompress.map((m: any) => `${m.role === 'user' ? 'PL' : 'GM'}: ${m.content}`).join('\n');
        const compressionPrompt = ["あなたはTRPGの優秀な記録係です。以下の「現在のあらすじ」と「追加のチャットログ」を統合し、AI GMが今後の展開を処理するための【詳細な最新のあらすじ】を作成してください。","【絶対条件】","・重要な出来事、NPCとの会話結果、得たアイテムやヒント、PLの目的は絶対に漏らさないこと。","・システムやダイスの結果等のメタな情報は省略し、物語の進行を中心にまとめること。","","【現在のあらすじ】",currentSummary || "なし（最初の要約です）","","【追加のチャットログ】",logText].join('\n');
        try {
          currentSummary = await generateAITextWithPrompt(compressionPrompt, 'lite', 1000, 0.3);
          await supabase.from('rooms').update({ current_summary: currentSummary }).eq('id', activeRoom.id);
          setActiveRoom(prev => prev ? { ...prev, current_summary: currentSummary } : null);
          const idsToDelete = logsToCompress.map((m: any) => m.id);
          if (idsToDelete.length > 0) await supabase.from('ai_memory').delete().in('id', idsToDelete);
          currentMemory = recentLogs;
        } catch(e) { currentMemory = currentMemory.slice(-(contextLimit + 5)); }
      }

      let activeNpcListText = "";
      if (activeRoom.scenario?.npcList) {
         try {
            const recentLogsContext = currentMemory.slice(-5).map((m: any) => m.content).join('\n');
            const npcFilterPrompt = `以下の【全NPCリスト】から、直近のログと現在のあらすじに登場している、または今後すぐに関わりそうなNPCの情報だけを抜粋してそのまま出力してください。不要なNPCは省いてください。\n\n【全NPCリスト】\n${activeRoom.scenario.npcList}\n\n【あらすじとログ】\n${currentSummary}\n${recentLogsContext}`;
            activeNpcListText = await generateAITextWithPrompt(npcFilterPrompt, 'lite', 500, 0.2);
         } catch(e) { activeNpcListText = activeRoom.scenario?.npcList; }
      }

      const history = currentMemory.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      if (history.length === 0) history.push({ role: 'user', parts: [{ text: "セッションを開始してください。" }]});

      const aiPlayersText = aiPlayersList.length > 0 ? aiPlayersList.map((c: any) => `・${c.name} (${c.genderOrRace || "性別不詳"}) | HP:${c.hp} SAN:${c.san}% STR:${c.str} DEX:${c.dex} INT:${c.int} CON:${c.con}\n 設定: ${c.personality}`).join("\n\n") : "なし（ソロプレイ）";
      const afkNames = (activeRoom.afk_users || []).map((uid: string) => { const cId = activeRoom.joined_users?.[uid]; return activeRoom.scenario?.presetCharacters.find((c: any) => c.id === cId)?.name; }).filter(Boolean).join(", ");
      const afkInstruction = afkNames ? `\n【AFK（離席中）のプレイヤー】\n${afkNames}\n※このプレイヤーは現在離席中なので、行動を促したり意見を求めたりしないでください。` : "";

      const inventoryTextLines: string[] = [];
      if (activeRoom.item_visibility && activeRoom.item_visibility !== 'none') {
        inventoryTextLines.push("","【現在の全キャラクターの所持アイテム】");
        activeRoom.scenario?.presetCharacters.forEach((c: any) => {
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
      } catch(e) { chapters = [{ title: "本編", content: activeRoom.scenario?.plot || "" }]; }
      
      const currentChapIndex = activeRoom.current_chapter_index || 0;
      const currentChapter = chapters[currentChapIndex] || chapters[chapters.length - 1];
      const isLastChapter = currentChapIndex >= chapters.length - 1;

      const chapterProgress = chapters.map((c: any, idx: number) => {
        if (idx < currentChapIndex) return `[クリア済] 第${idx + 1}章: ${c.title}`;
        if (idx === currentChapIndex) return `[★現在進行中] 第${idx + 1}章: ${c.title}`;
        return `[未到達（ネタバレ厳禁）] 第${idx + 1}章: ${c.title}`;
      }).join('\n');

      let scenarioPlotText = `【物語の全体構成（全${chapters.length}章）】\n${chapterProgress}\n\n【現在（第${currentChapIndex + 1}章）のプロット・台本】\n${currentChapter.content}`;

      let difficultyInstruction = "";
      switch (activeRoom.difficulty) {
        case "beginner": difficultyInstruction = "【難易度：初心者】接待プレイです。困っていればヒントや選択肢を出しても構いません。"; break;
        case "easy": difficultyInstruction = "【難易度：簡単】判定が通りやすく、探索で見つかる情報を多めに描写してください。ただし露骨な解法の指示は避けてください。"; break;
        case "normal": difficultyInstruction = "【難易度：普通】【ヒント・誘導・選択肢の提示・次期目標の指示は完全禁止】純粋な情景描写と結果のみを出力してください。「次は〜が残されています」「〜しましょう」といったタスクリストや次期目標の提示、解法の匂わせ（「※〜があるかもしれません」「〜が必要」等）は絶対に書かないでください。"; break;
        case "hard": difficultyInstruction = "【難易度：難しい】【ノーヒント・厳格】解法のヒントや補足、目標の提示は一切禁止。PLから具体的な探索宣言がない限りオブジェクトの存在すら明かさないでください。判定失敗時は即座に状況を悪化させてください。"; break;
        case "pro": difficultyInstruction = "【難易度：プロ】【容赦ない本格派】一切のヒントや誘導を禁止。PLの軽率な行動には即座に致命的なペナルティやロストの危機を与えてください。"; break;
        case "oni": difficultyInstruction = "【難易度：鬼】【理不尽・極限】一切の手加減・ヒントを排除。死と隣り合わせの無慈悲な描写を徹底してください。"; break;
        default: difficultyInstruction = "【難易度：普通】【ヒント・誘導・選択肢の提示・次期目標の指示は完全禁止】純粋な情景描写と結果のみを出力してください。";
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

      const sysPrompt = getGMSystemPrompt(activeRoom.ai_model || 'lite', {
        title: activeRoom.scenario?.title, setting: activeRoom.scenario?.setting, scenarioPlotText, currentSummary, joinedCharacter, inventoryText, aiPlayersText, ruleSpec, gmStyle, difficultyInstruction, isTrial: activeRoom.is_trial, mySceneName: myScene.name, isSplitMode, afkInstruction, targetTab, activeNpcListText
      });

      let finalModel = forcedModel || activeRoom.ai_model || 'lite';
      if (!forcedModel) {
        if (targetTab === "consult") finalModel = 'lite';
        else if (targetTab === "gm") finalModel = ['claude', 'opus', 'pro', 'flash'].includes(activeRoom.ai_model || '') ? 'flash' : 'lite';
      }

      const outputTokens = 3000;
      const aiTextRaw = await generateAIResponse(sysPrompt, history, finalModel, outputTokens, 0.7);
      
      let parsedAI = { text: "", statusUpdates: [], inventoryUpdates: [], chapterClear: false };
      try {
        const jsonStr = aiTextRaw.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedAI = JSON.parse(jsonStr);
      } catch (e) { parsedAI.text = aiTextRaw; }

      if (parsedAI.statusUpdates && Array.isArray(parsedAI.statusUpdates)) {
        let hpSanUpdated = false;
        parsedAI.statusUpdates.forEach((upd: any) => {
           if (upd.name && joinedCharacter && joinedCharacter.name.replace(/\s+/g, '').includes(upd.name.replace(/\s+/g, ''))) {
             setJoinedCharacter(prev => prev ? { ...prev, hp: upd.hp, san: upd.san } : null);
           }
           setAiPlayersList(prev => {
             const newAi = [...prev];
             const idx = newAi.findIndex(p => p.name.replace(/\s+/g, '').includes(upd.name.replace(/\s+/g, '')));
             if (idx !== -1) { newAi[idx] = { ...newAi[idx], hp: upd.hp, san: upd.san }; hpSanUpdated = true; }
             return newAi;
           });
        });
      }

      let invUpdated = false;
      let newInventories = { ...(activeRoom.inventories || {}) };
      if (parsedAI.inventoryUpdates && Array.isArray(parsedAI.inventoryUpdates)) {
        parsedAI.inventoryUpdates.forEach((upd: any) => {
           if (upd.name && upd.items) {
             const char = activeRoom.scenario?.presetCharacters.find((c: any) => c.name.replace(/\s+/g, '').includes(upd.name.replace(/\s+/g, '')));
             if (char) { newInventories[char.id] = upd.items; invUpdated = true; }
           }
        });
      }
      if (invUpdated) {
         await supabase.from('rooms').update({ inventories: newInventories }).eq('id', activeRoom.id);
         setActiveRoom(prev => prev ? { ...prev, inventories: newInventories } : null);
      }

      let cleanAiText = parsedAI.text || aiTextRaw;
      let isChapterCleared = parsedAI.chapterClear === true;

      const splitMatch = cleanAiText.match(/\[SPLIT_PROPOSAL:\s*(.+?)\]/);
      if (splitMatch) { setProposedTeams([]); generateSplitProposal(); cleanAiText = cleanAiText.replace(/\[SPLIT_PROPOSAL:.*?\]/g, '').trim(); }
      cleanAiText = cleanAiText.replace(/\[STATUS_UPDATE:.*?\]/g, '').replace(/\[INVENTORY_UPDATE:.*?\]/g, '').trim();

      if (activeRoom.is_trial && (cleanAiText.includes('本編でお楽しみください') || cleanAiText.includes('本編でお待ち')) && !cleanAiText.includes('[SCENARIO_END]')) {
        cleanAiText += '\n\n[SCENARIO_END]';
      }
      if (isChapterCleared && isLastChapter && !cleanAiText.includes('[SCENARIO_END]')) {
        cleanAiText += '\n\n[SCENARIO_END]';
      }

      await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'assistant', content: cleanAiText });
      const msgSender = targetTab === "consult" ? "ai_player" : "gm";
      await pushMessage(activeRoom.id, { sender: msgSender, text: cleanAiText, type: targetTab === "gm" ? "ooc" : "ic", sceneId: myScene?.id, charName: targetTab === "consult" ? "AI相棒" : "AI GM", channel: targetTab });

      if (isChapterCleared) {
         if (activeRoom.is_trial) {
           const endText = '【お試しプレイはここまでです！続きはチケットを消費して本編の部屋を作成してお楽しみください】\n\n[SCENARIO_END]';
           await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'assistant', content: endText });
           await pushMessage(activeRoom.id, { sender: "system", text: endText, type: "system", sceneId: myScene?.id, channel: "system" }, false);
           await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
           setActiveRoom(prev => prev ? { ...prev, status: 'finished' } : null);
         } else if (!isLastChapter) {
           const nextIndex = currentChapIndex + 1;
           await supabase.from('rooms').update({ current_chapter_index: nextIndex }).eq('id', activeRoom.id);
           setActiveRoom(prev => prev ? { ...prev, current_chapter_index: nextIndex } : null);
           await pushMessage(activeRoom.id, { sender: "system", text: `【システム】チャプター「${currentChapter.title}」をクリアしました！\n物語は次章「${chapters[nextIndex].title}」へ進行します...`, type: "system", sceneId: myScene?.id, channel: "system" }, false);
           await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'user', content: `【システム情報：第${nextIndex+1}章（${chapters[nextIndex].title}）に突入しました。これまでの状況を踏まえ、次の展開を描写してください】` });
         } else {
           await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
           setActiveRoom(prev => prev ? { ...prev, status: 'finished' } : null);
           await pushMessage(activeRoom.id, { sender: "system", text: `【システム】全シナリオをクリアしました！お疲れ様でした。\nこれより「感想戦モード」になります。`, type: "system", sceneId: myScene?.id, channel: "system" }, false);
         }
      }
    } catch (err: any) { 
      // ★ エラー時のチケット自動返還ロジック
      if (!activeRoom.error_refunded) {
        const model = activeRoom.ai_model || 'lite';
        let ticketKey = 'tickets_bronze';
        let ticketName = 'ブロンズチケット';

        if (model === 'flash') { ticketKey = 'tickets_silver'; ticketName = 'シルバーチケット'; }
        if (model === 'pro') { ticketKey = 'tickets_gold'; ticketName = 'ゴールドチケット'; }
        if (model === 'claude') { ticketKey = 'tickets_platinum'; ticketName = 'プラチナチケット'; }
        if (model === 'opus') { ticketKey = 'tickets_diamond'; ticketName = 'ダイヤモンドチケット'; }

        await supabase.from('rooms').update({ error_refunded: true }).eq('id', activeRoom.id);
        setActiveRoom(prev => prev ? { ...prev, error_refunded: true } : null);

        if (currentUser) {
          const currentAmount = (currentUser as any)[ticketKey] || 0;
          const newAmount = currentAmount + 1;
          await supabase.from('profiles').update({ [ticketKey]: newAmount }).eq('id', currentUser.id);
          setCurrentUser(prev => prev ? { ...prev, [ticketKey]: newAmount } : null);
        }

        await pushMessage(activeRoom.id, { sender: "system", text: `【システムエラー】AIが混雑、または応答に失敗しました。\nお詫びとして消費した「${ticketName}」を1枚自動返還しました。`, type: "system", sceneId: myScene?.id, channel: "system" }, false);
      } else {
        await pushMessage(activeRoom.id, { sender: "system", text: `【システムエラー】AIが混雑しています。時間を置いて再度お試しください。`, type: "system", sceneId: myScene?.id, channel: "system" }, false);
      }
      
      if (currentUser) {
         const recentLogs = messages.slice(-5).map((m: any) => `${m.charName || m.sender}: ${m.text}`).join('\n');
         await supabase.from('reports').insert({ reporter_id: currentUser.id, target_type: 'room', target_id: activeRoom.id, room_id: activeRoom.id, reason: `【自動記録：AIシステムエラー】\nエラー内容: ${err.message}\nタブ: ${targetTab}\n直前の入力: ${extraUserContext || "なし"}\n\n【直近のチャットログ】\n${recentLogs}`, status: 'pending' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabClick = (tab: ChatTab) => {
    setChatTab(tab); setUnreadIndicators(prev => ({ ...prev, [tab]: false }));
  };

  const updateInventory = async (newItems: string) => {
    if (!activeRoom || !currentUser) return;
    const newInventories = { ...activeRoom.inventories, [currentUser.id]: newItems };
    await supabase.from('rooms').update({ inventories: newInventories }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, inventories: newInventories });
  };

  const saveToArchive = async (silent: boolean = false) => {
    if (!currentUser || !activeRoom || !joinedCharacter) return;
    const isOwn = activeRoom.scenario?.authorId === currentUser.id;

    if (isTicketSystemEnabled && !isOwn) {
      if ((currentUser.ticketsItem || 0) < 1) {
        if(!silent) { alert("アイテムチケットが足りません！（必要: 1枚）\n※自身の作成したシナリオは無料で保存できます。"); setShowTicketModal(true); }
        return;
      }
      if(!silent && !confirm("書庫への保存には アイテムチケット が 1枚 必要です。保存しますか？")) return;
      const { error: tErr } = await supabase.from('profiles').update({ tickets_item: (currentUser.ticketsItem || 0) - 1 }).eq('id', currentUser.id);
      if (tErr) { if(!silent) alert("チケットの消費に失敗しました。"); return; }
      setCurrentUser(prev => prev ? { ...prev, ticketsItem: (prev.ticketsItem || 0) - 1 } : null);
    }

    const endIndex = messages.findIndex((m: any) => m.text.includes('[SCENARIO_END]'));
    const baseMessages = endIndex !== -1 ? messages.slice(0, endIndex + 1) : messages;

    const userIds = Object.keys(activeRoom.joined_users || {});
    const { data: profiles } = await supabase.from('profiles').select('id, handle_name').in('id', userIds);
    const profileMap: Record<string, string> = {};
    if (profiles) profiles.forEach((p: any) => { profileMap[p.id] = p.handle_name; });
    const coPlayers = Object.values(profileMap).filter((name: any) => name !== currentUser?.handleName);

    const charactersWithPlayers = activeRoom.scenario?.presetCharacters.map((c: any) => {
      const uid = Object.keys(activeRoom.joined_users || {}).find((k: string) => activeRoom.joined_users![k] === c.id);
      return { ...c, playerName: uid ? profileMap[uid] : 'AI相棒' };
    }) || [];

    const archiveTitle = activeRoom.is_trial ? `【体験版】${activeRoom.scenario?.title || "不明なシナリオ"}` : activeRoom.scenario?.title || "不明なシナリオ";

    const { data, error } = await supabase.from('play_archives').insert({ 
      user_id: currentUser.id, scenario_id: activeRoom.scenario?.id || activeRoom.scenario_id, scenario_title: archiveTitle, scenario_image: activeRoom.scenario?.imageUrl || "", character_name: joinedCharacter.name, chat_logs: baseMessages, rule: activeRoom.rule, co_players: coPlayers, characters: charactersWithPlayers 
    }).select().single();
    
    if (error) { 
      if(!silent) alert("書庫への保存に失敗しました: " + error.message); 
    } else {
      setPlayArchives(prev => [data, ...prev]);
      if(!silent) { alert("プレイ履歴を書庫に保存しました！"); setCurrentView("library"); }
    }
  };

  const executeExport = async (title: string, sourceMessages: Message[], type: 'chat' | 'summary' | 'novel', options?: { archiveId?: string, modelName?: string, viewPoint?: 'third' | 'first', myCharacterName?: string, scenarioImage?: string, createdAt?: string, coPlayers?: string[], characters?: Character[], scenarioId?: string, authorId?: string, aiModelConfirmed?: boolean, aiModel?: string, tone?: string }) => {
    if (type === 'novel' && !options?.aiModelConfirmed) {
      setNovelSettingsModal({ title, sourceMessages, type, options: { ...options, tone: 'light' }, aiModel: 'flash' });
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert("ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。"); return; }
    printWindow.document.write('<div style="padding: 20px; font-family: sans-serif; color: #333;">生成中...しばらくお待ちください。（AI執筆中の場合は数十秒かかることがあります）</div>');

    const targetMessages = sourceMessages.filter((m: any) => m.channel !== 'gm');
    let contentHtml = "";

    const commonStyle = `<style>body { font-family: sans-serif; color: #333; margin: 0; padding: 0; background: #f9f9f9; } .page { background: #fff; max-width: 800px; margin: 20px auto; padding: 60px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px; } .page-break { page-break-before: always; margin-top: 40px; padding-top: 40px; border-top: 2px dashed #ccc; } @media print { body { background: #fff; } .page { box-shadow: none; margin: 0; padding: 0; } .page-break { border-top: none; padding-top: 0; margin-top: 0; } } .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; } .cover img { max-width: 80%; max-height: 50vh; object-fit: contain; border-radius: 8px; margin-bottom: 30px; } .character-intro { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 40px; } .character-intro img { width: 140px; height: 140px; object-fit: cover; border-radius: 8px; flex-shrink: 0; } .character-info h3 { margin: 0 0 10px 0; border-bottom: 2px solid #10b981; padding-bottom: 5px; } .no-image { width: 140px; height: 140px; background: #eee; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; flex-shrink: 0; } .novel-body { white-space: pre-wrap; line-height: 1.9; font-size: 15px; } .novel-image { text-align: center; margin: 40px 0; } .novel-image img { max-width: 100%; max-height: 400px; border-radius: 8px; }</style>`;

    const coverHtml = `<div class="cover">${options?.scenarioImage ? `<img src="${options.scenarioImage}" />` : ''}<h1>${title}</h1><div class="meta"><p>プレイ日時: ${options?.createdAt ? new Date(options.createdAt).toLocaleString() : '不明'}</p><p>参加プレイヤー: ${options?.coPlayers?.length ? options.coPlayers.join(', ') : 'ソロプレイ'}</p></div></div>`;

    const generateCharsHtml = (introMap: Record<string, string> = {}) => {
      let charsToRender = options?.characters || [];
      if (charsToRender.length === 0) {
        charsToRender = Object.keys(introMap).map(name => ({ id: name, name: name, job: '探索者', personality: introMap[name], imageUrl: '', hp: 0, san: 0, str: 0, dex: 0, int: 0, con: 0, wis: 0, cha: 0, playerName: 'プレイヤー' }));
      }
      const chunks = [];
      const chunkSize = 3;
      for (let i = 0; i < charsToRender.length; i += chunkSize) { chunks.push(charsToRender.slice(i, i + chunkSize)); }
      return chunks.map((chunk: any, chunkIdx: number) => `
        <div class="page-break">
          ${chunkIdx === 0 ? '<h2 style="text-align: center; margin-bottom: 40px; font-size: 24px; color: #2c3e50;">登場キャラクター</h2>' : ''}
          ${chunk.map((c: any) => {
            const matchedKey = Object.keys(introMap).find((k: string) => k.includes(c.name) || c.name.includes(k));
            const introText = matchedKey ? introMap[matchedKey] : (c.personality || '情報なし');
            const playerName = c.playerName ? c.playerName : 'AI相棒';
            return `<div class="character-intro">${c.imageUrl ? `<img src="${c.imageUrl}" />` : `<div class="no-image">No Image</div>`}<div class="character-info"><h3>${c.name} <span style="font-size:14px; font-weight:normal; color:#666;">（PL: ${playerName}）</span></h3><p><strong>【特徴・活躍】</strong><br/>${introText}</p></div></div>`;
          }).join('')}
        </div>`).join('');
    };

    if (type === 'chat') {
      const chatHtml = targetMessages.map((m: any) => {
        if (m.type === 'image' && m.imageUrl) return `<div style="margin-bottom: 12px; border-bottom: 1px dashed #eee; padding-bottom: 8px;"><strong style="color: #2c3e50;">AI GM (画像)</strong><br><img src="${m.imageUrl}" style="max-width: 300px; border-radius: 8px;" /><br><span style="white-space: pre-wrap; color: #34495e;">${m.text}</span></div>`;
        const senderName = m.charName || (m.sender === "player" ? "プレイヤー" : m.sender === "gm" ? "AI GM" : "システム");
        const text = m.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim();
        if (!text) return "";
        return `<div style="margin-bottom: 12px; border-bottom: 1px dashed #eee; padding-bottom: 8px;"><strong style="color: #2c3e50;">${senderName}</strong><br><span style="white-space: pre-wrap; color: #34495e;">${text}</span></div>`;
      }).join('');
      contentHtml = `${commonStyle}<div class="page">${coverHtml}${generateCharsHtml()}<div class="page-break"><h2 style="text-align: center; margin-bottom: 40px;">チャットログ</h2>${chatHtml}</div></div>`;
    } else {
      setIsExporting(true);
      let imageCounter = 0; const imagesList: string[] = [];
      const logTextForAI = targetMessages.map((m: any) => {
        if (m.type === 'image' && m.imageUrl) { imagesList.push(m.imageUrl); imageCounter++; return `[IMAGE_ID: ${imageCounter}] (ここに情景画像が生成されました: ${m.text})`; }
        return `${m.charName || (m.sender === 'gm' ? 'GM' : 'システム')}: ${m.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim()}`;
      }).join('\n');

      const viewpointInstruction = options?.viewPoint === 'first' && options?.myCharacterName ? `1. 単調な事実の羅列を避け、五感を刺激する情景描写と心理描写を大幅に肉付けすること。また、【${options.myCharacterName}】の視点（一人称）で物語を描写すること。` : `1. 単調な事実の羅列を避け、五感を刺激する情景描写と心理描写を大幅に肉付けすること。神の視点（第三者視点）で物語を描写すること。`;
      const uniqueCharNames = Array.from(new Set(targetMessages.filter((m: any) => m.sender === 'player' || m.sender === 'ai_player').map((m: any) => m.charName).filter(Boolean)));
      const charNamesStr = uniqueCharNames.length > 0 ? `登場キャラクター（${uniqueCharNames.join('、')}）` : '各キャラクター';
      const prompt = getNovelPrompt(options?.aiModel || 'flash', viewpointInstruction, charNamesStr, options?.tone || 'light');
      
      try {
        let aiModelToUse = options?.aiModel || 'flash'; 
        if (aiModelToUse === 'flash') aiModelToUse = geminiFlashModel === '3.5-lite' ? 'flash-lite' : 'flash';
        
        const generatedText = await generateAITextWithPrompt(prompt + "\n\n【チャットログ】\n" + logTextForAI, aiModelToUse, 3000, 0.8);
        
        let introMap: Record<string, string> = {}; let finalNovelText = generatedText;
        if (generatedText.includes('[NOVEL_START]')) {
          const parts = generatedText.split('[NOVEL_START]');
          finalNovelText = parts[1].trim();
          const introRegex = /\[CHAR_INTRO:\s*(.+?)\]([\s\S]*?)(?=\[CHAR_INTRO:|$)/g;
          let m; while ((m = introRegex.exec(parts[0])) !== null) introMap[m[1].trim()] = m[2].trim();
        }

        imagesList.forEach((imgUrl: any, idx: number) => {
          finalNovelText = finalNovelText.replace(new RegExp(`\\[IMAGE_ID:\\s*${idx + 1}\\]`, 'g'), `</div><div class="novel-image"><img src="${imgUrl}" /></div><div class="novel-body">`);
        });

        contentHtml = `${commonStyle}<div class="page">${coverHtml}${generateCharsHtml(introMap)}<div class="page-break"><h2 style="text-align: center; margin-bottom: 40px;">本編</h2><div class="novel-body">${finalNovelText}</div></div></div>`;

        if (options?.archiveId && type === 'novel' && options.modelName) {
          const archive = playArchives.find((a: any) => a.id === options.archiveId);
          if (archive) {
            const updatedNovels = { ...(archive.novels || {}), [options.modelName]: contentHtml }; 
            await supabase.from('play_archives').update({ novels: updatedNovels }).eq('id', options.archiveId);
            setPlayArchives(prev => prev.map((a: any) => a.id === options.archiveId ? { ...a, novels: updatedNovels } : a));
          }
        }
      } catch(e: any) { alert("エクスポート生成エラー: " + e.message); setIsExporting(false); printWindow.close(); return; }
      setIsExporting(false);
    }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${contentHtml}<script>setTimeout(() => { if('${type}' === 'chat') { window.print(); window.close(); } }, 500);</script></body></html>`);
    printWindow.document.close();
  };

  const handleStartNovel = async () => {
    if (!novelSettingsModal || !currentUser) return;
    const { title, sourceMessages, type, options, aiModel } = novelSettingsModal;
    if (isTicketSystemEnabled) {
      if ((currentUser.ticketsItem || 0) < 1) { alert(`アイテムチケットが足りません！\nロビーの「チケット購入ストア」から入手してください。`); setShowTicketModal(true); return; }
      if (!confirm(`小説化を開始します。\nアイテムチケットを 1 枚消費しますか？`)) return;
      const { error } = await supabase.from('profiles').update({ tickets_item: (currentUser.ticketsItem || 0) - 1 }).eq('id', currentUser.id);
      if (error) { alert("チケットの消費に失敗しました。"); return; }
      setCurrentUser(prev => prev ? { ...prev, ticketsItem: (prev.ticketsItem || 0) - 1 } : null);
    }
    setNovelSettingsModal(null);
    executeExport(title, sourceMessages, type, { ...options, aiModelConfirmed: true, aiModel });
  };

  const exportToPDF = async (type: 'chat' | 'summary' | 'novel', viewPoint: 'third' | 'first' = 'third') => {
    if (!activeRoom) return;
    const endIndex = messages.findIndex((m: any) => m.text.includes('[SCENARIO_END]'));
    const baseMessages = endIndex !== -1 ? messages.slice(0, endIndex + 1) : messages;

    const userIds = Object.keys(activeRoom.joined_users || {});
    const { data: profiles } = await supabase.from('profiles').select('id, handle_name').in('id', userIds);
    const profileMap: Record<string, string> = {};
    if (profiles) profiles.forEach((p: any) => { profileMap[p.id] = p.handle_name; });

    const charactersWithPlayers = activeRoom.scenario?.presetCharacters.map((c: any) => {
      const uid = Object.keys(activeRoom.joined_users || {}).find((k: string) => activeRoom.joined_users![k] === c.id);
      return { ...c, playerName: uid ? profileMap[uid] : 'AI相棒' };
    }) || [];

    await executeExport(
      activeRoom.scenario?.title || "名称未設定", baseMessages, type, 
      { scenarioImage: activeRoom.scenario?.imageUrl, createdAt: new Date().toISOString(), coPlayers: Object.values(profileMap).filter((name: any) => name !== currentUser?.handleName), characters: charactersWithPlayers, viewPoint: viewPoint, myCharacterName: joinedCharacter?.name, scenarioId: activeRoom.scenario?.id, authorId: activeRoom.scenario?.authorId }
    );
  };

  // ★ 2. 広告動画視聴（ログインボーナス）の完了処理
  const executeAdReward = async () => {
    if (!currentUser) return;
    const today = new Date().toLocaleDateString('ja-JP');
    const newCount = adViewInfo.date === today ? adViewInfo.count + 1 : 1;
    const newPoints = (currentUser.points || 0) + 20;

    await supabase.from('profiles').update({ points: newPoints, ad_view_count: newCount, last_ad_view_date: today }).eq('id', currentUser.id);
    setCurrentUser(prev => prev ? { ...prev, points: newPoints } : null);
    setAdViewInfo({ count: newCount, date: today });
    
    alert("動画視聴ボーナス！ 20pt を獲得しました！");
    setAdModal({ isOpen: false, step: 0, scenario: null, room: null, type: 'trial' });
  };

  const unreadCount = myNotifications.filter((n: any) => !n.isRead).length;
  const isChatDisabled = Boolean(isLoading || (isSplitMode && myScene && myScene.isMerged === true && chatTab !== 'consult'));

  return (
    <main className="h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {currentView === "library" && currentUser && (
        <LibraryView 
          currentUser={currentUser} playArchives={playArchives} setCurrentView={setCurrentView} executeExport={executeExport} isExporting={isExporting} allScenarios={scenarios} openRoomConfigModal={handleOpenRoomConfig}
        />
      )}

      {currentView === "userProfile" && currentUser && (
        <UserProfileView 
          currentUser={currentUser} targetUserId={targetUserId} setCurrentView={setCurrentView} allScenarios={scenarios} updateProfile={updateProfile} blockUser={blockUser} unblockUser={unblockUser} addFriend={addFriend} activeRooms={rooms} executeSpectateWithAd={(room: any) => setAdModal({ isOpen: true, step: 1, scenario: null, room: room, type: 'spectate' })} openRoomConfigModal={handleOpenRoomConfig} openUserProfile={openUserProfile}
        />
      )}

      {currentView === "admin" && currentUser?.isAdmin && (
        <AdminView
          isMaintenance={isMaintenance} toggleMaintenance={toggleMaintenance} isTicketSystemEnabled={isTicketSystemEnabled} toggleTicketSystem={toggleTicketSystem} geminiFlashModel={geminiFlashModel} toggleGeminiFlashModel={toggleGeminiFlashModel} reports={reports} allUsers={allUsers} scenarios={scenarios} resolveReport={resolveReport} setBanTargetUser={setBanTargetUser} setBanReason={setBanReason} setBanTargetScenario={setBanTargetScenario} setScenarioBanReason={setScenarioBanReason} unbanScenarioFromAppeal={unbanScenarioFromAppeal} userSearchQuery={userSearchQuery} setUserSearchQuery={setUserSearchQuery} toggleAdminStatus={toggleAdminStatus} toggleTesterStatus={toggleTesterStatus} unbanUser={unbanUser} scenarioSearchQuery={scenarioSearchQuery} setScenarioSearchQuery={setScenarioSearchQuery} setCurrentView={setCurrentView} executeCreateTester={executeCreateTester} openUserActionModal={(user: any) => setAdminActionUser(user)}
        />
      )}

      {currentView === "banned" && <BannedView handleLogout={handleLogout} />}
      {currentView === "maintenance" && <MaintenanceView handleLogout={handleLogout} />}
      
      {currentView === "login" && (
        <LoginView email={email} setEmail={setEmail} password={password} setPassword={setPassword} authLoading={authLoading} handleEmailAuth={handleEmailAuth} handleGoogleAuth={handleGoogleAuth} setCurrentView={setCurrentView} isMaintenance={isMaintenance} />
      )}
      
      {currentView === "signup" && (
        <SignupView email={email} setEmail={setEmail} password={password} setPassword={setPassword} authLoading={authLoading} handleEmailSignUp={handleEmailSignUp} handleGoogleAuth={handleGoogleAuth} setCurrentView={setCurrentView} isMaintenance={isMaintenance} />
      )}
      
      {currentView === "onboarding" && (
        <OnboardingView authLoading={authLoading} handleProfileSetup={handleProfileSetup} handleLogout={handleLogout} email={email} />
      )}

      {currentView === "lobby" && currentUser && (
        <LobbyView 
          currentUser={currentUser} handleLogout={handleLogout} setShowMailbox={setShowMailbox} unreadCount={unreadCount} secretRoomIdSearch={secretRoomIdSearch} setSecretRoomIdSearch={setSecretRoomIdSearch} rooms={rooms} searchedSecretRoom={searchedSecretRoom} setSearchedSecretRoom={setSearchedSecretRoom} executeJoinRoom={executeJoinRoom} availableRooms={availableRooms} spectateRoom={spectateRoom} setEditingScenario={setEditingScenario} setCurrentView={setCurrentView} createdScenarios={createdScenarios} deleteScenario={deleteScenario} setRoomConfigModal={setRoomConfigModal} fetchAdminData={fetchAdminData} startTrialPlay={(scenario: any) => setAdModal({ isOpen: true, step: 1, scenario, room: null, type: 'trial' })} availableScenarios={availableScenarios} openUserProfile={openUserProfile} setScenarioAppealTarget={setScenarioAppealTarget} playArchives={playArchives} setShowTicketModal={setShowTicketModal} exchangeTicketWithPoints={exchangeTicketWithPoints}
        />
      )}
      
      {currentView === "scenarioEdit" && editingScenario && (
        <ScenarioEditView editingScenario={editingScenario} setEditingScenario={setEditingScenario} editingCharIndex={editingCharIndex} setEditingCharIndex={setEditingCharIndex} saveScenario={saveScenario} setCurrentView={setCurrentView} allScenarios={scenarios} />
      )}
      
      {currentView === "game" && activeRoom && myScene && currentUser && (
        <GameView 
          activeRoom={activeRoom} myScene={myScene} currentUser={currentUser} joinedCharacter={joinedCharacter} leaveGame={leaveGame} setReportTarget={(target: any) => setReportTarget(target)} rollDice={rollDice} startGame={startGame} startSplitting={startSplitting} isSplitMode={isSplitMode} chatTab={chatTab} messages={messages} isLoading={isLoading} isScenarioEnded={isScenarioEnded} setCurrentView={setCurrentView} endGame={endGame} input={input} setInput={setInput} handleSend={handleSend} handleTabClick={handleTabClick} unreadIndicators={unreadIndicators} consultWithAI={consultWithAI} setConsultWithAI={setConsultWithAI} isChatDisabled={isChatDisabled} mergeTeam={mergeTeam} executeMergeAll={executeMergeAll} generateSceneImage={generateSceneImage} proposedTeams={proposedTeams} setProposedTeams={setProposedTeams} isGeneratingSplit={isGeneratingSplit} generateSplitProposal={generateSplitProposal} finishSplitting={finishSplitting} cancelSplitting={cancelSplitting} togglePauseRoom={togglePauseRoom} toggleAFK={toggleAFK} triggerAutoAction={triggerAutoAction} updateInventory={updateInventory} openRoomConfigModal={handleOpenRoomConfig} aiPlayersList={aiPlayersList} saveToArchive={saveToArchive} kickUser={kickUser}
        />
      )}
      
      {currentView === "evaluation" && activeRoom && currentUser && (
        <EvaluationView activeRoom={activeRoom} messages={messages} ratingScenario={ratingScenario} setRatingScenario={setRatingScenario} ratingGM={ratingGM} setRatingGM={setRatingGM} submitEvaluation={submitEvaluation} exportToPDF={exportToPDF} isExporting={isExporting} saveToArchive={saveToArchive} currentUser={currentUser} addFriend={addFriend} openUserProfile={openUserProfile} openRoomConfigModal={handleOpenRoomConfig} />
      )}

      {adModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-pink-500/50 rounded-xl p-8 w-full max-w-sm shadow-2xl text-center space-y-6">
            <h3 className="text-xl font-bold text-pink-400">📺 広告を視聴して{adModal.type === 'trial' ? "プレイ" : adModal.type === 'points' ? "ポイント獲得" : "観戦"}</h3>
            <div className="h-32 bg-slate-900 border border-slate-700 flex items-center justify-center rounded">
              <span className="text-slate-500 font-bold animate-pulse">動画広告が再生されています...<br/>({adModal.step}/3)</span>
            </div>
            {adModal.step <= 3 ? (
              <button onClick={() => { if(adModal.step === 3) { if (adModal.type === 'trial') executeTrialPlay(); else if (adModal.type === 'points') executeAdReward(); else if (adModal.type === 'spectate' && adModal.room) { spectateRoom(adModal.room); setAdModal({ isOpen: false, step: 0, scenario: null, room: null, type: 'trial' }); } } else { setAdModal({...adModal, step: adModal.step + 1}); } }} className="w-full bg-pink-600 hover:bg-pink-500 py-3 rounded text-sm font-bold text-white shadow-lg">
                {adModal.step === 3 ? (adModal.type === 'trial' ? "お試しプレイを開始する！" : adModal.type === 'points' ? "ポイントを受け取る！" : "観戦を開始する！") : "次の広告へ進む"}
              </button>
            ) : null}
            <button onClick={() => setAdModal({ isOpen: false, step: 0, scenario: null, room: null, type: 'trial' })} className="text-xs text-slate-400 hover:text-white underline">キャンセル</button>
          </div>
        </div>
      )}

      {novelSettingsModal && (
        <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-emerald-700/50 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">📖 小説の執筆設定</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-slate-400 block mb-1">文体（トーン）</label>
                <select value={novelSettingsModal.options?.tone || 'light'} onChange={(e) => setNovelSettingsModal({...novelSettingsModal, options: {...novelSettingsModal.options, tone: e.target.value}})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
                  <option value="light">ライトノベル風（会話多め・テンポ重視）</option>
                  <option value="literature">純文学風（情景・心理描写を重厚に）</option>
                  <option value="hardboiled">ハードボイルド風（渋く簡潔な表現）</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">使用するAIモデル</label>
                <select value={novelSettingsModal.aiModel} onChange={(e) => setNovelSettingsModal({...novelSettingsModal, aiModel: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
                  <option value="lite">🟤 Gemini Flash Lite {isTicketSystemEnabled ? "(消費: ブロンズチケット 1枚)" : "(無料)"}</option>
                  <option value="flash">⚪ Gemini Flash {isTicketSystemEnabled ? "(消費: シルバーチケット 1枚)" : "(無料)"}</option>
                  <option value="pro">🟡 Gemini Pro {isTicketSystemEnabled ? "(消費: ゴールドチケット 1枚)" : "(無料)"}</option>
                  <option value="claude">🟣 Claude 3.5 Sonnet {isTicketSystemEnabled ? "(消費: プラチナチケット 1枚)" : "(無料)"}</option>
                  <option value="opus">💎 Claude 3 Opus {isTicketSystemEnabled ? "(消費: ダイヤモンドチケット 1枚)" : "(無料)"}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setNovelSettingsModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button>
              <button onClick={handleStartNovel} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded text-sm font-bold shadow-lg">執筆開始</button>
            </div>
          </div>
        </div>
      )}

      {showTicketModal && (
        <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-4xl shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
              <h3 className="text-xl font-bold text-emerald-400">🎟️ チケット購入・交換ストア</h3>
              <button onClick={() => setShowTicketModal(false)} className="text-2xl text-slate-400 hover:text-white">×</button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col justify-center items-center shadow-inner">
                 <span className="text-sm text-slate-400 mb-1">現在の所持ポイント</span>
                 <span className="text-3xl font-bold text-yellow-400">🪙 {currentUser?.points || 0} pt</span>
              </div>
              <div className="flex-1 bg-pink-900/20 border border-pink-500/50 rounded-lg p-4 flex flex-col justify-center items-center shadow-inner relative overflow-hidden">
                 <span className="text-xs text-pink-300 mb-2 font-bold">ログインボーナス（1日3回まで）</span>
                 <button onClick={() => alert("※動画広告実装準備中")} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 rounded-lg shadow-lg flex items-center justify-center gap-2">
                   📺 動画を見て 20pt 獲得する (0/3)
                 </button>
                 <p className="text-[10px] text-pink-400/70 mt-2">※3回視聴でブロンズチケット1枚分(60pt)になります。</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
               
               {/* ブロンズ */}
               <div className="bg-stone-800/50 border border-stone-600 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-bold text-stone-300">ブロンズ</h4>
                      <span className="bg-stone-600 text-white text-[10px] px-2 py-1 rounded font-bold">所持: {currentUser?.ticketsBronze || 0}枚</span>
                    </div>
                    <p className="text-[11px] text-stone-400">日常的な探索やテストプレイに。<br/>超高速・低コストな最安プラン。</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-600">
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => alert("※決済システム準備中")} className="flex-1 bg-stone-600 hover:bg-stone-500 text-white text-xs py-2 rounded font-bold shadow">¥240</button>
                      <button onClick={() => exchangeTicketWithPoints('bronze', 60)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 rounded font-bold shadow flex items-center justify-center gap-1">🪙 60pt</button>
                    </div>
                    <button onClick={() => alert("※決済システム準備中")} className="w-full bg-stone-700/50 hover:bg-stone-600 text-stone-300 text-[10px] py-1.5 rounded font-bold border border-stone-600 transition-colors">3枚セット - ¥640 (11%OFF)</button>
                  </div>
               </div>
               
               {/* シルバー */}
               <div className="bg-slate-700/30 border border-slate-600 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-bold text-slate-300">シルバー</h4>
                      <span className="bg-slate-600 text-white text-[10px] px-2 py-1 rounded font-bold">所持: {currentUser?.ticketsSilver || 0}枚</span>
                    </div>
                    <p className="text-[11px] text-slate-400">手軽にサクッと遊びたい方向け。<br/>テンポの良いスピーディーなセッション。</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-600">
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => alert("※決済システム準備中")} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded font-bold shadow">¥360</button>
                      <button onClick={() => exchangeTicketWithPoints('silver', 100)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 rounded font-bold shadow flex items-center justify-center gap-1">🪙 100pt</button>
                    </div>
                    <button onClick={() => alert("※決済システム準備中")} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] py-1.5 rounded font-bold border border-slate-600 transition-colors">3枚セット - ¥970 (10%OFF)</button>
                  </div>
               </div>
               
               {/* ゴールド (ポイント交換削除) */}
               <div className="bg-amber-900/10 border border-amber-700/50 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-bold text-amber-400">ゴールド</h4>
                      <span className="bg-amber-600 text-white text-[10px] px-2 py-1 rounded font-bold">所持: {currentUser?.ticketsGold || 0}枚</span>
                    </div>
                    <p className="text-[11px] text-amber-500/70">論理的で緻密なシナリオ向け。<br/>※AIプレイヤーは参加できません。</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-900/50">
                    <div className="flex flex-col gap-2">
                      <button onClick={() => alert("※決済システム準備中")} className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs py-2 rounded font-bold shadow">1枚購入 - ¥600</button>
                      <button onClick={() => alert("※決済システム準備中")} className="w-full bg-amber-900/50 hover:bg-amber-800/80 text-amber-300 text-[10px] py-1.5 rounded font-bold border border-amber-700/50 transition-colors">3枚セット - ¥1,620 (10%OFF)</button>
                    </div>
                  </div>
               </div>
               
               {/* プラチナ (ポイント交換削除) */}
               <div className="bg-indigo-900/10 border border-indigo-700/50 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-bold text-indigo-300">プラチナ</h4>
                      <span className="bg-indigo-600 text-white text-[10px] px-2 py-1 rounded font-bold">所持: {currentUser?.ticketsPlatinum || 0}枚</span>
                    </div>
                    <p className="text-[11px] text-indigo-400/70">エモーショナルな体験を求める方向け。<br/>※AIプレイヤーは参加できません。</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-indigo-900/50">
                    <div className="flex flex-col gap-2">
                      <button onClick={() => alert("※決済システム準備中")} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded font-bold shadow">1枚購入 - ¥1,200</button>
                      <button onClick={() => alert("※決済システム準備中")} className="w-full bg-indigo-900/50 hover:bg-indigo-800/80 text-indigo-300 text-[10px] py-1.5 rounded font-bold border border-indigo-700/50 transition-colors">3枚セット - ¥3,240 (10%OFF)</button>
                    </div>
                  </div>
               </div>
               
               {/* ダイヤモンド (ポイント交換削除) */}
               <div className="bg-gradient-to-br from-fuchsia-900/40 to-rose-900/20 border-2 border-fuchsia-500/50 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden lg:col-span-2">
                  <div className="absolute top-0 right-0 bg-fuchsia-600 text-white text-[8px] font-bold px-4 py-1 rotate-45 translate-x-3 translate-y-2 shadow-lg">最高級</div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-bold text-fuchsia-300">ダイヤモンド</h4>
                      <span className="bg-fuchsia-600 text-white text-[10px] px-2 py-1 rounded font-bold relative z-10">所持: {currentUser?.ticketsDiamond || 0}枚</span>
                    </div>
                    <p className="text-[11px] text-fuchsia-200/80 relative z-10">最高峰のVIP TRPG体験。人間を超える神業GMで、絶対に失敗できない究極のセッションを。<br/>※AIプレイヤーは参加できません。</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-fuchsia-900/50 relative z-10">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button onClick={() => alert("※決済システム準備中")} className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs py-2 rounded font-bold shadow">1枚購入 - ¥1,800</button>
                      <button onClick={() => alert("※決済システム準備中")} className="flex-1 bg-fuchsia-900/50 hover:bg-fuchsia-800/80 text-fuchsia-300 text-[10px] py-2 rounded font-bold border border-fuchsia-700/50 transition-colors">3枚セット - ¥4,860 (10%OFF)</button>
                    </div>
                  </div>
               </div>
               
               {/* アイテム */}
               <div className="bg-slate-700/30 border border-slate-600 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-bold text-white">アイテム</h4>
                      <span className="bg-slate-500 text-white text-[10px] px-2 py-1 rounded font-bold">所持: {currentUser?.ticketsItem || 0}枚</span>
                    </div>
                    <p className="text-[11px] text-slate-400">高品質画像生成(3回分)や、<br/>小説執筆、書庫保存などに使用します。</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-600">
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => alert("※決済システム準備中")} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-xs py-2 rounded font-bold shadow">¥200</button>
                      <button onClick={() => exchangeTicketWithPoints('item', 500)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 rounded font-bold shadow flex items-center justify-center gap-1">🪙 500pt</button>
                    </div>
                    <button onClick={() => alert("※決済システム準備中")} className="w-full bg-slate-800 border border-slate-500 hover:bg-slate-700 text-slate-300 text-[10px] py-1.5 rounded font-bold transition-colors">3枚セット - ¥540 (10%OFF)</button>
                  </div>
               </div>
               
            </div>
          </div>
        </div>
      )}

      {/* 管理画面のユーザーアクションモーダル */}
      {adminActionUser && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-blue-500/50 rounded-xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">🎁 ユーザー管理アクション</h3>
            <p className="text-xs text-slate-400 border-b border-slate-700 pb-2 mb-4">対象: {adminActionUser.handleName} ({adminActionUser.email})</p>
            <div>
              <h4 className="font-bold text-sm text-emerald-400 mb-2">🎟️ チケットの個別付与</h4>
              <div className="flex gap-2">
                <select value={adminTicketType} onChange={e => setAdminTicketType(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs flex-1">
                  <option value="bronze">ブロンズ (Flash Lite)</option>
                  <option value="silver">シルバー (Flash)</option>
                  <option value="gold">ゴールド (Pro)</option>
                  <option value="platinum">プラチナ (Sonnet)</option>
                  <option value="diamond">ダイヤモンド (Opus)</option>
                  <option value="item">アイテム生成枠</option>
                </select>
                <input type="number" value={adminTicketAmount} onChange={e => setAdminTicketAmount(Number(e.target.value))} placeholder="枚数" className="w-16 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-center" />
                <button onClick={grantTickets} className="bg-emerald-600 hover:bg-emerald-500 px-4 rounded text-xs font-bold shadow">付与</button>
              </div>
            </div>
            <div className="pt-2">
              <h4 className="font-bold text-sm text-blue-400 mb-2">✉️ システムメール（個別通知）送信</h4>
              <textarea value={adminMailBody} onChange={e => setAdminMailBody(e.target.value)} placeholder="メッセージ内容..." className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-2 text-xs" />
              <button onClick={sendMail} disabled={!adminMailBody.trim()} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 py-2 rounded text-xs font-bold mt-2 shadow">メールを送信する</button>
            </div>
            <button onClick={() => setAdminActionUser(null)} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold mt-4">閉じる</button>
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
                    if (val === 'room') { setReportTarget({...reportTarget, type: 'room', id: reportTarget.roomId || "", name: 'この部屋の進行・チャット全般'}); } 
                    else if (val === 'scenario') { setReportTarget({...reportTarget, type: 'scenario', id: reportTarget.scenarioId || "", name: `シナリオ: ${reportTarget.scenarioName}`}); } 
                    else { const user = reportTarget.availableUsers?.find((u: any) => u.id === val); if (user) setReportTarget({...reportTarget, type: 'user', id: user.id, name: `プレイヤー: ${user.name}`}); } 
                  }} 
                  value={reportTarget.type === 'user' ? reportTarget.id : reportTarget.type}
                >
                  <option value="room">この部屋の進行・チャット全般</option>
                  <option value="scenario">シナリオの不適切・規約違反</option>
                  {reportTarget.availableUsers?.map((u: any) => <option key={u.id} value={u.id}>プレイヤー: {u.name} を通報</option>)}
                </select>
              </div>
            ) : <p className="text-xs text-slate-400 mb-4">対象: {reportTarget.name}</p>}
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
              {myNotifications.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">お知らせはありません。</p> : myNotifications.map((n: any) => (
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
    </main>
  );
}