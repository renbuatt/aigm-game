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

type Scene = { id: string; name: string; memberIds: string[]; leaderId?: string; };

type Room = { 
  id: string; scenario_id: string; scenario?: Scenario; 
  host_name: string; status: "recruiting" | "playing" | "finished"; scenes: Scene[]; 
  host_id?: string;
};

type Message = { sender: "player" | "gm" | "ai_player"; text: string; type?: "ic" | "ooc" | "system"; sceneId?: string; charName?: string; };
type ChatTab = "story" | "consult" | "gm";

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

  const [shopScenarioId, setShopScenarioId] = useState<string>(""); 

  const availableScenarios = scenarios.filter(s => !s.isBanned);
  const createdScenarios = availableScenarios.filter(s => s.authorId === currentUser?.id);
  const purchasedScenarios = availableScenarios.filter(s => s.authorId !== currentUser?.id && s.purchasedTickets && currentUser && s.purchasedTickets[currentUser.id] > 0);
  const availableRooms = rooms.filter(r => !r.scenario?.isBanned);

  const defaultScene: Scene = { id: "scene_main", name: "メインルーム", memberIds: [] };
  const myScene = activeRoom?.scenes?.find(s => joinedCharacter && s.memberIds.includes(joinedCharacter.id)) || activeRoom?.scenes?.[0] || defaultScene;
  const myActiveRoom = rooms.find(r => currentUser && r.host_id === currentUser.id && r.status !== 'finished');

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
        host_name: r.host_name, host_id: r.host_id, status: r.status, scenes: r.scenes || []
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
      const activeMyRoom = roomsData.find(r => r.host_id === userId && r.status === 'playing');
      if (activeMyRoom && activeMyRoom.scenario) {
        const char = activeMyRoom.scenario.presetCharacters[0];
        setActiveRoom(activeMyRoom);
        setJoinedCharacter(char);
        const aiChars = activeMyRoom.scenario.presetCharacters.filter(c => c.id !== char?.id);
        setAiPlayersList(aiChars);
        setCurrentView("game");
        return;
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
1. PLたちが【相談】を終え、明確な「行動宣言」を出した時のみ物語を進行させてください。
2. リスクや不確実性を伴う行動には、勝手に結果を決めず必ずダイスロール（1d100の技能/SAN判定、または3d6のステータス判定）を要求してください。結果が出るまで描写を待機してください。
3. このシナリオの想定プレイ時間は現実時間で「約${activeRoom.scenario?.playTime || 60}分」です。現在のやり取りの回数から残り時間を推測し、適切なタイミングでクライマックスとエンディングへ誘導してください。ダラダラと長引かせないこと。
`;
      } else if (targetTab === "consult") {
        roleInstruction = `
【重要：AIプレイヤーとしての振る舞い】
現在は「プレイヤー間の相談時間」です。あなたはGMではなく、AI相棒（${aiPlayersList.map(c=>c.name).join(", ")}）の立場でPLに返答してください。
物語を勝手に進めず、「じゃあ僕はあっちを調べるよ」「それは危険じゃない？」など、彼らの性格に合わせた対話のみを行ってください。
`;
      } else if (targetTab === "gm") {
        roleInstruction = `
【重要：GMへのメタ質問対応】
現在は「GMへの質問・ルール確認」の時間です。物語は進めず、ルールの裁定、状況の再確認、ダイスの振り方の指示など、システム的な回答のみを行ってください。
`;
      }

      const sysPrompt = `
あなたはTRPGの優秀で臨場感あふれるAIシステムです。

【シナリオ設定】
タイトル: ${activeRoom.scenario?.title}
世界観: ${activeRoom.scenario?.setting}
プロット: ${activeRoom.scenario?.plot}
想定プレイ時間: ${activeRoom.scenario?.playTime || 60}分

【人間PL】
名前: ${joinedCharacter.name} (${joinedCharacter.job}) / ステータス: HP:${joinedCharacter.hp} SAN:${joinedCharacter.san}% STR:${joinedCharacter.str} DEX:${joinedCharacter.dex} INT:${joinedCharacter.int} CON:${joinedCharacter.con}
【AI相棒】
${aiPlayersText}

${roleInstruction}
`;

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

      await supabase.from('ai_memory').insert({ room_id: activeRoom.id, role: 'assistant', content: aiText });
      
      const msgSender = targetTab === "consult" ? "ai_player" : "gm";
      setMessages((prev) => [...prev, { sender: msgSender, text: aiText, type: targetTab === "gm" ? "ooc" : "ic", sceneId: myScene?.id, charName: targetTab === "consult" ? "AI相棒" : "AI GM" }]);

    } catch (err: any) {
      alert("AIエラー: " + err.message);
      setMessages((prev) => [...prev, { sender: "gm", text: `（システムエラー: ${err.message}）`, type: "system", sceneId: myScene?.id }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (scenario: Scenario) => {
    const charId = charSelects[scenario.id];
    if (!currentUser || !scenario || !charId) { alert("エラー: キャラクターが選択されていません。"); return; }
    
    const initialScenes: Scene[] = [{ id: `scene_main_${Date.now()}`, name: "メインルーム", memberIds: scenario.presetCharacters.map(c => c.id) }];
    const { data, error } = await supabase.from('rooms').insert({ scenario_id: scenario.id, host_name: currentUser.handleName, host_id: currentUser.id, status: "recruiting", scenes: initialScenes }).select().single();
    if (error) { alert("データベースエラーが発生しました: " + error.message); return; }
    if (data) {
      await fetchData();
      const newRoom: Room = { id: data.id, scenario_id: data.scenario_id, scenario: scenario, host_name: data.host_name, host_id: data.host_id, status: data.status, scenes: data.scenes };
      const hostChar = scenario.presetCharacters.find(c => c.id === charId);
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
    if(!activeRoom || !activeRoom.scenario || !joinedCharacter || !myScene) return;
    
    let aiChars: Character[] = [];
    const emptyChars = activeRoom.scenario.presetCharacters.filter(c => c.id !== joinedCharacter.id);
    if (emptyChars.length > 0) {
      if (confirm(`参加していないキャラクターが ${emptyChars.length} 人います。\n彼らを「AIプレイヤー（相棒）」として参加させますか？\n（キャンセルを押すとソロプレイになります）`)) {
        aiChars = emptyChars;
      }
    }
    setAiPlayersList(aiChars);

    await supabase.from('rooms').update({ status: 'playing' }).eq('id', activeRoom.id);
    setActiveRoom({...activeRoom, status: 'playing'});
    setMessages(prev => [...prev, { sender: "gm", text: `【システム】ゲームを開始しました。AI GMを呼び出しています...`, type: "system", sceneId: myScene.id }]);
    
    await callAIGM(`【システムコマンド】セッションが開始されました。プロットに従い、導入部分の情景描写を行い、プレイヤーに行動方針の相談を促してください。`);
  };

  // ★ 離脱・終了処理（誰もいない場合は完全に閉じる警告を追加）
  const leaveGame = async () => {
    if (!activeRoom) return;
    
    const confirmLeave = confirm("【警告】\n他に人間プレイヤーがいない場合、部屋は完全に閉じられます。\nその際は現在のセッションに二度と復帰できなくなりますが、本当によろしいですか？");
    
    if (confirmLeave) {
      if (activeRoom.host_id === currentUser?.id) {
        await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
      }
      setCurrentView("lobby");
      setActiveRoom(null);
      setJoinedCharacter(null);
      setAiPlayersList([]);
      setMessages([]);
      await fetchData(); 
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeRoom || !joinedCharacter || !currentUser || !myScene) return;
    const currentInput = input;
    const userMsg: Message = { sender: "player", text: currentInput, type: chatTab === "story" ? "ic" : "ooc", sceneId: myScene.id, charName: joinedCharacter.name };
    setMessages((prev) => [...prev, userMsg]);
    setInput(""); 
    
    let context = "";
    if (chatTab === "story") context = `【行動宣言】${joinedCharacter.name}「${currentInput}」`;
    else if (chatTab === "consult") context = `【PL間相談】${joinedCharacter.name}「${currentInput}」`;
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

    setMessages((prev) => [...prev, { sender: "player", text: msgText, type: "ic", sceneId: myScene.id, charName: joinedCharacter.name }]);
    await callAIGM(`【システム判定結果】${joinedCharacter.name}が${label}ロールを行いました。\n結果: ${msgText}\nこの結果を踏まえてGMとして情景描写を行ってください。`, "story");
  };

  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  return (
    <main className="h-screen w-full bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* 管理画面、ログイン等その他のUIは既存のまま */}
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
              <h2 className="text-xl font-bold text-blue-400">🌐 募集中のセッション</h2>
              <div className="h-[500px] overflow-y-scroll space-y-4 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
                {availableRooms.length === 0 ? <p className="text-slate-400 text-sm p-4 text-center">現在募集中のセッションはありません。</p> : availableRooms.map((room) => {
                  return (
                    <div key={room.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4 hover:border-blue-500 relative">
                      <img src={room.scenario?.imageUrl || NO_IMAGE_SCENARIO} className="w-24 h-24 object-cover rounded" />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">{room.scenario?.title} {room.host_id === currentUser.id && <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded ml-auto">あなたがホスト</span>}</h3>
                        </div>
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
                      const currentChar = charSelects[s.id] || "";
                      return (
                        <div key={s.id} className="bg-slate-900 border rounded-lg p-3 flex flex-col gap-2 border-slate-700">
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
                          <div className="bg-slate-800 p-2 rounded mt-1 border border-slate-700">
                            <select value={currentChar} onChange={(e) => setCharSelects({...charSelects, [s.id]: e.target.value})} className="w-full bg-slate-900 text-xs p-1.5 rounded text-white mb-2">
                              <option value="" disabled>自分のキャラクターを選択...</option>
                              {s.presetCharacters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button onClick={() => handleCreateRoom(s)} disabled={!currentChar} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white text-xs font-bold py-1.5 rounded">部屋を立てて入室</button>
                          </div>
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
      {currentView === "game" && activeRoom && joinedCharacter && currentUser && myScene && (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 min-h-0 relative">
          <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-4">
              <button onClick={leaveGame} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-bold shadow">🚪 離脱 / 終了</button>
              <button onClick={() => setReportTarget({type: 'scenario', id: activeRoom.scenario_id, name: activeRoom.scenario?.title || ""})} className="text-xs bg-slate-900 hover:bg-red-900/50 text-red-400 border border-slate-700 px-3 py-1.5 rounded font-bold">🚨 通報</button>
              
              <div className="flex flex-col ml-4">
                <span className="text-[10px] text-blue-400 font-bold border border-blue-500/50 bg-blue-900/30 px-2 py-0.5 rounded w-fit mb-1">ROOM: {activeRoom.scenario?.title} (約{activeRoom.scenario?.playTime || 60}分)</span>
                <span className="text-sm font-bold text-white flex items-center gap-2">{joinedCharacter.name}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 justify-end max-w-md">
              <button onClick={() => rollDice(joinedCharacter.san, "SAN", true)} className="bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 SAN({joinedCharacter.san}%)</button>
              <button onClick={() => rollDice(joinedCharacter.str, "STR", false)} className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 STR({joinedCharacter.str})</button>
              <button onClick={() => rollDice(joinedCharacter.dex, "DEX", false)} className="bg-green-700 hover:bg-green-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 DEX({joinedCharacter.dex})</button>
              <button onClick={() => rollDice(joinedCharacter.int, "INT", false)} className="bg-purple-700 hover:bg-purple-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 INT({joinedCharacter.int})</button>
              <button onClick={() => rollDice(joinedCharacter.con, "CON", false)} className="bg-amber-700 hover:bg-amber-600 text-white text-[10px] px-2 py-1.5 rounded font-bold shadow-lg">🎲 CON({joinedCharacter.con})</button>

              {currentUser.handleName === activeRoom.host_name && activeRoom.status === "recruiting" && (
                <button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-4 py-2 rounded animate-pulse ml-2 shadow-lg shadow-emerald-900/50">▶ ゲーム開始</button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-scroll space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3 min-h-0">
            {messages.map((msg, index) => {
              const isMe = msg.sender === "player";
              const isAIPlayer = msg.sender === "ai_player";
              const isSystem = msg.type === "system";
              
              let bgColor = isMe ? "bg-blue-600/90 ml-auto" : (isAIPlayer ? "bg-indigo-600/80 mr-auto border-l-4 border-indigo-400" : "bg-slate-700/90 mr-auto border-l-4 border-emerald-500");
              if (isSystem) bgColor = "bg-slate-900/80 mx-auto border border-slate-700 text-center";

              return (
                <div key={index} className={`p-3 rounded-xl max-w-[85%] ${bgColor} text-white shadow-md`}>
                  <span className="text-[10px] opacity-60 block mb-1">
                    {msg.charName || (isMe ? joinedCharacter.name : (msg.sender === "gm" ? "AI GM" : "SYSTEM"))} 
                    {!isSystem && msg.type && ` [${msg.type.toUpperCase()}]`}
                  </span>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              )
            })}
            {isLoading && <div className="text-xs text-emerald-400 animate-pulse font-bold bg-slate-900/50 w-fit px-3 py-1 rounded">AI思考中...</div>}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2 shadow-lg">
            <div className="flex gap-2 border-b border-slate-700 pb-2">
              <button onClick={() => setChatTab("story")} className={`text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "story" ? "bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500" : "text-slate-400 hover:text-white"}`}>📖 行動宣言 (GMへ)</button>
              <button onClick={() => setChatTab("consult")} className={`text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "consult" ? "bg-indigo-600/20 text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"}`}>🗣️ 相談 (PL・AI相棒へ)</button>
              <button onClick={() => setChatTab("gm")} className={`text-xs font-bold px-4 py-2 rounded-t-lg transition ${chatTab === "gm" ? "bg-amber-600/20 text-amber-400 border-b-2 border-amber-500" : "text-slate-400 hover:text-white"}`}>⚙️ GMへのメタ質問</button>
            </div>
            <div className="flex gap-2 pt-1">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} 
                placeholder={chatTab === "story" ? "例：鍵穴を覗き込みます。" : (chatTab === "consult" ? "例：ねえ、この扉どうやって開けようか？" : "例：今の状況でもう一度目星は振れますか？")} 
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition" />
              <button onClick={handleSend} disabled={isLoading} className={`text-white px-6 py-2 rounded-lg text-sm font-bold shadow transition ${chatTab === "story" ? "bg-emerald-600 hover:bg-emerald-500" : (chatTab === "consult" ? "bg-indigo-600 hover:bg-indigo-500" : "bg-amber-600 hover:bg-amber-500")} disabled:opacity-50`}>送信</button>
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
          </div>
        </div>
      )}
    </main>
  );
}