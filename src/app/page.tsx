"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { generateAIResponse, generateAITextWithPrompt, generateFreeImage, generatePremiumImage } from "../lib/ai";
import { getGMSystemPrompt, getNovelPrompt } from "../lib/prompts";
import { ViewState, UserProfile, Notification, BanAppeal, Report, Character, Scenario, Scene, Room, Message, ChatTab, PlayArchive } from "../types";

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
    if (myBlockedIds.includes(hostId) || joinedUserIds.some((id: string) => myBlockedIds.includes(id)) || blockedMeIds.includes(hostId)) return null;
    return { ...room, isWarning: joinedUserIds.some((id: string) => blockedMeIds.includes(id)) };
  }).filter(Boolean) as Room[];

  const defaultScene: Scene = { id: "scene_main", name: "メインルーム", memberIds: [] };
  const myScene = activeRoom?.scenes?.find((s: any) => joinedCharacter && s.memberIds.includes(joinedCharacter.id)) || activeRoom?.scenes?.[0] || defaultScene;
  const isSplitMode = activeRoom ? (activeRoom.scenes?.length > 1) : false;
  const isScenarioEnded = messages.some((m: any) => m.text.includes('[SCENARIO_END]')) || activeRoom?.status === 'finished';
  const unreadCount = myNotifications.filter((n: any) => !n.isRead).length;
  const isChatDisabled = Boolean(isLoading || (isSplitMode && myScene && myScene.isMerged === true && chatTab !== 'consult'));

  const deleteScenario = async (id: string) => {
    if (!confirm("本当にこのシナリオを削除しますか？\n（※関連する部屋も削除されます）")) return;
    await supabase.from('rooms').delete().eq('scenario_id', id);
    const { error } = await supabase.from('scenarios').delete().eq('id', id);
    if (error) alert("削除に失敗しました: " + error.message);
    else { alert("シナリオを削除しました。"); await fetchData(); }
  };

  const handleOpenRoomConfig = (scenario: Scenario) => {
    setRoomConfigModal({ scenario, charId: "", privacy: "open", message: "", difficulty: "normal", rule: "coc_jp", itemVisibility: "none", aiModel: "lite", language: "ja" });
  };

  const openUserProfile = (userId: string) => { setTargetUserId(userId); setCurrentView("userProfile"); };

  const addFriend = async (targetId: string) => {
    if (!currentUser) return;
    if (currentUser.friendIds?.includes(targetId)) { alert("既に登録済です。"); return; }
    const newFriends = [...(currentUser.friendIds || []), targetId];
    const { error } = await supabase.from('profiles').update({ friend_ids: newFriends }).eq('id', currentUser.id);
    if (!error) { setCurrentUser({ ...currentUser, friendIds: newFriends }); alert("追加しました！"); } 
  };

  const blockUser = async (targetId: string) => {
    if (!currentUser) return;
    if (confirm("ブロックしますか？")) {
      const newBlocked = [...(currentUser.blockedUserIds || []), targetId];
      const newFriends = (currentUser.friendIds || []).filter((id: string) => id !== targetId);
      await supabase.from('profiles').update({ blocked_user_ids: newBlocked, friend_ids: newFriends }).eq('id', currentUser.id);
      setCurrentUser({ ...currentUser, blockedUserIds: newBlocked, friendIds: newFriends }); alert("ブロックしました。");
    }
  };

  const unblockUser = async (targetId: string) => {
    if (!currentUser) return;
    const newBlocked = (currentUser.blockedUserIds || []).filter((id: string) => id !== targetId);
    await supabase.from('profiles').update({ blocked_user_ids: newBlocked }).eq('id', currentUser.id);
    setCurrentUser({ ...currentUser, blockedUserIds: newBlocked }); alert("ブロック解除しました。");
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const { error } = await supabase.from('profiles').update({ handle_name: updates.handleName, bio: updates.bio, avatar_url: updates.avatarUrl }).eq('id', currentUser.id);
    if (!error) setCurrentUser({ ...currentUser, ...updates });
  };

  const uploadAvatar = async (file: File) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const fileName = `${currentUser.id}_${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('avatars').upload(fileName, file);
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await updateProfile({ avatarUrl: data.publicUrl });
      alert("更新しました！");
    } finally { setIsLoading(false); }
  };

  const loadChatLogs = async (roomId: string) => {
    const { data } = await supabase.from('chat_logs').select('message').eq('room_id', roomId).order('id', { ascending: true });
    if (data && data.length > 0) setMessages(data.map((d: any) => d.message));
    else setMessages([]);
  };

  const pushMessage = async (roomId: string, msg: Message, save: boolean = true) => {
    setMessages(prev => {
      if (prev.some((m: any) => JSON.stringify(m) === JSON.stringify(msg))) return prev;
      return [...prev, msg];
    });
    if (save && roomId) { await supabase.from('chat_logs').insert({ room_id: roomId, message: msg }); }
  };

  useEffect(() => {
    if (currentView === "game" && activeRoom) {
      const chatChannel = supabase.channel(`chat_sync_${activeRoom.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_logs', filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
          setMessages(prev => prev.some((m: any) => JSON.stringify(m) === JSON.stringify(payload.new.message)) ? prev : [...prev, payload.new.message]);
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
    if (scData) {
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
    if (rmData && loadedScenarios.length > 0) {
      const formattedRooms = rmData.map((r: any) => ({
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
      return { loadedScenarios, formattedRooms };
    }
    return { loadedScenarios, formattedRooms: [] };
  };

  const fetchProfile = async (userId: string, emailStr: string, currentMaintenance: boolean, roomsData: Room[]) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!data || !data.full_name) { setEmail(emailStr); setCurrentView("onboarding"); return; }
    
    const today = new Date().toLocaleDateString('ja-JP');
    let vCount = data.ad_view_count || 0; let vDate = data.last_ad_view_date || "";
    if (vDate !== today) { vCount = 0; vDate = today; }
    setAdViewInfo({ count: vCount, date: vDate });

    const profileData: UserProfile = { 
      id: data.id, handleName: data.handle_name, fullName: data.full_name, address: data.address, phone: data.phone, avatarUrl: data.avatar_url, bio: data.bio, discordId: data.discord_id, ratingSum: data.rating_sum || 0, ratingCount: data.rating_count || 0, isAdmin: data.is_admin || false, isTester: data.is_tester || false, isBanned: data.is_banned || false, isSuspended: data.is_suspended || false, email: data.email, friendIds: data.friend_ids || [], blockedUserIds: data.blocked_user_ids || [], points: data.points || 0, ticketsNormal: data.tickets_normal || 0, ticketsBronze: data.tickets_bronze || 0, ticketsSilver: data.tickets_silver || 0, ticketsGold: data.tickets_gold || 0, ticketsPlatinum: data.tickets_platinum || 0, ticketsDiamond: data.tickets_diamond || 0, ticketsItem: data.tickets_item || 0, imageGenCredits: data.image_gen_credits || 0
    };
    if (data.email !== emailStr) await supabase.from('profiles').update({ email: emailStr }).eq('id', userId);
    setCurrentUser(profileData); 
    const { data: nData } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if(nData) setMyNotifications(nData.map((d: any) => ({ id: d.id, userId: d.user_id, title: d.title, message: d.message, isRead: d.is_read, createdAt: d.created_at })));

    const { data: blockedMeData } = await supabase.from('profiles').select('id').contains('blocked_user_ids', [userId]);
    setBlockedMeIds(blockedMeData ? blockedMeData.map((d: any) => d.id) : []);

    const { data: archiveData } = await supabase.from('play_archives').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (archiveData) setPlayArchives(archiveData.map((d: any) => ({ id: d.id, userId: d.user_id, scenarioId: d.scenario_id, scenarioTitle: d.scenario_title, scenarioImage: d.scenario_image, characterName: d.character_name, chatLogs: d.chat_logs, createdAt: d.created_at, rule: d.rule, coPlayers: d.co_players, novels: d.novels || {}, characters: d.characters || [] })));

    if (!profileData.isBanned && (!currentMaintenance || profileData.isAdmin || profileData.isTester)) {
      const activeMyRoom = roomsData.find((r: any) => (r.status === 'playing' || r.status === 'splitting' || r.status === 'recruiting') && r.joined_users && r.joined_users[userId]);
      if (activeMyRoom && activeMyRoom.scenario) {
        const charId = activeMyRoom.joined_users[userId];
        const char = activeMyRoom.scenario.presetCharacters.find((c: any) => c.id === charId);
        if (char) { setActiveRoom(activeMyRoom); setJoinedCharacter(char); setAiPlayersList(activeMyRoom.scenario.presetCharacters.filter((c: any) => !Object.values(activeMyRoom.joined_users || {}).includes(c.id))); await loadChatLogs(activeMyRoom.id); setCurrentView("game"); return; }
      }
      setCurrentView("lobby");
    } else if (profileData.isBanned) setCurrentView("banned"); 
    else setCurrentView("maintenance");
  };

  useEffect(() => {
    const initApp = async () => {
      const { data: appData } = await supabase.from('app_settings').select('*').eq('id', 1).single();
      setIsMaintenance(appData?.is_maintenance || false); setIsTicketSystemEnabled(appData?.is_ticket_system_enabled || false); setGeminiFlashModel(appData?.gemini_flash_model || '3.5-lite');
      const { formattedRooms } = await fetchData();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await fetchProfile(session.user.id, session.user.email || "", appData?.is_maintenance || false, formattedRooms);
    };
    initApp();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { formattedRooms } = await fetchData(); if (data.user) await fetchProfile(data.user.id, email, isMaintenance, formattedRooms);
    } catch (e: any) { alert("ログインエラー: " + e.message); } finally { setAuthLoading(false); }
  };

  const handleEmailSignUp = async (e: React.FormEvent, name: string, addr: string, phone: string) => {
    e.preventDefault(); setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, handle_name: name.split(" ")[0] || email.split("@")[0], full_name: name, address: addr, phone: phone, avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", email: email });
        alert("アカウント作成完了！"); const { formattedRooms } = await fetchData(); await fetchProfile(data.user.id, email, isMaintenance, formattedRooms);
      }
    } catch (e: any) { alert("登録エラー: " + e.message); } finally { setAuthLoading(false); }
  };

  const handleProfileSetup = async (name: string, addr: string, phone: string) => {
    setAuthLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("セッションなし");
      await supabase.from('profiles').upsert({ id: session.user.id, handle_name: name.split(" ")[0] || session.user.email?.split("@")[0], full_name: name, address: addr, phone: phone, avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", email: session.user.email });
      const { formattedRooms } = await fetchData(); await fetchProfile(session.user.id, session.user.email || "", isMaintenance, formattedRooms);
    } catch (e: any) { alert("エラー: " + e.message); } finally { setAuthLoading(false); }
  };

  const handleGoogleAuth = async () => { setAuthLoading(true); await supabase.auth.signInWithOAuth({ provider: 'google' }); setAuthLoading(false); };
  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setCurrentView("login"); setActiveRoom(null); setJoinedCharacter(null); };

  const togglePauseRoom = async () => {
    if (!activeRoom) return; const newStatus = !activeRoom.is_paused;
    await supabase.from('rooms').update({ is_paused: newStatus }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, is_paused: newStatus });
    await pushMessage(activeRoom.id, { sender: "system", text: newStatus ? "【システム】セッションを中断しました。" : "【システム】セッションを再開しました！", type: "system", channel: "system" });
  };

  const toggleAFK = async (userId: string, forceRemove: boolean = false) => {
    if (!activeRoom) return;
    let newAfk = [...(activeRoom.afk_users || [])];
    if (forceRemove || newAfk.includes(userId)) newAfk = newAfk.filter((id: string) => id !== userId);
    else newAfk.push(userId);
    await supabase.from('rooms').update({ afk_users: newAfk }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, afk_users: newAfk });
    const charName = activeRoom.scenario?.presetCharacters.find((c: any) => c.id === activeRoom.joined_users?.[userId])?.name || "プレイヤー";
    await pushMessage(activeRoom.id, { sender: "system", text: forceRemove || !newAfk.includes(userId) ? `【システム】${charName}が復帰しました。` : `【システム】${charName}が離席しました。`, type: "system", channel: "system" }, false); 
  };

  const kickUser = async (uid: string) => {
    if (!activeRoom || !currentUser || activeRoom.host_id !== currentUser.id || !confirm("強制退出させますか？")) return;
    const newUsers = { ...activeRoom.joined_users }; const charId = newUsers[uid]; delete newUsers[uid];
    let newAfk = [...(activeRoom.afk_users || [])].filter((id: string) => id !== uid);
    await supabase.from('rooms').update({ joined_users: newUsers, afk_users: newAfk }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, joined_users: newUsers, afk_users: newAfk });
    const charName = activeRoom.scenario?.presetCharacters.find((c: any) => c.id === charId)?.name || "プレイヤー";
    await pushMessage(activeRoom.id, { sender: "system", text: `【システム】${charName} は追放されました。`, type: "system", channel: "system" }, true);
  };

  const triggerAutoAction = async () => {
    if (!activeRoom || activeRoom.is_paused || activeRoom.status !== 'playing' || isScenarioEnded || isRequestingRef.current) return;
    isRequestingRef.current = true; setIsLoading(true);
    try { await callAIGM("【システムコマンド：タイムアウト自動行動】5分間入力なし。物語を前進させてください。", "story"); } finally { isRequestingRef.current = false; setIsLoading(false); }
  };

  const saveScenario = async () => {
    if (!editingScenario || !currentUser) return;
    setIsLoading(true);
    try {
      let translationEn = editingScenario.translationEn || {};
      let translationZh = editingScenario.translationZh || {};
      if (editingScenario.title && editingScenario.description) {
        try {
          const charsData = editingScenario.presetCharacters.map((c: any) => ({ name: c.name, job: c.job, personality: c.personality }));
          const promptBase = `Translate the following TRPG scenario information into [TARGET_LANG]. Return ONLY a valid JSON object with no markdown formatting. Structure: {"title": "...", "description": "...", "characters": [{"name": "...", "job": "...", "personality": "..."}]}.\n\nTitle: ${editingScenario.title}\nDescription: ${editingScenario.description}\nCharacters: ${JSON.stringify(charsData)}`;
          const [resEn, resZh] = await Promise.all([
            generateAITextWithPrompt(promptBase.replace('[TARGET_LANG]', 'English'), 'flash', 2000, 0.3),
            generateAITextWithPrompt(promptBase.replace('[TARGET_LANG]', 'Simplified Chinese'), 'flash', 2000, 0.3)
          ]);
          translationEn = JSON.parse(resEn.replace(/```json/g, "").replace(/```/g, "").trim());
          translationZh = JSON.parse(resZh.replace(/```json/g, "").replace(/```/g, "").trim());
        } catch (e) { alert("自動翻訳に一部失敗しましたが、シナリオは保存されます。"); }
      }
      const dbData = { 
        title: editingScenario.title, description: editingScenario.description || "", system: editingScenario.system || "", tags: editingScenario.tags || "", setting: editingScenario.setting || "", 
        npc_list: editingScenario.npcList || "", plot: editingScenario.plot || "", prologue: editingScenario.prologue || "", epilogue: editingScenario.epilogue || "",
        image_url: editingScenario.imageUrl || "", preset_characters: editingScenario.presetCharacters, rating_sum: editingScenario.ratingSum, rating_count: editingScenario.ratingCount, author_id: currentUser.id, purchased_tickets: editingScenario.purchasedTickets || {}, price: editingScenario.price || 500, play_limit: editingScenario.playLimit || 1, giftLimit: editingScenario.giftLimit || 1, play_time: editingScenario.playTime || 60, is_playable_by_others: editingScenario.isPlayableByOthers || false, is_trial_ok: editingScenario.isTrialOk || false, item_visibility: editingScenario.itemVisibility || "none", required_scenario_id: editingScenario.requiredScenarioId || "",
        translation_en: translationEn, translation_zh: translationZh
      };
      if (editingScenario.id && !editingScenario.id.startsWith('s')) await supabase.from('scenarios').update(dbData).eq('id', editingScenario.id);
      else await supabase.from('scenarios').insert(dbData);
      alert("シナリオを保存（多言語翻訳）しました！"); await fetchData(); setCurrentView("lobby");
    } catch (err: any) { alert("保存エラー: " + err.message); } finally { setIsLoading(false); }
  };

  const submitEvaluation = async () => {
    if(!activeRoom || !activeRoom.scenario || !currentUser) return;
    await supabase.from('scenarios').update({ rating_sum: activeRoom.scenario.ratingSum + ratingScenario, rating_count: activeRoom.scenario.ratingCount + 1 }).eq('id', activeRoom.scenario.id);
    if(activeRoom.host_id) {
      const { data } = await supabase.from('profiles').select('rating_sum, rating_count').eq('id', activeRoom.host_id).single();
      if(data) await supabase.from('profiles').update({ rating_sum: (data.rating_sum || 0) + ratingGM, rating_count: (data.rating_count || 0) + 1 }).eq('id', activeRoom.host_id);
    }
    alert("評価を送信しました！"); setActiveRoom(null); setJoinedCharacter(null); await fetchData(); setCurrentView("lobby");
  };

  const submitUserReport = async () => {
    if (!currentUser || !reportTarget || !reportReason.trim()) return;
    await supabase.from('reports').insert({ reporter_id: currentUser.id, target_type: reportTarget.type, target_id: reportTarget.id, room_id: reportTarget.roomId || null, reason: reportReason });
    alert("通報しました。"); setReportTarget(null); setReportReason("");
  };

  const submitScenarioAppeal = async () => {
    if (!currentUser || !scenarioAppealTarget || !scenarioAppealText.trim()) return;
    await supabase.from('reports').insert({ reporter_id: currentUser.id, target_type: 'scenario_appeal', target_id: scenarioAppealTarget.id, reason: scenarioAppealText });
    alert("再審査の申請を送信しました。"); setScenarioAppealTarget(null); setScenarioAppealText(""); await fetchAdminData();
  };

  // --- 管理画面API ---
  const fetchAdminData = async () => {
    const { data: uData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (uData) setAllUsers(uData.map((d: any) => ({ id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id, ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0, isAdmin: d.is_admin || false, isTester: d.is_tester || false, isBanned: d.is_banned || false, isSuspended: d.is_suspended || false, email: d.email, points: d.points })));
    const { data: rData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (rData) setReports(rData.map((d: any) => ({ id: d.id, reporterId: d.reporter_id, targetType: d.target_type, targetId: d.target_id, roomId: d.room_id || null, reason: d.reason, status: d.status, createdAt: d.created_at })));
  };
  const toggleMaintenance = async () => { const s = !isMaintenance; await supabase.from('app_settings').update({ is_maintenance: s }).eq('id', 1); setIsMaintenance(s); };
  const toggleTicketSystem = async () => { const s = !isTicketSystemEnabled; await supabase.from('app_settings').update({ is_ticket_system_enabled: s }).eq('id', 1); setIsTicketSystemEnabled(s); };
  const toggleGeminiFlashModel = async (m: '3.5-lite'|'3.6') => { await supabase.from('app_settings').update({ gemini_flash_model: m }).eq('id', 1); setGeminiFlashModel(m); };
  const resolveReport = async (id: string) => { await supabase.from('reports').update({ status: 'resolved' }).eq('id', id); fetchAdminData(); };
  const toggleAdminStatus = async (id: string, s: boolean) => { await supabase.from('profiles').update({ is_admin: !s }).eq('id', id); fetchAdminData(); };
  const toggleTesterStatus = async (id: string, s: boolean) => { await supabase.from('profiles').update({ is_tester: !s }).eq('id', id); fetchAdminData(); };
  const adminExecuteBan = async (id: string, r: string) => { await supabase.from('profiles').update({ is_banned: true }).eq('id', id); await supabase.from('ban_appeals').insert({ user_id: id, reason: r, status: 'banned' }); fetchAdminData(); };
  const adminUnbanUser = async (id: string) => { await supabase.from('profiles').update({ is_banned: false }).eq('id', id); await supabase.from('ban_appeals').update({ status: 'resolved' }).eq('user_id', id); fetchAdminData(); };
  const adminSuspendUser = async (id: string) => { await supabase.from('profiles').update({ is_suspended: true }).eq('id', id); fetchAdminData(); };
  const adminUnsuspendUser = async (id: string) => { await supabase.from('profiles').update({ is_suspended: false }).eq('id', id); fetchAdminData(); };
  const adminExecuteScenarioBan = async (id: string, r: string) => { await supabase.from('scenarios').update({ is_banned: true }).eq('id', id); const s = scenarios.find((x:any)=>x.id===id); if(s?.authorId) await supabase.from('notifications').insert({ user_id: s.authorId, title: '【重要】シナリオ修正依頼', message: r }); fetchData(); fetchAdminData(); };
  const adminUnbanScenario = async (id: string) => { await supabase.from('scenarios').update({ is_banned: false }).eq('id', id); fetchData(); fetchAdminData(); };
  const adminDeleteScenario = async (id: string) => { if(!confirm("削除しますか？")) return; await supabase.from('rooms').delete().eq('scenario_id', id); await supabase.from('scenarios').delete().eq('id', id); fetchData(); fetchAdminData(); };
  const adminSendMailToUser = async (id: string, b: string) => { await supabase.from('notifications').insert({ user_id: id, title: '✉️ 運営からのお知らせ', message: b }); alert("送信しました"); };
  const grantPointsToAll = async (a: number) => { if(!confirm("付与しますか？")) return; setIsLoading(true); for(const u of allUsers){ await supabase.from('profiles').update({ points: (u.points||0)+a }).eq('id', u.id); } fetchAdminData(); setIsLoading(false); alert("付与完了"); };
  const executeCreateTester = async (e: string, p: string) => { try{ const {data,error}=await supabase.auth.signUp({email:e,password:p}); if(error)throw error; if(data.user){ await supabase.from('profiles').upsert({id:data.user.id,handle_name:e.split('@')[0],is_tester:true,email:e}); alert("作成完了。再ログインしてください。"); handleLogout();} }catch(err:any){alert(err.message);} };

  const exchangeTicketWithPoints = async (type: 'bronze'|'item'|'silver'|'gold'|'platinum'|'diamond', cost: number) => {
    if (!currentUser || (currentUser.points || 0) < cost || !confirm(`${cost} pt消費しますか？`)) return;
    const upd: any = { points: currentUser.points! - cost };
    if(type==='bronze') upd.tickets_bronze=(currentUser.ticketsBronze||0)+1; if(type==='item') upd.tickets_item=(currentUser.ticketsItem||0)+1; if(type==='silver') upd.tickets_silver=(currentUser.ticketsSilver||0)+1; if(type==='gold') upd.tickets_gold=(currentUser.ticketsGold||0)+1; if(type==='platinum') upd.tickets_platinum=(currentUser.ticketsPlatinum||0)+1; if(type==='diamond') upd.tickets_diamond=(currentUser.ticketsDiamond||0)+1;
    await supabase.from('profiles').update(upd).eq('id', currentUser.id);
    setCurrentUser({...currentUser, points: upd.points, ticketsBronze: upd.tickets_bronze||currentUser.ticketsBronze, ticketsItem: upd.tickets_item||currentUser.ticketsItem, ticketsSilver: upd.tickets_silver||currentUser.ticketsSilver, ticketsGold: upd.tickets_gold||currentUser.ticketsGold, ticketsPlatinum: upd.tickets_platinum||currentUser.ticketsPlatinum, ticketsDiamond: upd.tickets_diamond||currentUser.ticketsDiamond});
    alert("交換完了！");
  };

  const generatePackageImage = async (baseText: string, type: 'scenario' | 'character') => {
    setIsLoading(true);
    try {
      const q = type === 'scenario' ? `以下のプロットからパッケージの情景を1文の日本語で抽出:\n\n${baseText}` : `以下の設定から容姿を1文の日本語で描写:\n\n${baseText}`;
      const jPrompt = await generateAITextWithPrompt(q, 'lite', 200, 0.7);
      const enPrompt = await generateAITextWithPrompt(`英語のプロンプトに変換。最後に SFW, masterpiece, high quality を含める:\n${jPrompt}`, 'lite', 200, 0.3);
      return await generateFreeImage(enPrompt);
    } catch { alert("失敗しました。"); return null; } finally { setIsLoading(false); }
  };

  const generateSceneImage = async (type: 'free' | 'premium') => {
    if (!activeRoom || !myScene || !currentUser || isRequestingRef.current) return;
    isRequestingRef.current = true; setIsLoading(true);
    try {
      if (type === 'free') {
        if ((activeRoom.free_image_count || 0) >= 3) { alert("無料生成は3回までです。"); return; }
        const nc = (activeRoom.free_image_count || 0) + 1; await supabase.from('rooms').update({ free_image_count: nc }).eq('id', activeRoom.id); setActiveRoom(p=>p?{...p, free_image_count: nc}:null);
      } else {
        if (isTicketSystemEnabled && (currentUser.ticketsItem || 0) < 1) { alert("チケット不足"); return; }
        if (isTicketSystemEnabled) { await supabase.from('profiles').update({ tickets_item: (currentUser.ticketsItem || 0) - 1 }).eq('id', currentUser.id); setCurrentUser(p=>p?{...p, ticketsItem:(p.ticketsItem||0)-1}:null); }
      }
      const { data: mem } = await supabase.from('ai_memory').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: false }).limit(10);
      const logs = mem?.reverse().map((m: any) => m.content).join('\n') || "";
      const jp = await generateAITextWithPrompt(`直近のログから場所・雰囲気を1文で:\n${logs}`, 'lite', 400, 0.7);
      const en = await generateAITextWithPrompt(`英語プロンプトに変換。最後に SFW, fully clothed, masterpiece, high quality を付与:\n${jp}`, 'lite', 200, 0.3);
      const img = type === 'free' ? await generateFreeImage(en) : await generatePremiumImage(en);
      await pushMessage(activeRoom.id, { sender: "gm", text: `【画像生成】\n「${jp}」`, type: "image", imageUrl: img, sceneId: myScene.id, channel: "story" });
    } catch { alert("失敗"); } finally { isRequestingRef.current = false; setIsLoading(false); }
  };

  const startSplitting = async () => {
    if (!activeRoom) return; setIsLoading(true);
    await supabase.from('rooms').update({ status: 'splitting' }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, status: 'splitting', scenes: [{ id: 'scene_main', name: 'メインルーム', memberIds: [] }] });
    setProposedTeams([]); await generateSplitProposal(); setIsLoading(false);
  };
  const generateSplitProposal = async () => {
    if (!activeRoom) return; setIsGeneratingSplit(true);
    try {
      const { data: mem } = await supabase.from('ai_memory').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: false }).limit(15);
      const logs = mem?.reverse().map((m: any) => m.content).join('\n') || "";
      const chars = activeRoom.scenario?.presetCharacters.filter((c: any) => Object.values(activeRoom.joined_users || {}).includes(c.id)).map((c: any) => `{"id": "${c.id}", "name": "${c.name}"}`).join(", ") || "";
      const jsonStr = await generateAITextWithPrompt(`チーム分け案を作成(JSONのみ):\n【参加】${chars}\n【ログ】${logs}`, 'lite', 800, 0.3);
      const p = JSON.parse(jsonStr.replace(/```json/g, "").replace(/```/g, "").trim());
      setProposedTeams(p.teams ? p.teams.map((t: any) => ({ id: `t_${Date.now()}_${Math.random()}`, action: t.action, members: t.members, leader: t.members[0]||"" })) : [{ id: `t_${Date.now()}`, action: "", members: [], leader: "" }]);
    } catch { setProposedTeams([{ id: `t_${Date.now()}`, action: "", members: [], leader: "" }]); } finally { setIsGeneratingSplit(false); }
  };
  const finishSplitting = async () => {
    if (!activeRoom) return; const vt = proposedTeams.filter(t => t.action && t.members.length > 0);
    if(vt.length === 0) return; setIsLoading(true);
    const ns: Scene[] = [{ id: 'scene_main', name: 'メインルーム', memberIds: [] }, ...vt.map(t => ({ id: t.id, name: t.action, memberIds: t.members, leaderId: t.leader, isMerged: false }))];
    await supabase.from('rooms').update({ scenes: ns, status: 'playing' }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, scenes: ns, status: 'playing' });
    await pushMessage(activeRoom.id, { sender: "system", text: "【システム】チーム分け完了", type: "system", sceneId: "scene_main", channel: "system" });
    setIsLoading(false);
  };
  const cancelSplitting = async () => { if(activeRoom){ await supabase.from('rooms').update({ status: 'playing' }).eq('id', activeRoom.id); setActiveRoom({...activeRoom, status: 'playing'}); }};
  const mergeTeam = async () => {
    if(!activeRoom || !myScene || myScene.id === 'scene_main') return; setIsLoading(true);
    const us = activeRoom.scenes.map(s => s.id === myScene.id ? { ...s, isMerged: true } : s);
    await supabase.from('rooms').update({ scenes: us }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, scenes: us });
    await pushMessage(activeRoom.id, { sender: "system", text: `【システム】合流待機中`, type: "system", sceneId: myScene.id, channel: "system" });
    setIsLoading(false);
  };
  const executeMergeAll = async () => {
    if(!activeRoom) return; setIsLoading(true);
    const rs: Scene[] = [{ id: 'scene_main', name: 'メインルーム', memberIds: Object.keys(activeRoom.joined_users || {}) }];
    await supabase.from('rooms').update({ scenes: rs }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, scenes: rs });
    await pushMessage(activeRoom.id, { sender: "system", text: "【システム】全チーム合流", type: "system", sceneId: 'scene_main', channel: "system" });
    await callAIGM("【システム】全チーム合流しました。現状を描写してください。", "story");
    setIsLoading(false);
  };

  const executeCreateRoom = async () => {
    if (!currentUser || !roomConfigModal) return;
    const { scenario, charId, privacy, message, difficulty, rule, itemVisibility, aiModel, language } = roomConfigModal;
    if (!charId) { alert("キャラクターを選択してください。"); return; }
    const isAuthor = scenario.authorId === currentUser.id;
    if (isTicketSystemEnabled && !isAuthor) {
      let tk = 'tickets_bronze'; let tn = 'ブロンズ';
      if(aiModel==='flash') {tk='tickets_silver'; tn='シルバー';} if(aiModel==='pro') {tk='tickets_gold'; tn='ゴールド';} if(aiModel==='claude') {tk='tickets_platinum'; tn='プラチナ';} if(aiModel==='opus') {tk='tickets_diamond'; tn='ダイヤモンド';}
      if ((currentUser as any)[tk] < 1) { alert(`${tn}チケットが足りません！`); setShowTicketModal(true); return; }
      if (!confirm(`${tn}チケット を1枚消費しますか？`)) return;
      await supabase.from('profiles').update({ [tk]: (currentUser as any)[tk] - 1 }).eq('id', currentUser.id);
      setCurrentUser(p => p ? { ...p, [tk]: (p as any)[tk] - 1 } : null);
    }
    const hostChar = scenario.presetCharacters.find((c: any) => c.id === charId);
    if (!hostChar) return;
    const is: Scene[] = [{ id: `sc_${Date.now()}`, name: "メインルーム", memberIds: scenario.presetCharacters.map((c: any) => c.id) }];
    const invs: any = {}; scenario.presetCharacters.forEach((c: any) => { invs[c.id] = c.items || ""; });
    const { data, error } = await supabase.from('rooms').insert({ 
      scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: is, privacy, host_message: message, joined_users: { [currentUser.id]: charId }, current_summary: "", difficulty, rule, is_paused: false, afk_users: [], is_trial: false, item_visibility: itemVisibility, inventories: invs, current_chapter_index: 0, ai_model: aiModel, error_refunded: false, free_image_count: 0, is_lost: false, lost_turn_count: 0, language: language || 'ja'
    }).select().single();
    if (error) { alert("エラー: " + error.message); return; }
    if (data) {
      await supabase.from('scenarios').update({ play_count: (scenario.playCount || 0) + 1 }).eq('id', scenario.id);
      setRoomConfigModal(null); await fetchData();
      const nr: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users, current_summary: "", difficulty: data.difficulty, rule: data.rule, is_paused: false, afk_users: [], is_trial: false, item_visibility: data.item_visibility, inventories: data.inventories, current_chapter_index: 0, ai_model: data.ai_model, error_refunded: false, free_image_count: 0, is_lost: false, lost_turn_count: 0, language: data.language };
      await supabase.from('ai_memory').delete().eq('room_id', nr.id);
      setActiveRoom(nr); setJoinedCharacter(hostChar); setMessages([]); 
      await pushMessage(nr.id, { sender: "system", text: `【入室完了】準備が整うまでお待ちください。`, type: "system", sceneId: nr.scenes[0].id, channel: "system" });
      setCurrentView("game");
    }
  };

  const executeTrialPlay = async () => {
    if (!currentUser || !adModal.scenario) return;
    const scenario = adModal.scenario; setAdModal({ isOpen: false, step: 0, scenario: null, room: null, type: 'trial' });
    const charId = scenario.presetCharacters[0]?.id; if (!charId) return;
    const is: Scene[] = [{ id: `sc_${Date.now()}`, name: "メインルーム", memberIds: scenario.presetCharacters.map((c: any) => c.id) }];
    const invs: any = {}; scenario.presetCharacters.forEach((c: any) => { invs[c.id] = c.items || ""; });
    const { data } = await supabase.from('rooms').insert({ 
      scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: is, privacy: 'secret', host_message: "お試しプレイ", joined_users: { [currentUser.id]: charId }, current_summary: "", difficulty: "normal", rule: "coc_jp", is_paused: false, afk_users: [], is_trial: true, item_visibility: "none", inventories: invs, current_chapter_index: 0, ai_model: 'lite', language: 'ja'
    }).select().single();
    if (data) {
      await supabase.from('scenarios').update({ play_count: (scenario.playCount || 0) + 1 }).eq('id', scenario.id); await fetchData();
      const nr: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes, privacy: data.privacy, host_message: data.host_message, joined_users: data.joined_users, current_summary: "", difficulty: data.difficulty, rule: data.rule, is_paused: false, afk_users: [], is_trial: true, item_visibility: "none", inventories: data.inventories, current_chapter_index: 0, ai_model: data.ai_model, error_refunded: false, free_image_count: 0, is_lost: false, lost_turn_count: 0, language: 'ja' };
      setActiveRoom(nr); setJoinedCharacter(scenario.presetCharacters[0]); setMessages([]); setAiPlayersList(scenario.presetCharacters.filter((c: any) => c.id !== charId));
      await pushMessage(nr.id, { sender: "system", text: `【お試し開始】`, type: "system", sceneId: nr.scenes[0].id, channel: "system" });
      setCurrentView("game");
    }
  };

  const executeJoinRoom = async (room: Room, charId: string) => {
    if (!currentUser || currentUser.isSuspended) { alert("参加制限中"); return; }
    const { data: latestRoom } = await supabase.from('rooms').select('joined_users, inventories').eq('id', room.id).single();
    if (Object.values(latestRoom?.joined_users || {}).includes(charId)) { alert("選択済です"); return; }
    const char = room.scenario?.presetCharacters.find((c: any) => c.id === charId); if (!char) return;
    const nu = { ...latestRoom?.joined_users, [currentUser.id]: charId };
    const ni = { ...latestRoom?.inventories, [currentUser.id]: char.items || "" };
    await supabase.from('rooms').update({ joined_users: nu, inventories: ni }).eq('id', room.id);
    setActiveRoom({ ...room, joined_users: nu, inventories: ni }); setJoinedCharacter(char); await loadChatLogs(room.id);
    await pushMessage(room.id, { sender: "system", text: `【入室完了】${char.name}として参加しました！`, type: "system", sceneId: room.scenes[0].id, channel: "system" });
    setCurrentView("game");
  };

  const spectateRoom = async (room: Room) => {
    if (!currentUser) return;
    const ns = [...(room.spectator_ids || []), currentUser.id];
    await supabase.from('rooms').update({ spectator_ids: ns }).eq('id', room.id);
    setActiveRoom({ ...room, spectator_ids: ns }); setJoinedCharacter(null); await loadChatLogs(room.id);
    await pushMessage(room.id, { sender: "system", text: `【観戦モード】`, type: "system", sceneId: room.scenes[0].id, channel: "system" }, false);
    setCurrentView("game");
  };

  const startGame = async () => {
    if(!activeRoom || !joinedCharacter || !myScene) return; setIsLoading(true);
    const takenIds = Object.values(activeRoom.joined_users || {});
    let aiChars = activeRoom.scenario?.presetCharacters.filter((c: any) => !takenIds.includes(c.id)) || [];
    setAiPlayersList(aiChars);
    await supabase.from('rooms').update({ status: 'playing', is_paused: false }).eq('id', activeRoom.id);
    setActiveRoom({ ...activeRoom, status: 'playing', is_paused: false });
    await pushMessage(activeRoom.id, { sender: "system", text: `【システム】ゲーム開始！`, type: "system", sceneId: myScene.id, channel: "system" });
    await callAIGM(`【開始】以下の導入を描写し、ダイス判定をさせてください。\n${activeRoom.scenario?.prologue || ""}`, "story", true);
    setIsLoading(false);
  };

  const endGame = async () => {
    if(activeRoom && (currentUser?.id === activeRoom.host_id || activeRoom.is_trial)) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
      setActiveRoom({...activeRoom, status: 'finished'});
    }
  };

  const leaveGame = async () => {
    if (!activeRoom || !currentUser) return;
    if (activeRoom.status === 'finished') { setCurrentView("evaluation"); return; }
    if (!joinedCharacter) { setCurrentView("lobby"); setActiveRoom(null); return; }
    if (confirm("離脱しますか？")) {
      const nu = { ...activeRoom.joined_users }; delete nu[currentUser.id];
      await supabase.from('rooms').update({ joined_users: nu }).eq('id', activeRoom.id);
      setCurrentView("lobby"); setActiveRoom(null); setJoinedCharacter(null); setAiPlayersList([]); setMessages([]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeRoom || !joinedCharacter || !myScene) return;
    const cur = input; setInput(""); setIsLoading(true);
    if (activeRoom.status === 'finished' || activeRoom.status === 'recruiting' || (chatTab === "consult" && !consultWithAI)) {
      await pushMessage(activeRoom.id, { sender: "player", text: cur, type: "ooc", sceneId: myScene.id, charName: joinedCharacter.name, channel: chatTab }); setIsLoading(false); return; 
    }
    await pushMessage(activeRoom.id, { sender: "player", text: cur, type: chatTab === "story" ? "ic" : "ooc", sceneId: myScene.id, charName: joinedCharacter.name, channel: chatTab });
    const pfx = isSplitMode && myScene.id !== 'scene_main' ? `[${myScene.name}チーム - ${joinedCharacter.name}] ` : `${joinedCharacter.name}「`;
    const sfx = isSplitMode && myScene.id !== 'scene_main' ? `` : `」`;
    await callAIGM(chatTab === "story" ? `【行動宣言】${pfx}${cur}${sfx}` : chatTab === "consult" ? `【PL間相談】${pfx}${cur}${sfx}` : `【GM質問】PL: ${cur}`, chatTab);
    setIsLoading(false);
  };

  const rollDice = async (tv: number, lbl: string, d100: boolean = false) => {
    if(!activeRoom || !joinedCharacter) return; setIsLoading(true);
    let r = 0; let s = false; let msg = "";
    if (activeRoom.rule === "dnd") { r = Math.floor(Math.random()*20)+1; const m=Math.floor((tv-10)/2)||0; s = r+m>=12; msg = `🎲 ${lbl} (1d20${m>=0?'+':''}${m}) ➔ ${r} (計${r+m}) vs DC12 【${s?"成功":"失敗"}】`; }
    else if (activeRoom.rule === "sw25") { const d1=Math.floor(Math.random()*6)+1; const d2=Math.floor(Math.random()*6)+1; r=d1+d2; const b=Math.floor(tv/6)||0; s=r+b>=10; msg=`🎲 ${lbl} (2d6+${b}) ➔ ${r} vs 10 【${s?"成功":"失敗"}】`; }
    else { r = d100 ? Math.floor(Math.random()*100)+1 : Math.floor(Math.random()*18)+3; s = r <= tv; msg = `🎲 ${lbl} ➔ 出目: ${r} 【${s?"成功":"失敗"}】`; }
    await pushMessage(activeRoom.id, { sender: "player", text: msg, type: "ic", sceneId: myScene.id, charName: joinedCharacter.name, channel: chatTab });
    if (activeRoom.status === 'playing') await callAIGM(`【判定結果】${joinedCharacter.name}: ${msg}`, chatTab, false, 'lite');
    setIsLoading(false);
  };

  const callAIGM = async (extra?: string, tab: ChatTab = "story", start: boolean = false, forcedModel?: string) => {
    if (!activeRoom || !joinedCharacter) return;
    try {
      if (extra) await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'user', content: extra });
      const { data: mData } = await supabase.from('ai_memory').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: true });
      const curMem = mData || [];
      const history = curMem.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      if (history.length === 0) history.push({ role: 'user', parts: [{ text: "開始" }]});
      
      let langInstruction = "";
      if (activeRoom.language === 'en') langInstruction = "\n【LANGUAGE: ENGLISH】This session MUST be conducted entirely in English. All responses, scene descriptions, and NPC dialogues must be in English.";
      else if (activeRoom.language === 'zh') langInstruction = "\n【LANGUAGE: CHINESE】This session MUST be conducted entirely in Simplified Chinese (简体中文). All responses and descriptions must be in Chinese.";

      const aiText = await generateAIResponse(getGMSystemPrompt(forcedModel || activeRoom.ai_model || 'lite', { title: activeRoom.scenario?.title, setting: activeRoom.scenario?.setting, scenarioPlotText: activeRoom.scenario?.plot, currentSummary: activeRoom.current_summary, joinedCharacter, inventoryText: "", aiPlayersText: "", ruleSpec: "", gmStyle: langInstruction, difficultyInstruction: "", isTrial: activeRoom.is_trial, mySceneName: myScene.name, isSplitMode, afkInstruction: "", targetTab: tab, activeNpcListText: "" }), history, forcedModel || activeRoom.ai_model || 'lite', 3000, 0.7);
      
      let resText = aiText;
      try { const j = JSON.parse(aiText.replace(/```json/g,"").replace(/```/g,"").trim()); resText = j.text || aiText; } catch(e){}
      
      await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'assistant', content: resText });
      await pushMessage(activeRoom.id, { sender: tab==="consult"?"ai_player":"gm", text: resText, type: tab==="gm"?"ooc":"ic", sceneId: myScene.id, charName: tab==="consult"?"AI相棒":"AI GM", channel: tab });
    } catch (e: any) { alert("AIエラー: " + e.message); }
  };

  const handleTabClick = (tab: ChatTab) => { setChatTab(tab); setUnreadIndicators(p => ({ ...p, [tab]: false })); };
  const updateInventory = async (items: string) => { if (activeRoom && currentUser) { const ni = { ...activeRoom.inventories, [currentUser.id]: items }; await supabase.from('rooms').update({ inventories: ni }).eq('id', activeRoom.id); setActiveRoom({ ...activeRoom, inventories: ni }); } };
  
  const saveToArchive = async (silent: boolean = false) => {
    if (!currentUser || !activeRoom || !joinedCharacter) return;
    const isOwn = activeRoom.scenario?.authorId === currentUser.id;
    if (isTicketSystemEnabled && !isOwn) {
      if ((currentUser.ticketsItem || 0) < 1) { if(!silent) { alert("チケット不足"); setShowTicketModal(true); } return; }
      if(!silent && !confirm("アイテムチケットを1枚消費しますか？")) return;
      await supabase.from('profiles').update({ tickets_item: (currentUser.ticketsItem || 0) - 1 }).eq('id', currentUser.id);
      setCurrentUser(p => p ? { ...p, ticketsItem: (p.ticketsItem || 0) - 1 } : null);
    }
    const end = messages.findIndex((m: any) => m.text.includes('[SCENARIO_END]'));
    const bMsgs = end !== -1 ? messages.slice(0, end + 1) : messages;
    const { data } = await supabase.from('play_archives').insert({ user_id: currentUser.id, scenario_id: activeRoom.scenario_id, scenario_title: activeRoom.scenario?.title||"", scenario_image: activeRoom.scenario?.imageUrl||"", character_name: joinedCharacter.name, chat_logs: bMsgs, rule: activeRoom.rule }).select().single();
    if (data) { setPlayArchives(p => [data, ...p]); if(!silent) { alert("保存しました！"); setCurrentView("library"); } }
  };

  const executeExport = async (title: string, sourceMessages: Message[], type: 'chat' | 'summary' | 'novel', options?: { archiveId?: string, modelName?: string, viewPoint?: 'third' | 'first', myCharacterName?: string, scenarioImage?: string, createdAt?: string, coPlayers?: string[], characters?: Character[], scenarioId?: string, authorId?: string, aiModelConfirmed?: boolean, aiModel?: string, tone?: string }) => {
    if (type === 'novel' && !options?.aiModelConfirmed) {
      setNovelSettingsModal({ title, sourceMessages, type, options: { ...options, tone: 'light' }, aiModel: 'flash' });
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert("ポップアップがブロックされました。"); return; }
    printWindow.document.write('<div style="padding: 20px; font-family: sans-serif; color: #333;">生成中...しばらくお待ちください。</div>');

    const targetMessages = sourceMessages.filter((m: any) => m.channel !== 'gm');
    let contentHtml = `<style>body{font-family:sans-serif;color:#333;margin:0;padding:0;background:#f9f9f9;}.page{background:#fff;max-width:800px;margin:20px auto;padding:60px;box-shadow:0 0 10px rgba(0,0,0,0.1);border-radius:8px;}.page-break{page-break-before:always;margin-top:40px;padding-top:40px;border-top:2px dashed #ccc;}</style>`;
    const coverHtml = `<div style="text-align:center;min-height:80vh;display:flex;flex-direction:column;justify-content:center;">${options?.scenarioImage ? `<img src="${options.scenarioImage}" style="max-width:80%;max-height:50vh;border-radius:8px;margin-bottom:30px;"/>` : ''}<h1>${title}</h1></div>`;

    if (type === 'chat') {
      const chatHtml = targetMessages.map((m: any) => {
        const text = m.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim();
        if (!text) return "";
        return `<div style="margin-bottom:12px;border-bottom:1px dashed #eee;padding-bottom:8px;"><strong>${m.charName||m.sender}</strong><br><span style="white-space:pre-wrap;">${text}</span></div>`;
      }).join('');
      contentHtml += `<div class="page">${coverHtml}<div class="page-break">${chatHtml}</div></div>`;
    } else {
      setIsExporting(true);
      const logTextForAI = targetMessages.map((m: any) => `${m.charName || m.sender}: ${m.text.replace(/\[SPLIT_PROPOSAL:.*?\]/, '').replace('[SCENARIO_END]', '').trim()}`).join('\n');
      const prompt = getNovelPrompt(options?.aiModel || 'flash', "第三者視点で情景描写を豊富に肉付けすること。", '各キャラクター', options?.tone || 'light');
      try {
        const generatedText = await generateAITextWithPrompt(prompt + "\n\n【チャットログ】\n" + logTextForAI, options?.aiModel || 'flash', 3000, 0.8);
        contentHtml += `<div class="page">${coverHtml}<div class="page-break"><h2 style="text-align:center;">本編</h2><div style="white-space:pre-wrap;line-height:1.9;">${generatedText}</div></div></div>`;
      } catch(e: any) { alert("生成エラー: " + e.message); printWindow.close(); setIsExporting(false); return; }
      setIsExporting(false);
    }
    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${contentHtml}<script>setTimeout(()=>{if('${type}'==='chat'){window.print();window.close();}},500);</script></body></html>`);
    printWindow.document.close();
  };

  const handleStartNovel = async () => {
    if (!novelSettingsModal || !currentUser) return;
    if (isTicketSystemEnabled && (currentUser.ticketsItem || 0) < 1) { alert("アイテムチケット不足"); return; }
    if (isTicketSystemEnabled) { await supabase.from('profiles').update({ tickets_item: (currentUser.ticketsItem || 0) - 1 }).eq('id', currentUser.id); }
    executeExport(novelSettingsModal.title, novelSettingsModal.sourceMessages, novelSettingsModal.type, { ...novelSettingsModal.options, aiModelConfirmed: true, aiModel: novelSettingsModal.aiModel });
    setNovelSettingsModal(null);
  };

  const exportToPDF = async (type: 'chat' | 'summary' | 'novel', viewPoint: 'third' | 'first' = 'third') => {
    if (!activeRoom) return; await executeExport(activeRoom.scenario?.title || "", messages, type, { viewPoint, myCharacterName: joinedCharacter?.name });
  };

  const executeAdReward = async () => {
    if (!currentUser) return;
    const today = new Date().toLocaleDateString('ja-JP'); 
    const newCount = adViewInfo.date === today ? adViewInfo.count + 1 : 1;
    await supabase.from('profiles').update({ points: (currentUser.points || 0) + 20, ad_view_count: newCount, last_ad_view_date: today }).eq('id', currentUser.id);
    setCurrentUser(p => p ? { ...p, points: (p.points || 0) + 20 } : null); 
    setAdViewInfo({ count: newCount, date: today });
    alert("20pt 獲得しました！"); 
    setAdModal({ isOpen: false });
  };

  return (
    <main className="h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      {currentView === "library" && currentUser && <LibraryView currentUser={currentUser} playArchives={playArchives} setCurrentView={setCurrentView} executeExport={executeExport} isExporting={isExporting} allScenarios={scenarios} openRoomConfigModal={handleOpenRoomConfig} />}
      {currentView === "userProfile" && currentUser && <UserProfileView currentUser={currentUser} targetUserId={targetUserId} setCurrentView={setCurrentView} allScenarios={scenarios} updateProfile={updateProfile} blockUser={blockUser} unblockUser={unblockUser} addFriend={addFriend} activeRooms={rooms} executeSpectateWithAd={(r: any) => setAdModal({ isOpen: true, step: 1, room: r, type: 'spectate' })} openRoomConfigModal={handleOpenRoomConfig} openUserProfile={openUserProfile} uploadAvatar={uploadAvatar} />}
      {currentView === "admin" && currentUser?.isAdmin && (
        <AdminView isMaintenance={isMaintenance} toggleMaintenance={toggleMaintenance} isTicketSystemEnabled={isTicketSystemEnabled} toggleTicketSystem={toggleTicketSystem} geminiFlashModel={geminiFlashModel} toggleGeminiFlashModel={toggleGeminiFlashModel} reports={reports} resolveReport={resolveReport} allUsers={allUsers} scenarios={scenarios} toggleAdminStatus={toggleAdminStatus} toggleTesterStatus={toggleTesterStatus} adminExecuteBan={adminExecuteBan} adminUnbanUser={adminUnbanUser} adminSuspendUser={adminSuspendUser} adminUnsuspendUser={adminUnsuspendUser} adminExecuteScenarioBan={adminExecuteScenarioBan} adminUnbanScenario={adminUnbanScenario} adminDeleteScenario={adminDeleteScenario} setCurrentView={setCurrentView} executeCreateTester={executeCreateTester} grantPointsToAll={grantPointsToAll} adminSendMailToUser={adminSendMailToUser} />
      )}
      {currentView === "banned" && <BannedView handleLogout={handleLogout} />}
      {currentView === "maintenance" && <MaintenanceView handleLogout={handleLogout} />}
      {currentView === "login" && <LoginView email={email} setEmail={setEmail} password={password} setPassword={setPassword} authLoading={authLoading} handleEmailAuth={handleEmailAuth} handleGoogleAuth={handleGoogleAuth} setCurrentView={setCurrentView} isMaintenance={isMaintenance} />}
      {currentView === "signup" && <SignupView email={email} setEmail={setEmail} password={password} setPassword={setPassword} authLoading={authLoading} handleEmailSignUp={handleEmailSignUp} handleGoogleAuth={handleGoogleAuth} setCurrentView={setCurrentView} isMaintenance={isMaintenance} />}
      {currentView === "onboarding" && <OnboardingView authLoading={authLoading} handleProfileSetup={handleProfileSetup} handleLogout={handleLogout} email={email} />}
      {currentView === "lobby" && currentUser && (
        <LobbyView currentUser={currentUser} handleLogout={handleLogout} setShowMailbox={setShowMailbox} unreadCount={unreadCount} secretRoomIdSearch={secretRoomIdSearch} setSecretRoomIdSearch={setSecretRoomIdSearch} rooms={rooms} searchedSecretRoom={searchedSecretRoom} setSearchedSecretRoom={setSearchedSecretRoom} executeJoinRoom={executeJoinRoom} availableRooms={availableRooms} spectateRoom={spectateRoom} setEditingScenario={setEditingScenario} setCurrentView={setCurrentView} createdScenarios={createdScenarios} deleteScenario={deleteScenario} setRoomConfigModal={setRoomConfigModal} fetchAdminData={fetchAdminData} startTrialPlay={(sc: any) => setAdModal({ isOpen: true, step: 1, scenario: sc, type: 'trial' })} availableScenarios={availableScenarios} openUserProfile={openUserProfile} setScenarioAppealTarget={setScenarioAppealTarget} playArchives={playArchives} setShowTicketModal={setShowTicketModal} exchangeTicketWithPoints={exchangeTicketWithPoints} />
      )}
      {currentView === "scenarioEdit" && editingScenario && <ScenarioEditView editingScenario={editingScenario} setEditingScenario={setEditingScenario} editingCharIndex={editingCharIndex} setEditingCharIndex={setEditingCharIndex} saveScenario={saveScenario} setCurrentView={setCurrentView} allScenarios={scenarios} generatePackageImage={generatePackageImage} isLoading={isLoading} />}
      {currentView === "game" && activeRoom && myScene && currentUser && joinedCharacter && (
        <GameView activeRoom={activeRoom} myScene={myScene} currentUser={currentUser} joinedCharacter={joinedCharacter} leaveGame={leaveGame} setReportTarget={setReportTarget} rollDice={rollDice} startGame={startGame} startSplitting={startSplitting} isSplitMode={isSplitMode} chatTab={chatTab} messages={messages} isLoading={isLoading} isScenarioEnded={isScenarioEnded} setCurrentView={setCurrentView} endGame={endGame} input={input} setInput={setInput} handleSend={handleSend} handleTabClick={handleTabClick} unreadIndicators={unreadIndicators} consultWithAI={consultWithAI} setConsultWithAI={setConsultWithAI} isChatDisabled={isChatDisabled} mergeTeam={mergeTeam} executeMergeAll={executeMergeAll} generateSceneImage={generateSceneImage} proposedTeams={proposedTeams} setProposedTeams={setProposedTeams} isGeneratingSplit={isGeneratingSplit} generateSplitProposal={generateSplitProposal} finishSplitting={finishSplitting} cancelSplitting={cancelSplitting} togglePauseRoom={togglePauseRoom} toggleAFK={toggleAFK} triggerAutoAction={triggerAutoAction} updateInventory={updateInventory} openRoomConfigModal={handleOpenRoomConfig} aiPlayersList={aiPlayersList} saveToArchive={saveToArchive} kickUser={kickUser} />
      )}
      {currentView === "evaluation" && activeRoom && currentUser && <EvaluationView activeRoom={activeRoom} messages={messages} ratingScenario={ratingScenario} setRatingScenario={setRatingScenario} ratingGM={ratingGM} setRatingGM={setRatingGM} submitEvaluation={submitEvaluation} exportToPDF={exportToPDF} isExporting={isExporting} saveToArchive={saveToArchive} currentUser={currentUser} addFriend={addFriend} openUserProfile={openUserProfile} openRoomConfigModal={handleOpenRoomConfig} />}

      {adModal.isOpen && (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-pink-500/50 rounded-xl p-8 w-full max-w-sm shadow-2xl text-center space-y-6">
            <h3 className="text-xl font-bold text-pink-400">📺 広告を視聴</h3>
            <div className="h-32 bg-slate-900 border border-slate-700 flex items-center justify-center rounded">
              <span className="text-slate-500 font-bold animate-pulse">広告再生中... ({adModal.step}/3)</span>
            </div>
            {adModal.step <= 3 && (
              <button onClick={() => { if(adModal.step === 3) { if (adModal.type === 'trial') executeTrialPlay(); else if (adModal.type === 'points') executeAdReward(); else if (adModal.type === 'spectate' && adModal.room) spectateRoom(adModal.room); } else setAdModal({...adModal, step: adModal.step + 1}); }} className="w-full bg-pink-600 hover:bg-pink-500 py-3 rounded text-sm font-bold text-white">
                {adModal.step === 3 ? "完了する" : "次へ"}
              </button>
            )}
            <button onClick={() => setAdModal({ isOpen: false })} className="text-xs text-slate-400 hover:text-white underline">キャンセル</button>
          </div>
        </div>
      )}

      {roomConfigModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-emerald-700/50 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">🚪 部屋の作成</h3>
            <div className="space-y-4 mb-6">
              <div><label className="text-xs text-slate-400 block mb-1">使用キャラクター</label><select value={roomConfigModal.charId || ""} onChange={(e) => setRoomConfigModal({...roomConfigModal, charId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"><option value="" disabled>選択してください</option>{roomConfigModal.scenario?.presetCharacters?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="text-xs text-slate-400 block mb-1">AIモデル</label><select value={roomConfigModal.aiModel || "lite"} onChange={(e) => setRoomConfigModal({...roomConfigModal, aiModel: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"><option value="lite">Flash Lite</option><option value="flash">Gemini Flash</option><option value="pro">Gemini Pro</option></select></div>
              <div><label className="text-xs text-slate-400 block mb-1">言語（Language）</label><select value={roomConfigModal.language || "ja"} onChange={(e) => setRoomConfigModal({...roomConfigModal, language: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"><option value="ja">日本語</option><option value="en">English</option><option value="zh">中国語</option></select></div>
              <div><label className="text-xs text-slate-400 block mb-1">難易度</label><select value={roomConfigModal.difficulty || "normal"} onChange={(e) => setRoomConfigModal({...roomConfigModal, difficulty: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"><option value="easy">簡単</option><option value="normal">普通</option><option value="hard">難しい</option></select></div>
            </div>
            <div className="flex gap-4"><button onClick={() => setRoomConfigModal(null)} className="flex-1 bg-slate-700 py-3 rounded text-sm font-bold">キャンセル</button><button onClick={executeCreateRoom} disabled={!roomConfigModal.charId} className="flex-1 bg-emerald-600 py-3 rounded text-sm font-bold">作成して入室</button></div>
          </div>
        </div>
      )}
      
      {novelSettingsModal && (
        <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
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
    </main>
  );
}