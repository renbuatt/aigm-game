"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// --- Supabaseクライアント ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 型定義 ---
type ViewState = "login" | "lobby" | "scenarioEdit" | "game" | "evaluation";

type UserProfile = { 
  id: string; handleName: string; avatarUrl: string; bio: string; discordId?: string;
  ratingSum: number; ratingCount: number;
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
  
  const [lobbyMessages, setLobbyMessages] = useState<LobbyMessage[]>([{ id: "lmsg_sys", senderName: "システム", text: "ロビーへようこそ！", time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), isSystem: true }]);
  const [lobbyInput, setLobbyInput] = useState("");
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [msgType, setMsgType] = useState<"ic" | "ooc">("ic");
  const [isLoading, setIsLoading] = useState(false);

  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitScene1, setSplitScene1] = useState<{name: string, members: string[], leader: string}>({ name: "地下室", members: [], leader: "" });
  const [splitScene2, setSplitScene2] = useState<{name: string, members: string[], leader: string}>({ name: "図書室", members: [], leader: "" });

  // ★ 評価用ステート
  const [ratingScenario, setRatingScenario] = useState<number>(5);
  const [ratingGM, setRatingGM] = useState<number>(5);

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

  const fetchProfile = async (userId: string, emailStr: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setCurrentUser({ id: data.id, handleName: data.handle_name, avatarUrl: data.avatar_url, bio: data.bio, discordId: data.discord_id, ratingSum: data.rating_sum || 0, ratingCount: data.rating_count || 0 });
    } else {
      const newProfile = { id: userId, handle_name: emailStr.split("@")[0], avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", discord_id: "", rating_sum: 0, rating_count: 0 };
      await supabase.from('profiles').insert(newProfile);
      setCurrentUser({ id: userId, handleName: newProfile.handle_name, avatarUrl: newProfile.avatar_url, bio: newProfile.bio, discordId: newProfile.discord_id, ratingSum: 0, ratingCount: 0 });
    }
    setCurrentView("lobby");
  };

  useEffect(() => {
    const initApp = async () => {
      await fetchData();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await fetchProfile(session.user.id, session.user.email || "プレイヤー");
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
        if (data.user) await fetchProfile(data.user.id, email);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) { alert("アカウントを作成しました！"); await fetchProfile(data.user.id, email); }
      }
    } catch (error: any) { alert("エラーが発生しました: " + error.message); } finally { setAuthLoading(false); }
  };
  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setCurrentView("login"); };
  const saveProfile = async () => {
    if (!editProfileData || !currentUser) return;
    const { error } = await supabase.from('profiles').upsert({ id: currentUser.id, handle_name: editProfileData.handleName, avatar_url: editProfileData.avatarUrl, bio: editProfileData.bio, discord_id: editProfileData.discordId });
    if (!error) { setCurrentUser(editProfileData); setIsEditingProfile(false); }
  };

  // ==========================================
  // ロビー機能（部屋作成と入室）
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

  // ==========================================
  // ゲーム進行・終了処理 (AI・評価)
  // ==========================================
  const startGame = async () => {
    if(!activeRoom) return;
    // DBステータスを playing に更新
    await supabase.from('rooms').update({ status: 'playing' }).eq('id', activeRoom.id);
    setActiveRoom({...activeRoom, status: 'playing'});
    setMessages(prev => [...prev, { sender: "gm", text: `【システム】ホストがゲームを開始しました。\nAI GM「これよりセッションを開始します。」`, type: "system", sceneId: myScene.id }]);
  };

  const endGame = async () => {
    if(!activeRoom) return;
    // DBステータスを finished に更新（ロビーから消える）
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', activeRoom.id);
    setMessages(prev => [...prev, { sender: "gm", text: `【システム】セッションが終了しました。お疲れ様でした！評価画面へ移動します...`, type: "system", sceneId: myScene.id }]);
    
    // 3秒後に全員を評価画面へ飛ばす（簡易実装）
    setTimeout(() => {
      setCurrentView("evaluation");
    }, 3000);
  };

  const submitEvaluation = async () => {
    if(!activeRoom || !activeRoom.scenario || !currentUser) return;
    // 1. シナリオの評価を保存
    const newScSum = activeRoom.scenario.ratingSum + ratingScenario;
    const newScCount = activeRoom.scenario.ratingCount + 1;
    await supabase.from('scenarios').update({ rating_sum: newScSum, rating_count: newScCount }).eq('id', activeRoom.scenario.id);

    // 2. ホスト(GM)の評価を保存（自分がホストの場合はスキップでも良いが一旦保存）
    if(activeRoom.host_id) {
      const { data: hostData } = await supabase.from('profiles').select('rating_sum, rating_count').eq('id', activeRoom.host_id).single();
      if(hostData) {
        await supabase.from('profiles').update({ rating_sum: (hostData.rating_sum || 0) + ratingGM, rating_count: (hostData.rating_count || 0) + 1 }).eq('id', activeRoom.host_id);
      }
    }
    
    alert("評価を送信しました！ロビーに戻ります。");
    setActiveRoom(null);
    setJoinedCharacter(null);
    await fetchData();
    setCurrentView("lobby");
  };

  // ==========================================
  // レンダリング
  // ==========================================
  const getRatingStars = (num: number) => { return "★".repeat(num) + "☆".repeat(5 - num); };

  return (
    <main className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {currentView === "login" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h1 className="text-3xl font-extrabold text-emerald-400 mb-2 text-center">AI GM MORPG</h1>
            <p className="text-slate-400 text-sm text-center mb-8">ログインして冒険を始める</p>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="メールアドレス" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="パスワード" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white" />
              <button type="submit" disabled={authLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl">{isLoginMode ? "ログイン" : "新規登録"}</button>
            </form>
          </div>
        </div>
      )}

      {currentView === "lobby" && currentUser && (
        <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full overflow-y-auto">
          <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
            <h1 className="text-3xl font-extrabold text-emerald-400">AI GM MORPG Lobby</h1>
            <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white underline">ログアウト</button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-blue-400">🌐 募集中のセッション</h2>
              {rooms.map((room) => {
                const scRating = room.scenario?.ratingCount ? (room.scenario.ratingSum / room.scenario.ratingCount).toFixed(1) : "未評価";
                // ★ 低評価アラートの簡易判定
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
              })}
            </div>

            {/* プロフィール・部屋立てUI (前回と同じため一部省略していますが機能は維持) */}
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
                        <p className="font-bold text-white">{currentUser.handleName}</p>
                        <p className="text-[10px] text-amber-400">★ 評価: {currentUser.ratingCount > 0 ? (currentUser.ratingSum / currentUser.ratingCount).toFixed(1) : "新規"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col">
                <h2 className="text-sm font-bold text-amber-400 mb-3">📜 シナリオを立てる</h2>
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
              {/* ★ ホスト専用: ゲーム進行・終了ボタン */}
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