"use client";

import { useState } from "react";

// --- 型定義 ---
type ViewState = "login" | "lobby" | "scenarioEdit" | "game"; // ★ "login" を追加

type UserProfile = {
  id: string;
  handleName: string;
  avatarUrl: string;
  bio: string;
};

type Character = {
  id: string;
  name: string;
  job: string;
  personality: string;
  imageUrl: string;
  hp: number;
  san: number;
  str: number;
  dex: number;
  int: number;
  con: number;
  wis: number;
  cha: number;
};

type Scenario = {
  id: string;
  title: string;
  system: string;
  tags: string;
  setting: string;
  npcList: string;
  plot: string;
  imageUrl: string;
  presetCharacters: Character[];
};

type Room = {
  id: string;
  scenario: Scenario;
  hostName: string;
  status: "recruiting" | "playing";
};

type Message = {
  sender: "player" | "gm";
  text: string;
  type?: "ic" | "ooc" | "system";
};

type LobbyMessage = {
  id: string;
  senderName: string;
  text: string;
  time: string;
  isSystem?: boolean;
};

const NO_IMAGE_SCENARIO = "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=400&q=80";
const NO_IMAGE_CHAR = "https://images.unsplash.com/photo-1544502062-f82887f03d1c?auto=format&fit=crop&w=200&q=80";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

export default function Home() {
  // ★ 初期画面を "login" に変更
  const [currentView, setCurrentView] = useState<ViewState>("login");

  // --- ★ 認証（ログイン・登録）用のステート ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true); // true:ログイン, false:新規登録

  // --- ユーザーデータ管理 ---
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<UserProfile | null>(null);

  // --- データ管理 ---
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: "s1",
      title: "チュートリアル：閉ざされた部屋",
      system: "オリジナルクトゥルフ",
      tags: "クローズド / 謎解き / 初心者向け",
      setting: "現代日本。探索者は見知らぬ部屋で目を覚ます。",
      npcList: "【謎の少女】部屋の隅で震えている。記憶喪失。",
      plot: "1. 導入: 廃屋で目を覚ます。\n2. 探索: 少女と会話し、鍵のかかった扉と日記を発見。\n3. 結末: 鍵を見つけて脱出。",
      imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
      presetCharacters: [
        {
          id: "c1", name: "探索者A", job: "私立探偵", personality: "冷静沈着だが、金には汚い", 
          imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
          hp: 12, san: 65, str: 60, dex: 70, int: 75, con: 60, wis: 65, cha: 50 
        },
        {
          id: "c2", name: "探索者B", job: "巻き込まれた学生", personality: "好奇心旺盛で無鉄砲", 
          imageUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=200&q=80",
          hp: 10, san: 70, str: 40, dex: 60, int: 80, con: 50, wis: 70, cha: 65 
        }
      ]
    }
  ]);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [editingCharIndex, setEditingCharIndex] = useState<number | null>(null);

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("s1");
  const [rooms, setRooms] = useState<Room[]>([
    {
      id: "room_dummy_1",
      scenario: scenarios[0],
      hostName: "ベテランGM",
      status: "recruiting",
    }
  ]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [joinedCharacter, setJoinedCharacter] = useState<Character | null>(null);

  // ロビーチャット
  const [lobbyMessages, setLobbyMessages] = useState<LobbyMessage[]>([
    { id: "lmsg_sys", senderName: "システム", text: "ロビーへようこそ！シナリオを選んで部屋を立てるか、募集中の部屋に参加しましょう。", time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), isSystem: true }
  ]);
  const [lobbyInput, setLobbyInput] = useState("");

  // セッション情報
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [msgType, setMsgType] = useState<"ic" | "ooc">("ic");
  const [isLoading, setIsLoading] = useState(false);

  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  // ==========================================
  // ★ 認証（ログイン・登録）のモック処理
  // ==========================================
  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    // ※次回ここに本物のデータベース（Supabase等）の認証処理を入れます
    const mockUser: UserProfile = {
      id: `u_${Date.now()}`,
      handleName: email.split("@")[0], // メールアドレスの@前を仮名前に
      avatarUrl: DEFAULT_AVATAR,
      bio: "新しく登録したプレイヤーです！よろしくお願いします。",
    };
    setCurrentUser(mockUser);
    setCurrentView("lobby");
  };

  const handleGoogleAuth = () => {
    // ※次回ここにGoogleログインの処理を入れます
    const mockUser: UserProfile = {
      id: `u_google_${Date.now()}`,
      handleName: "Google ユーザー",
      avatarUrl: DEFAULT_AVATAR,
      bio: "Googleアカウントでログインしました！",
    };
    setCurrentUser(mockUser);
    setCurrentView("lobby");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView("login");
  };

  // ==========================================
  // プロフィール更新関数
  // ==========================================
  const saveProfile = () => {
    if(editProfileData) setCurrentUser(editProfileData);
    setIsEditingProfile(false);
  };

  // ==========================================
  // 各種アクション関数
  // ==========================================
  const handleSendLobby = () => {
    if (!lobbyInput.trim() || !currentUser) return;
    setLobbyMessages((prev) => [...prev, {
      id: `lmsg_${Date.now()}`, 
      senderName: currentUser.handleName,
      text: lobbyInput,
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }]);
    setLobbyInput("");
  };

  const handleCreateRoom = () => {
    if (!currentUser) return;
    const newRoom: Room = {
      id: `room_${Date.now()}`, 
      scenario: activeScenario, 
      hostName: currentUser.handleName, 
      status: "recruiting",
    };
    setRooms([newRoom, ...rooms]);
    setLobbyMessages(prev => [...prev, {
      id: `lmsg_${Date.now()}_sys`, senderName: "システム",
      text: `【募集開始】${currentUser.handleName}さんが「${activeScenario.title}」の募集を開始しました！`,
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    }]);
  };

  const handleRollStatsForEditingChar = () => {
    if (!editingScenario || editingCharIndex === null) return;
    const roll3d6x5 = () => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      return (d1 + d2 + d3) * 5;
    };
    const str = roll3d6x5();
    const dex = roll3d6x5();
    const int = roll3d6x5();
    const con = roll3d6x5();
    const wis = roll3d6x5();
    const cha = roll3d6x5();
    const hp = Math.floor((str + con) / 10);
    const san = wis;

    const newChars = [...editingScenario.presetCharacters];
    newChars[editingCharIndex] = {
      ...newChars[editingCharIndex],
      str, dex, int, con, wis, cha, hp, san
    };
    setEditingScenario({ ...editingScenario, presetCharacters: newChars });
  };

  const handleJoinRoom = (room: Room, character: Character) => {
    if (!currentUser) return;
    setActiveRoom(room);
    setJoinedCharacter(character);
    setMessages([
      {
        sender: "gm",
        text: `【セッションルーム入室】\nシナリオ：「${room.scenario.title}」\n参加プレイヤー：${currentUser.handleName}\n担当キャラクター：${character.name}\n\nAI GM「接続完了。これよりセッションを開始します。」`,
        type: "system",
      },
    ]);
    setCurrentView("game");
  };

  const handleSend = () => {
    if (!input.trim() || isLoading || !activeRoom || !joinedCharacter || !currentUser) return;
    const userMsg: Message = { sender: "player", text: input, type: msgType };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const replyText = msgType === "ic"
          ? `AI GM「『${userMsg.text}』ですね。シナリオ設定を加味して描写します…」`
          : `AI GM (OOC)「${currentUser.handleName}さん、了解しました: ${userMsg.text}」`;
      setMessages((prev) => [...prev, { sender: "gm", text: replyText, type: msgType }]);
      setIsLoading(false);
    }, 1000);
  };

  const rollDice = (targetValue: number, label: string) => {
    const diceResult = Math.floor(Math.random() * 100) + 1;
    const isSuccess = diceResult <= targetValue;
    setMessages((prev) => [...prev, {
      sender: "player",
      text: `🎲 ${label} 判定 (1d100 ≦ ${targetValue}) ➔ 出目: ${diceResult} 【${isSuccess ? "成功" : "失敗"}】`,
      type: "ic",
    }]);
  };

  const saveScenario = () => {
    if (!editingScenario) return;
    if (editingScenario.id) {
      setScenarios(scenarios.map(s => s.id === editingScenario.id ? editingScenario : s));
    } else {
      setScenarios([...scenarios, { ...editingScenario, id: `s${Date.now()}` }]);
      setSelectedScenarioId(`s${Date.now()}`);
    }
    setCurrentView("lobby");
  };

  return (
    <main className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* ==================== 0. ログイン／新規登録画面 ==================== */}
      {currentView === "login" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h1 className="text-3xl font-extrabold text-emerald-400 mb-2 text-center">AI GM MORPG</h1>
            <p className="text-slate-400 text-sm text-center mb-8">次世代のオンラインTRPGセッションへ</p>

            <div className="space-y-4 mb-6">
              <button onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-800 font-bold py-3 rounded-xl transition">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                Googleで続ける
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-px bg-slate-700 flex-1"></div>
              <span className="text-xs text-slate-500 font-medium">またはメールアドレス</span>
              <div className="h-px bg-slate-700 flex-1"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">メールアドレス</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition" placeholder="mail@example.com" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">パスワード</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition" placeholder="6文字以上" minLength={6} />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-900/50 mt-2">
                {isLoginMode ? "ログイン" : "新規登録してはじめる"}
              </button>
            </form>

            <div className="text-center mt-6">
              <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-sm text-emerald-400 hover:text-emerald-300 underline">
                {isLoginMode ? "アカウントをお持ちでない場合は新規登録" : "すでにアカウントをお持ちの方はこちら (ログイン)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 1. ロビー画面 ==================== */}
      {currentView === "lobby" && currentUser && (
        <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar">
          
          <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
            <div>
              <h1 className="text-3xl font-extrabold text-emerald-400 mb-1">AI GM MORPG Lobby</h1>
              <p className="text-slate-400 text-sm">遊ぶシナリオとキャラクターを選んで、部屋を立てましょう。</p>
            </div>
            <div className="text-right">
               <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white underline">
                 ログアウト
               </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* 募集中のセッション掲示板 */}
              <div>
                <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2 mb-4">🌐 現在募集中のセッション</h2>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {rooms.map((room) => (
                    <div key={room.id} className="bg-slate-800 border border-slate-700 rounded-xl p-0 hover:border-blue-500 transition relative overflow-hidden group flex">
                      <img src={room.scenario.imageUrl || NO_IMAGE_SCENARIO} alt="scenario" className="w-32 h-full object-cover" />
                      <div className="p-4 flex-1">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">募集中</div>
                        <h3 className="text-lg font-bold text-white mb-1">{room.scenario.title}</h3>
                        <div className="flex gap-2 text-xs text-slate-400 mb-3">
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">システム: {room.scenario.system}</span>
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-amber-300">ホスト: {room.hostName}</span>
                        </div>
                        <p className="text-sm text-slate-300 mb-4 line-clamp-1">{room.scenario.tags}</p>
                        
                        <div className="flex gap-2 items-center">
                          <select 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none"
                            onChange={(e) => {
                              const char = room.scenario.presetCharacters.find(c => c.id === e.target.value);
                              if(char) handleJoinRoom(room, char);
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>参加するキャラクターを選択...</option>
                            {room.scenario.presetCharacters.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.job})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {rooms.length === 0 && <p className="text-slate-500 text-center py-10">現在募集中の部屋はありません。</p>}
                </div>
              </div>

              {/* ロビーチャットエリア */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col h-64 shadow-inner">
                <h2 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">💬 グローバルロビーチャット</h2>
                <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-2 custom-scrollbar">
                  {lobbyMessages.map((msg) => (
                    <div key={msg.id} className="text-sm leading-relaxed">
                      <span className="text-xs text-slate-500">[{msg.time}] </span>
                      <span className={`font-bold ${msg.isSystem ? 'text-amber-400' : 'text-emerald-300'}`}>{msg.senderName}: </span>
                      <span className="text-slate-200 ml-1">{msg.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={lobbyInput} onChange={(e) => setLobbyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendLobby()} placeholder="メッセージを入力..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  <button onClick={handleSendLobby} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition">送信</button>
                </div>
              </div>
            </div>

            {/* 右側：ユーザー情報 ＆ シナリオライブラリ */}
            <div className="space-y-6">
              
              {/* プレイヤー（ユーザー）プロフィールカード */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
                <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                  <h2 className="text-sm font-bold text-blue-400">👤 プレイヤー情報</h2>
                  {!isEditingProfile && (
                    <button onClick={() => { setEditProfileData(currentUser); setIsEditingProfile(true); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">編集</button>
                  )}
                </div>

                {isEditingProfile && editProfileData ? (
                  <div className="space-y-3">
                    <div><label className="text-xs text-slate-400 block mb-1">ハンドルネーム</label><input type="text" value={editProfileData.handleName} onChange={(e) => setEditProfileData({...editProfileData, handleName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-white outline-none focus:border-blue-500" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">アイコン画像URL</label><input type="text" value={editProfileData.avatarUrl} onChange={(e) => setEditProfileData({...editProfileData, avatarUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-white outline-none focus:border-blue-500" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">自己紹介</label><textarea value={editProfileData.bio} onChange={(e) => setEditProfileData({...editProfileData, bio: e.target.value})} className="w-full h-16 bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-white outline-none focus:border-blue-500" /></div>
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-slate-700 text-xs py-2 rounded">キャンセル</button>
                      <button onClick={saveProfile} className="flex-1 bg-blue-600 hover:bg-blue-500 font-bold text-xs py-2 rounded">保存</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4 items-start">
                    <img src={currentUser.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover" />
                    <div className="flex-1">
                      <p className="font-bold text-white text-lg">{currentUser.handleName}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-3">{currentUser.bio}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* シナリオライブラリ＆部屋立て */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col h-[520px]">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold text-amber-400">📜 シナリオライブラリ</h2>
                  <button onClick={() => { setEditingScenario({ id: "", title: "", system: "", tags: "", setting: "", npcList: "", plot: "", imageUrl: "", presetCharacters: [] }); setCurrentView("scenarioEdit"); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">＋ 新規作成</button>
                </div>
                
                <select value={selectedScenarioId} onChange={(e) => setSelectedScenarioId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-amber-500 outline-none mb-4 font-bold">
                  {scenarios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>

                {activeScenario && (
                  <div className="flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar gap-4">
                    <div>
                      <img src={activeScenario.imageUrl || NO_IMAGE_SCENARIO} alt="Package" className="w-full h-32 object-cover rounded-lg border border-slate-700 mb-2 shadow-lg" />
                      <div className="text-xs text-slate-400 text-right mb-2">
                        <button onClick={() => { setEditingScenario(activeScenario); setCurrentView("scenarioEdit"); }} className="underline hover:text-white">このシナリオを編集</button>
                      </div>
                      <p className="text-xs bg-slate-900 p-2 rounded border border-slate-700 text-slate-300 line-clamp-3 mb-4">{activeScenario.setting}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-emerald-400 mb-2 border-b border-slate-700 pb-1">👤 選択可能キャラクター (HO)</h3>
                      {activeScenario.presetCharacters.length === 0 ? (
                        <p className="text-xs text-slate-500">キャラクターが登録されていません。</p>
                      ) : (
                        <div className="space-y-2">
                          {activeScenario.presetCharacters.map((char) => (
                            <div key={char.id} className="flex gap-3 p-2 rounded-lg border border-slate-700 bg-slate-900 items-center">
                              <img src={char.imageUrl || NO_IMAGE_CHAR} alt={char.name} className="w-10 h-10 object-cover rounded-full border border-slate-600" />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-white">{char.name}</p>
                                <p className="text-[10px] text-slate-400">{char.job}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button onClick={handleCreateRoom} disabled={!activeScenario || activeScenario.presetCharacters.length === 0} className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white font-bold py-4 mt-4 rounded-xl transition shadow-lg shadow-amber-900/50">
                  自分がGMとして募集を開始
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. シナリオ＆キャラクター編集画面 (GMモード) ==================== */}
      {currentView === "scenarioEdit" && editingScenario && (
        <div className="flex-1 flex flex-col items-center p-6 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar">
          <h2 className="text-2xl font-bold text-amber-400 mb-6 w-full">{editingScenario.id ? "シナリオ・セット編集" : "シナリオ・セット新規作成"}</h2>
          
          {editingCharIndex !== null ? (
            <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-emerald-400 mb-2 border-b border-slate-700 pb-2">キャラクター設定</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-400 block mb-1">名前</label><input type="text" value={editingScenario.presetCharacters[editingCharIndex].name} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].name = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" /></div>
                <div><label className="text-xs text-slate-400 block mb-1">職業</label><input type="text" value={editingScenario.presetCharacters[editingCharIndex].job} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].job = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" /></div>
              </div>
              <div><label className="text-xs text-slate-400 block mb-1">キャラクター画像URL</label><input type="text" placeholder="https://..." value={editingScenario.presetCharacters[editingCharIndex].imageUrl} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].imageUrl = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">性格・特徴 (ハンドアウト内容)</label><textarea value={editingScenario.presetCharacters[editingCharIndex].personality} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].personality = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-20 outline-none focus:border-emerald-500" /></div>
              
              <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-emerald-400">パラメーター</label>
                  <button onClick={handleRollStatsForEditingChar} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded transition">🎲 ダイスで一括生成</button>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                  {['str', 'dex', 'int', 'con', 'wis', 'cha'].map((stat) => (
                    <div key={stat}>
                      <label className="text-[10px] text-slate-400 block mb-1 uppercase">{stat}</label>
                      <input type="number" value={(editingScenario.presetCharacters[editingCharIndex] as any)[stat]} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; (newC[editingCharIndex] as any)[stat] = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-white text-center outline-none focus:border-emerald-500" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-3">
                  <div><label className="text-[10px] text-slate-400 block mb-1">HP</label><input type="number" value={editingScenario.presetCharacters[editingCharIndex].hp} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].hp = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white text-center outline-none focus:border-emerald-500" /></div>
                  <div><label className="text-[10px] text-slate-400 block mb-1">SAN</label><input type="number" value={editingScenario.presetCharacters[editingCharIndex].san} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].san = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white text-center outline-none focus:border-emerald-500" /></div>
                </div>
              </div>
              <button onClick={() => setEditingCharIndex(null)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition mt-2">シナリオ編集に戻る</button>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-bold text-amber-400 border-b border-slate-700 pb-2">基本設定</h3>
                <div><label className="text-sm text-amber-200 block mb-1">シナリオタイトル</label><input type="text" value={editingScenario.title} onChange={(e) => setEditingScenario({ ...editingScenario, title: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" /></div>
                <div><label className="text-sm text-amber-200 block mb-1">パッケージ画像URL</label><input type="text" placeholder="https://..." value={editingScenario.imageUrl} onChange={(e) => setEditingScenario({ ...editingScenario, imageUrl: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm text-amber-200 block mb-1">システム</label><input type="text" value={editingScenario.system} onChange={(e) => setEditingScenario({ ...editingScenario, system: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" /></div>
                  <div><label className="text-sm text-amber-200 block mb-1">タグ</label><input type="text" value={editingScenario.tags} onChange={(e) => setEditingScenario({ ...editingScenario, tags: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" /></div>
                </div>
                <div><label className="text-sm text-amber-200 block mb-1">世界観・設定</label><textarea value={editingScenario.setting} onChange={(e) => setEditingScenario({ ...editingScenario, setting: e.target.value })} className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500" /></div>
                <div><label className="text-sm text-amber-200 block mb-1">NPC一覧</label><textarea value={editingScenario.npcList} onChange={(e) => setEditingScenario({ ...editingScenario, npcList: e.target.value })} className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500" /></div>
                <div><label className="text-sm text-amber-200 block mb-1">プロット (AI用)</label><textarea value={editingScenario.plot} onChange={(e) => setEditingScenario({ ...editingScenario, plot: e.target.value })} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500" /></div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                    <h3 className="text-lg font-bold text-emerald-400">専用キャラクター (HO)</h3>
                    <button 
                      onClick={() => {
                        const newChar: Character = { id: `c${Date.now()}`, name: "新規キャラ", job: "", personality: "", imageUrl: "", hp: 10, san: 50, str: 50, dex: 50, int: 50, con: 50, wis: 50, cha: 50 };
                        setEditingScenario({ ...editingScenario, presetCharacters: [...editingScenario.presetCharacters, newChar] });
                        setEditingCharIndex(editingScenario.presetCharacters.length);
                      }}
                      className="text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 px-3 py-1.5 rounded transition"
                    >
                      ＋ 追加
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {editingScenario.presetCharacters.map((char, idx) => (
                      <div key={char.id} className="flex items-center gap-3 bg-slate-900 border border-slate-700 p-3 rounded-lg">
                        <img src={char.imageUrl || NO_IMAGE_CHAR} alt="char" className="w-12 h-12 object-cover rounded border border-slate-600" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">{char.name}</p>
                          <p className="text-[10px] text-slate-400">{char.job}</p>
                        </div>
                        <button onClick={() => setEditingCharIndex(idx)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-white transition">編集</button>
                        <button onClick={() => {
                          const newC = editingScenario.presetCharacters.filter((_, i) => i !== idx);
                          setEditingScenario({ ...editingScenario, presetCharacters: newC });
                        }} className="text-xs text-red-400 hover:text-red-300 px-2 py-2">削除</button>
                      </div>
                    ))}
                    {editingScenario.presetCharacters.length === 0 && <p className="text-xs text-slate-500">キャラクターが登録されていません。</p>}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setCurrentView("lobby")} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition">キャンセル</button>
                  <button onClick={saveScenario} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg transition shadow-lg shadow-amber-900/50">シナリオ一式を保存する</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== 3. ゲームセッション画面 ==================== */}
      {currentView === "game" && activeRoom && joinedCharacter && currentUser && (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 h-full">
          <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView("lobby")} className="text-xs text-slate-400 hover:text-white underline">← 退室</button>
              <div className="flex items-center gap-3">
                <img src={activeRoom.scenario.imageUrl || NO_IMAGE_SCENARIO} alt="bg" className="w-10 h-10 object-cover rounded border border-slate-600" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-blue-400 font-bold border border-blue-500/50 bg-blue-900/30 px-2 py-0.5 rounded w-fit mb-0.5">ROOM: {activeRoom.scenario.title}</span>
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <img src={joinedCharacter.imageUrl || NO_IMAGE_CHAR} alt="me" className="w-5 h-5 object-cover rounded-full" />
                    {joinedCharacter.name}
                    <span className="text-xs font-normal text-slate-400 ml-1">(PL: {currentUser.handleName})</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => rollDice(joinedCharacter.san, "SAN")} className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs px-2 py-1 rounded font-medium">SAN ({joinedCharacter.san})</button>
              <button onClick={() => rollDice(joinedCharacter.str, "STR")} className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1 rounded font-medium">STR ({joinedCharacter.str})</button>
              <button onClick={() => rollDice(joinedCharacter.dex, "DEX")} className="bg-green-700 hover:bg-green-600 text-white text-xs px-2 py-1 rounded font-medium">DEX ({joinedCharacter.dex})</button>
              <button onClick={() => rollDice(joinedCharacter.int, "INT")} className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium">INT ({joinedCharacter.int})</button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3 custom-scrollbar">
            {messages.map((msg, index) => (
              <div key={index} className={`p-3 rounded-xl max-w-[85%] ${msg.sender === "gm" ? "bg-slate-700/90 border-l-4 border-emerald-500 mr-auto text-slate-100" : "bg-blue-600/90 ml-auto text-right text-white"}`}>
                <span className="text-[10px] opacity-60 block mb-1">{msg.sender === "gm" ? "AI GM" : joinedCharacter.name} {msg.type && `[${msg.type.toUpperCase()}]`}</span>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            ))}
            {isLoading && <div className="text-xs text-emerald-400 animate-pulse flex items-center gap-2"><span>AI GMが描写を生成中...</span></div>}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="msgType" value="ic" checked={msgType === "ic"} onChange={() => setMsgType("ic")} className="accent-blue-500"/><span className="text-blue-400 font-semibold">行動宣言 (IC)</span></label>
              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="msgType" value="ooc" checked={msgType === "ooc"} onChange={() => setMsgType("ooc")} className="accent-slate-400"/><span className="text-slate-400">雑談 (OOC)</span></label>
            </div>
            <div className="flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="行動を入力..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              <button onClick={handleSend} disabled={isLoading} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">送信</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}