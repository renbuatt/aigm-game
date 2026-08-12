"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// --- Supabaseクライアント ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 型定義 ---
type ViewState = "login" | "lobby" | "scenarioEdit" | "game";

type UserProfile = { id: string; handleName: string; avatarUrl: string; bio: string; };

type Character = {
  id: string; name: string; job: string; personality: string; imageUrl: string;
  hp: number; san: number; str: number; dex: number; int: number; con: number; wis: number; cha: number;
};

type Scenario = {
  id: string; title: string; system: string; tags: string; setting: string;
  npcList: string; plot: string; imageUrl: string; presetCharacters: Character[];
};

// ★ シーン（別行動）の型定義
type Scene = {
  id: string;
  name: string;
  memberIds: string[]; // このシーンにいるキャラクターのID
  leaderId?: string;   // サブリーダーのキャラクターID
};

type Room = { 
  id: string; 
  scenario_id: string; 
  scenario?: Scenario; // 画面表示用に後から結合
  host_name: string; 
  status: "recruiting" | "playing"; 
  scenes: Scene[]; // ★ シーン情報を追加
};

type Message = { 
  sender: "player" | "gm"; 
  text: string; 
  type?: "ic" | "ooc" | "system"; 
  sceneId?: string; // ★ どのシーンでの発言かを記録
};

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
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [joinedCharacter, setJoinedCharacter] = useState<Character | null>(null);
  
  const [lobbyMessages, setLobbyMessages] = useState<LobbyMessage[]>([{ id: "lmsg_sys", senderName: "システム", text: "ロビーへようこそ！", time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), isSystem: true }]);
  const [lobbyInput, setLobbyInput] = useState("");
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [msgType, setMsgType] = useState<"ic" | "ooc">("ic");
  const [isLoading, setIsLoading] = useState(false);

  // ★ パーティー分割UI用のステート
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitScene1, setSplitScene1] = useState<{name: string, members: string[], leader: string}>({ name: "地下室", members: [], leader: "" });
  const [splitScene2, setSplitScene2] = useState<{name: string, members: string[], leader: string}>({ name: "図書室", members: [], leader: "" });

  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  // ★ 現在自分がいるシーンを特定
  const myScene = activeRoom?.scenes.find(s => joinedCharacter && s.memberIds.includes(joinedCharacter.id)) || activeRoom?.scenes[0];

  // ==========================================
  // Supabase データ取得処理
  // ==========================================
  const fetchData = async () => {
    // シナリオ取得
    const { data: scData } = await supabase.from('scenarios').select('*').order('id', { ascending: false });
    let loadedScenarios: Scenario[] = [];
    if (scData && scData.length > 0) {
      loadedScenarios = scData.map((d: any) => ({
        id: d.id, title: d.title, system: d.system, tags: d.tags, setting: d.setting,
        npcList: d.npc_list, plot: d.plot, imageUrl: d.image_url, presetCharacters: d.preset_characters || []
      }));
      setScenarios(loadedScenarios);
      if(!selectedScenarioId) setSelectedScenarioId(loadedScenarios[0].id);
    }

    // 部屋取得
    const { data: rmData } = await supabase.from('rooms').select('*').eq('status', 'recruiting').order('id', { ascending: false });
    if (rmData && loadedScenarios.length > 0) {
      const formattedRooms = rmData.map((r: any) => ({
        id: r.id,
        scenario_id: r.scenario_id,
        scenario: loadedScenarios.find(s => s.id === r.scenario_id),
        host_name: r.host_name,
        status: r.status,
        scenes: r.scenes || []
      })).filter(r => r.scenario) as Room[];
      setRooms(formattedRooms);
    }
  };

  const fetchProfile = async (userId: string, emailStr: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setCurrentUser({ id: data.id, handleName: data.handle_name, avatarUrl: data.avatar_url, bio: data.bio });
    } else {
      const newProfile = { id: userId, handle_name: emailStr.split("@")[0], avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。" };
      await supabase.from('profiles').insert(newProfile);
      setCurrentUser({ id: userId, handleName: newProfile.handle_name, avatarUrl: newProfile.avatar_url, bio: newProfile.bio });
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
  // 認証・プロフィール・シナリオ保存
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

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert("Googleログインの設定が未完了です。");
    setAuthLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setCurrentView("login"); };

  const saveProfile = async () => {
    if (!editProfileData || !currentUser) return;
    const { error } = await supabase.from('profiles').upsert({ id: currentUser.id, handle_name: editProfileData.handleName, avatar_url: editProfileData.avatarUrl, bio: editProfileData.bio });
    if (!error) { setCurrentUser(editProfileData); setIsEditingProfile(false); }
  };

  const saveScenario = async () => {
    if (!editingScenario) return;
    const dbData = { title: editingScenario.title, system: editingScenario.system, tags: editingScenario.tags, setting: editingScenario.setting, npc_list: editingScenario.npcList, plot: editingScenario.plot, image_url: editingScenario.imageUrl, preset_characters: editingScenario.presetCharacters };
    if (editingScenario.id && !editingScenario.id.startsWith('s')) await supabase.from('scenarios').update(dbData).eq('id', editingScenario.id);
    else await supabase.from('scenarios').insert(dbData);
    await fetchData();
    setCurrentView("lobby");
  };

  // ==========================================
  // ロビー機能
  // ==========================================
  const handleSendLobby = () => {
    if (!lobbyInput.trim() || !currentUser) return;
    setLobbyMessages((prev) => [...prev, { id: `lmsg_${Date.now()}`, senderName: currentUser.handleName, text: lobbyInput, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) }]);
    setLobbyInput("");
  };

  const handleCreateRoom = async () => {
    if (!currentUser || !activeScenario) return;
    
    // 初期シーンとして「メインルーム」を作成
    const initialScenes: Scene[] = [{
      id: `scene_main_${Date.now()}`,
      name: "メインルーム",
      memberIds: activeScenario.presetCharacters.map(c => c.id) // 全員を配置
    }];

    const { data, error } = await supabase.from('rooms').insert({
      scenario_id: activeScenario.id,
      host_name: currentUser.handleName,
      status: "recruiting",
      scenes: initialScenes
    }).select().single();

    if (!error && data) {
      await fetchData();
      setLobbyMessages(prev => [...prev, { id: `lmsg_${Date.now()}_sys`, senderName: "システム", text: `【募集開始】${currentUser.handleName}さんが「${activeScenario.title}」の募集を開始しました！`, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), isSystem: true }]);
    }
  };

  const handleJoinRoom = (room: Room, character: Character) => {
    if (!currentUser) return;
    setActiveRoom(room); setJoinedCharacter(character);
    setMessages([{ sender: "gm", text: `【セッション入室】\nシナリオ：「${room.scenario?.title}」\nプレイヤー：${currentUser.handleName}\n\nAI GM「接続完了。これより開始します。」`, type: "system", sceneId: room.scenes[0].id }]);
    setCurrentView("game");
  };

  // ==========================================
  // ゲーム・別行動機能
  // ==========================================
  const handleSend = () => {
    if (!input.trim() || isLoading || !activeRoom || !joinedCharacter || !currentUser || !myScene) return;
    const userMsg: Message = { sender: "player", text: input, type: msgType, sceneId: myScene.id };
    setMessages((prev) => [...prev, userMsg]);
    setInput(""); setIsLoading(true);
    
    setTimeout(() => {
      const replyText = msgType === "ic" ? `AI GM「（${myScene.name}にて）処理します…」` : `AI GM (OOC)「了解しました: ${userMsg.text}」`;
      setMessages((prev) => [...prev, { sender: "gm", text: replyText, type: msgType, sceneId: myScene.id }]);
      setIsLoading(false);
    }, 1000);
  };

  const rollDice = (targetValue: number, label: string) => {
    if(!myScene) return;
    const res = Math.floor(Math.random() * 100) + 1;
    setMessages((prev) => [...prev, { sender: "player", text: `🎲 ${label} (≦ ${targetValue}) ➔ 出目: ${res} 【${res <= targetValue ? "成功" : "失敗"}】`, type: "ic", sceneId: myScene.id }]);
  };

  // ★ パーティー分割の実行（ローカルステート更新とDB更新モック）
  const executePartySplit = async () => {
    if(!activeRoom) return;
    const newScenes: Scene[] = [
      { id: `scene_${Date.now()}_1`, name: splitScene1.name, memberIds: splitScene1.members, leaderId: splitScene1.leader },
      { id: `scene_${Date.now()}_2`, name: splitScene2.name, memberIds: splitScene2.members, leaderId: splitScene2.leader },
    ];
    
    // DB更新
    await supabase.from('rooms').update({ scenes: newScenes }).eq('id', activeRoom.id);
    
    // ローカル状態更新
    setActiveRoom({...activeRoom, scenes: newScenes});
    setIsSplitModalOpen(false);

    // システムメッセージ
    setMessages(prev => [
      ...prev,
      { sender: "gm", text: `【システム】パーティーが「${splitScene1.name}」と「${splitScene2.name}」に分割されました。`, type: "system", sceneId: newScenes[0].id },
      { sender: "gm", text: `【システム】パーティーが「${splitScene1.name}」と「${splitScene2.name}」に分割されました。`, type: "system", sceneId: newScenes[1].id }
    ]);
  };

  const toggleMember = (sceneNum: 1|2, charId: string) => {
    if(sceneNum === 1) {
      setSplitScene1(prev => ({...prev, members: prev.members.includes(charId) ? prev.members.filter(id => id !== charId) : [...prev.members, charId]}));
      setSplitScene2(prev => ({...prev, members: prev.members.filter(id => id !== charId)}));
    } else {
      setSplitScene2(prev => ({...prev, members: prev.members.includes(charId) ? prev.members.filter(id => id !== charId) : [...prev.members, charId]}));
      setSplitScene1(prev => ({...prev, members: prev.members.filter(id => id !== charId)}));
    }
  };

  const handleRollStatsForEditingChar = () => { /* 省略（前回と同じ） */
    if (!editingScenario || editingCharIndex === null) return;
    const roll = () => { return (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1) * 5; };
    const str = roll(), dex = roll(), int = roll(), con = roll(), wis = roll(), cha = roll();
    const newChars = [...editingScenario.presetCharacters];
    newChars[editingCharIndex] = { ...newChars[editingCharIndex], str, dex, int, con, wis, cha, hp: Math.floor((str + con) / 10), san: wis };
    setEditingScenario({ ...editingScenario, presetCharacters: newChars });
  };

  return (
    <main className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* ==================== 0. ログイン／新規登録 ==================== */}
      {currentView === "login" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h1 className="text-3xl font-extrabold text-emerald-400 mb-2 text-center">AI GM MORPG</h1>
            <p className="text-slate-400 text-sm text-center mb-8">データベースへ接続中...</p>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div><label className="text-xs text-slate-400 block mb-1">メールアドレス</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">パスワード</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none" /></div>
              <button type="submit" disabled={authLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                {authLoading ? "処理中..." : isLoginMode ? "ログイン" : "新規登録してはじめる"}
              </button>
            </form>
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
            <div><h1 className="text-3xl font-extrabold text-emerald-400 mb-1">AI GM MORPG Lobby</h1></div>
            <div className="text-right"><button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white underline">ログアウト</button></div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2 mb-4">🌐 現在募集中のセッション</h2>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {rooms.map((room) => (
                    <div key={room.id} className="bg-slate-800 border border-slate-700 rounded-xl p-0 hover:border-blue-500 transition relative overflow-hidden group flex">
                      <img src={room.scenario?.imageUrl || NO_IMAGE_SCENARIO} alt="scenario" className="w-32 h-full object-cover" />
                      <div className="p-4 flex-1">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">募集中</div>
                        <h3 className="text-lg font-bold text-white mb-1">{room.scenario?.title}</h3>
                        <div className="flex gap-2 text-xs text-slate-400 mb-3"><span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">ホスト: {room.host_name}</span></div>
                        <div className="flex gap-2 items-center">
                          <select className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none" onChange={(e) => { const char = room.scenario?.presetCharacters.find(c => c.id === e.target.value); if(char) handleJoinRoom(room, char); }} defaultValue="">
                            <option value="" disabled>参加するキャラクターを選択...</option>
                            {room.scenario?.presetCharacters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* プロフィール・シナリオ選択エリア（前回同様のため省略気味に配置） */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
                <div className="flex justify-between items-center mb-3"><h2 className="text-sm font-bold text-blue-400">👤 プレイヤー情報</h2><button onClick={() => { setEditProfileData(currentUser); setIsEditingProfile(true); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">編集</button></div>
                {isEditingProfile && editProfileData ? (
                  <div className="space-y-2">
                    <input type="text" value={editProfileData.handleName} onChange={(e) => setEditProfileData({...editProfileData, handleName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm" />
                    <button onClick={saveProfile} className="w-full bg-blue-600 font-bold text-xs py-2 rounded">保存</button>
                  </div>
                ) : (
                  <div className="flex gap-4 items-center"><img src={currentUser.avatarUrl} className="w-12 h-12 rounded-full object-cover" /><p className="font-bold text-white">{currentUser.handleName}</p></div>
                )}
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-3"><h2 className="text-sm font-bold text-amber-400">📜 シナリオライブラリ</h2><button onClick={() => { setEditingScenario({ id: "", title: "", system: "", tags: "", setting: "", npcList: "", plot: "", imageUrl: "", presetCharacters: [] }); setCurrentView("scenarioEdit"); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">＋ 新規作成</button></div>
                <select value={selectedScenarioId} onChange={(e) => setSelectedScenarioId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none mb-4 font-bold">
                  {scenarios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
                <button onClick={handleCreateRoom} disabled={!activeScenario} className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white font-bold py-4 mt-auto rounded-xl">自分がGMとして募集を開始</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. シナリオ編集画面（前回と同じ） ==================== */}
      {currentView === "scenarioEdit" && editingScenario && (
        <div className="flex-1 flex flex-col items-center p-6 max-w-4xl mx-auto w-full overflow-y-auto">
           {/* （コード量省略のため構造維持：前回と変更なし） */}
           <h2 className="text-2xl font-bold text-amber-400 mb-4 w-full">シナリオ編集</h2>
           <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                <div><label className="text-sm text-amber-200 block">タイトル</label><input type="text" value={editingScenario.title} onChange={(e) => setEditingScenario({ ...editingScenario, title: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" /></div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                 <button onClick={() => setCurrentView("lobby")} className="w-full bg-slate-700 py-2 rounded-lg mb-2">キャンセル</button>
                 <button onClick={saveScenario} className="w-full bg-amber-600 py-2 rounded-lg">保存</button>
              </div>
           </div>
        </div>
      )}

      {/* ==================== 3. ゲームセッション画面 ==================== */}
      {currentView === "game" && activeRoom && joinedCharacter && currentUser && myScene && (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 h-full relative">
          
          {/* ★ パーティー分割モーダル (ホスト用開発機能) */}
          {isSplitModalOpen && currentUser.handleName === activeRoom.host_name && (
            <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 rounded-xl">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl">
                <h3 className="text-xl font-bold text-red-400 mb-4">【開発用】手動パーティー分割</h3>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* シーン1 */}
                  <div className="space-y-3 p-4 bg-slate-900 rounded-lg border border-slate-700">
                    <input type="text" value={splitScene1.name} onChange={e=>setSplitScene1({...splitScene1, name: e.target.value})} className="w-full bg-slate-800 p-2 text-sm text-white rounded font-bold" />
                    <div className="text-xs text-slate-400">所属メンバー:</div>
                    {activeRoom.scenario?.presetCharacters.map(c => (
                      <label key={`s1_${c.id}`} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={splitScene1.members.includes(c.id)} onChange={() => toggleMember(1, c.id)} className="accent-red-500" /> {c.name}
                      </label>
                    ))}
                    <div className="text-xs text-slate-400 mt-2">サブリーダー:</div>
                    <select value={splitScene1.leader} onChange={e=>setSplitScene1({...splitScene1, leader: e.target.value})} className="w-full bg-slate-800 p-1 text-xs">
                       <option value="">なし（AI任せ）</option>
                       {splitScene1.members.map(id => {
                         const c = activeRoom.scenario?.presetCharacters.find(pc => pc.id === id);
                         return <option key={id} value={id}>{c?.name}</option>
                       })}
                    </select>
                  </div>
                  {/* シーン2 */}
                  <div className="space-y-3 p-4 bg-slate-900 rounded-lg border border-slate-700">
                    <input type="text" value={splitScene2.name} onChange={e=>setSplitScene2({...splitScene2, name: e.target.value})} className="w-full bg-slate-800 p-2 text-sm text-white rounded font-bold" />
                    <div className="text-xs text-slate-400">所属メンバー:</div>
                    {activeRoom.scenario?.presetCharacters.map(c => (
                      <label key={`s2_${c.id}`} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={splitScene2.members.includes(c.id)} onChange={() => toggleMember(2, c.id)} className="accent-blue-500" /> {c.name}
                      </label>
                    ))}
                    <div className="text-xs text-slate-400 mt-2">サブリーダー:</div>
                    <select value={splitScene2.leader} onChange={e=>setSplitScene2({...splitScene2, leader: e.target.value})} className="w-full bg-slate-800 p-1 text-xs">
                       <option value="">なし（AI任せ）</option>
                       {splitScene2.members.map(id => {
                         const c = activeRoom.scenario?.presetCharacters.find(pc => pc.id === id);
                         return <option key={id} value={id}>{c?.name}</option>
                       })}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setIsSplitModalOpen(false)} className="flex-1 bg-slate-700 py-3 rounded text-sm font-bold">キャンセル</button>
                  <button onClick={executePartySplit} className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded text-sm font-bold shadow-lg shadow-red-900/50">分割を実行する</button>
                </div>
              </div>
            </div>
          )}

          <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView("lobby")} className="text-xs text-slate-400 hover:text-white underline">← 退室</button>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] text-blue-400 font-bold border border-blue-500/50 bg-blue-900/30 px-2 py-0.5 rounded w-fit">ROOM: {activeRoom.scenario?.title}</span>
                  {/* ★ 現在のシーン名を表示 */}
                  <span className="text-[10px] text-red-400 font-bold border border-red-500/50 bg-red-900/30 px-2 py-0.5 rounded w-fit flex items-center gap-1">
                    📍 現在地: {myScene.name}
                    {myScene.leaderId === joinedCharacter.id && <span className="text-amber-300 ml-1">👑 (Leader)</span>}
                  </span>
                </div>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <img src={joinedCharacter.imageUrl || NO_IMAGE_CHAR} alt="me" className="w-5 h-5 object-cover rounded-full" />
                  {joinedCharacter.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* ホスト専用の強制分割ボタン */}
              {currentUser.handleName === activeRoom.host_name && activeRoom.scenes.length === 1 && (
                <button onClick={() => setIsSplitModalOpen(true)} className="bg-red-900/50 hover:bg-red-800/80 border border-red-500/50 text-red-300 text-[10px] px-2 py-1.5 rounded mr-4">
                  [開発] 強制分割
                </button>
              )}
              <button onClick={() => rollDice(joinedCharacter.san, "SAN")} className="bg-cyan-700 text-white text-xs px-2 py-1 rounded">SAN</button>
            </div>
          </header>

          {/* ★ 現在のシーン (myScene.id) に紐づくメッセージだけを表示 */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3 custom-scrollbar">
            {messages.filter(m => m.sceneId === myScene.id || m.type === "system").map((msg, index) => (
              <div key={index} className={`p-3 rounded-xl max-w-[85%] ${msg.sender === "gm" ? "bg-slate-700/90 border-l-4 border-emerald-500 mr-auto text-slate-100" : "bg-blue-600/90 ml-auto text-right text-white"}`}>
                <span className="text-[10px] opacity-60 block mb-1">{msg.sender === "gm" ? "AI GM" : joinedCharacter.name}</span>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex gap-2"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={`${myScene.name}での行動を入力...`} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" /><button onClick={handleSend} disabled={isLoading} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">送信</button></div>
          </div>
        </div>
      )}
    </main>
  );
} 