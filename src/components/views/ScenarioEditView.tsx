import React from "react";
import { Scenario, Character } from "../../types";

type Props = {
  editingScenario: Scenario;
  setEditingScenario: React.Dispatch<React.SetStateAction<Scenario | null>>;
  editingCharIndex: number | null;
  setEditingCharIndex: React.Dispatch<React.SetStateAction<number | null>>;
  saveScenario: () => Promise<void>;
  setCurrentView: (view: any) => void;
  allScenarios: Scenario[];
  generatePackageImage: (baseText: string, type: 'scenario' | 'character') => Promise<string | null>;
  isLoading: boolean; // ★ 追加：保存中のローディング状態
};

export default function ScenarioEditView({
  editingScenario, setEditingScenario, editingCharIndex, setEditingCharIndex,
  saveScenario, setCurrentView, allScenarios, generatePackageImage, isLoading
}: Props) {
  
  const handleCharChange = (field: keyof Character, value: any) => {
    if (editingCharIndex === null) return;
    const newChars = [...editingScenario.presetCharacters];
    newChars[editingCharIndex] = { ...newChars[editingCharIndex], [field]: value };
    setEditingScenario({ ...editingScenario, presetCharacters: newChars });
  };

  const editingChar = editingCharIndex !== null ? editingScenario.presetCharacters[editingCharIndex] : null;

  const getChapters = (): {title: string, content: string}[] => {
    if (!editingScenario.plot) return [{ title: "第1章: 導入", content: "" }];
    try {
      const parsed = JSON.parse(editingScenario.plot);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      return [{ title: "本編", content: editingScenario.plot }];
    }
    return [{ title: "第1章: 導入", content: "" }];
  };

  const chapters = getChapters();

  const updateChapter = (index: number, field: 'title' | 'content', value: string) => {
    const newChapters = [...chapters];
    newChapters[index][field] = value;
    setEditingScenario({ ...editingScenario, plot: JSON.stringify(newChapters) });
  };

  const addChapter = () => {
    const newChapters = [...chapters, { title: `第${chapters.length + 1}章`, content: "" }];
    setEditingScenario({ ...editingScenario, plot: JSON.stringify(newChapters) });
  };

  const removeChapter = (index: number) => {
    if (chapters.length <= 1) {
      alert("少なくとも1つの章は必要です。");
      return;
    }
    if (!confirm(`チャプター ${index + 1} を削除しますか？`)) return;
    const newChapters = chapters.filter((_, i) => i !== index);
    setEditingScenario({ ...editingScenario, plot: JSON.stringify(newChapters) });
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-emerald-400 mb-1">📝 シナリオ・クリエイター</h1>
          <p className="text-xs text-slate-400">新しい物語とキャラクターを設定します。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingScenario(null); setCurrentView("lobby"); }} disabled={isLoading} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm font-bold shadow transition-colors disabled:opacity-50">キャンセル</button>
          <button onClick={saveScenario} disabled={!editingScenario.title || isLoading} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 px-4 py-2 rounded text-sm font-bold shadow transition-colors w-40 flex justify-center">
            {isLoading ? "⏳ 保存＆翻訳中..." : "保存する"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
        
        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">📖 基本情報</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">シナリオタイトル <span className="text-red-400">*</span></label>
                <input type="text" value={editingScenario.title} onChange={e=>setEditingScenario({...editingScenario, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" placeholder="例：狂気山脈の影" />
              </div>
              
              <div>
                <label className="text-xs text-slate-400 block mb-1">公開用紹介文・あらすじ <span className="text-emerald-400">※ネタバレなし</span></label>
                <textarea value={editingScenario.description || ""} onChange={e=>setEditingScenario({...editingScenario, description: e.target.value})} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white resize-none" placeholder="ロビー画面でプレイヤー向けに表示される紹介文です。ネタバレを含まないあらすじを入力してください。" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-1">システム / ルール</label>
                  <input type="text" value={editingScenario.system} onChange={e=>setEditingScenario({...editingScenario, system: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" placeholder="例：CoC第6版" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-1">想定プレイ時間（分）</label>
                  <input type="number" value={editingScenario.playTime || 60} onChange={e=>setEditingScenario({...editingScenario, playTime: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">パッケージ画像URL</label>
                <div className="flex gap-2">
                  <input type="text" value={editingScenario.imageUrl} onChange={e=>setEditingScenario({...editingScenario, imageUrl: e.target.value})} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" placeholder="https://..." />
                  <button onClick={async () => { 
                    if(!editingScenario.plot && !editingScenario.description) { alert("先に「あらすじ」か「プロット」を入力してください。"); return; }
                    const baseText = editingScenario.description || editingScenario.plot;
                    const url = await generatePackageImage(baseText, 'scenario'); 
                    if(url) setEditingScenario({...editingScenario, imageUrl: url}); 
                  }} className="bg-purple-600 hover:bg-purple-500 text-white px-3 rounded text-xs font-bold whitespace-nowrap shadow-lg">
                    ✨ AI生成
                  </button>
                </div>
                {editingScenario.imageUrl && <img src={editingScenario.imageUrl} className="mt-2 h-32 object-cover rounded border border-slate-700" alt="プレビュー" />}
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-blue-400 mb-4 border-b border-slate-700 pb-2">🌍 多言語対応 (グローバル展開)</h2>
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                海外のプレイヤーがロビーでシナリオ内容を読めるように、<strong className="text-emerald-400">保存時に自動でタイトル・あらすじ・キャラクター設定が英語・中国語に翻訳されます。</strong><br/>
                <span className="text-[10px] text-slate-500">（※AI GM用の裏側プロットは翻訳不要です。日本語のままAIが理解して外国語でセッションを回します）</span>
              </p>
              <div className="flex items-center gap-4 bg-slate-900 p-3 rounded border border-slate-700">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">翻訳ステータス</p>
                  <p className="text-xs mt-1">
                    {editingScenario.translationEn && Object.keys(editingScenario.translationEn).length > 0
                      ? <span className="text-emerald-400 font-bold">✅ 英語・中国語の翻訳データあり</span>
                      : <span className="text-slate-500 font-bold">未翻訳（保存時に実行されます）</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">🗺️ 世界観とプロット <span className="text-xs text-red-400 font-normal">※AI（GM）専用</span></h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">世界観・背景設定</label>
                <textarea value={editingScenario.setting} onChange={e=>setEditingScenario({...editingScenario, setting: e.target.value})} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white resize-none" placeholder="時代背景や舞台となる場所の説明..." />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-slate-400 block">プロット・真相（章立て） <span className="text-red-400">*</span></label>
                  <button onClick={addChapter} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-[10px] text-white font-bold shadow transition-colors border border-slate-500">
                    ＋ 章を追加
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mb-3">※AI GMが進行するための台本になります。物語の始まりから結末まで、チャプターごとに区切って詳細に書いてください。</p>
                
                <div className="space-y-3">
                  {chapters.map((chap, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-slate-700 p-3 rounded-lg flex flex-col gap-2 relative shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                          <span className="bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/50">Chapter {idx + 1}</span>
                        </span>
                        {chapters.length > 1 && (
                          <button onClick={() => removeChapter(idx)} className="text-[10px] text-red-400 hover:text-red-300 bg-red-900/20 px-2 py-1 rounded border border-red-900/50 transition-colors">
                            削除
                          </button>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={chap.title} 
                        onChange={e => updateChapter(idx, 'title', e.target.value)} 
                        placeholder="章のタイトル (例: 館への到着)" 
                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white font-bold" 
                      />
                      <textarea 
                        value={chap.content} 
                        onChange={e => updateChapter(idx, 'content', e.target.value)} 
                        rows={5} 
                        placeholder="この章で起こる出来事、NPCの振る舞い、判定の指示などを詳細に記載してください。" 
                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white resize-none leading-relaxed" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 mt-2">プロローグ（導入の読み上げテキスト）</label>
                <textarea value={editingScenario.prologue} onChange={e=>setEditingScenario({...editingScenario, prologue: e.target.value})} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white resize-none" placeholder="セッション開始時にGMが読み上げる情景描写..." />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">登場NPCリスト</label>
                <textarea value={editingScenario.npcList} onChange={e=>setEditingScenario({...editingScenario, npcList: e.target.value})} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white resize-none" placeholder="NPCの名前と役割・性格などを箇条書きで..." />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">⚙️ 公開設定</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editingScenario.isPlayableByOthers || false} onChange={e=>setEditingScenario({...editingScenario, isPlayableByOthers: e.target.checked})} className="w-4 h-4" />
                他のユーザーにもこのシナリオのプレイを許可する（公開する）
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-pink-300">
                <input type="checkbox" checked={editingScenario.isTrialOk || false} onChange={e=>setEditingScenario({...editingScenario, isTrialOk: e.target.checked})} className="w-4 h-4 accent-pink-500" />
                「お試しプレイ（無料体験版）」の対象シナリオにする
              </label>
              
              <div className="pt-2">
                <label className="text-xs text-slate-400 block mb-1">前提シナリオ（続編の場合）</label>
                <select value={editingScenario.requiredScenarioId || ""} onChange={e=>setEditingScenario({...editingScenario, requiredScenarioId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
                  <option value="">なし（単独でプレイ可能）</option>
                  {allScenarios.filter(s => s.id !== editingScenario.id).map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：キャラクター設定 */}
        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
              <h2 className="text-lg font-bold text-blue-400">👥 プリセットキャラクター</h2>
              <button onClick={() => {
                setEditingScenario({
                  ...editingScenario,
                  presetCharacters: [...editingScenario.presetCharacters, { id: `char_${Date.now()}`, name: "新規キャラクター", job: "探索者", personality: "", imageUrl: "", hp: 10, san: 50, str: 10, dex: 10, int: 10, con: 10, wis: 10, cha: 10 }]
                });
                setEditingCharIndex(editingScenario.presetCharacters.length);
              }} className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-xs font-bold shadow">
                ＋ 追加
              </button>
            </div>

            {editingScenario.presetCharacters.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">キャラクターが設定されていません。</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {editingScenario.presetCharacters.map((c, idx) => (
                  <div key={c.id} onClick={() => setEditingCharIndex(idx)} className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center gap-3 ${editingCharIndex === idx ? 'bg-blue-900/30 border-blue-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                    <img src={c.imageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} className="w-10 h-10 rounded-full object-cover shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{c.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{c.job}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 選択中のキャラクター詳細編集 */}
            {editingChar && editingCharIndex !== null && (
              <div className="bg-slate-900 border border-slate-600 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white">キャラクター編集</h3>
                  <button onClick={() => {
                    if(!confirm("このキャラクターを削除しますか？")) return;
                    const newChars = [...editingScenario.presetCharacters];
                    newChars.splice(editingCharIndex, 1);
                    setEditingScenario({ ...editingScenario, presetCharacters: newChars });
                    setEditingCharIndex(null);
                  }} className="text-xs text-red-400 hover:text-red-300 underline">削除</button>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 block mb-1">名前</label>
                      <input type="text" value={editingChar.name} onChange={e=>handleCharChange('name', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 block mb-1">職業 / クラス</label>
                      <input type="text" value={editingChar.job} onChange={e=>handleCharChange('job', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 block mb-1">性別・種族</label>
                      <input type="text" value={editingChar.genderOrRace || ""} onChange={e=>handleCharChange('genderOrRace', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">アイコン画像URL</label>
                    <div className="flex gap-2">
                      <input type="text" value={editingChar.imageUrl} onChange={e=>handleCharChange('imageUrl', e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded p-1.5 text-sm" />
                      <button onClick={async () => { 
                        if(!editingChar.personality) { alert("先に「性格・背景設定」を入力してください。"); return; }
                        const url = await generatePackageImage(`名前:${editingChar.name}\n職業:${editingChar.job}\n性別:${editingChar.genderOrRace}\n設定:${editingChar.personality}`, 'character'); 
                        if(url) handleCharChange('imageUrl', url); 
                      }} className="bg-purple-600 hover:bg-purple-500 text-white px-2 rounded text-xs font-bold whitespace-nowrap shadow">
                        ✨ AI生成
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    <div><label className="text-[10px] text-red-400 block mb-1">HP</label><input type="number" value={editingChar.hp} onChange={e=>handleCharChange('hp', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-sm" /></div>
                    <div><label className="text-[10px] text-cyan-400 block mb-1">SAN</label><input type="number" value={editingChar.san} onChange={e=>handleCharChange('san', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-sm" /></div>
                    <div><label className="text-[10px] text-slate-400 block mb-1">STR</label><input type="number" value={editingChar.str} onChange={e=>handleCharChange('str', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-sm" /></div>
                    <div><label className="text-[10px] text-slate-400 block mb-1">DEX</label><input type="number" value={editingChar.dex} onChange={e=>handleCharChange('dex', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-sm" /></div>
                    <div><label className="text-[10px] text-slate-400 block mb-1">INT</label><input type="number" value={editingChar.int} onChange={e=>handleCharChange('int', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-sm" /></div>
                    <div><label className="text-[10px] text-slate-400 block mb-1">CON</label><input type="number" value={editingChar.con} onChange={e=>handleCharChange('con', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-center text-sm" /></div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">性格・背景設定・秘密</label>
                    <textarea value={editingChar.personality} onChange={e=>handleCharChange('personality', e.target.value)} rows={4} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white resize-none" placeholder="AI相棒として動く際のロールプレイ方針になります。" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">初期所持品</label>
                    <textarea value={editingChar.items || ""} onChange={e=>handleCharChange('items', e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white resize-none" placeholder="スマートフォン, 財布, 懐中電灯..." />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}