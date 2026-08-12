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
  str: number;
};

type Scenario = {
  id: string;
  title: string;
  setting: string;
  plot: string;
};

type Message = {
  sender: "player" | "gm";
  text: string;
  type?: "ic" | "ooc" | "system";
};

export default function Home() {
  // 画面状態管理
  const [currentView, setCurrentView] = useState<ViewState>("lobby");

  // --- データ管理 ---
  // キャラクター
  const [characters, setCharacters] = useState<Character[]>([
    { id: "c1", name: "探索者A", job: "私立探偵", personality: "冷静沈着だが、金には汚い", hp: 12, san: 65, str: 50 },
    { id: "c2", name: "探索者B", job: "大学生", personality: "好奇心旺盛で無鉄砲", hp: 10, san: 70, str: 40 },
  ]);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<string>("c1");

  // シナリオ（GMモード）
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: "s1",
      title: "チュートリアル：閉ざされた部屋",
      setting: "【世界観】現代日本。探索者は一般人。",
      plot: "1. 導入: 廃屋で目を覚ます。\n2. 探索: 鍵のかかった扉と日記を発見。\n3. 結末: 鍵を見つけて脱出。",
    },
    {
      id: "s2",
      title: "狂気の洋館探索",
      setting: "【世界観】1920年代アメリカ。神話生物の影が潜む。",
      plot: "1. 導入: 遺産相続のために洋館を訪れる。\n2. 探索: 地下室から奇妙な音が聞こえる。\n3. 結末: 地下の儀式を阻止するか、逃亡する。",
    }
  ]);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("s1");

  // セッション情報
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [msgType, setMsgType] = useState<"ic" | "ooc">("ic");
  const [isLoading, setIsLoading] = useState(false);

  // 選択中のデータを取得
  const activeChar = characters.find((c) => c.id === selectedCharId) || characters[0];
  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  // --- ルーム（MO箱）作成・ゲーム開始 ---
  const handleStartGame = () => {
    setMessages([
      {
        sender: "gm",
        text: `【セッションルーム作成完了】\nシナリオ：「${activeScenario.title}」\n参加者：${activeChar.name}（${activeChar.job}）\n\nAI GM「準備が整いました。これよりセッションを開始します。」`,
        type: "system",
      },
    ]);
    setCurrentView("game");
  };

  // --- チャット送信 ---
  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { sender: "player", text: input, type: msgType };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const replyText =
        msgType === "ic"
          ? `AI GM「『${userMsg.text}』ですね。現在のシナリオ『${activeScenario.title}』の状況に合わせて処理します…」`
          : `AI GM (OOC)「了解しました: ${userMsg.text}」`;

      setMessages((prev) => [...prev, { sender: "gm", text: replyText, type: msgType }]);
      setIsLoading(false);
    }, 1000);
  };

  // --- ダイスロール (1d100) ---
  const rollDice = (targetValue: number, label: string) => {
    const diceResult = Math.floor(Math.random() * 100) + 1;
    const isSuccess = diceResult <= targetValue;
    const diceMsg: Message = {
      sender: "player",
      text: `🎲 ${label} 判定 (1d100 ≦ ${targetValue}) ➔ 出目: ${diceResult} 【${isSuccess ? "成功" : "失敗"}】`,
      type: "ic",
    };
    setMessages((prev) => [...prev, diceMsg]);
  };

  // --- 保存処理 ---
  const saveCharacter = () => {
    if (!editingChar) return;
    if (editingChar.id) {
      setCharacters(characters.map(c => c.id === editingChar.id ? editingChar : c));
    } else {
      const newChar = { ...editingChar, id: `c${Date.now()}` };
      setCharacters([...characters, newChar]);
      setSelectedCharId(newChar.id);
    }
    setCurrentView("lobby");
  };

  const saveScenario = () => {
    if (!editingScenario) return;
    if (editingScenario.id) {
      setScenarios(scenarios.map(s => s.id === editingScenario.id ? editingScenario : s));
    } else {
      const newScenario = { ...editingScenario, id: `s${Date.now()}` };
      setScenarios([...scenarios, newScenario]);
      setSelectedScenarioId(newScenario.id);
    }
    setCurrentView("lobby");
  };

  return (
    <main className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* ==================== 1. ロビー画面（MO箱構築） ==================== */}
      {currentView === "lobby" && (
        <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full overflow-y-auto">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-emerald-400 mb-2">AI GM MORPG Lobby</h1>
            <p className="text-slate-400 text-sm">シナリオとキャラクターを選択し、専用のセッションルーム（MO箱）を作成します</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* 左側：シナリオ選択 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">📜 シナリオ (GM設定)</h2>
                <button
                  onClick={() => {
                    setEditingScenario({ id: "", title: "", setting: "", plot: "" });
                    setCurrentView("scenarioEdit");
                  }}
                  className="text-xs bg-amber-900/30 text-amber-400 hover:bg-amber-900/60 px-3 py-1.5 rounded transition"
                >
                  ＋ 新規作成
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      selectedScenarioId === scenario.id
                        ? "bg-amber-900/30 border-amber-500 shadow-md shadow-amber-900/20"
                        : "bg-slate-800 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-white text-sm">{scenario.title}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingScenario(scenario); setCurrentView("scenarioEdit"); }}
                        className="text-[10px] text-slate-400 hover:text-amber-400 underline"
                      >
                        編集
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{scenario.setting}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 右側：キャラクター選択 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">👤 キャラクター</h2>
                <button
                  onClick={() => {
                    setEditingChar({ id: "", name: "", job: "", personality: "", hp: 10, san: 50, str: 50 });
                    setCurrentView("characterEdit");
                  }}
                  className="text-xs bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/60 px-3 py-1.5 rounded transition"
                >
                  ＋ 新規作成
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    onClick={() => setSelectedCharId(char.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      selectedCharId === char.id
                        ? "bg-emerald-900/30 border-emerald-500 shadow-md shadow-emerald-900/20"
                        : "bg-slate-800 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-white text-sm">{char.name}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingChar(char); setCurrentView("characterEdit"); }}
                        className="text-[10px] text-slate-400 hover:text-emerald-400 underline"
                      >
                        編集
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{char.job} / {char.personality}</p>
                    <div className="flex gap-3 text-[10px] text-slate-300">
                      <span>HP: {char.hp}</span>
                      <span>SAN: {char.san}</span>
                      <span>STR: {char.str}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* セッション作成ボタン */}
          <div className="mt-auto pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400 mb-3">
              選択中のシナリオ：<span className="text-amber-400 font-bold">{activeScenario?.title}</span> × 
              選択中のキャラ：<span className="text-emerald-400 font-bold">{activeChar?.name}</span>
            </p>
            <button
              onClick={handleStartGame}
              disabled={!activeScenario || !activeChar}
              className="w-full max-w-md mx-auto bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-900/50"
            >
              🚀 この組み合わせでセッションルーム（MO）を作成
            </button>
          </div>
        </div>
      )}

      {/* ==================== 2. シナリオ作成・編集画面 ==================== */}
      {currentView === "scenarioEdit" && editingScenario && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
          <h2 className="text-2xl font-bold text-amber-400 mb-6">
            {editingScenario.id ? "シナリオ編集" : "シナリオ新規作成"}
          </h2>
          <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
            <div>
              <label className="text-sm font-semibold text-amber-200 block mb-1">シナリオタイトル</label>
              <input
                type="text"
                value={editingScenario.title}
                onChange={(e) => setEditingScenario({ ...editingScenario, title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-amber-200 block mb-1">世界観・システム設定</label>
              <textarea
                value={editingScenario.setting}
                onChange={(e) => setEditingScenario({ ...editingScenario, setting: e.target.value })}
                className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-amber-200 block mb-1">プロット・シナリオ進行</label>
              <textarea
                value={editingScenario.plot}
                onChange={(e) => setEditingScenario({ ...editingScenario, plot: e.target.value })}
                className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setCurrentView("lobby")}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 rounded-lg transition"
              >
                キャンセル
              </button>
              <button
                onClick={saveScenario}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-lg transition"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. キャラクター作成・編集画面 ==================== */}
      {currentView === "characterEdit" && editingChar && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6">
            {editingChar.id ? "キャラクター編集" : "キャラクター新規作成"}
          </h2>
          <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">名前</label>
              <input
                type="text"
                value={editingChar.name}
                onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">職業</label>
              <input
                type="text"
                value={editingChar.job}
                onChange={(e) => setEditingChar({ ...editingChar, job: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">性格・特徴</label>
              <textarea
                value={editingChar.personality}
                onChange={(e) => setEditingChar({ ...editingChar, personality: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-20 focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">HP</label>
                <input
                  type="number"
                  value={editingChar.hp}
                  onChange={(e) => setEditingChar({ ...editingChar, hp: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">SAN (正気度)</label>
                <input
                  type="number"
                  value={editingChar.san}
                  onChange={(e) => setEditingChar({ ...editingChar, san: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">STR (筋力)</label>
                <input
                  type="number"
                  value={editingChar.str}
                  onChange={(e) => setEditingChar({ ...editingChar, str: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setCurrentView("lobby")}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 rounded-lg transition"
              >
                キャンセル
              </button>
              <button
                onClick={saveCharacter}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg transition"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. ゲームセッション画面 (MO箱) ==================== */}
      {currentView === "game" && (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 h-full">
          <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView("lobby")}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                ← 退室してロビーへ
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] text-amber-400 font-bold border border-amber-500/50 bg-amber-900/30 px-2 py-0.5 rounded w-fit mb-0.5">
                  シナリオ: {activeScenario.title}
                </span>
                <span className="text-sm font-bold text-white">Player: {activeChar.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => rollDice(activeChar.san, "SAN")}
                className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs px-2.5 py-1.5 rounded font-medium"
              >
                SANチェック ({activeChar.san})
              </button>
              <button
                onClick={() => rollDice(50, "目星")}
                className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-2.5 py-1.5 rounded font-medium"
              >
                目星 (50)
              </button>
              <button
                onClick={() => rollDice(activeChar.str, "STR")}
                className="bg-amber-700 hover:bg-amber-600 text-white text-xs px-2.5 py-1.5 rounded font-medium"
              >
                STR ({activeChar.str})
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3 custom-scrollbar">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-xl max-w-[85%] ${
                  msg.sender === "gm"
                    ? "bg-slate-700/90 border-l-4 border-emerald-500 mr-auto text-slate-100"
                    : "bg-blue-600/90 ml-auto text-right text-white"
                }`}
              >
                <span className="text-[10px] opacity-60 block mb-1">
                  {msg.sender === "gm" ? "AI GM" : activeChar.name} {msg.type && `[${msg.type.toUpperCase()}]`}
                </span>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            ))}
            {isLoading && (
              <div className="text-xs text-emerald-400 animate-pulse flex items-center gap-2">
                <span>AI GMが描写を生成中...</span>
              </div>
            )}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="msgType"
                  value="ic"
                  checked={msgType === "ic"}
                  onChange={() => setMsgType("ic")}
                  className="accent-emerald-500"
                />
                <span className="text-emerald-400 font-semibold">行動宣言 (IC)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="msgType"
                  value="ooc"
                  checked={msgType === "ooc"}
                  onChange={() => setMsgType("ooc")}
                  className="accent-slate-400"
                />
                <span className="text-slate-400">プレイヤー雑談 (OOC)</span>
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={
                  msgType === "ic"
                    ? "行動を入力... (例: 部屋の中を調べる)"
                    : "GMへの質問などを入力..."
                }
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}