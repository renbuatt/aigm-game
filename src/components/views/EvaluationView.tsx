import React from "react";
import { Room } from "../../types";

type Props = {
  activeRoom: Room;
  ratingScenario: number;
  setRatingScenario: (val: number) => void;
  ratingGM: number;
  setRatingGM: (val: number) => void;
  submitEvaluation: () => Promise<void>;
  exportToPDF: (type: 'chat' | 'summary' | 'novel') => Promise<void>;
  isExporting: boolean;
};

export default function EvaluationView({
  activeRoom, ratingScenario, setRatingScenario, ratingGM, setRatingGM, submitEvaluation, exportToPDF, isExporting
}: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 w-full min-h-0 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6">
        <h1 className="text-2xl font-extrabold text-amber-400 text-center border-b border-slate-700 pb-4">セッション終了！お疲れ様でした</h1>
        
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-white mb-2">💾 思い出を保存する (PDF出力)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button onClick={() => exportToPDF('chat')} disabled={isExporting} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-2 rounded shadow disabled:opacity-50">そのままのチャット</button>
            <button onClick={() => exportToPDF('summary')} disabled={isExporting} className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-2 rounded shadow disabled:opacity-50">AI要約データ</button>
            <button onClick={() => exportToPDF('novel')} disabled={isExporting} className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold py-2 rounded shadow disabled:opacity-50">AIリプレイ小説化</button>
          </div>
          {isExporting && <p className="text-[10px] text-amber-400 animate-pulse text-center mt-2">AIが執筆しています... (数秒〜十数秒かかります)</p>}
        </div>

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
            <label className="text-sm text-white font-bold block mb-2">👑 プレイヤー（ホスト・GM）の評価: {activeRoom.host_name}</label>
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
  );
}