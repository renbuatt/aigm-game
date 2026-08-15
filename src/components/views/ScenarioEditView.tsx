import React from "react";
import { ViewState, Scenario, Character } from "../../types";

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
        const newC = [...editingScenario.presetCharacters];
        newC[editingCharIndex].imageUrl = base64String;
        setEditingScenario({ ...editingScenario, presetCharacters: newC });
      } else {
        setEditingScenario({ ...editingScenario, imageUrl: base64String });
      }
    };
    reader.readAsDataURL(file);
    
    e.target.value = "";
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">名前</label>
              <input type="text" value={editingScenario.presetCharacters[editingCharIndex].name} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].name = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">職業</label>
              <input type="text" value={editingScenario.presetCharacters[editingCharIndex].job} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].job = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <label className="text-xs text-slate-400 block mb-2">キャラクター画像</label>
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
                  onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].imageUrl = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} 
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
              <div><label className="text-[10px] text-slate-400 block mb-1">SAN (1〜100%)</label><input type="number" min="1" max="100" value={editingScenario.presetCharacters[editingCharIndex].san} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].san = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
              <div><label className="text-[10px] text-slate-400 block mb-1">HP</label><input type="number" value={editingScenario.presetCharacters[editingCharIndex].hp} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].hp = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
              <div><label className="text-[10px] text-slate-400 block mb-1">STR</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].str} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].str = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
              <div><label className="text-[10px] text-slate-400 block mb-1">DEX</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].dex} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].dex = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
              <div><label className="text-[10px] text-slate-400 block mb-1">INT</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].int} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].int = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
              <div><label className="text-[10px] text-slate-400 block mb-1">CON</label><input type="number" min="3" max="18" value={editingScenario.presetCharacters[editingCharIndex].con} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].con = Number(e.target.value); setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-sm text-white text-center" /></div>
            </div>
          </div>
          
          <div>
            <label className="text-xs text-slate-400 block mb-1">性格・特徴 (ハンドアウト内容)</label>
            <textarea value={editingScenario.presetCharacters[editingCharIndex].personality} onChange={(e) => { const newC = [...editingScenario.presetCharacters]; newC[editingCharIndex].personality = e.target.value; setEditingScenario({ ...editingScenario, presetCharacters: newC }); }} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white h-24" />
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

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <label className="text-xs text-amber-200 block mb-2">パッケージ画像</label>
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
                  <div className="mt-2">
                    <img src={editingScenario.imageUrl} alt="パッケージプレビュー" className="w-full h-32 object-cover rounded-xl border border-slate-500" />
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
                <button onClick={() => { const newChar: Character = { id: `c${Date.now()}`, name: "新規キャラ", job: "", personality: "", imageUrl: "", hp: 10, san: 50, str: 10, dex: 10, int: 10, con: 10, wis: 10, cha: 10 }; setEditingScenario({ ...editingScenario, presetCharacters: [...editingScenario.presetCharacters, newChar] }); setEditingCharIndex(editingScenario.presetCharacters.length); }} className="text-xs bg-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded">＋ 追加</button>
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
                        <p className="text-sm font-bold text-white">{char.name} ({char.job || "職業未設定"})</p>
                        <p className="text-[10px] text-slate-400">HP:{char.hp} | SAN:{char.san}% | STR:{char.str} DEX:{char.dex} INT:{char.int}</p>
                      </div>
                    </div>
                    {/* ★ 削除ボタンを追加 */}
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