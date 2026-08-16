import React, { useState } from "react";
import { ViewState, Scenario, Character } from "../../types";
import { generateAITextWithPrompt } from "../../lib/ai";

type Props = {
  editingScenario: Scenario;
  setEditingScenario: React.Dispatch<React.SetStateAction<Scenario | null>>;
  editingCharIndex: number | null;
  setEditingCharIndex: React.Dispatch<React.SetStateAction<number | null>>;
  saveScenario: () => Promise<void>;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
};

export default function ScenarioEditView({ editingScenario, setEditingScenario, editingCharIndex, setEditingCharIndex, saveScenario, setCurrentView }: Props) {
  const [activeTab, setActiveTab] = useState<'basic' | 'characters' | 'plot'>('basic');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  const updateScenario = (key: keyof Scenario, value: any) => setEditingScenario({ ...editingScenario, [key]: value });

  const addCharacter = () => {
    const newChar: Character = { id: `c_${Date.now()}`, name: "", job: "", genderOrRace: "", personality: "", imageUrl: "", hp: 10, san: 50, str: 10, dex: 10, int: 10, con: 10, wis: 10, cha: 10, items: "" };
    updateScenario('presetCharacters', [...editingScenario.presetCharacters, newChar]);
    setEditingCharIndex(editingScenario.presetCharacters.length);
  };

  const updateCharacter = (index: number, key: keyof Character, value: any) => {
    const newChars = [...editingScenario.presetCharacters];
    newChars[index] = { ...newChars[index], [key]: value };
    updateScenario('presetCharacters', newChars);
  };

  const removeCharacter = (index: number) => {
    const newChars = [...editingScenario.presetCharacters];
    newChars.splice(index, 1);
    updateScenario('presetCharacters', newChars);
    setEditingCharIndex(null);
  };

  // ★ 画像アップロード処理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, onComplete: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onComplete(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ★ AI画像生成処理（共通）
  const generateImage = async (promptSource: string, onComplete: (url: string) => void) => {
    setIsGeneratingImg(true);
    try {
      const translationPrompt = [
        "以下の日本語の設定から、画像生成AI用のカンマ区切りの英語プロンプトを作成してください。",
        "【絶対条件】",
        "・文章ではなく、英単語のカンマ区切りで出力してください。",
        "・不適切な画像を防ぐため最後に「SFW, masterpiece, high quality」を含めること。",
        "",
        "設定：",
        promptSource
      ].join('\n');

      let englishPrompt = "";
      try {
        englishPrompt = await generateAITextWithPrompt(translationPrompt);
      } catch(err) {
        englishPrompt = "SFW, masterpiece, high quality";
      }
      
      const prompt = encodeURIComponent(englishPrompt);
      const seed = Math.floor(Math.random() * 100000);
      const url = `https://image.pollinations.ai/prompt/${prompt}?nologo=true&seed=${seed}&safe=true`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network error");
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        onComplete(reader.result as string);
        setIsGeneratingImg(false);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      alert("画像生成に失敗しました。時間をおいて再試行してください。");
      setIsGeneratingImg(false);
    }
  };

  // パッケージ画像のAI生成
  const handleAIGenerateScenarioImage = () => {
    if (!editingScenario.title) {
      alert("タイトルを入力してから生成してください。");
      return;
    }
    const source = `TRPGシナリオのパッケージ画像。タイトル: ${editingScenario.title}, 世界観: ${editingScenario.setting || "不気味でミステリアス"}, 文字は不要。`;
    generateImage(source, (url) => updateScenario('imageUrl', url));
  };

  // キャラクター画像のAI生成
  const handleAIGenerateCharacterImage = (index: number) => {
    const char = editingScenario.presetCharacters[index];
    if (!char.name) {
      alert("キャラクター名を入力してから生成してください。");
      return;
    }
    const source = `キャラクターの立ち絵 portrait。名前: ${char.name}, 職業: ${char.job}, 特徴: ${char.personality}, ${char.genderOrRace || ""}`;
    generateImage(source, (url) => updateCharacter(index, 'imageUrl', url));
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full min-h-0 relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-emerald-400">📝 シナリオ作成・編集</h2>
        <button onClick={() => setCurrentView("lobby")} className="text-sm bg-slate-700 px-4 py-2 rounded font-bold hover:bg-slate-600 transition-colors">キャンセル</button>
      </div>

      <div className="flex gap-2 border-b border-slate-700 mb-4">
        <button onClick={() => setActiveTab('basic')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'basic' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>基本設定</button>
        <button onClick={() => setActiveTab('characters')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'characters' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}>キャラクター ({editingScenario.presetCharacters.length})</button>
        <button onClick={() => setActiveTab('plot')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'plot' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-white'}`}>シナリオ本文設定</button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">タイトル <span className="text-red-400">*</span></label>
              <input type="text" value={editingScenario.title || ""} onChange={e=>updateScenario('title', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
            </div>

            {/* ★ パッケージ画像設定枠の復元 */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">パッケージ画像URL / アップロード</label>
              <div className="flex gap-2">
                <input type="text" value={editingScenario.imageUrl || ""} onChange={e=>updateScenario('imageUrl', e.target.value)} placeholder="https:// または アップロード" className="flex-1 bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                <label className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-xs font-bold cursor-pointer flex items-center justify-center transition-colors">
                  📁 PCから
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => updateScenario('imageUrl', url))} />
                </label>
                <button onClick={handleAIGenerateScenarioImage} disabled={isGeneratingImg} className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 px-3 py-2 rounded text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1">
                  {isGeneratingImg ? "⏳ 生成中..." : "✨ AI生成"}
                </button>
              </div>
              {editingScenario.imageUrl && <img src={editingScenario.imageUrl} className="mt-2 w-32 h-32 object-cover rounded border border-slate-600 shadow-md" />}
            </div>

            <div className="flex gap-4">
              <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">目安プレイ時間 (分)</label><input type="number" value={editingScenario.playTime || 60} onChange={e=>updateScenario('playTime', parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" /></div>
              <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">販売価格 (pt)</label><input type="number" value={editingScenario.price || 0} onChange={e=>updateScenario('price', parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" /></div>
            </div>
            
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
              <label className="text-xs text-slate-400 block mb-2 font-bold">このシナリオのデフォルトのアイテム表示設定</label>
              <select value={editingScenario.itemVisibility || "none"} onChange={e=>updateScenario('itemVisibility', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white">
                <option value="none">非表示</option>
                <option value="self">自分の所持品のみ表示</option>
                <option value="all">パーティー全員の所持品を表示</option>
              </select>
            </div>

            <div className="bg-slate-900/80 border border-slate-600 p-4 rounded-lg mt-4 space-y-4 shadow-lg">
              <label className="flex items-center gap-3 text-sm font-bold text-white cursor-pointer hover:text-blue-300 transition select-none">
                <input type="checkbox" checked={!!editingScenario.isPlayableByOthers} onChange={(e) => updateScenario('isPlayableByOthers', e.target.checked)} className="w-5 h-5 accent-blue-500 cursor-pointer" />
                🌍 他のプレイヤーがこのシナリオで部屋を作成して遊ぶことを許可する
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-pink-300 cursor-pointer hover:text-pink-200 transition select-none">
                <input type="checkbox" checked={!!editingScenario.isTrialOk} onChange={(e) => updateScenario('isTrialOk', e.target.checked)} className="w-5 h-5 accent-pink-500 cursor-pointer" />
                🌟 「お試しプレイ（導入のみ・他AI・無料）」を許可してロビーに公開する
              </label>
            </div>
          </div>
        )}

        {activeTab === 'characters' && (
          <div className="flex gap-4 h-full">
            <div className="w-1/3 bg-slate-800 border border-slate-700 rounded p-2 overflow-y-auto">
              {editingScenario.presetCharacters.map((c, idx) => (
                <div key={c.id} onClick={() => setEditingCharIndex(idx)} className={`p-2 rounded cursor-pointer mb-1 text-sm font-bold flex items-center justify-between ${editingCharIndex === idx ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-700'}`}>
                  <span>{c.name || "名称未設定"}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeCharacter(idx); }} className="text-red-400 hover:text-red-300 px-2">×</button>
                </div>
              ))}
              <button onClick={addCharacter} className="w-full mt-2 bg-slate-700 py-2 rounded text-xs font-bold hover:bg-slate-600">＋ 追加</button>
            </div>
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded p-4 overflow-y-auto custom-scrollbar">
              {editingCharIndex !== null && editingScenario.presetCharacters[editingCharIndex] ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">名前</label><input type="text" value={editingScenario.presetCharacters[editingCharIndex].name} onChange={e=>updateCharacter(editingCharIndex, 'name', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm" /></div>
                    <div className="flex-1"><label className="text-xs text-slate-400 block mb-1">職業</label><input type="text" value={editingScenario.presetCharacters[editingCharIndex].job} onChange={e=>updateCharacter(editingCharIndex, 'job', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm" /></div>
                  </div>

                  {/* ★ キャラクター画像設定枠の復元 */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">画像URL / アップロード</label>
                    <div className="flex gap-2">
                      <input type="text" value={editingScenario.presetCharacters[editingCharIndex].imageUrl} onChange={e=>updateCharacter(editingCharIndex, 'imageUrl', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm" />
                      <label className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-xs font-bold cursor-pointer flex items-center justify-center transition-colors">
                        📁 PCから
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => updateCharacter(editingCharIndex, 'imageUrl', url))} />
                      </label>
                      <button onClick={() => handleAIGenerateCharacterImage(editingCharIndex)} disabled={isGeneratingImg} className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 px-3 py-2 rounded text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1">
                        {isGeneratingImg ? "⏳ 生成中..." : "✨ AI生成"}
                      </button>
                    </div>
                    {editingScenario.presetCharacters[editingCharIndex].imageUrl && <img src={editingScenario.presetCharacters[editingCharIndex].imageUrl} className="mt-2 w-24 h-24 object-cover rounded border border-slate-600 shadow-md" />}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {['hp', 'san', 'str', 'dex', 'int', 'con'].map(stat => (
                      <div key={stat}><label className="text-[10px] text-slate-400 block mb-1 uppercase">{stat}</label><input type="number" value={(editingScenario.presetCharacters[editingCharIndex] as any)[stat]} onChange={e=>updateCharacter(editingCharIndex, stat as any, parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-center text-sm" /></div>
                    ))}
                  </div>
                  <div><label className="text-xs text-amber-400 block mb-1 font-bold">🎒 初期所持アイテム (コンマ区切り等で記載)</label><textarea value={editingScenario.presetCharacters[editingCharIndex].items || ""} onChange={e=>updateCharacter(editingCharIndex, 'items', e.target.value)} placeholder="例：スマートフォン, 財布, 懐中電灯" className="w-full h-16 bg-slate-900 border border-slate-700 rounded p-2 text-sm" /></div>
                  <div><label className="text-xs text-slate-400 block mb-1">性格・裏設定 (AIがロールプレイに使用)</label><textarea value={editingScenario.presetCharacters[editingCharIndex].personality} onChange={e=>updateCharacter(editingCharIndex, 'personality', e.target.value)} className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-2 text-sm" /></div>
                </div>
              ) : <div className="text-center text-slate-500 py-10">キャラクターを選択してください</div>}
            </div>
          </div>
        )}

        {activeTab === 'plot' && (
          <div className="space-y-6 pb-8">
            <div>
              <label className="text-sm text-slate-300 font-bold block mb-1">🌍 世界観・時代設定</label>
              <textarea value={editingScenario.setting || ""} onChange={e=>updateScenario('setting', e.target.value)} placeholder="例: 1920年代のアーカム。禁酒法時代の暗い街並み..." className="w-full h-20 bg-slate-800 border border-slate-700 rounded p-3 text-sm" />
            </div>
            
            <div className="border-l-4 border-emerald-500 pl-4">
              <label className="text-sm text-emerald-400 font-bold block mb-1">🎬 プロローグ (導入)</label>
              <p className="text-[10px] text-slate-400 mb-2">未入力の場合はAIが本編プロットから自動生成します。</p>
              <textarea value={editingScenario.prologue || ""} onChange={e=>updateScenario('prologue', e.target.value)} placeholder="探索者たちは古びた洋館の前に立っていた。扉は少しだけ開いている..." className="w-full h-32 bg-slate-800 border border-emerald-900/50 rounded p-3 text-sm" />
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <label className="text-sm text-blue-400 font-bold block mb-1">📜 本編プロット・真相・ギミック解法</label>
              <p className="text-[10px] text-slate-400 mb-2">AI GMが物語を進行させるための台本（プレイヤーには見えません）。エピローグはAIがここから展開を汲み取って自動生成します。</p>
              <textarea value={editingScenario.plot || ""} onChange={e=>updateScenario('plot', e.target.value)} placeholder="【真相】実は依頼人が犯人。2階の書斎にある日記を読むと事実が判明する..." className="w-full h-64 bg-slate-800 border border-blue-900/50 rounded p-3 text-sm" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
        <button onClick={saveScenario} disabled={!editingScenario.title} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 px-8 py-3 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95">保存してロビーに戻る</button>
      </div>
    </div>
  );
}