import React, { useState, useEffect } from "react";
import { Room, Message, UserProfile } from "../../types";
import { supabase } from "../../lib/supabase";

type Props = {
  activeRoom: Room;
  messages: Message[];
  ratingScenario: number;
  setRatingScenario: React.Dispatch<React.SetStateAction<number>>;
  ratingGM: number;
  setRatingGM: React.Dispatch<React.SetStateAction<number>>;
  submitEvaluation: () => Promise<void>;
  exportToPDF: (type: 'chat' | 'summary' | 'novel') => Promise<void>; // ★ 引数変更
  isExporting: boolean;
  saveToArchive: () => Promise<void>;
  currentUser: UserProfile;
  addFriend: (targetId: string) => Promise<void>;
  openUserProfile: (userId: string) => void;
};

export default function EvaluationView({
  activeRoom, messages, ratingScenario, setRatingScenario, ratingGM, setRatingGM,
  submitEvaluation, exportToPDF, isExporting, saveToArchive, currentUser, addFriend, openUserProfile
}: Props) {
  const [coPlayers, setCoPlayers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchCoPlayers = async () => {
      const ids = Object.keys(activeRoom.joined_users || {}).filter(id => id !== currentUser.id);
      if (ids.length === 0) return;
      
      const { data } = await supabase.from('profiles').select('*').in('id', ids);
      if (data) {
        setCoPlayers(data.map(d => ({ id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url } as UserProfile)));
      }
    };
    fetchCoPlayers();
  }, [activeRoom, currentUser.id]);

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-2xl shadow-2xl space-y-6">
        <h2 className="text-3xl font-extrabold text-center text-amber-400 mb-2">🎉 セッションクリア！</h2>
        <p className="text-center text-slate-300 text-sm">お疲れ様でした！シナリオとGMの評価をお願いします。</p>

        <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl space-y-4">
          <div>
            <label className="text-sm font-bold text-white block mb-2">📖 シナリオ「{activeRoom.scenario?.title}」の評価</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={`sc_${star}`} onClick={() => setRatingScenario(star)} className={`text-3xl transition-transform hover:scale-110 ${ratingScenario >= star ? "text-amber-400" : "text-slate-600"}`}>★</button>
              ))}
              <span className="ml-2 text-slate-400 text-sm">({ratingScenario} / 5)</span>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-700">
            <label className="text-sm font-bold text-white block mb-2">🤖 AI GMの進行・描写の評価</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={`gm_${star}`} onClick={() => setRatingGM(star)} className={`text-3xl transition-transform hover:scale-110 ${ratingGM >= star ? "text-blue-400" : "text-slate-600"}`}>★</button>
              ))}
              <span className="ml-2 text-slate-400 text-sm">({ratingGM} / 5)</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-emerald-400 mb-2 border-b border-slate-700 pb-2">💾 セッションの記録を保存</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => exportToPDF('chat')} disabled={isExporting} className="bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-lg text-xs font-bold text-white shadow transition flex items-center justify-center gap-2">
              💬 ログをPDF出力
            </button>
            {/* ★ 引数を変更しました */}
            <button onClick={() => exportToPDF('novel')} disabled={isExporting} className="bg-indigo-700 hover:bg-indigo-600 px-4 py-3 rounded-lg text-xs font-bold text-white shadow transition flex items-center justify-center gap-2 disabled:opacity-50">
              {isExporting ? "⏳ 執筆中..." : "📖 リプレイ小説を出力"}
            </button>
          </div>
          <button onClick={saveToArchive} className="w-full mt-2 bg-amber-700 hover:bg-amber-600 px-4 py-3 rounded-lg text-sm font-bold text-white shadow transition flex items-center justify-center gap-2">
            👑 プレイ書庫(マイページ)に保存する
          </button>
          <p className="text-[10px] text-slate-500 text-center">※退室後もマイページからいつでも出力できます。</p>
        </div>

        {coPlayers.length > 0 && (
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-lg mt-6">
            <h3 className="text-sm font-bold text-blue-400 mb-4 border-b border-slate-700 pb-2">🤝 一緒に遊んだプレイヤー</h3>
            <div className="flex flex-wrap gap-4">
              {coPlayers.map(p => (
                <div key={p.id} className="bg-slate-800 border border-slate-600 p-3 rounded-lg flex items-center gap-3 w-full sm:w-[calc(50%-0.5rem)]">
                  <img src={p.avatarUrl} className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition" onClick={() => openUserProfile(p.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white cursor-pointer hover:text-blue-300 truncate" onClick={() => openUserProfile(p.id)}>{p.handleName}</p>
                    {currentUser.friendIds?.includes(p.id) ? (
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded mt-1 inline-block">友達登録済み</span>
                    ) : (
                      <button onClick={() => addFriend(p.id)} className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded shadow mt-1 transition">＋ 友達に追加</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={submitEvaluation} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 text-lg">
          評価を送信してロビーに戻る
        </button>
      </div>
    </div>
  );
}