"use client";

import { useState } from "react";

// --- 型定義 ---
type ViewState = "lobby" | "character" | "game";

type Character = {
  name: string;
  job: string;
  hp: number;
  san: number;
  str: number;
};

type Message = {
  sender: "player" | "gm";
  text: string;
  type?: "ic" | "ooc" | "system";
};

export default function Home() {
  // 画面状態管理
  const [currentView, setCurrentView] = useState<ViewState>("lobby");

  // キャラクター情報
  const [character, setCharacter] = useState<Character>({
    name: "探索者A",
    job: "私立探偵",
    hp: 12,
    san: 65,
    str: 50,
  });

  // セッション情報
  const [roomMode, setRoomMode] = useState<"trial" | "point">("trial");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [msgType, setMsgType] = useState<"ic" | "ooc">("ic");
  const [isLoading, setIsLoading] = useState(false);

  // --- ゲーム開始（部屋作成） ---
  const handleStartGame = (mode: "trial" | "point") => {
    setRoomMode(mode);
    setMessages([
      {
        sender: "gm",
        text: `【セッション開始】モード: ${
          mode === "trial" ? "10分お試し (Web Speech API)" : "ポイント直接 (プレミアム音声)"
        }\nAI GM「ようこそ、${character.name}（${character.job}）。事件の舞台へご案内します。」`,
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
          ? `AI GM「『${userMsg.text}』ですね。${character.name}の行動を処理します…」`
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

  return (
    <main className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* ==================== 1. ロビー画面 ==================== */}
      {currentView === "lobby" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
          <h1 className="text-3xl font-extrabold text-emerald-400 mb-2">AI GM MORPG Lobby</h1>
          <p className="text-slate-400 text-sm mb-8">AIがゲームマスターを務める次世代TRPGセッション</p>

          {/* キャラクター簡易カード */}
          <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-400 block">使用キャラクター</span>
              <p className="text-lg font-bold text-white">{character.name} <span className="text-xs font-normal text-slate-400">({character.job})</span></p>
              <div className="flex gap-3 text-xs text-slate-300 mt-1">
                <span>HP: {character.hp}</span>
                <span>SAN: {character.san}</span>
                <span>STR: {character.str}</span>
              </div>
            </div>
            <button
              onClick={() => setCurrentView("character")}
              className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-xs font-semibold transition"
            >
              キャラ編集
            </button>
          </div>

          {/* ルーム作成・選択 */}
          <div className="w-full space-y-4">
            <h2 className="text-sm font-semibold text-slate-300">新しいセッションを開始</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleStartGame("trial")}
                className="p-5 bg-gradient-to-br from-emerald-900/60 to-slate-800 border border-emerald-500/50 rounded-xl text-left hover:border-emerald-400 transition group"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-emerald-300">10分お試しモード</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">無料</span>
                </div>
                <p className="text-xs text-slate-400">広告を視聴して10分間プレイ。Web Speech API音声を利用。</p>
              </button>

              <button
                onClick={() => handleStartGame("point")}
                className="p-5 bg-gradient-to-br from-purple-900/60 to-slate-800 border border-purple-500/50 rounded-xl text-left hover:border-purple-400 transition group"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-purple-300">ポイントモード</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">標準</span>
                </div>
                <p className="text-xs text-slate-400">時間制限なし。高品質AIボイス＋持ち込みキャラ使用可能。</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. キャラクター作成画面 ==================== */}
      {currentView === "character" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6">キャラクター設定</h2>
          <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">名前</label>
              <input
                type="text"
                value={character.name}
                onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">職業</label>
              <input
                type="text"
                value={character.job}
                onChange={(e) => setCharacter({ ...character, job: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">HP</label>
                <input
                  type="number"
                  value={character.hp}
                  onChange={(e) => setCharacter({ ...character, hp: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">SAN (正気度)</label>
                <input
                  type="number"
                  value={character.san}
                  onChange={(e) => setCharacter({ ...character, san: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">STR (筋力)</label>
                <input
                  type="number"
                  value={character.str}
                  onChange={(e) => setCharacter({ ...character, str: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center"
                />
              </div>
            </div>
            <button
              onClick={() => setCurrentView("lobby")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg transition mt-4"
            >
              ロビーへ戻る
            </button>
          </div>
        </div>
      )}

      {/* ==================== 3. ゲームセッション画面 ==================== */}
      {currentView === "game" && (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 h-full">
          {/* 上部ステータスバー */}
          <header className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-3 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView("lobby")}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                ← 退出
              </button>
              <div>
                <span className="text-xs text-emerald-400 font-bold block">
                  [{roomMode === "trial" ? "お試し" : "ポイント"}] セッション中
                </span>
                <span className="text-sm font-bold text-white">{character.name} ({character.job})</span>
              </div>
            </div>

            {/* クイックダイスボタン群 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => rollDice(character.san, "SAN")}
                className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs px-2.5 py-1.5 rounded font-medium"
              >
                SANチェック ({character.san})
              </button>
              <button
                onClick={() => rollDice(50, "目星")}
                className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-2.5 py-1.5 rounded font-medium"
              >
                目星 (50)
              </button>
              <button
                onClick={() => rollDice(character.str, "STR")}
                className="bg-amber-700 hover:bg-amber-600 text-white text-xs px-2.5 py-1.5 rounded font-medium"
              >
                STR (50)
              </button>
            </div>
          </header>

          {/* メインチャットエリア */}
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
                  {msg.sender === "gm" ? "AI GM" : character.name} {msg.type && `[${msg.type.toUpperCase()}]`}
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

          {/* 下部入力コントロール */}
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
                    : "雑談を入力..."
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