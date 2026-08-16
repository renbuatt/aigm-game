import React, { useState } from "react";
import { ViewState, Scenario, Character } from "../../types";
// ★ Geminiのテキスト生成機能を呼び出すために追加
import { generateAITextWithPrompt } from "../../lib/ai"; 

type Props = {
  editingScenario: Scenario;
  setEditingScenario: React.Dispatch<React.SetStateAction<Scenario | null>>;
  editingCharIndex: number | null;
  setEditingCharIndex: React.Dispatch<React.SetStateAction<number | null>>;
  saveScenario: () => Promise<void>;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
};

export default function ScenarioEditView({
  editingScenario, setEditingScenario, editingCharIndex, setEditingCharIndex, saveScenario, setCurrentView
}: Props) {

  const [isGenerating, setIsGenerating] = useState(false);

  // ★ 修正：入力した文字が即座に最新状態として保存されるようにする安全な更新関数
  const updateCharacter = (field: keyof Character, value: any) => {
    if (editingCharIndex === null) return;
    const newChars = [...editingScenario.presetCharacters];
    newChars[editingCharIndex] = { ...newChars[editingCharIndex], [field]: value };
    setEditingScenario({ ...editingScenario, presetCharacters: newChars });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isChar: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("ファイルサイズが大きすぎます。2MB以下の画像を選択してください。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      
      if (isChar && editingCharIndex !== null) {
        updateCharacter('imageUrl', base64String);
      } else {
        setEditingScenario({ ...editingScenario, imageUrl: base64String });
      }
    };
    reader.readAsDataURL(file);
    
    e.target.value = "";
  };

  const generateImageWithAI = async (basePrompt: string, isChar: boolean) => {
    setIsGenerating(true);
    try {
      // ★ 日本語のプロンプトをGeminiで安全な英語プロンプトに変換＆NSFW対策タグを強制付与
      const translationPrompt = `
以下の日本語の設定情報を、画像生成AI用のカンマ区切りの英語プロンプト（タグの羅列）に変換してください。
【絶対条件】
・文章ではなく、英単語のカンマ区切りで出力してください。
・性別が指定されている場合は、必ず「1boy, male」「1girl, female」「old man」など、画像生成AIが認識しやすいタグに変換してください。
・不適切な画像（裸、エロティック、グロテスク）が生成されるのを防ぐため、プロンプトの最後に必ず「SFW, fully clothed, decent, wearing clothes」を含めてください。

対象設定：
${basePrompt}
      `;

      let englishPrompt = "";
      try {
        englishPrompt = await generateAITextWithPrompt(translationPrompt);
      } catch (err) {
        // AIの翻訳に失敗した場合は元のテキスト＋安全タグを付与
        englishPrompt = `${basePrompt}, SFW, fully clothed`;
      }

      const styleKeywords = isChar 
        ? "anime style character portrait, highly detailed, dramatic lighting, TRPG, safe for work, masterpiece" 
        : "TRPG cover art, dark fantasy landscape, cinematic lighting, masterpiece, safe for work";
      
      const prompt = encodeURIComponent(`${englishPrompt}, ${styleKeywords}`);
      const seed = Math.floor(Math.random() * 100000);
      
      // ★ safe=true オプションも追加して二重でブロック
      const url = `https://image.pollinations.ai/prompt/${prompt}?nologo=true&seed=${seed}&safe=true`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("AIサーバーが混雑しています");
      const blob = await res.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        if (isChar && editingCharIndex !== null) {
          // ★ 修正：生成された画像も正しく即時反映
          const newChars = [...editingScenario.presetCharacters];
          newChars[editingCharIndex] = { ...newChars[editingCharIndex], imageUrl: base64data };
          setEditingScenario({ ...editingScenario, presetCharacters: newChars });
        } else {
          setEditingScenario({ ...editingScenario, imageUrl: base64data });
        }
        setIsGenerating(false);
      };
      reader.readAsDataURL(blob);

    } catch (error: any) {
      alert("画像の生成に失敗しました（AIサーバー混雑エラー等）。\n少し時間をおいて再度お試しください。");
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 max-w-6xl mx-auto w-full min-h-0 overflow-y-auto">
      <h2 className="text-2xl font-bold text-amber-400 mb-6 w-full">{editingScenario.id ? "シナリオ・セット編集" : "シナリオ・セット新規作成"}</h2>
      
      {editingCharIndex !== null ? (
        // ==========================================
        // キャラクター編集画面
        // ==========================================
        <div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4 shadow-2xl">
          <h3 className="text-lg font-bold text-emerald-400 mb-2 border-b border-slate-700 pb-2">キャラクター設定</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">名前</label>
              <input type="text" value={editingScenario.presetCharacters[editingCharIndex].name} onChange={(e) => updateCharacter('name', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">職業</label>
              <input type="text" value={editingScenario.presetCharacters[editingCharIndex].job} onChange={(e) => updateCharacter('job', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">性別・種族</label>
              <input type="text" value={editingScenario.presetCharacters[editingCharIndex].genderOrRace || ""} onChange={(e) => updateCharacter('genderOrRace', e.target.value)} placeholder="例：男性、エルフなど" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 relative">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-slate-400 block">キャラクター画像</label>
              
              <button 
                onClick={() => {
                  const char = editingScenario.presetCharacters[editingCharIndex!];
                  if (!char.name) { alert("先に「名前」を入力してください！"); return; }
                  // 即座に最新のデータが送られます
                  const promptStr = `${char.name}, ${char.genderOrRace ? char.genderOrRace + ', ' : ''}${char.job || ""}, ${char.personality || ""}`.slice(0, 150);
                  generateImageWithAI(promptStr, true);
                }}
                disabled={isGenerating}
                className="text-[10px] bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold px-3 py-1.5 rounded shadow-lg transition-colors"
              >
                {isGenerating ? "⏳ 生成中..." : "✨ AIで自動生成 (β版)"}
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleFileUpload(e, true)} 
                className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-4 file:border-0 file:rounded-lg file:text-xs file:font-bold file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 whitespace-nowrap">またはURL:</span>
                <input 
                  type="text" 
                  value={editingScenario.presetCharacters[editingCharIndex].imageUrl || ""} 
                  onChange={(e) => updateCharacter('imageUrl', e.target.value)} 
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] text-white" 
                  placeholder="https://..." 
                />
              </div>
              {editingScenario.presetCharacters[editingCharIndex].imageUrl && (
                <div className="mt-2">
                  <img src={editingScenario.presetCharacters[editingCharIndex].imageUrl} alt="プレビュー" className="w-20 h-20 object-cover rounded-xl border border-slate-500" />
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h4 className="text-xs font-bold text-amber-400 mb-3">ステータス設定</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><label className="text-[10px] text-slate-400 block mb-1">SAN (1〜100%)</label><input type="number" min="1" max="100" value={editingScenario.presetCharacters[editingCharIndex].san} onChange={(e) => updateCharacter('san', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
              <div><label className="text-[10px] text-slate-400 block mb-1">HP</label><input type="number" value={editingScenario.presetCharacters[editingCharIndex].hp} onChange={(e) => updateCharacter('hp', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
              <div><label className="text-[10px] text-slate-400 block mb-1">STR</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].str} onChange={(e) => updateCharacter('str', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
              <div><label className="text-[10px] text-slate-400 block mb-1">DEX</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].dex} onChange={(e) => updateCharacter('dex', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
              <div><label className="text-[10px] text-slate-400 block mb-1">INT</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].int} onChange={(e) => updateCharacter('int', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
              <div><label className="text-[10px] text-slate-400 block mb-1">CON</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].con} onChange={(e) => updateCharacter('con', Number(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
            </div>
          </div>
          
          <div>
            <label className="text-xs text-slate-400 block mb-1">性格・特徴 (ハンドアウト内容)</label>
            <textarea value={editingScenario.presetCharacters[editingCharIndex].personality} onChange={(e) => updateCharacter('personality', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-24" />
          </div>
          
          <button onClick={() => setEditingCharIndex(null)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg mt-2">キャラクター設定を確定して戻る</button>
        </div>
      ) : (
        // ==========================================
        // シナリオ編集（親）画面
        // ==========================================
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-bold text-amber-400 border-b border-slate-700 pb-2">基本設定</h3>
            
            <div>
              <label className="text-xs text-amber-200 block mb-1">シナリオタイトル</label>
              <input type="text" value={editingScenario.title} onChange={(e) => setEditingScenario({ ...editingScenario, title: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 relative">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-amber-200 block">パッケージ画像</label>
                
                <button 
                  onClick={() => {
                    if (!editingScenario.title) { alert("先に「シナリオタイトル」を入力してください！"); return; }
                    generateImageWithAI(`${editingScenario.title}, ${editingScenario.setting || ""}`.slice(0, 150), false);
                  }}
                  disabled={isGenerating}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold px-3 py-1.5 rounded shadow-lg transition-colors"
                >
                  {isGenerating ? "⏳ 生成中..." : "✨ AIで自動生成 (β版)"}
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileUpload(e, false)} 
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-4 file:border-0 file:rounded-lg file:text-xs file:font-bold file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">またはURL:</span>
                  <input 
                    type="text" 
                    value={editingScenario.imageUrl || ""} 
                    onChange={(e) => setEditingScenario({ ...editingScenario, imageUrl: e.target.value })} 
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] text-white" 
                    placeholder="https://..." 
                  />
                </div>
                {editingScenario.imageUrl && (
                  <div className="mt-2 flex justify-center bg-slate-950 rounded-xl border border-slate-500 overflow-hidden">
                    <img src={editingScenario.imageUrl} alt="パッケージプレビュー" className="w-full h-auto max-h-64 object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
              <div>
                <label className="text-[10px] text-amber-200 block mb-1">販売価格 (G)</label>
                <input type="number" min="0" value={editingScenario.price || 0} onChange={(e) => setEditingScenario({ ...editingScenario, price: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" />
              </div>
              <div>
                <label className="text-[10px] text-emerald-400 block mb-1">想定プレイ時間 (分)</label>
                <input type="number" min="10" step="10" value={editingScenario.playTime || 60} onChange={(e) => setEditingScenario({ ...editingScenario, playTime: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-bold" />
              </div>
            </div>

            <div>
              <label className="text-xs text-amber-200 block mb-1">世界観・設定</label>
              <textarea value={editingScenario.setting || ""} onChange={(e) => setEditingScenario({ ...editingScenario, setting: e.target.value })} className="w-full h-16 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white" />
            </div>
            
            <div>
              <label className="text-xs text-amber-200 block mb-1">NPC一覧</label>
              <textarea value={editingScenario.npcList || ""} onChange={(e) => setEditingScenario({ ...editingScenario, npcList: e.target.value })} className="w-full h-16 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white" />
            </div>
            
            <div>
              <label className="text-xs text-amber-200 block mb-1">プロット (AI GM用進行計画)</label>
              <textarea value={editingScenario.plot} onChange={(e) => setEditingScenario({ ...editingScenario, plot: e.target.value })} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <h3 className="text-lg font-bold text-emerald-400">専用キャラクター (HO)</h3>
                <button onClick={() => { const newChar: Character = { id: `c${Date.now()}`, name: "新規キャラ", job: "", genderOrRace: "", personality: "", imageUrl: "", hp: 10, san: 50, str: 10, dex: 10, int: 10, con: 10, wis: 10, cha: 10 }; setEditingScenario({ ...editingScenario, presetCharacters: [...editingScenario.presetCharacters, newChar] }); setEditingCharIndex(editingScenario.presetCharacters.length); }} className="text-xs bg-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded">＋ 追加</button>
              </div>
              <div className="space-y-3">
                {editingScenario.presetCharacters.map((char, idx) => (
                  <div key={char.id} className="flex items-center justify-between bg-slate-900 border border-slate-700 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      {char.imageUrl ? (
                        <img src={char.imageUrl} alt={char.name} className="w-10 h-10 object-cover rounded-full border border-slate-600" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 border border-slate-600 font-bold">No Img</div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-white">{char.name} <span className="text-xs font-normal text-slate-300">({char.job || "職業未設定"} / {char.genderOrRace || "性別未設定"})</span></p>
                        <p className="text-[10px] text-slate-400">HP:{char.hp} | SAN:{char.san}% | STR:{char.str} DEX:{char.dex} INT:{char.int}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingCharIndex(idx)} className="text-xs bg-slate-700 px-3 py-2 rounded text-white hover:bg-slate-600 transition-colors">編集</button>
                      <button 
                        onClick={() => {
                          if (confirm(`キャラクター「${char.name}」を削除しますか？`)) {
                            const newCharacters = editingScenario.presetCharacters.filter((_, i) => i !== idx);
                            setEditingScenario({ ...editingScenario, presetCharacters: newCharacters });
                          }
                        }} 
                        className="text-xs bg-red-900/50 px-3 py-2 rounded text-red-300 hover:bg-red-800/80 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setCurrentView("lobby")} className="flex-1 bg-slate-700 text-white font-semibold py-3 rounded-lg">キャンセル</button>
              <button onClick={saveScenario} className="flex-1 bg-amber-600 text-white font-semibold py-3 rounded-lg">保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}