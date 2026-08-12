"use client";

import { useState } from "react";

type Message = {
  sender: "player" | "gm";
  text: string;
  type?: "ic" | "ooc" | "system";
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "gm", text: "AI GM「ようこそ。探索者よ、どのような行動をとりますか？」", type: "system" },
  ]);
  const [input, setInput] = useState("");
  const [msgType, setMsgType] = useState<"ic" | "ooc">("ic");
  const [isLoading, setIsLoading] = useState(false);

  // 送信処理（仮のAI GM応答）
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { sender: "player", text: input, type: msgType };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // TODO: ここで将来的にバックエンドのAI API（Gemini等）を叩く
    setTimeout(() => {
      const replyText =
        msgType === "ic"
          ? `AI GM「『${userMsg.text}』ですね。あなたの行動に応じて周囲の状況が変化します…」`
          : `AI GM (OOC)「雑談を受信しました: ${userMsg.text}」`;

      setMessages((prev) => [...prev, { sender: "gm", text: replyText, type: msgType }]);
      setIsLoading(false);
    }, 1000);
  };

  // ダイスロール機能 (1d100)
  const rollDice = () => {
    const diceResult = Math.floor(Math.random() * 100) + 1;
    const isSuccess = diceResult <= 50; // 仮の50判定
    const diceMsg: Message = {
      sender: "player",
      text: `🎲 ダイスロール (1d100) ➔ 出目: ${diceResult} 【${isSuccess ? "成功" : "失敗"}】`,
      type: "ic",
    };
    setMessages((prev) => [...prev, diceMsg]);
  };

  return (
    <main className="flex flex-col h-screen max-w-3xl mx-auto p-4 bg-slate-900 text-slate-100">
      {/* ヘッダー */}
      <header className="border-b border-slate-700 pb-3 mb-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-emerald-400">AI GM MORPG - MVP</h1>
        <button
          onClick={rollDice}
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold transition"
        >
          🎲 1d100ダイスを振る
        </button>
      </header>

      {/* チャットログ表示エリア */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-800 rounded-lg border border-slate-700 mb-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg max-w-[85%] ${
              msg.sender === "gm"
                ? "bg-slate-700 border-l-4 border-emerald-500 mr-auto"
                : "bg-blue-600 ml-auto text-right"
            }`}
          >
            <span className="text-xs opacity-60 block mb-1">
              {msg.sender === "gm" ? "AI GM" : "あなた"} {msg.type && `[${msg.type.toUpperCase()}]`}
            </span>
            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
          </div>
        ))}
        {isLoading && (
          <div className="text-xs text-slate-400 animate-pulse">AI GMが思考中...</div>
        )}
      </div>

      {/* 入力エリア */}
      <div className="flex flex-col gap-2">
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
            <span className="text-emerald-400 font-semibold">行動 (IC)</span>
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
            <span className="text-slate-400">雑談 (OOC)</span>
          </label>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={msgType === "ic" ? "行動を入力... (例: 部屋の鍵を探す)" : "プレイヤー同士の雑談..."}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-md text-sm font-semibold transition disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </div>
    </main>
  );
}