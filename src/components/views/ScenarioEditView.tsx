import React, { useState } from "react";
import { ViewState, Scenario, Character } from "../../types";

type Props = {
  editingScenario: Scenario;
  setEditingScenario: React.Dispatch<React.SetStateAction<Scenario | null>>;
  editingCharIndex: number | null;
  setEditingCharIndex: React.Dispatch<React.SetStateAction<number | null>>;
  saveScenario: () => Promise<void>;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
};

export default function ScenarioEditView({ editingScenario, setEditingScenario, editingCharIndex, setEditingCharIndex, saveScenario, setCurrentView }: Props) {
  const [tab, setTab] = useState<'basic' | 'chars' | 'plot'>('basic');
  
  const initialChapters = (() => {
    try {
      const parsed = JSON.parse(editingScenario.plot);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch(e) {}
    return [{ title: "第1章", content: editingScenario.plot || "" }];
  })();

  const [chapters, setChapters] = useState<{title: string, content: string}[]>(initialChapters);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);

  const addChapter = () => {
    setChapters([...chapters, { title: `第${chapters.length + 1}章`, content: "" }]);
    setActiveChapterIndex(chapters.length);
  };

  const removeChapter = (index: number) => {
    if (chapters.length <= 1) return;
    const newChapters = chapters.filter((_, i) => i !== index);
    setChapters(newChapters);
    setActiveChapterIndex(Math.max(0, index - 1));
  };

  const updateChapterTitle = (index: number, newTitle: string) => {
    const newChapters = [...chapters];
    newChapters[index].title = newTitle;
    setChapters(newChapters);
  };

  const updateChapterContent = (index: number, newContent: string) => {
    const newChapters = [...chapters];
    newChapters[index].content = newContent;
    setChapters(newChapters);
  };

  const handleSave = () => {
    const finalPlotString = JSON.stringify(chapters);
    setEditingScenario(prev => prev ? { ...prev, plot: finalPlotString } : null);
    setTimeout(() => {
      saveScenario();
    }, 100);
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full min-h-0 overflow-y-auto custom-scrollbar">
      <header className="mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-emerald-400">📝 シナリオ作成エディタ</h2>
        <div className="flex gap-4">
          <button onClick={() => setCurrentView("lobby")} className="text-sm bg-slate-700 px-4 py-2 rounded font-bold hover:bg-slate-600 transition-colors">キャンセル</button>
          <button onClick={handleSave} className="text-sm bg-emerald-600 px-4 py-2 rounded font-bold hover:bg-emerald-500 shadow-lg text-white transition-colors">保存して戻る</button>
        </div>
      </header>

      <div className="flex gap-4 mb-6 border-b border-slate-700">
        <button onClick={() => setTab('basic')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${tab === 'basic' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>基本設定</button>
        <button onClick={() => setTab('chars')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${tab === 'chars' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}>キャラクター ({editingScenario.presetCharacters.length})</button>
        <button onClick={() => setTab('plot')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${tab === 'plot' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'}`}>シナリオ本文設定</button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-20">
        
        {tab === 'basic' && (
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">タイトル <span className="text-red-400">*</span></label>
                <input type="text" value={editingScenario.title} onChange={e=>setEditingScenario({...editingScenario, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-emerald-500 font-bold" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">推奨システム (例: CoC, D&D)</label>
                  <input type="text" value={editingScenario.system} onChange={e=>setEditingScenario({...editingScenario, system: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-emerald-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">タグ (カンマ区切り)</label>
                  <input type="text" value={editingScenario.tags} onChange={e=>setEditingScenario({...editingScenario, tags: e.target.value})} placeholder="ホラー, 現代日本, 初心者向け" className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-emerald-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">目安プレイ時間 (分)</label>
                  <input type="number" value={editingScenario.playTime || 60} onChange={e=>setEditingScenario({...editingScenario, playTime: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-emerald-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">カバー画像URL</label>
                  <input type="text" value={editingScenario.imageUrl} onChange={e=>setEditingScenario({...editingScenario, imageUrl: e.target.value})} placeholder="https://..." className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-emerald-500 text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg space-y-4">
              <h3 className="text-emerald-400 font-bold mb-2">📢 公開・公開設定</h3>
              <div className="grid grid-cols-1 gap-4">
                <label className="flex items-center gap-3 p-3 bg-slate-900 rounded border border-slate-700 cursor-pointer hover:border-blue-500 transition-colors">
                  <input type="checkbox" checked={editingScenario.isPlayableByOthers || false} onChange={e=>setEditingScenario({...editingScenario, isPlayableByOthers: e.target.checked})} className="w-5 h-5 accent-blue-500" />
                  <div>
                    <p className="font-bold text-sm text-white">ロビーに公開する</p>
                    <p className="text-[10px] text-slate-400">チェックを入れると、他のユーザーもこのシナリオで遊べるようになります。</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-900 rounded border border-slate-700 cursor-pointer hover:border-pink-500 transition-colors">
                  <input type="checkbox" checked={editingScenario.isTrialOk || false} onChange={e=>setEditingScenario({...editingScenario, isTrialOk: e.target.checked})} className="w-5 h-5 accent-pink-500" />
                  <div>
                    <p className="font-bold text-sm text-pink-200">お試しプレイ (無料広告枠) を許可する</p>
                    <p className="text-[10px] text-slate-400">チェックを入れると、未購入のユーザーでも広告視聴で導入部のみ遊べるようになります。</p>
                  </div>
                </label>
              </div>
              <div className="mt-4">
                <label className="text-xs text-slate-400 block mb-1">初期設定でのアイテム表示機能</label>
                <select value={editingScenario.itemVisibility || 'none'} onChange={e=>setEditingScenario({...editingScenario, itemVisibility: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white">
                  <option value="none">非表示</option>
                  <option value="self">自分の所持品のみ表示</option>
                  <option value="all">パーティー全員の所持品を表示</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">※部屋を立てる際にホストが変更することも可能です。</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'plot' && (
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <h3 className="font-bold text-blue-400 flex items-center gap-2 mb-2">🌍 世界観・舞台設定</h3>
              <p className="text-[10px] text-slate-400 mb-2">AIが状況を正しく描写するためのベースとなる設定です。</p>
              <textarea value={editingScenario.setting} onChange={e=>setEditingScenario({...editingScenario, setting: e.target.value})} className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:border-blue-500" placeholder="例: 1920年代のアーカム。禁酒法時代の暗い街並み..."></textarea>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-emerald-700/50 shadow-lg">
              <h3 className="font-bold text-emerald-400 flex items-center gap-2 mb-2">🎬 プロローグ (導入)</h3>
              <p className="text-[10px] text-slate-400 mb-2">未入力の場合はAIが本編プロットから自動生成します。</p>
              <textarea value={editingScenario.prologue} onChange={e=>setEditingScenario({...editingScenario, prologue: e.target.value})} className="w-full h-24 bg-slate-900 border border-emerald-900/50 rounded p-3 text-sm text-white focus:border-emerald-500" placeholder="探索者たちは古びた洋館の前に立っていた。扉は少しだけ開いている..."></textarea>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-amber-700/50 shadow-lg">
              <div className="flex justify-between items-end mb-4 border-b border-slate-700 pb-2">
                <div>
                  <h3 className="font-bold text-amber-400 flex items-center gap-2">📜 本編プロット・真相・ギミック解説</h3>
                  <p className="text-[10px] text-slate-400">AI GMが物語を進行させるための台本（プレイヤーには見えません）。</p>
                </div>
                <button onClick={addChapter} className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded font-bold shadow">
                  ＋ チャプターを追加
                </button>
              </div>

              <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
                {chapters.map((chap, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveChapterIndex(idx)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeChapterIndex === idx ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {chap.title || `チャプター ${idx + 1}`}
                  </button>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <input 
                    type="text" 
                    value={chapters[activeChapterIndex].title} 
                    onChange={(e) => updateChapterTitle(activeChapterIndex, e.target.value)}
                    placeholder="チャプターの見出し (例: 館の探索, 真相解明など)"
                    className="bg-transparent text-white font-bold text-lg border-b border-slate-600 focus:border-amber-500 outline-none w-2/3 pb-1"
                  />
                  <button 
                    onClick={() => removeChapter(activeChapterIndex)}
                    disabled={chapters.length <= 1}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    🗑️ このチャプターを削除
                  </button>
                </div>
                <textarea 
                  value={chapters[activeChapterIndex].content} 
                  onChange={(e) => updateChapterContent(activeChapterIndex, e.target.value)} 
                  className="w-full h-64 bg-transparent text-sm text-slate-200 outline-none resize-y" 
                  placeholder="このシーンで起きるイベント、NPCの行動、配置されているアイテムやギミックの解除方法などを詳細に記載してください。"
                ></textarea>
              </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-purple-700/50 shadow-lg">
              <h3 className="font-bold text-purple-400 flex items-center gap-2 mb-2">🎆 エピローグ (結末)</h3>
              <p className="text-[10px] text-slate-400 mb-2">未入力の場合はAIが本編の結末から自動生成します。</p>
              <textarea value={editingScenario.epilogue} onChange={e=>setEditingScenario({...editingScenario, epilogue: e.target.value})} className="w-full h-24 bg-slate-900 border border-purple-900/50 rounded p-3 text-sm text-white focus:border-purple-500" placeholder="こうして事件は幕を閉じた。しかし、あの影はまだどこかに..."></textarea>
            </div>
          </div>
        )}

        {tab === 'chars' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <p className="text-sm text-slate-300">プレイ可能なプリセットキャラクターを作成します。</p>
              <button onClick={() => {
                const newChar: Character = { id: `c_${Date.now()}`, name: "新規キャラクター", job: "職業", personality: "性格", imageUrl: "", hp: 10, san: 50, str: 10, dex: 10, int: 10, con: 10, wis: 10, cha: 10, items: "" };
                setEditingScenario({...editingScenario, presetCharacters: [...editingScenario.presetCharacters, newChar]});
                setEditingCharIndex(editingScenario.presetCharacters.length);
              }} className="text-xs bg-blue-600 px-3 py-1.5 rounded text-white font-bold hover:bg-blue-500">＋ キャラクター追加</button>
            </div>

            {editingCharIndex !== null ? (
              <div className="bg-slate-800 border border-blue-500 p-6 rounded-xl shadow-2xl relative">
                <button onClick={() => setEditingCharIndex(null)} className="absolute top-4 right-4 text-xs bg-slate-700 px-3 py-1 rounded">完了</button>
                <h3 className="text-blue-400 font-bold mb-4">キャラクター詳細編集</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">名前</label>
                    <input type="text" value={editingScenario.presetCharacters[editingCharIndex].name} onChange={e=>{
                      const chars = [...editingScenario.presetCharacters]; chars[editingCharIndex].name = e.target.value; setEditingScenario({...editingScenario, presetCharacters: chars});
                    }} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">職業・クラス</label>
                    <input type="text" value={editingScenario.presetCharacters[editingCharIndex].job} onChange={e=>{
                      const chars = [...editingScenario.presetCharacters]; chars[editingCharIndex].job = e.target.value; setEditingScenario({...editingScenario, presetCharacters: chars});
                    }} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">性別・種族</label>
                    <input type="text" value={editingScenario.presetCharacters[editingCharIndex].genderOrRace || ""} onChange={e=>{
                      const chars = [...editingScenario.presetCharacters]; chars[editingCharIndex].genderOrRace = e.target.value; setEditingScenario({...editingScenario, presetCharacters: chars});
                    }} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">初期所持アイテム</label>
                    <input type="text" value={editingScenario.presetCharacters[editingCharIndex].items || ""} onChange={e=>{
                      const chars = [...editingScenario.presetCharacters]; chars[editingCharIndex].items = e.target.value; setEditingScenario({...editingScenario, presetCharacters: chars});
                    }} placeholder="スマホ, 財布, 懐中電灯..." className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-400 block mb-1">性格・バックボーン</label>
                    <textarea value={editingScenario.presetCharacters[editingCharIndex].personality} onChange={e=>{
                      const chars = [...editingScenario.presetCharacters]; chars[editingCharIndex].personality = e.target.value; setEditingScenario({...editingScenario, presetCharacters: chars});
                    }} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white h-24" />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-3 md:grid-cols-6 gap-2 bg-slate-900 p-3 rounded border border-slate-700">
                    {['hp', 'san', 'str', 'dex', 'int', 'con'].map(stat => (
                       <div key={stat}>
                         <label className="text-[10px] text-slate-400 block uppercase">{stat}</label>
                         <input type="number" value={(editingScenario.presetCharacters[editingCharIndex] as any)[stat]} onChange={e=>{
                           const chars = [...editingScenario.presetCharacters]; (chars[editingCharIndex] as any)[stat] = Number(e.target.value); setEditingScenario({...editingScenario, presetCharacters: chars});
                         }} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-sm text-center text-white" />
                       </div>
                    ))}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-400 block mb-1">画像URL</label>
                    <input type="text" value={editingScenario.presetCharacters[editingCharIndex].imageUrl} onChange={e=>{
                      const chars = [...editingScenario.presetCharacters]; chars[editingCharIndex].imageUrl = e.target.value; setEditingScenario({...editingScenario, presetCharacters: chars});
                    }} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editingScenario.presetCharacters.map((char, index) => (
                  <div key={char.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex gap-4 items-center">
                    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-xs overflow-hidden">
                      {char.imageUrl ? <img src={char.imageUrl} className="w-full h-full object-cover" /> : "No Img"}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{char.name} <span className="text-[10px] text-slate-400 font-normal ml-1">({char.job})</span></p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setEditingCharIndex(index)} className="text-[10px] bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">編集</button>
                        <button onClick={() => {
                          const chars = [...editingScenario.presetCharacters]; chars.splice(index, 1); setEditingScenario({...editingScenario, presetCharacters: chars});
                        }} className="text-[10px] bg-red-900/50 text-red-300 px-2 py-1 rounded hover:bg-red-800/80">削除</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}