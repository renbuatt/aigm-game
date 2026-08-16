import React, { useState } from "react";
import { ViewState, UserProfile, PlayArchive, Message } from "../../types";

type Props = {
  currentUser: UserProfile;
  playArchives: PlayArchive[];
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  executeExport: (title: string, sourceMessages: Message[], type: 'chat' | 'summary' | 'novel', selectedImages?: string[]) => Promise<void>;
  isExporting: boolean;
};

export default function MyPageView({ currentUser, playArchives, setCurrentView, executeExport, isExporting }: Props) {
  const [showNovelModal, setShowNovelModal] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<PlayArchive | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const handleToggleImage = (url: string) => {
    if (selectedImages.includes(url)) setSelectedImages(selectedImages.filter(i => i !== url));
    else setSelectedImages([...selectedImages, url]);
  };

  const openNovelModal = (archive: PlayArchive) => {
    const availableImages: string[] = [];
    if (archive.scenarioImage) availableImages.push(archive.scenarioImage);
    archive.chatLogs.filter(m => m.type === 'image' && m.imageUrl).forEach(m => availableImages.push(m.imageUrl!));
    const uniqueImages = Array.from(new Set(availableImages));
    
    if (uniqueImages.length > 0) {
       setSelectedArchive(archive);
       setSelectedImages([]);
       setShowNovelModal(true);
    } else {
       executeExport(archive.scenarioTitle, archive.chatLogs, 'novel');
    }
  };

  const executeNovelExport = () => {
    if (!selectedArchive) return;
    setShowNovelModal(false);
    executeExport(selectedArchive.scenarioTitle, selectedArchive.chatLogs, 'novel', selectedImages);
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-6xl mx-auto w-full min-h-0 overflow-y-auto">
      <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-amber-400 mb-1 flex items-center gap-2">
            👑 プレイ書庫 
            <span className="text-[10px] bg-amber-600/20 border border-amber-500/50 text-amber-300 px-2 py-1 rounded-full uppercase tracking-wider">Premium Feature</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">過去にプレイしたセッションの記録を保管し、いつでも「あらすじ要約」や「リプレイ小説」に出力できます。<br/>（※将来的に課金機能として提供予定です）</p>
        </div>
        <button onClick={() => setCurrentView("lobby")} className="text-sm text-slate-400 hover:text-white underline">← ロビーに戻る</button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playArchives.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-500 font-bold border border-dashed border-slate-700 rounded-xl bg-slate-900/50">
            保存されたプレイ記録がありません。<br/>セッション終了後の評価画面から「書庫に保存」を選択してください。
          </div>
        ) : playArchives.map(archive => (
          <div key={archive.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl flex flex-col hover:border-amber-500/50 transition-colors">
            <div className="h-32 bg-slate-900 relative">
              {archive.scenarioImage ? (
                <img src={archive.scenarioImage} className="w-full h-full object-cover opacity-60" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700 font-bold">No Image</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="font-bold text-white truncate text-lg">{archive.scenarioTitle}</h3>
                <p className="text-xs text-amber-300 font-bold">PL: {archive.characterName}</p>
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col justify-between gap-4 bg-slate-800">
              <p className="text-[10px] text-slate-500 text-right">保存日: {new Date(archive.createdAt).toLocaleDateString('ja-JP')}</p>
              
              <div className="space-y-2">
                <button onClick={() => executeExport(archive.scenarioTitle, archive.chatLogs, 'chat')} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-bold transition-colors">
                  💬 チャットログを出力
                </button>
                <button onClick={() => executeExport(archive.scenarioTitle, archive.chatLogs, 'summary')} disabled={isExporting} className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 text-white py-2 rounded text-xs font-bold transition-colors">
                  {isExporting ? '⏳ 生成中...' : '📝 あらすじ要約を生成'}
                </button>
                <button onClick={() => openNovelModal(archive)} disabled={isExporting} className="w-full bg-purple-700 hover:bg-purple-600 disabled:bg-slate-700 text-white py-2 rounded text-xs font-bold transition-colors shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                  {isExporting ? '⏳ 生成中...' : '📖 本格リプレイ小説を生成'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNovelModal && selectedArchive && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-purple-500/50 rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <h3 className="text-xl font-bold text-purple-400 mb-2">🖼️ 小説に挿入する画像を選択</h3>
            <p className="text-xs text-slate-300 mb-4">リプレイ小説の中に挿絵として表示したい画像を選んでください（複数選択可）。</p>
            
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 mb-4 pr-2">
              {Array.from(new Set([selectedArchive.scenarioImage, ...selectedArchive.chatLogs.filter(m => m.type === 'image' && m.imageUrl).map(m => m.imageUrl!)].filter(Boolean))).map((img, idx) => (
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
              <button onClick={executeNovelExport} className="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded text-sm font-bold text-white shadow-lg">小説を生成する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}