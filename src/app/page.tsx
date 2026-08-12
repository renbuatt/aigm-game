"use client";

import { useState } from "react";

// --- 型定義 ---
type ViewState = "lobby" | "character" | "gmMode" | "game";

type Character = {
  id: string;
  name: string;
  job: string;
  personality: string; // 性格を追加
  hp: number;
  san: number;
  str: number;
};

type GMConfig = {
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

  // GM用設定データ
  const [gmConfig, setGmConfig] = useState<GMConfig>({
    setting: "【世界観】現代日本。\n【探索者作成】一般人推奨。神話生物の知識は持たないこと。",
    plot: "1. 導入: 探索者は見知らぬ廃屋で目を覚ます。\n2. 探索: 部屋には鍵のかかった扉と、古びた日記がある。\n3. 結末: 鍵を見つけて脱出すればクリア。",
  });

  // キャラクターデータ（初期登録キャラ）
  const [characters, setCharacters] = useState<Character[]>([
    { id: "1", name: "探索者A", job: "私立探偵", personality: "冷静沈着だが、金には汚い", hp: 12, san: 65, str: 50 },
    { id: "2", name: "探索者B", job: "大学生", personality: "好奇心旺盛で無鉄砲", hp: 10, san: 70, str: 40 },
  ]);
  const [selectedCharId, setSelectedCharId] = useState<string>("1");
  const [editingChar, setEditingChar] = useState<Character | null>(null);

  // セッション情報
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [msgType, setMsgType] = useState<"ic" | "ooc">("ic");
  const [isLoading, setIsLoading] = useState(false);

  // 現在選択中のキャラクターを取得
  const activeChar = characters.find((c) => c.id === selectedCharId) || characters[0];

  // --- ゲーム開始 ---
  const handleStartGame = () => {
    setMessages([
      {
        sender: "gm",
        text: `【セッション開始】\nAI GM「ようこそ、${activeChar.name}（${activeChar.job}）。準備はよろしいですか？」\n\n※裏側では以下のGMプロットが読み込まれています:\n${gmConfig.plot}`,
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
          ? `AI GM「『${userMsg.text}』ですね。${activeChar.name}の行動を処理します…」`
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
      text: `🎲 ${label} 判定 (1d100 ≦ ${targetValue}) ➔ 出目: ${diceResult} 【${
        isSuccess ? "成功" : "失敗"
      }】`,
      type: "ic",
    };
    setMessages((prev) => [...prev, diceMsg]);
  };

  // --- キャラ保存 ---
  const saveCharacter = () => {
    if (!editingChar) return;
    if (editingChar.id) {
      // 既存更新
      setCharacters(characters.map(c => c.id === editingChar.id ? editingChar : c));
    } else {
      // 新規追加
      const newChar = { ...editingChar, id: Date.now().toString() };
      setCharacters([...characters, newChar]);
      setSelectedCharId(newChar.id);
    }
    setCurrentView("lobby");
  };

  return (
    <main className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* ==================== 1. ロビー画面 ==================== */}
      {currentView === "lobby" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
          <h1 className="text-3xl font-extrabold text-emerald-400 mb-2">AI GM MORPG Lobby</h1>
          <p className="text-slate-400 text-sm mb-8">AIがゲームマスターを務める次世代TRPGセッション</p>

          {/* GMモード設定への導線 */}
          <button
            onClick={() => setCurrentView("gmMode")}
            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 mb-6 flex justify-between items-center transition group"
          >
            <div className="text-left">
              <span className="text-sm font-bold text-amber-400 block mb-1">🛠 GMモード（シナリオ・設定）</span>
              <span className="text-xs text-slate-400">AIに読み込ませる世界観やプロットを編集します</span>
            </div>
            <span className="text-slate-500 group-hover:text-amber-400 transition">編集 ➔</span>
          </button>

          {/* キャラクター選択 */}
          <div className="w-full mb-8">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-slate-300">使用キャラクター選択</h2>
              <button
                onClick={() => {
                  setEditingChar({ id: "", name: "", job: "", personality: "", hp: 10, san: 50, str: 50 });
                  setCurrentView("character");
                }}
                className="text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 px-3 py-1.5 rounded-lg transition"
              >
                ＋ 新規作成
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {characters.map((char) => (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedCharId === char.id
                      ? "bg-emerald-900/40 border-emerald-500"
                      : "bg-slate-800 border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-white">{char.name}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingChar(char); setCurrentView("character"); }}
                      className="text-xs text-slate-400 hover:text-white underline"
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

          {/* セッション開始 */}
          <button
            onClick={handleStartGame}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-emerald-900/50"
          >
            セッションを開始する
          </button>
        </div>
      )}

      {/* ==================== 2. GMモード設定画面 ==================== */}
      {currentView === "gmMode" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full">
          <h2 className="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">
            🛠 GMモード設定
          </h2>
          <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
            <div>
              <label className="text-sm font-semibold text-amber-200 block mb-2">
                世界観・キャラクター作成要素
              </label>
              <p className="text-xs text-slate-400 mb-2">AIに伝える前提知識、職業の制限、性格の反映方法などを記載します。</p>
              <textarea
                value={gmConfig.setting}
                onChange={(e) => setGmConfig({ ...gmConfig, setting: e.target.value })}
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="例: 舞台は1920年代のアメリカ。探索者は秘密結社のメンバー..."
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-amber-200 block mb-2">
                シナリオプロット（進行用）
              </label>
              <p className="text-xs text-slate-400 mb-2">物語の導入、発生するイベント、結末の条件などを記載します。</p>
              <textarea
                value={gmConfig.plot}
                onChange={(e) => setGmConfig({ ...gmConfig, plot: e.target.value })}
                className="w-full h-48 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="1. 導入: 〇〇が起きる&#10;2. 探索: 〇〇を見つける&#10;3. 結末: 〇〇を倒す"
              />
            </div>
            <button
              onClick={() => setCurrentView("lobby")}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
            >
              保存してロビーへ戻る
            </button>
          </div>
        </div>
      )}

      {/* ==================== 3. キャラクター作成・編集画面 ==================== */}
      {currentView === "character" && editingChar && (
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">職業</label>
              <input
                type="text"
                value={editingChar.job}
                onChange={(e) => setEditingChar({ ...editingChar, job: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">性格・特徴</label>
              <textarea
                value={editingChar.personality}
                onChange={(e) => setEditingChar({ ...editingChar, personality: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-20"
                placeholder="例: 好奇心旺盛で、怪しいものを見ると触らずにはいられない。"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">HP</label>
                <input
                  type="number"
                  value={editingChar.hp}
                  onChange={(e) => setEditingChar({ ...editingChar, hp: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">SAN (正気度)</label>
                <input
                  type="number"
                  value={editingChar.san}
                  onChange={(e) => setEditingChar({ ...editingChar, san: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">STR (筋力)</label>
                <input
                  type="number"
                  value={editingChar.str}
                  onChange={(e) => setEditingChar({ ...editingChar, str: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center"
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

      {/* ==================== 4. ゲームセッション画面 ==================== */}
      {currentView === "game" && (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 h-full">
          <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView("lobby")}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                ← ロビーへ戻る
              </button>
              <div>
                <span className="text-xs text-emerald-400 font-bold block">
                  セッション進行中
                </span>
                <span className="text-sm font-bold text-white">{activeChar.name} ({activeChar.job})</span>
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

          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-3">
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
                    ? "行動を入力... (例: 扉をゆっくり押し開けて中を調べる)"
                    : "GMへの質問などを入力..."
                }
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
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