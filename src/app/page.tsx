"use client";

import { useState } from "react";

// --- 型定義 ---
type ViewState = "lobby" | "characterEdit" | "scenarioEdit" | "game";

type Character = {
  id: string;
  name: string;
  job: string;
  personality: string;
  hp: number;
  san: number;
  // 6大ステータス
  str: number; // Strength (筋力)
  dex: number; // Dexterity (器用さ・敏捷)
  int: number; // Intelligence (知力)
  con: number; // Constitution (耐久力・体力)
  wis: number; // Wisdom (叡智・意志)
  cha: number; // Charisma (魅力)
};

type Scenario = {
  id: string;
  title: string;
  system: string;
  tags: string;
  setting: string;
  npcList: string;
  plot: string;
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
};

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewState>("lobby");

  // --- データ管理 ---
  const [characters, setCharacters] = useState<Character[]>([
    { 
      id: "c1", name: "探索者A", job: "私立探偵", personality: "冷静沈着だが、金には汚い", 
      hp: 12, san: 65, str: 60, dex: 70, int: 75, con: 60, wis: 65, cha: 50 
    },
  ]);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<string>("c1");

  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: "s1",
      title: "チュートリアル：閉ざされた部屋",
      system: "オリジナルクトゥルフ",
      tags: "クローズド / 謎解き / 推奨人数1人",
      setting: "現代日本。探索者は一般人。",
      npcList: "【謎の少女】部屋の隅で震えている。記憶喪失。",
      plot: "1. 導入: 廃屋で目を覚ます。\n2. 探索: 少女と会話し、鍵のかかった扉と日記を発見。\n3. 結末: 鍵を見つけて脱出。",
    }
  ]);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("s1");

  const [rooms, setRooms] = useState<Room[]>([
    {
      id: "room_dummy_1",
      scenario: scenarios[0],
      hostName: "GM初心者マーク",
      status: "recruiting",
    }
  ]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  // ロビーチャット
  const [lobbyMessages, setLobbyMessages] = useState<LobbyMessage[]>([
    { 
      id: "lmsg_sys", senderName: "システム", 
      text: "ロビーへようこそ！ここで他のプレイヤーと雑談したり、セッションの相談ができます。", 
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);
  const [lobbyInput, setLobbyInput] = useState("");

  // セッション情報
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [msgType, setMsgType] = useState<"ic" | "ooc">("ic");
  const [isLoading, setIsLoading] = useState(false);

  const activeChar = characters.find((c) => c.id === selectedCharId) || characters[0];
  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  // --- ダイスでステータスを自動生成 ---
  const handleRollCharacterStats = () => {
    if (!editingChar) return;
    
    // 3d6 * 5 のTRPG基準計算
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
    
    // HP = (STR + CON) / 10, SAN = WIS
    const hp = Math.floor((str + con) / 10);
    const san = wis;

    setEditingChar({
      ...editingChar,
      str, dex, int, con, wis, cha, hp, san
    });
  };

  // --- ロビーチャット送信 ---
  const handleSendLobby = () => {
    if (!lobbyInput.trim()) return;
    setLobbyMessages((prev) => [...prev, {
      id: `lmsg_${Date.now()}`, senderName: activeChar.name, text: lobbyInput,
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }]);
    setLobbyInput("");
  };

  // --- ルーム操作 ---
  const handleCreateRoom = () => {
    const newRoom: Room = {
      id: `room_${Date.now()}`, scenario: activeScenario, hostName: activeChar.name, status: "recruiting",
    };
    setRooms([newRoom, ...rooms]);
    setLobbyMessages(prev => [...prev, {
      id: `lmsg_${Date.now()}_sys`, senderName: "システム",
      text: `【募集開始】${activeChar.name}さんが「${activeScenario.title}」の募集を開始しました！`,
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const handleJoinRoom = (room: Room) => {
    setActiveRoom(room);
    setMessages([
      {
        sender: "gm",
        text: `【セッションルーム入室】\nシナリオ：「${room.scenario.title}」\nシステム：${room.scenario.system}\n参加キャラクター：${activeChar.name}\n\nAI GM「接続完了。これよりセッションを開始します。」`,
        type: "system",
      },
    ]);
    setCurrentView("game");
  };

  // --- セッション内チャット送信 ---
  const handleSend = () => {
    if (!input.trim() || isLoading || !activeRoom) return;
    const userMsg: Message = { sender: "player", text: input, type: msgType };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const replyText = msgType === "ic"
          ? `AI GM「『${userMsg.text}』ですね。シナリオ設定を加味して描写します…」`
          : `AI GM (OOC)「了解しました: ${userMsg.text}」`;
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

  // --- 保存処理 ---
  const saveCharacter = () => {
    if (!editingChar) return;
    if (editingChar.id) {
      setCharacters(characters.map(c => c.id === editingChar.id ? editingChar : c));
    } else {
      setCharacters([...characters, { ...editingChar, id: `c${Date.now()}` }]);
      setSelectedCharId(`c${Date.now()}`);
    }
    setCurrentView("lobby");
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
      
      {/* ==================== 1. ロビー画面 ==================== */}
      {currentView === "lobby" && (
        <div className="flex-1 flex flex-col p-6 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar">
          <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
            <div>
              <h1 className="text-3xl font-extrabold text-emerald-400 mb-1">AI GM MORPG Lobby</h1>
              <p className="text-slate-400 text-sm">セッションに参加するか、新しく部屋を立てましょう。</p>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* 募集中のセッション掲示板 */}
              <div>
                <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2 mb-4">🌐 現在募集中のセッション</h2>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {rooms.map((room) => (
                    <div key={room.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500 transition relative overflow-hidden group">
                      <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">募集中</div>
                      <h3 className="text-lg font-bold text-white mb-1">{room.scenario.title}</h3>
                      <div className="flex gap-2 text-xs text-slate-400 mb-3">
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">システム: {room.scenario.system}</span>
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700">ホスト: {room.hostName}</span>
                      </div>
                      <p className="text-sm text-slate-300 mb-4 line-clamp-2">{room.scenario.tags}</p>
                      <button onClick={() => handleJoinRoom(room)} className="w-full bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 hover:border-blue-500 font-bold py-2 rounded-lg transition">
                        この部屋に参加する (選択中のキャラ: {activeChar.name})
                      </button>
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
                      <span className={`font-bold ${msg.senderName === 'システム' ? 'text-amber-400' : 'text-emerald-300'}`}>{msg.senderName}: </span>
                      <span className="text-slate-200 ml-1">{msg.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={lobbyInput} onChange={(e) => setLobbyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendLobby()} placeholder="ロビーにいる全員へメッセージを送信..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  <button onClick={handleSendLobby} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition">送信</button>
                </div>
              </div>
            </div>

            {/* 右側：自分のデータ管理＆部屋立て */}
            <div className="space-y-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold text-emerald-400">👤 参加キャラクター</h2>
                  <button onClick={() => { setEditingChar({ id: "", name: "", job: "", personality: "", hp: 10, san: 50, str: 50, dex: 50, int: 50, con: 50, wis: 50, cha: 50 }); setCurrentView("characterEdit"); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">＋ 新規</button>
                </div>
                <select value={selectedCharId} onChange={(e) => setSelectedCharId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none mb-2">
                  {characters.map(c => <option key={c.id} value={c.id}>{c.name} ({c.job})</option>)}
                </select>
                <div className="text-xs text-slate-400 flex flex-col gap-1 mb-2">
                  <div className="flex justify-between"><span>HP: {activeChar?.hp}</span><span>SAN: {activeChar?.san}</span></div>
                  <div className="grid grid-cols-3 gap-1 mt-1 opacity-70">
                    <span>STR: {activeChar?.str}</span><span>DEX: {activeChar?.dex}</span><span>INT: {activeChar?.int}</span>
                    <span>CON: {activeChar?.con}</span><span>WIS: {activeChar?.wis}</span><span>CHA: {activeChar?.cha}</span>
                  </div>
                </div>
                <div className="text-right"><button onClick={() => { setEditingChar(activeChar); setCurrentView("characterEdit"); }} className="text-xs underline hover:text-white">編集</button></div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold text-amber-400">📜 自分で部屋を立てる (GM)</h2>
                  <button onClick={() => { setEditingScenario({ id: "", title: "", system: "", tags: "", setting: "", npcList: "", plot: "" }); setCurrentView("scenarioEdit"); }} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">＋ 新規シナリオ</button>
                </div>
                <select value={selectedScenarioId} onChange={(e) => setSelectedScenarioId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-amber-500 outline-none mb-3">
                  {scenarios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
                <div className="text-xs text-slate-400 text-right mb-4">
                  <button onClick={() => { setEditingScenario(activeScenario); setCurrentView("scenarioEdit"); }} className="underline hover:text-white">シナリオを編集</button>
                </div>
                <button onClick={handleCreateRoom} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-amber-900/50">このシナリオで募集を開始</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. シナリオ作成・編集画面 ==================== */}
      {currentView === "scenarioEdit" && editingScenario && (
        <div className="flex-1 flex flex-col items-center p-6 max-w-3xl mx-auto w-full overflow-y-auto custom-scrollbar">
          <h2 className="text-2xl font-bold text-amber-400 mb-6 w-full">{editingScenario.id ? "シナリオ編集" : "シナリオ新規作成"}</h2>
          <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
            <div><label className="text-sm font-semibold text-amber-200 block mb-1">シナリオタイトル</label><input type="text" value={editingScenario.title} onChange={(e) => setEditingScenario({ ...editingScenario, title: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-semibold text-amber-200 block mb-1">システム (ルール)</label><input type="text" value={editingScenario.system} onChange={(e) => setEditingScenario({ ...editingScenario, system: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none" /></div>
              <div><label className="text-sm font-semibold text-amber-200 block mb-1">タグ (傾向・難易度)</label><input type="text" value={editingScenario.tags} onChange={(e) => setEditingScenario({ ...editingScenario, tags: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none" /></div>
            </div>
            <div><label className="text-sm font-semibold text-amber-200 block mb-1">世界観・システム設定</label><textarea value={editingScenario.setting} onChange={(e) => setEditingScenario({ ...editingScenario, setting: e.target.value })} className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-amber-500 outline-none" /></div>
            <div><label className="text-sm font-semibold text-amber-200 block mb-1">NPC一覧・設定</label><textarea value={editingScenario.npcList} onChange={(e) => setEditingScenario({ ...editingScenario, npcList: e.target.value })} className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-amber-500 outline-none" /></div>
            <div><label className="text-sm font-semibold text-amber-200 block mb-1">プロット・シナリオ進行</label><textarea value={editingScenario.plot} onChange={(e) => setEditingScenario({ ...editingScenario, plot: e.target.value })} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-amber-500 outline-none" /></div>
            <div className="flex gap-3 pt-4 border-t border-slate-700">
              <button onClick={() => setCurrentView("lobby")} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition">キャンセル</button>
              <button onClick={saveScenario} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg transition">保存する</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. キャラクター作成・編集画面 ==================== */}
      {currentView === "characterEdit" && editingChar && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full overflow-y-auto">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6 w-full">{editingChar.id ? "キャラクター編集" : "キャラクター新規作成"}</h2>
          <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-400 block mb-1">名前</label><input type="text" value={editingChar.name} onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" /></div>
              <div><label className="text-xs text-slate-400 block mb-1">職業</label><input type="text" value={editingChar.job} onChange={(e) => setEditingChar({ ...editingChar, job: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" /></div>
            </div>
            
            <div><label className="text-xs text-slate-400 block mb-1">性格・特徴</label><textarea value={editingChar.personality} onChange={(e) => setEditingChar({ ...editingChar, personality: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-20 focus:border-emerald-500 outline-none" /></div>
            
            {/* ステータス入力＆ダイスボタンエリア */}
            <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-emerald-400">パラメーター</label>
                <button onClick={handleRollCharacterStats} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 transition">
                  🎲 ダイスで一括生成
                </button>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                <div><label className="text-[10px] text-slate-400 block mb-1">STR (筋力)</label><input type="number" value={editingChar.str} onChange={(e) => setEditingChar({ ...editingChar, str: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-white text-center focus:border-emerald-500 outline-none" /></div>
                <div><label className="text-[10px] text-slate-400 block mb-1">DEX (敏捷)</label><input type="number" value={editingChar.dex} onChange={(e) => setEditingChar({ ...editingChar, dex: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-white text-center focus:border-emerald-500 outline-none" /></div>
                <div><label className="text-[10px] text-slate-400 block mb-1">INT (知力)</label><input type="number" value={editingChar.int} onChange={(e) => setEditingChar({ ...editingChar, int: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-white text-center focus:border-emerald-500 outline-none" /></div>
                <div><label className="text-[10px] text-slate-400 block mb-1">CON (体力)</label><input type="number" value={editingChar.con} onChange={(e) => setEditingChar({ ...editingChar, con: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-white text-center focus:border-emerald-500 outline-none" /></div>
                <div><label className="text-[10px] text-slate-400 block mb-1">WIS (意志)</label><input type="number" value={editingChar.wis} onChange={(e) => setEditingChar({ ...editingChar, wis: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-white text-center focus:border-emerald-500 outline-none" /></div>
                <div><label className="text-[10px] text-slate-400 block mb-1">CHA (魅力)</label><input type="number" value={editingChar.cha} onChange={(e) => setEditingChar({ ...editingChar, cha: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm text-white text-center focus:border-emerald-500 outline-none" /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-3">
                <div><label className="text-[10px] text-slate-400 block mb-1">HP (耐久値)</label><input type="number" value={editingChar.hp} onChange={(e) => setEditingChar({ ...editingChar, hp: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white text-center focus:border-emerald-500 outline-none" /></div>
                <div><label className="text-[10px] text-slate-400 block mb-1">SAN (正気度)</label><input type="number" value={editingChar.san} onChange={(e) => setEditingChar({ ...editingChar, san: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white text-center focus:border-emerald-500 outline-none" /></div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setCurrentView("lobby")} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 rounded-lg transition">キャンセル</button>
              <button onClick={saveCharacter} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg transition">保存する</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. ゲームセッション画面 ==================== */}
      {currentView === "game" && activeRoom && (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 h-full">
          <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView("lobby")} className="text-xs text-slate-400 hover:text-white underline">← 退室</button>
              <div className="flex flex-col">
                <span className="text-[10px] text-blue-400 font-bold border border-blue-500/50 bg-blue-900/30 px-2 py-0.5 rounded w-fit mb-0.5">
                  ROOM: {activeRoom.scenario.title} (System: {activeRoom.scenario.system})
                </span>
                <span className="text-sm font-bold text-white">Player: {activeChar.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => rollDice(activeChar.san, "SAN")} className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs px-2 py-1 rounded font-medium">SAN ({activeChar.san})</button>
              <button onClick={() => rollDice(activeChar.str, "STR")} className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1 rounded font-medium">STR ({activeChar.str})</button>
              <button onClick={() => rollDice(activeChar.dex, "DEX")} className="bg-green-700 hover:bg-green-600 text-white text-xs px-2 py-1 rounded font-medium">DEX ({activeChar.dex})</button>
              <button onClick={() => rollDice(activeChar.int, "INT")} className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium">INT ({activeChar.int})</button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3 custom-scrollbar">
            {messages.map((msg, index) => (
              <div key={index} className={`p-3 rounded-xl max-w-[85%] ${msg.sender === "gm" ? "bg-slate-700/90 border-l-4 border-emerald-500 mr-auto text-slate-100" : "bg-blue-600/90 ml-auto text-right text-white"}`}>
                <span className="text-[10px] opacity-60 block mb-1">{msg.sender === "gm" ? "AI GM" : activeChar.name} {msg.type && `[${msg.type.toUpperCase()}]`}</span>
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