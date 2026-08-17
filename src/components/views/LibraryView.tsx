import React from "react";
import { ViewState, UserProfile, PlayArchive } from "../../types";

type Props = {
  currentUser: UserProfile;
  playArchives: PlayArchive[];
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  executeExport: (title: string, messages: any[], type: 'chat' | 'summary' | 'novel', images?: string[]) => Promise<void>;
  isExporting: boolean;
};

export default function LibraryView({ currentUser, playArchives, setCurrentView, executeExport, isExporting }: Props) {
  return (
    <div className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full min-h-0 overflow-y-auto custom-scrollbar">
      <header className="mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
          <span className="text-3xl">👑</span> プレイ書庫 (Premium)
        </h2>
        <button onClick={() => setCurrentView("lobby")} className="text-sm bg-slate-700 px-4 py-2 rounded font-bold hover:bg-slate-600 transition-colors shadow">ロビーに戻る</button>
      </header>
      
      <div className="mb-8">
        <p className="text-sm text-slate-300 mb-6 bg-slate-800 p-4 rounded border border-slate-700">
          これまでに保存したすべてのプレイ履歴を閲覧し、当時のチャットログやリプレイ小説を出力することができます。
        </p>

        {playArchives.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-800 p-4 rounded text-center border border-slate-700/50">保存されたプレイ履歴はありません。</p>
        ) : (
          <div className="space-y-4">
            {playArchives.map(a => (
              <div key={a.id} className="bg-slate-800 border border-amber-700/50 p-4 rounded-xl flex flex-col sm:flex-row gap-5 shadow-lg">
                <img src={a.scenarioImage || "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=150&q=80"} className="w-24 h-24 object-cover rounded-lg hidden sm:block border border-slate-600 shadow" />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xl">{a.scenarioTitle}</h4>
                    <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1 mb-3">
                      <span className="bg-slate-900 px-2 py-1 rounded">📅 {new Date(a.createdAt).toLocaleString()}</span>
                      <span className="bg-slate-900 px-2 py-1 rounded">🎲 {a.rule === 'coc_jp' ? 'CoC日本卓' : a.rule === 'dnd' ? 'D&D' : a.rule === 'sw25' ? 'SW2.5' : a.rule === 'storytelling' ? 'ストテリ' : a.rule === 'coc_en' ? 'CoC海外版' : '不明'}</span>
                      <span className="bg-slate-900 px-2 py-1 rounded">👤 参加HN: {a.coPlayers && a.coPlayers.length > 0 ? a.coPlayers.join(", ") : "ソロプレイ"}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => executeExport(`${a.scenarioTitle}_chat`, a.chatLogs, 'chat')} disabled={isExporting} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-bold transition shadow border border-slate-600">💬 ログ出力</button>
                    <button onClick={() => executeExport(`${a.scenarioTitle}_novel`, a.chatLogs, 'novel', a.chatLogs.filter(m=>m.type==='image').map(m=>m.imageUrl!))} disabled={isExporting} className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded font-bold transition shadow disabled:opacity-50 border border-amber-500">📖 小説化して出力</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}