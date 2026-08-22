"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { generateAIResponse, generateAITextWithPrompt, generateFreeImage, generatePremiumImage } from "../lib/ai";
import { getGMSystemPrompt } from "../lib/prompts";
import { 
  ViewState, UserProfile, Notification, Report, 
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

import TicketStoreModal from "../components/modals/TicketStoreModal";
import RoomConfigModal from "../components/modals/RoomConfigModal";
import NovelSettingsModal from "../components/modals/NovelSettingsModal";
import AdVideoModal from "../components/modals/AdVideoModal";

// ★ カスタムフック
import { useAdmin } from "../hooks/useAdmin";
import { useAuth } from "../hooks/useAuth";
import { useScenario } from "../hooks/useScenario";
import { useExport } from "../hooks/useExport";

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
  
  const [myNotifications, setMyNotifications] = useState<Notification[]>([]);
  const [showMailbox, setShowMailbox] = useState(false);

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

  const [adViewInfo, setAdViewInfo] = useState({ count: 0, date: "" });

  const isRequestingRef = useRef(false);

  const fetchData = async () => {
    const { data: scData } = await supabase.from('scenarios').select('*').order('id', { ascending: false });
    let loadedScenarios: Scenario[] = [];
    if (scData && scData.length > 0) {
      loadedScenarios = scData.map((d: any) => ({
        id: d.id, title: d.title, description: d.description || "", system: d.system || "", tags: d.tags || "", setting: d.setting || "",
        npcList: d.npc_list || "", plot: d.plot || "", prologue: d.prologue || "", epilogue: d.epilogue || "",
        imageUrl: d.image_url || "", presetCharacters: d.preset_characters || [], ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0,
        authorId: d.author_id, price: d.price || 500, playLimit: d.play_limit || 1, giftLimit: d.gift_limit || 1,
        purchasedTickets: d.purchased_tickets || {}, isBanned: d.is_banned || false, playTime: d.play_time || 60,
        isPlayableByOthers: d.is_playable_by_others || false, isTrialOk: d.is_trial_ok || false, itemVisibility: d.item_visibility || "none",
        requiredScenarioId: d.required_scenario_id || "", playCount: d.play_count || 0, viewCount: d.view_count || 0,
        translationEn: d.translation_en || {}, translationZh: d.translation_zh || {}
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
        error_refunded: r.error_refunded || false, free_image_count: r.free_image_count || 0, is_lost: r.is_lost || false, lost_turn_count: r.lost_turn_count || 0,
        language: r.language || 'ja'
      })).filter((r: any) => r.scenario) as Room[];
      setRooms(formattedRooms);
    }
    return { loadedScenarios, formattedRooms };
  };

  const fetchProfile = async (userId: string, emailStr: string, currentMaintenance: boolean, roomsData: Room[]) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!data || !data.full_name) { setEmail(emailStr); setCurrentView("onboarding"); return; }
    
    const today = new Date().toLocaleDateString('ja-JP');
    let vCount = data.ad_view_count || 0;
    let vDate = data.last_ad_view_date || "";
    if (vDate !== today) { vCount = 0; vDate = today; }
    setAdViewInfo({ count: vCount, date: vDate });

    const profileData: UserProfile = { 
      id: data.id, handleName: data.handle_name, fullName: data.full_name, address: data.address, phone: data.phone, avatarUrl: data.avatar_url, bio: data.bio, discordId: data.discord_id, ratingSum: data.rating_sum || 0, ratingCount: data.rating_count || 0, isAdmin: data.is_admin || false, isTester: data.is_tester || false, isBanned: data.is_banned || false, 
      isSuspended: data.is_suspended || false, 
      email: data.email, friendIds: data.friend_ids || [], blockedUserIds: data.blocked_user_ids || [],
      points: data.points || 0, ticketsNormal: data.tickets_normal || 0, ticketsBronze: data.tickets_bronze || 0, ticketsSilver: data.tickets_silver || 0, ticketsGold: data.tickets_gold || 0, ticketsPlatinum: data.tickets_platinum || 0, ticketsDiamond: data.tickets_diamond || 0, ticketsItem: data.tickets_item || 0, imageGenCredits: data.image_gen_credits || 0
    };
    if (data.email !== emailStr) await supabase.from('profiles').update({ email: emailStr }).eq('id', userId);
    setCurrentUser(profileData); 
    
    const { data: notifData } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if(notifData) setMyNotifications(notifData.map((d: any) => ({ id: d.id, userId: d.user_id, title: d.title, message: d.message, isRead: d.is_read, createdAt: d.created_at })));

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

  const {
    handleEmailAuth, handleEmailSignUp, handleProfileSetup, handleGoogleAuth, handleLogout,
    openUserProfile, addFriend, blockUser, unblockUser, updateProfile, uploadAvatar
  } = useAuth({
    email, password, setAuthLoading, isMaintenance, fetchData, fetchProfile,
    currentUser, setCurrentUser, setCurrentView, setActiveRoom, setJoinedCharacter,
    setIsLoading, setTargetUserId
  });

  const {
    allUsers, reports, fetchAdminData, toggleMaintenance, toggleTicketSystem,
    toggleAdminStatus, toggleTesterStatus, toggleGeminiFlashModel, resolveReport,
    adminExecuteBan, adminUnbanUser, adminSuspendUser, adminUnsuspendUser,
    adminExecuteScenarioBan, adminUnbanScenario, adminDeleteScenario,
    executeCreateTester, adminSendMailToUser,
    adminGrantItem, adminSendMailToAll, grantItemToAll
  } = useAdmin({
    scenarios, fetchData, isMaintenance, setIsMaintenance,
    isTicketSystemEnabled, setIsTicketSystemEnabled, setGeminiFlashModel,
    handleLogout, setIsLoading
  });

  const {
    deleteScenario, saveScenario, submitEvaluation, submitUserReport,
    submitScenarioAppeal, generatePackageImage
  } = useScenario({
    currentUser, activeRoom, setActiveRoom, setJoinedCharacter,
    editingScenario, ratingScenario, ratingGM,
    reportTarget, setReportTarget, reportReason, setReportReason,
    scenarioAppealTarget, setScenarioAppealTarget, scenarioAppealText, setScenarioAppealText,
    setIsLoading, fetchData, fetchAdminData, setCurrentView
  });

  const {
    saveToArchive, executeExport, handleStartNovel, exportToPDF
  } = useExport({
    currentUser, setCurrentUser, activeRoom, joinedCharacter, messages,
    isTicketSystemEnabled, setShowTicketModal, playArchives, setPlayArchives,
    setIsExporting, geminiFlashModel, novelSettingsModal, setNovelSettingsModal,
    setCurrentView
  });

  const availableScenarios = scenarios.filter((s: any) => !s.isBanned);
  const createdScenarios = scenarios.filter((s: any) => s.authorId === currentUser?.id);
  const availableRoomsRaw = rooms.filter((r: any) => !r.scenario?.isBanned);

  // ★ 部屋の言語に応じた翻訳の適用と、国旗バッジの付与
  const availableRooms = availableRoomsRaw.map((room: any) => {
    if (!currentUser) return room;
    const hostId = room.host_id;
    const joinedUserIds = Object.keys(room.joined_users || {});
    const myBlockedIds = currentUser.blockedUserIds || [];
    if (myBlockedIds.includes(hostId)) return null;
    if (joinedUserIds.some((id: string) => myBlockedIds.includes(id))) return null;
    if (blockedMeIds.includes(hostId)) return null;
    
    let displayScenario = { ...room.scenario };
    let langBadge = "🇯🇵 ";
    
    if (room.language === 'en' && room.scenario?.translationEn) {
      langBadge = "🇺🇸 EN | ";
      const t = room.scenario.translationEn;
      if (t.title) displayScenario.title = t.title;
      if (t.description) displayScenario.description = t.description;
      if (t.characters && Array.isArray(t.characters)) {
        displayScenario.presetCharacters = displayScenario.presetCharacters.map((c: any, i: number) => {
          const tChar = t.characters[i];
          return tChar ? { ...c, name: tChar.name || c.name, job: tChar.job || c.job, personality: tChar.personality || c.personality } : c;
        });
      }
    } else if (room.language === 'zh' && room.scenario?.translationZh) {
      langBadge = "🇨🇳 ZH | ";
      const t = room.scenario.translationZh;
      if (t.title) displayScenario.title = t.title;
      if (t.description) displayScenario.description = t.description;
      if (t.characters && Array.isArray(t.characters)) {
        displayScenario.presetCharacters = displayScenario.presetCharacters.map((c: any, i: number) => {
          const tChar = t.characters[i];
          return tChar ? { ...c, name: tChar.name || c.name, job: tChar.job || c.job, personality: tChar.personality || c.personality } : c;
        });
      }
    }

    displayScenario.title = `${langBadge}${displayScenario.title}`;
    const isWarning = joinedUserIds.some((id: string) => blockedMeIds.includes(id));
    return { ...room, scenario: displayScenario, isWarning };
  }).filter(Boolean) as Room[];

  const defaultScene: Scene = { id: "scene_main", name: "メインルーム", memberIds: [] };
  const myScene = activeRoom?.scenes?.find((s: any) => joinedCharacter && s.memberIds.includes(joinedCharacter.id)) || activeRoom?.scenes?.[0] || defaultScene;
  const isSplitMode = activeRoom ? (activeRoom.scenes?.length > 1) : false;
  const isScenarioEnded = messages.some((m: any) => m.text.includes('[SCENARIO_END]')) || activeRoom?.status === 'finished';

  const unreadCount = myNotifications.filter((n: any) => !n.isRead).length;
  const isChatDisabled = Boolean(isLoading || (isSplitMode && myScene && myScene.isMerged === true && chatTab !== 'consult'));

  const handleOpenRoomConfig = (scenario: Scenario) => {
    setRoomConfigModal({ scenario, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: "none", aiModel: "lite", language: "ja" });
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

  const generateSceneImage = async (imageType: 'free' | 'premium') => {
    if (!activeRoom || !myScene || !currentUser || isRequestingRef.current) return;
    isRequestingRef.current = true; setIsLoading(true);
    try {
      if (imageType === 'free') {
        if ((activeRoom.free_image_count || 0) >= 3) {
          alert("無料の情景生成は1セッションにつき3回までです。\nこれ以上はアイテムチケットをご利用ください。");
          isRequestingRef.current = false; setIsLoading(false); return;
        }
        const newCount = (activeRoom.free_image_count || 0) + 1;
        await supabase.from('rooms').update({ free_image_count: newCount }).eq('id', activeRoom.id);
        setActiveRoom(prev => prev ? { ...prev, free_image_count: newCount } : null);
      }
      if (imageType === 'premium') {
        if (isTicketSystemEnabled) {
          if ((currentUser.ticketsItem || 0) < 1) { alert("アイテムチケットがありません。「購入ストア」から補充してください。"); isRequestingRef.current = false; setIsLoading(false); return; }
          const { error } = await supabase.from('profiles').update({ tickets_item: (currentUser.ticketsItem || 0) - 1 }).eq('id', currentUser.id);
          if (!error) setCurrentUser(prev => prev ? { ...prev, ticketsItem: (prev.ticketsItem || 0) - 1 } : null);
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
      const jsonStr = aiResponse.replace(/`{3}json/g, "").replace(/`{3}/g, "").trim();
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
    const { scenario, charId, privacy, message, difficulty, rule, itemVisibility, aiModel, language } = roomConfigModal;
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
      if (!confirm(`この部屋はセッション開始時に ${costName}チケット を1枚消費します。作成して入室しますか？`)) return;
    }

    const hostChar = scenario.presetCharacters.find((c: any) => c.id === charId);
    if (!hostChar) return;

    const initialScenes: Scene[] = [{ id: `scene_main_${Date.now()}`, name: "メインルーム", memberIds: scenario.presetCharacters.map((c: any) => c.id) }];
    const initialInventories: Record<string, string> = {};
    scenario.presetCharacters.forEach((c: any) => { initialInventories[c.id] = c.items || "特になし"; });

    const { data, error } = await supabase.from('rooms').insert({ 
      scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: initialScenes, privacy: privacy, host_message: message, joined_users: { [currentUser.id]: charId }, current_summary: "", difficulty: difficulty, rule: rule, is_paused: false, afk_users: [], is_trial: false, item_visibility: itemVisibility, inventories: initialInventories, current_chapter_index: 0, ai_model: aiModel, error_refunded: false, free_image_count: 0, is_lost: false, lost_turn_count: 0, language: language || 'ja'
    }).select().single();
    
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
      const currentSc = scenarios.find((s: any) => s.id === scenario.id);
      if (currentSc) await supabase.from('scenarios').update({ play_count: (currentSc.playCount || 0) + 1 }).eq('id', scenario.id);
      setRoomConfigModal(null); await fetchData();
      const newRoom: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users, current_summary: "", difficulty: data.difficulty, rule: data.rule, is_paused: false, afk_users: [], is_trial: false, item_visibility: data.item_visibility, inventories: data.inventories, current_chapter_index: 0, ai_model: data.ai_model, error_refunded: false, free_image_count: 0, is_lost: false, lost_turn_count: 0, language: data.language };
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
      scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: initialScenes, privacy: 'secret', host_message: "お試しプレイ", joined_users: { [currentUser.id]: charId }, current_summary: "", difficulty: "normal", rule: "coc_jp", is_paused: false, afk_users: [], is_trial: true, item_visibility: "none", inventories: initialInventories, current_chapter_index: 0, ai_model: 'lite', error_refunded: false, free_image_count: 0, is_lost: false, lost_turn_count: 0, language: 'ja' 
    }).select().single();
    
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
      const currentSc = scenarios.find((s: any) => s.id === scenario.id);
      if (currentSc) await supabase.from('scenarios').update({ play_count: (currentSc.playCount || 0) + 1 }).eq('id', scenario.id);
      await fetchData();
      const newRoom: Room = { 
        id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, 
        status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users, 
        current_summary: "", difficulty: data.difficulty, rule: data.rule, is_paused: false, afk_users: [], is_trial: true, 
        item_visibility: "none", inventories: data.inventories, current_chapter_index: 0, ai_model: data.ai_model, error_refunded: false, 
        free_image_count: 0, is_lost: false, lost_turn_count: 0, language: 'ja' 
      };
      await supabase.from('ai_memory').delete().eq('room_id', newRoom.id);
      setActiveRoom(newRoom); setJoinedCharacter(hostChar); setMessages([]); 
      const aiChars = scenario.presetCharacters.filter((c: any) => c.id !== charId); setAiPlayersList(aiChars);
      await pushMessage(newRoom.id, { sender: "system", text: `【お試しルーム作成完了】\n他のキャラクターはAIが担当します。\n右上の「▶お試し開始」ボタンを押してスタートしてください。`, type: "system", sceneId: newRoom.scenes?.[0]?.id, channel: "system" });
      setCurrentView("game");
    }
  };

  const executeJoinRoom = async (room: Room, charId: string) => {
    if (!currentUser || !room || !charId) return;

    if (currentUser.isSuspended) {
      alert("【一時参加制限】\nあなたのアカウントは現在セッションへの参加が制限されています。\n※ロビーの閲覧やチャットログの確認は可能です。");
      return;
    }

    const isAuthor = room.scenario?.authorId === currentUser.id;
    if (isTicketSystemEnabled && !isAuthor && !room.is_trial) {
      let requiredTicketKey = ''; let currentTickets = 0; let costName = '';
      if (room.ai_model === 'lite') { requiredTicketKey = 'tickets_bronze'; currentTickets = currentUser.ticketsBronze || 0; costName = 'ブロンズ'; }
      if (room.ai_model === 'flash') { requiredTicketKey = 'tickets_silver'; currentTickets = currentUser.ticketsSilver || 0; costName = 'シルバー'; }
      if (room.ai_model === 'pro') { requiredTicketKey = 'tickets_gold'; currentTickets = currentUser.ticketsGold || 0; costName = 'ゴールド'; }
      if (room.ai_model === 'claude') { requiredTicketKey = 'tickets_platinum'; currentTickets = currentUser.ticketsPlatinum || 0; costName = 'プラチナ'; }
      if (room.ai_model === 'opus') { requiredTicketKey = 'tickets_diamond'; currentTickets = currentUser.ticketsDiamond || 0; costName = 'ダイヤモンド'; }

      if (currentTickets < 1) { 
        alert(`入室するためのチケットが足りません！\n（${costName}チケットが1枚必要です）\nロビーの「チケット購入ストア」から入手してください。`); 
        setShowTicketModal(true); return; 
      }
      if (!confirm(`この部屋はセッション開始時に ${costName}チケット が必要です。入室しますか？\n（※チケットはゲーム開始時に消費されます）`)) return;
    }

    const { data: latestRoom } = await supabase.from('rooms').select('joined_users, inventories').eq('id', room.id).single();
    const currentUsers = latestRoom?.joined_users || {};
    const currentInventories = latestRoom?.inventories || {};

    if (Object.values(currentUsers).includes(charId)) { 
      alert("申し訳ありません、そのキャラクターは先ほど他のプレイヤーに選択されました！"); await fetchData(); return; 
    }

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
    if (currentSc) {
      await supabase.from('scenarios').update({ view_count: (currentSc.viewCount || 0) + 1 }).eq('id', room.scenario_id);
    }

    setActiveRoom({ ...room, spectator_ids: newSpectators }); setJoinedCharacter(null); await loadChatLogs(room.id);
    await pushMessage(room.id, { sender: "system", text: `【観戦モード】部屋に入室しました。チャットやダイスは使用できません。`, type: "system", sceneId: room.scenes?.[0]?.id, channel: "system" }, false);
    setCurrentView("game");
  };

  const startGame = async () => {
    if(!activeRoom || !activeRoom.scenario || !joinedCharacter || !myScene || isRequestingRef.current) return;
    
    const isAuthor = activeRoom.scenario.authorId === currentUser?.id;

    if (isTicketSystemEnabled && !isAuthor && !activeRoom.is_trial && !isMaintenance && currentUser) {
      let requiredTicketKey = ''; let currentTickets = 0; let costName = '';
      if (activeRoom.ai_model === 'lite') { requiredTicketKey = 'tickets_bronze'; currentTickets = currentUser.ticketsBronze || 0; costName = 'ブロンズ'; }
      if (activeRoom.ai_model === 'flash') { requiredTicketKey = 'tickets_silver'; currentTickets = currentUser.ticketsSilver || 0; costName = 'シルバー'; }
      if (activeRoom.ai_model === 'pro') { requiredTicketKey = 'tickets_gold'; currentTickets = currentUser.ticketsGold || 0; costName = 'ゴールド'; }
      if (activeRoom.ai_model === 'claude') { requiredTicketKey = 'tickets_platinum'; currentTickets = currentUser.ticketsPlatinum || 0; costName = 'プラチナ'; }
      if (activeRoom.ai_model === 'opus') { requiredTicketKey = 'tickets_diamond'; currentTickets = currentUser.ticketsDiamond || 0; costName = 'ダイヤモンド'; }

      if (currentTickets < 1) {
        alert(`エラー：チケットが足りません！\n（${costName}チケットが1枚必要です）`);
        return; 
      }

      const { error: tErr } = await supabase.from('profiles').update({ [requiredTicketKey]: currentTickets - 1 }).eq('id', currentUser.id);
      if (tErr) { alert("チケットの消費処理に失敗しました。"); return; }

      setCurrentUser(prev => prev ? { 
        ...prev, 
        ticketsBronze: activeRoom.ai_model === 'lite' ? (prev.ticketsBronze || 0) - 1 : prev.ticketsBronze, 
        ticketsSilver: activeRoom.ai_model === 'flash' ? (prev.ticketsSilver || 0) - 1 : prev.ticketsSilver, 
        ticketsGold: activeRoom.ai_model === 'pro' ? (prev.ticketsGold || 0) - 1 : prev.ticketsGold, 
        ticketsPlatinum: activeRoom.ai_model === 'claude' ? (prev.ticketsPlatinum || 0) - 1 : prev.ticketsPlatinum, 
        ticketsDiamond: activeRoom.ai_model === 'opus' ? (prev.ticketsDiamond || 0) - 1 : prev.ticketsDiamond
      } : null);
    }

    isRequestingRef.current = true; setIsLoading(true);
    try {
      let aiChars: Character[] = [];
      const takenIds = Object.values(activeRoom.joined_users || {});
      const emptyChars = activeRoom.scenario.presetCharacters.filter((c: any) => !takenIds.includes(c.id));
      if (['pro', 'claude', 'opus'].includes(activeRoom.ai_model || '')) {
         if (emptyChars.length > 0 && !activeRoom.is_trial) alert("【お知らせ】ゴールド以上の部屋では、AIプレイヤーの参加はできません。");
      } else {
         if (emptyChars.length > 0) {
           if (activeRoom.is_trial) {
             aiChars = emptyChars; 
           } else if (confirm(`参加していないキャラクターが ${emptyChars.length} 人います。\n彼らを「AIプレイヤー（相棒）」として参加させますか？`)) {
             aiChars = emptyChars;
           }
         }
      }
      setAiPlayersList(aiChars);
      await supabase.from('rooms').update({ status: 'playing', is_paused: false }).eq('id', activeRoom.id);
      setActiveRoom({ ...activeRoom, status: 'playing', is_paused: false });
      await pushMessage(activeRoom.id, { sender: "system", text: `【システム】ゲームを開始しました。AI GMを呼び出しています...`, type: "system", sceneId: myScene.id, channel: "system" });
      const extraUserContext = `【システムコマンド】セッションが開始されました。\n以下の【設定されたプロローグ情報】に従い導入部分の情景描写を行ってください。\n\n【設定されたプロローグ情報】\n${activeRoom.scenario.prologue || "特になし"}\n\nまた、この導入部において、事態の把握や最初の試練として【必ずプレイヤー全員が最低1回はダイス判定を行わなければならない状況】を発生させてください。`;
      await callAIGM(extraUserContext, "story", true);
    } finally { 
      isRequestingRef.current = false; 
      setIsLoading(false); 
    }
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
      setCurrentView("lobby"); 
      setActiveRoom(null); 
      await fetchData(); 
      return; 
    }

    const isHost = activeRoom.host_id === currentUser.id;
    const isRecruiting = activeRoom.status === 'recruiting';
    const remainingPlayers = Object.keys(activeRoom.joined_users || {}).filter((id: string) => id !== currentUser.id).length;

    if (isRecruiting) {
      const newUsers = { ...activeRoom.joined_users };
      delete newUsers[currentUser.id];
      await supabase.from('rooms').update({ joined_users: newUsers }).eq('id', activeRoom.id);
      if (isHost && remainingPlayers === 0) {
        await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
      }
      setCurrentView("lobby"); 
      setActiveRoom(null); 
      setJoinedCharacter(null); 
      await fetchData(); 
      return;
    }

    if (remainingPlayers === 0) {
      if (confirm("【警告】他に人間プレイヤーがいないため、退出すると部屋は完全に閉じられます。本当によろしいですか？")) {
        await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
        setCurrentView("lobby"); 
        setActiveRoom(null); 
        setJoinedCharacter(null); 
        setAiPlayersList([]); 
        setMessages([]); 
        await fetchData(); 
      }
    } else {
      if (confirm("自分のキャラクターをAIに引き継がせて離脱します。よろしいですか？")) {
        const newUsers = { ...activeRoom.joined_users };
        delete newUsers[currentUser.id];
        await supabase.from('rooms').update({ joined_users: newUsers }).eq('id', activeRoom.id);
        setCurrentView("lobby"); 
        setActiveRoom(null); 
        setJoinedCharacter(null); 
        setAiPlayersList([]); 
        setMessages([]); 
        await fetchData(); 
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isRequestingRef.current || !activeRoom || !joinedCharacter || !currentUser || !myScene) return;
    isRequestingRef.current = true; 
    setIsLoading(true);
    try {
      const currentInput = input; 
      setInput(""); 
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
    } finally { 
      isRequestingRef.current = false; 
      setIsLoading(false); 
    }
  };

  const rollDice = async (targetValue: number, label: string, is1d100: boolean = false) => {
    if(!myScene || !activeRoom || isRequestingRef.current || !joinedCharacter) return;
    isRequestingRef.current = true; 
    setIsLoading(true);
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
          
          let diceModel = 'flash'; 
          if (['claude', 'opus', 'pro', 'flash'].includes(activeRoom.ai_model || '')) diceModel = 'flash';
          else diceModel = 'lite';
          
          await callAIGM(`【システム判定結果】${joinedCharacter.name}が${label}ロールを行いました。\n結果: ${msgText}\n${promptSuffix}`, chatTab, false, diceModel);
      }
    } finally { 
      isRequestingRef.current = false; 
      setIsLoading(false); 
    }
  };

  const callAIGM = async (extraUserContext?: string, targetTab: ChatTab = "story", isStarting: boolean = false, forcedModel?: string) => {
    if (!activeRoom || !joinedCharacter || !myScene) return;
    if (!isStarting && activeRoom.status !== 'playing') return;
    setIsLoading(true);
    
    try {
      if (extraUserContext) {
        await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'user', content: extraUserContext });
      }
      const { data: memoryDataRaw } = await supabase.from('ai_memory').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: true });
      let currentMemory = memoryDataRaw || [];
      let currentSummary = activeRoom.current_summary || "";

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
          if (idsToDelete.length > 0) {
            await supabase.from('ai_memory').delete().in('id', idsToDelete);
          }
          currentMemory = recentLogs;
        } catch(e) { 
          currentMemory = currentMemory.slice(-(contextLimit + 5)); 
        }
      }

      let activeNpcListText = "";
      if (activeRoom.scenario?.npcList) {
         try {
            const recentLogsContext = currentMemory.slice(-5).map((m: any) => m.content).join('\n');
            const npcFilterPrompt = `以下の【全NPCリスト】から、直近のログと現在のあらすじに登場している、または今後すぐに関わりそうなNPCの情報だけを抜粋してそのまま出力してください。不要なNPCは省いてください。\n\n【全NPCリスト】\n${activeRoom.scenario.npcList}\n\n【あらすじとログ】\n${currentSummary}\n${recentLogsContext}`;
            activeNpcListText = await generateAITextWithPrompt(npcFilterPrompt, 'lite', 500, 0.2);
         } catch(e) { 
            activeNpcListText = activeRoom.scenario?.npcList; 
         }
      }

      const history = currentMemory.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      if (history.length === 0) {
        history.push({ role: 'user', parts: [{ text: "セッションを開始してください。" }]});
      }

      const aiPlayersText = targetTab === 'gm' 
        ? "なし（GMへの質問のためAI相棒は登場・発言しません）" 
        : (aiPlayersList.length > 0 ? aiPlayersList.map((c: any) => `・${c.name} (${c.genderOrRace || "性別不詳"}) | HP:${c.hp} SAN:${c.san}% STR:${c.str} DEX:${c.dex} INT:${c.int} CON:${c.con}\n 設定: ${c.personality}`).join("\n\n") : "なし（ソロプレイ）");

      const afkNames = (activeRoom.afk_users || []).map((uid: string) => { 
        const cId = activeRoom.joined_users?.[uid]; 
        return activeRoom.scenario?.presetCharacters.find((c: any) => c.id === cId)?.name; 
      }).filter(Boolean).join(", ");
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
      } catch(e) { 
        chapters = [{ title: "本編", content: activeRoom.scenario?.plot || "" }]; 
      }
      
      const currentChapIndex = activeRoom.current_chapter_index || 0;
      const currentChapter = chapters[currentChapIndex] || chapters[chapters.length - 1];
      const isLastChapter = currentChapIndex >= chapters.length - 1;

      const chapterProgress = chapters.map((c: any, idx: number) => {
        if (idx < currentChapIndex) return `[クリア済] 第${idx + 1}章: ${c.title}`;
        if (idx === currentChapIndex) return `[★現在進行中] 第${idx + 1}章: ${c.title}`;
        return `[未到達（ネタバレ厳禁）] 第${idx + 1}章: ${c.title}`;
      }).join('\n');

      let isLostMode = activeRoom.is_lost || joinedCharacter.hp <= 0;
      let currentLostTurns = activeRoom.lost_turn_count || 0;
      
      if (joinedCharacter.hp <= 0 && !activeRoom.is_lost) {
        await supabase.from('rooms').update({ is_lost: true, lost_turn_count: 1 }).eq('id', activeRoom.id);
        setActiveRoom(prev => prev ? { ...prev, is_lost: true, lost_turn_count: 1 } : null);
        currentLostTurns = 1;
        isLostMode = true;
      } else if (isLostMode) {
        currentLostTurns += 1;
        await supabase.from('rooms').update({ lost_turn_count: currentLostTurns }).eq('id', activeRoom.id);
        setActiveRoom(prev => prev ? { ...prev, lost_turn_count: currentLostTurns } : null);
      }

      let lostContext = "";
      if (isLostMode) {
        if (currentLostTurns < 5) {
          lostContext = `\n\n【重要：ロストシナリオ進行中 (${currentLostTurns}/5ターン)】\nプレイヤーのHPが0になりました。即座にセッションを終了せず、死の淵や絶望の結末に向かう「ロストシナリオ」をドラマチックに描写してください。まだ完全に息絶えてはいません。`;
        } else {
          lostContext = `\n\n【重要：ロストシナリオ最終ターン】\nプレイヤーの最後の瞬間を重厚に描写し、絶望的な結末（ロスト）として完全に物語を終わらせてください。必ず「"chapterClear": true」を出力すること。`;
        }
      }

      let scenarioPlotText = `【物語の全体構成（全${chapters.length}章）】\n${chapterProgress}\n\n【現在（第${currentChapIndex + 1}章）のプロット・台本】\n${currentChapter.content}${lostContext}`;

      let difficultyInstruction = "";
      switch (activeRoom.difficulty) {
        case "beginner": difficultyInstruction = "【難易度：初心者】接待プレイです。困っていればヒントや選択肢を出しても構いません。"; break;
        case "easy": difficultyInstruction = "【難易度：簡単】判定が通りやすく、探索で見つかる情報を多めに描写してください。ただし露骨な解法の指示は避けてください。"; break;
        case "normal": difficultyInstruction = "【難易度：普通】【ヒント・誘導・選択肢の提示・次期目標の指示は完全禁止】純粋な情景描写と結果のみを出力してください。「次は〜が残されています」「〜しましょう」といったタスクリストや次期目標の提示、解法の匂わせ（「※〜があるかもしれません」「〜が必要」等）は絶対に書かないでください。"; break;
        case "hard": difficultyInstruction = "【難易度：難しい】【ノーヒント・厳格】解法のヒントや補足、目標の提示は一切禁止。さらに「〇〇するか、別の手段をとるか」といった選択肢や行動の誘導は絶対に書かないでください。PLから具体的な探索宣言がない限りオブジェクトの存在すら明かさず、判定失敗時は即座に状況を悪化させてください。"; break;
        case "pro": difficultyInstruction = "【難易度：プロ】【容赦ない本格派】一切のヒントや誘導、選択肢の提示を禁止。PLの軽率な行動には即座に致命的なペナルティやロストの危機を与えてください。"; break;
        case "oni": difficultyInstruction = "【難易度：鬼】【理不尽・極限】一切の手加減・ヒント・選択肢を排除。死と隣り合わせの無慈悲な描写を徹底してください。"; break;
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

      let langInstruction = "";
      if (activeRoom.language === 'en') {
        langInstruction = "\n【LANGUAGE: ENGLISH】This session MUST be conducted entirely in English. All responses, scene descriptions, and NPC dialogues must be in English.";
      } else if (activeRoom.language === 'zh') {
        langInstruction = "\n【LANGUAGE: CHINESE】This session MUST be conducted entirely in Simplified Chinese (简体中文). All responses and descriptions must be in Chinese.";
      }

      const sysPrompt = getGMSystemPrompt(activeRoom.ai_model || 'lite', {
        title: activeRoom.scenario?.title, 
        setting: activeRoom.scenario?.setting, 
        scenarioPlotText, 
        currentSummary, 
        joinedCharacter, 
        inventoryText, 
        aiPlayersText, 
        ruleSpec, 
        gmStyle: gmStyle + langInstruction, 
        difficultyInstruction, 
        isTrial: activeRoom.is_trial, 
        mySceneName: myScene.name, 
        isSplitMode, 
        afkInstruction, 
        targetTab, 
        activeNpcListText
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
        const jsonStr = aiTextRaw.replace(/`{3}json/gi, "").replace(/`{3}/g, "").trim();
        parsedAI = JSON.parse(jsonStr);
      } catch (e) { 
        parsedAI.text = aiTextRaw; 
      }

      if (parsedAI.statusUpdates && Array.isArray(parsedAI.statusUpdates)) {
        let hpSanUpdated = false;
        parsedAI.statusUpdates.forEach((upd: any) => {
           if (upd.name && joinedCharacter && joinedCharacter.name.replace(/\s+/g, '').includes(upd.name.replace(/\s+/g, ''))) {
             setJoinedCharacter(prev => prev ? { ...prev, hp: upd.hp, san: upd.san } : null);
           }
           setAiPlayersList(prev => {
             const newAi = [...prev];
             const idx = newAi.findIndex(p => p.name.replace(/\s+/g, '').includes(upd.name.replace(/\s+/g, '')));
             if (idx !== -1) { 
               newAi[idx] = { ...newAi[idx], hp: upd.hp, san: upd.san }; 
               hpSanUpdated = true; 
             }
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
             if (char) { 
               newInventories[char.id] = upd.items; 
               invUpdated = true; 
             }
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
      if (splitMatch) { 
        setProposedTeams([]); 
        generateSplitProposal(); 
        cleanAiText = cleanAiText.replace(/\[SPLIT_PROPOSAL:.*?\]/g, '').trim(); 
      }
      cleanAiText = cleanAiText.replace(/\[STATUS_UPDATE:.*?\]/g, '').replace(/\[INVENTORY_UPDATE:.*?\]/g, '').trim();

      if (activeRoom.is_trial && (cleanAiText.includes('本編でお楽しみください') || cleanAiText.includes('本編でお待ち')) && !cleanAiText.includes('[SCENARIO_END]')) {
        cleanAiText += '\n\n[SCENARIO_END]';
      }
      if (isChapterCleared && isLastChapter && !cleanAiText.includes('[SCENARIO_END]')) {
        cleanAiText += '\n\n[SCENARIO_END]';
      }

      await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'assistant', content: cleanAiText });
      const msgSender = targetTab === "consult" ? "ai_player" : "gm";
      await pushMessage(activeRoom.id, { 
        sender: msgSender, 
        text: cleanAiText, 
        type: targetTab === "gm" ? "ooc" : "ic", 
        sceneId: myScene?.id, 
        charName: targetTab === "consult" ? "AI相棒" : "AI GM", 
        channel: targetTab 
      });

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
      if (!activeRoom.error_refunded) {
        const model = activeRoom.ai_model || 'lite';
        let ticketKey = 'tickets_bronze';
        let ticketName = 'ブロンズチケット';

        if (model === 'flash') { ticketKey = 'tickets_silver'; ticketName = 'シルバーチケット'; }
        if (model === 'pro') { ticketKey = 'tickets_gold'; ticketName = 'ゴールドチケット'; }
        if (model === 'claude') { ticketKey = 'tickets_platinum'; ticketName = 'プラチナチケット'; }
        if (model === 'opus') { ticketKey = 'tickets_diamond'; ticketName = 'ダイヤモンドチケット'; }

        // 二重返還を防ぐために部屋を「返還済み」にマーク
        await supabase.from('rooms').update({ error_refunded: true }).eq('id', activeRoom.id);
        setActiveRoom(prev => prev ? { ...prev, error_refunded: true } : null);

        // 参加者全員に対して一律でチケットを返還する
        const joinedUserIds = Object.keys(activeRoom.joined_users || {});
        for (const uid of joinedUserIds) {
          const { data: userData } = await supabase.from('profiles').select(ticketKey).eq('id', uid).single();
          if (userData) {
            const currentAmount = (userData as any)[ticketKey] || 0;
            await supabase.from('profiles').update({ [ticketKey]: currentAmount + 1 }).eq('id', uid);
            await supabase.from('notifications').insert({ 
              user_id: uid, 
              title: '【重要】システムエラーに伴うチケット返還のお知らせ', 
              message: `プレイ中のセッション「${activeRoom.scenario?.title || '名称未設定'}」にてAIの応答エラーが発生したため、消費した「${ticketName}」を1枚返還いたしました。\nご不便をおかけして誠に申し訳ありません。` 
            });
          }
        }
        
        // 自分の画面（ステート）も更新して表示を反映させる
        if (currentUser && joinedUserIds.includes(currentUser.id)) {
           setCurrentUser(prev => prev ? { ...prev, [ticketKey]: ((prev as any)[ticketKey] || 0) + 1 } : null);
        }

        await pushMessage(activeRoom.id, { sender: "system", text: `【システムエラー】AIが混雑、または応答に失敗しました。\nお詫びとして参加者全員に消費した「${ticketName}」を1枚自動返還しました。`, type: "system", sceneId: myScene?.id, channel: "system" }, false);
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
    setChatTab(tab); 
    setUnreadIndicators(p => ({ ...p, [tab]: false })); 
  };

  const updateInventory = async (items: string) => { 
    if (activeRoom && currentUser) { 
      const ni = { ...activeRoom.inventories, [currentUser.id]: items }; 
      await supabase.from('rooms').update({ inventories: ni }).eq('id', activeRoom.id); 
      setActiveRoom({ ...activeRoom, inventories: ni }); 
    } 
  };

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

  return (
    <main className="h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {currentView === "library" && currentUser && (
        <LibraryView 
          currentUser={currentUser} 
          playArchives={playArchives} 
          setCurrentView={setCurrentView} 
          executeExport={executeExport} 
          isExporting={isExporting} 
          allScenarios={scenarios} 
          openRoomConfigModal={handleOpenRoomConfig} 
        />
      )}

      {currentView === "userProfile" && currentUser && (
        <UserProfileView 
          currentUser={currentUser} 
          targetUserId={targetUserId} 
          setCurrentView={setCurrentView} 
          allScenarios={scenarios} 
          updateProfile={updateProfile} 
          blockUser={blockUser} 
          unblockUser={unblockUser} 
          addFriend={addFriend} 
          activeRooms={rooms} 
          executeSpectateWithAd={(room: any) => setAdModal({ isOpen: true, step: 1, scenario: null, room: room, type: 'spectate' })} 
          openRoomConfigModal={handleOpenRoomConfig} 
          openUserProfile={openUserProfile} 
          uploadAvatar={uploadAvatar} 
        />
      )}

      {currentView === "admin" && currentUser?.isAdmin && (
        <AdminView
          isMaintenance={isMaintenance} toggleMaintenance={toggleMaintenance} 
          isTicketSystemEnabled={isTicketSystemEnabled} toggleTicketSystem={toggleTicketSystem} 
          geminiFlashModel={geminiFlashModel} toggleGeminiFlashModel={toggleGeminiFlashModel} 
          reports={reports} resolveReport={resolveReport} 
          allUsers={allUsers} scenarios={scenarios} 
          toggleAdminStatus={toggleAdminStatus} toggleTesterStatus={toggleTesterStatus} 
          adminExecuteBan={adminExecuteBan} adminUnbanUser={adminUnbanUser} 
          adminSuspendUser={adminSuspendUser} adminUnsuspendUser={adminUnsuspendUser} 
          adminExecuteScenarioBan={adminExecuteScenarioBan} adminUnbanScenario={adminUnbanScenario} 
          adminDeleteScenario={adminDeleteScenario} setCurrentView={setCurrentView} 
          executeCreateTester={executeCreateTester} 
          adminSendMailToUser={adminSendMailToUser} 
          adminGrantItem={adminGrantItem}
          adminSendMailToAll={adminSendMailToAll}
          grantItemToAll={grantItemToAll}
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
          authLoading={authLoading} 
          handleEmailAuth={handleEmailAuth} 
          handleGoogleAuth={handleGoogleAuth} 
          setCurrentView={setCurrentView} 
          isMaintenance={isMaintenance} 
        />
      )}
      
      {currentView === "signup" && (
        <SignupView 
          email={email} 
          setEmail={setEmail} 
          password={password} 
          setPassword={setPassword} 
          authLoading={authLoading} 
          handleEmailSignUp={handleEmailSignUp} 
          handleGoogleAuth={handleGoogleAuth} 
          setCurrentView={setCurrentView} 
          isMaintenance={isMaintenance} 
        />
      )}
      
      {currentView === "onboarding" && (
        <OnboardingView 
          authLoading={authLoading} 
          handleProfileSetup={handleProfileSetup} 
          handleLogout={handleLogout} 
          email={email} 
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
          startTrialPlay={(scenario: any) => setAdModal({ isOpen: true, step: 1, scenario, room: null, type: 'trial' })} 
          availableScenarios={availableScenarios} 
          openUserProfile={openUserProfile} 
          setScenarioAppealTarget={setScenarioAppealTarget} 
          playArchives={playArchives} 
          setShowTicketModal={setShowTicketModal} 
          exchangeTicketWithPoints={exchangeTicketWithPoints} 
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
          allScenarios={scenarios} 
          generatePackageImage={generatePackageImage} 
          isLoading={isLoading} 
        />
      )}
      
      {currentView === "game" && activeRoom && myScene && currentUser && joinedCharacter && (
        <GameView 
          activeRoom={activeRoom} 
          myScene={myScene} 
          currentUser={currentUser} 
          joinedCharacter={joinedCharacter} 
          leaveGame={leaveGame} 
          setReportTarget={(target: any) => setReportTarget(target)} 
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
          updateInventory={updateInventory} 
          openRoomConfigModal={handleOpenRoomConfig} 
          aiPlayersList={aiPlayersList} 
          saveToArchive={saveToArchive} 
          kickUser={kickUser} 
        />
      )}
      
      {currentView === "evaluation" && activeRoom && currentUser && (
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
          currentUser={currentUser} 
          addFriend={addFriend} 
          openUserProfile={openUserProfile} 
          openRoomConfigModal={handleOpenRoomConfig} 
        />
      )}

      <AdVideoModal 
        adModal={adModal} 
        setAdModal={setAdModal} 
        executeTrialPlay={executeTrialPlay} 
        executeAdReward={executeAdReward} 
        spectateRoom={spectateRoom} 
      />
      
      <NovelSettingsModal 
        novelSettingsModal={novelSettingsModal} 
        setNovelSettingsModal={setNovelSettingsModal} 
        handleStartNovel={handleStartNovel} 
        isTicketSystemEnabled={isTicketSystemEnabled} 
      />
      
      <TicketStoreModal 
        isOpen={showTicketModal} 
        closeModal={() => setShowTicketModal(false)} 
        currentUser={currentUser} 
        adViewInfo={adViewInfo} 
        openAdModalForPoints={() => setAdModal({ isOpen: true, step: 1, scenario: null, room: null, type: 'points' })} 
        exchangeTicketWithPoints={exchangeTicketWithPoints} 
      />
      
      <RoomConfigModal 
        config={roomConfigModal} 
        setConfig={setRoomConfigModal} 
        closeModal={() => setRoomConfigModal(null)} 
        executeCreateRoom={executeCreateRoom} 
        isTicketSystemEnabled={isTicketSystemEnabled} 
      />

    </main>
  );
}