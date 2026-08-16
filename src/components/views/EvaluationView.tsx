import React, { useState } from "react";
import { Room, Message } from "../../types";

type Props = {
  activeRoom: Room;
  messages: Message[];
  ratingScenario: number;
  setRatingScenario: React.Dispatch<React.SetStateAction<number>>;
  ratingGM: number;
  setRatingGM: React.Dispatch<React.SetStateAction<number>>;
  submitEvaluation: () => Promise<void>;
  exportToPDF: (type: 'chat' | 'summary' | 'novel', selectedImages?: string[]) => Promise<void>;
  isExporting: boolean;
  saveToArchive: () => Promise<void>; // ★ 追加
};

export default function EvaluationView({
  activeRoom, messages, ratingScenario, setRatingScenario, ratingGM, setRatingGM, submitEvaluation, exportToPDF, isExporting, saveToArchive
}: Props) {
  const [showNovelModal, setShowNovelModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const availableImages: string[] = [];
  if (activeRoom.scenario?.imageUrl) availableImages.push(activeRoom.scenario.imageUrl);
  activeRoom.scenario?.presetCharacters.forEach(c => { if(c.imageUrl) availableImages.push(c.imageUrl); });
  messages.filter(m => m.type === 'image' && m.imageUrl).forEach(m => availableImages.push(m.imageUrl!));
  
  const uniqueImages = Array.from(new Set(availableImages));

  const handleToggleImage = (url: string) => {
    if (selectedImages.includes(url)) {
      setSelectedImages(selectedImages.filter(i => i !== url));
    } else {
      setSelectedImages([...selectedImages, url]);
    }
  };

  const handleNovelExport = () => {
    setShowNovelModal(false);
    exportToPDF('novel', selectedImages);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full relative">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full shadow-2xl space-y-6 text-center">
        <h2 className="text-3xl font-extrabold text-amber-400 mb-2">🎉 セッションクリア！</h2>
        <p className="text-slate-300 mb-6">お疲れ様でした！このシナリオとGM（システム）の評価をお願いします。</p>

        <div className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-700">
          <div>
            <label className="text-sm text-amber-200 block mb-2 font-bold">シナリオの評価（星1〜5）</label>
            <div className="flex justify-center gap-2 text-2xl">
              {[1, 2, 3, 4, 5].map(num => (
                <button key={num} onClick={() => setRatingScenario(num)} className={`${ratingScenario >= num ? 'text-amber-400' : 'text-slate-600'} hover:text-amber-300 transition-colors`}>★</button>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-700/50">
            <label className="text-sm text-emerald-300 block mb-2 font-bold">GM (進行システム) の評価（星1〜5）</label>
            <div className="flex justify-center gap-2 text-2xl">
              {[1, 2, 3, 4, 5].map(num => (
                <button key={num} onClick={() => setRatingGM(num)} className={`${ratingGM >= num ? 'text-emerald-400' : 'text-slate-600'} hover:text-emerald-300 transition-colors`}>★</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={submitEvaluation} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 text-lg">評価を送信してロビーに戻る</button>

        <div className="border-t border-slate-700 pt-6 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-400">💾 記録を残す (PDF出力・書庫保存)</h3>
            {/* ★ マイページ保存用ボタン */}
            <button onClick={saveToArchive} className="text-xs bg-amber-600/20 text-amber-400 border border-amber-500/50 hover:bg-amber-600/40 px-3 py-1.5 rounded font-bold transition-colors">
              👑 書庫に保存 (Premium)
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => exportToPDF('chat')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded shadow text-xs font-bold transition-colors">💬 チャットログ</button>
            <button onClick={() => exportToPDF('summary')} disabled={isExporting} className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 text-white py-2 rounded shadow text-xs font-bold transition-colors">{isExporting ? '⏳ 生成中...' : '📝 あらすじ要約'}</button>
            <button onClick={() => { if(uniqueImages.length > 0) { setShowNovelModal(true); } else { exportToPDF('novel'); } }} disabled={isExporting} className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-700 text-white py-2 rounded shadow text-xs font-bold transition-colors">{isExporting ? '⏳ 生成中...' : '📖 リプレイ小説'}</button>
          </div>
        </div>
      </div>

      {showNovelModal && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-purple-500/50 rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <h3 className="text-xl font-bold text-purple-400 mb-2">🖼️ 小説に挿入する画像を選択</h3>
            <p className="text-xs text-slate-300 mb-4">リプレイ小説の中に挿絵として表示したい画像を選んでください（複数選択可）。</p>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 mb-4 pr-2">
              {uniqueImages.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleToggleImage(img)}
                  className={`relative cursor-pointer border-2 rounded-lg overflow-hidden ${selectedImages.includes(img) ? 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'border-slate-700 opacity-70 hover:opacity-100'}`}
                >
                  <img src={img} className="w-full h-32 object-cover" />
                  {selectedImages.includes(img) && (
                    <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs font-bold px-1.5 rounded-full">✓</div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-auto">
              <button onClick={() => setShowNovelModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold text-white">キャンセル</button>
              <button onClick={handleNovelExport} className="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded text-sm font-bold text-white shadow-lg">小説を生成する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}