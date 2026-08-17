import React from "react";
import { ViewState, UserProfile, PlayArchive, Character, Scenario } from "../../types";

type Props = {
  currentUser: UserProfile;
  playArchives: PlayArchive[];
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  executeExport: (title: string, messages: any[], type: 'chat' | 'summary' | 'novel', options?: { archiveId?: string, modelName?: string, viewPoint?: 'third' | 'first', myCharacterName?: string, scenarioImage?: string, createdAt?: string, coPlayers?: string[], characters?: Character[] }) => Promise<void>;
  isExporting: boolean;
  allScenarios: Scenario[]; // ★ 追加
  openRoomConfigModal: (scenario: Scenario) => void; // ★ 追加
};

export default function LibraryView({ currentUser, playArchives, setCurrentView, executeExport, isExporting, allScenarios, openRoomConfigModal }: Props) {
  
  const readSavedNovel = (title: string, content: string, modelName: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert("ポップアップがブロックされました。ブラウザの設定をご確認ください。"); return; }
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} - リプレイ小説 (${modelName})</title></head><body>${content}</body></html>
    `);
    printWindow.document.close();
  };

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
          これまでに保存したすべてのプレイ履歴を閲覧し、当時のチャットログを出力したり、AIモデルや視点を選択してリプレイ小説を生成・保存することができます。
        </p>

        {playArchives.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-800 p-4 rounded text-center border border-slate-700/50">保存されたプレイ履歴はありません。</p>
        ) : (
          <div className="space-y-4">
            {playArchives.map(a => {
              const originScenario = allScenarios.find(s => s.id === a.scenarioId);
              const canPlay = originScenario && (!originScenario.isBanned) && (originScenario.isPlayableByOthers || originScenario.authorId === currentUser.id);

              return (
                <div key={a.id} className="bg-slate-800 border border-amber-700/50 p-4 rounded-xl flex flex-col md:flex-row gap-5 shadow-lg">
                  <img src={a.scenarioImage || "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=150&q=80"} className="w-24 h-24 object-cover rounded-lg hidden md:block border border-slate-600 shadow" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white text-xl">{a.scenarioTitle}</h4>
                        {canPlay && (
                          <button onClick={() => openRoomConfigModal(originScenario)} className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded shadow font-bold text-white transition-colors">
                            ✨ 部屋を作る
                          </button>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1 mb-3">
                        <span className="bg-slate-900 px-2 py-1 rounded">📅 {new Date(a.createdAt).toLocaleString()}</span>
                        <span className="bg-slate-900 px-2 py-1 rounded">🎲 {a.rule === 'coc_jp' ? 'CoC日本卓' : a.rule === 'dnd' ? 'D&D' : a.rule === 'sw25' ? 'SW2.5' : a.rule === 'storytelling' ? 'ストテリ' : a.rule === 'coc_en' ? 'CoC海外版' : '不明'}</span>
                        <span className="bg-slate-900 px-2 py-1 rounded">👤 参加HN: {a.coPlayers && a.coPlayers.length > 0 ? a.coPlayers.join(", ") : "ソロプレイ"}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 border-t border-slate-700 pt-3">
                      <p className="text-[10px] text-slate-400 mb-2">▼ 出力・生成メニュー</p>
                      <div className="flex flex-col gap-3">
                        <div>
                          <button onClick={() => executeExport(`${a.scenarioTitle}_chat`, a.chatLogs, 'chat')} disabled={isExporting} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded transition border border-slate-600 shadow">💬 チャットログ出力</button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-emerald-400 w-20 font-bold">第三者視点:</span>
                          <button onClick={() => executeExport(`${a.scenarioTitle}_novel`, a.chatLogs, 'novel', { archiveId: a.id, modelName: 'Gemini (第三者視点)', viewPoint: 'third', scenarioImage: a.scenarioImage, createdAt: a.createdAt, coPlayers: a.coPlayers, characters: a.characters })} disabled={isExporting} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition shadow disabled:opacity-50">Gemini</button>
                          <button onClick={() => executeExport(`${a.scenarioTitle}_novel`, a.chatLogs, 'novel', { archiveId: a.id, modelName: 'Gemini Pro (第三者視点)', viewPoint: 'third', scenarioImage: a.scenarioImage, createdAt: a.createdAt, coPlayers: a.coPlayers, characters: a.characters })} disabled={isExporting} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition shadow disabled:opacity-50">Gemini Pro</button>
                          <button onClick={() => executeExport(`${a.scenarioTitle}_novel`, a.chatLogs, 'novel', { archiveId: a.id, modelName: 'Claude (第三者視点)', viewPoint: 'third', scenarioImage: a.scenarioImage, createdAt: a.createdAt, coPlayers: a.coPlayers, characters: a.characters })} disabled={isExporting} className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded transition shadow disabled:opacity-50">Claude</button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-amber-400 w-20 font-bold leading-tight">自分視点<br/><span className="font-normal text-slate-400">({a.characterName})</span>:</span>
                          <button onClick={() => executeExport(`${a.scenarioTitle}_novel`, a.chatLogs, 'novel', { archiveId: a.id, modelName: 'Gemini (自分視点)', viewPoint: 'first', myCharacterName: a.characterName, scenarioImage: a.scenarioImage, createdAt: a.createdAt, coPlayers: a.coPlayers, characters: a.characters })} disabled={isExporting} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition shadow disabled:opacity-50">Gemini</button>
                          <button onClick={() => executeExport(`${a.scenarioTitle}_novel`, a.chatLogs, 'novel', { archiveId: a.id, modelName: 'Gemini Pro (自分視点)', viewPoint: 'first', myCharacterName: a.characterName, scenarioImage: a.scenarioImage, createdAt: a.createdAt, coPlayers: a.coPlayers, characters: a.characters })} disabled={isExporting} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition shadow disabled:opacity-50">Gemini Pro</button>
                          <button onClick={() => executeExport(`${a.scenarioTitle}_novel`, a.chatLogs, 'novel', { archiveId: a.id, modelName: 'Claude (自分視点)', viewPoint: 'first', myCharacterName: a.characterName, scenarioImage: a.scenarioImage, createdAt: a.createdAt, coPlayers: a.coPlayers, characters: a.characters })} disabled={isExporting} className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded transition shadow disabled:opacity-50">Claude</button>
                        </div>
                      </div>
                    </div>

                    {a.novels && Object.keys(a.novels).length > 0 && (
                      <div className="mt-3 bg-slate-900/50 p-3 rounded border border-emerald-700/50">
                        <p className="text-[10px] text-emerald-400 font-bold mb-2">▼ 書庫に保存済みの小説を読む</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(a.novels).map(model => (
                            <button key={model} onClick={() => readSavedNovel(a.scenarioTitle, a.novels![model], model)} className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded shadow font-bold text-white transition-colors">
                              📖 {model}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}