import React, { useState } from 'react';

type NovelSettingsModalProps = {
  novelSettingsModal: any;
  setNovelSettingsModal: (val: any) => void;
  handleStartNovel: (lang: string) => void;
  isTicketSystemEnabled: boolean;
};

export default function NovelSettingsModal({
  novelSettingsModal,
  setNovelSettingsModal,
  handleStartNovel,
  isTicketSystemEnabled
}: NovelSettingsModalProps) {
  const [selectedLang, setSelectedLang] = useState('ja');

  if (!novelSettingsModal) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-center p-4">
      <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl">
        <h3 className="font-bold text-xl mb-4 text-purple-400">📖 小説化（ノベル作成）</h3>
        
        <p className="text-sm text-slate-300 mb-6">
          AIがこれまでのチャットログを読み込み、一つの物語（小説）として再構成します。
          作成された小説は「プレイ書庫（Library）」に保存されます。
        </p>

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 mb-2">出力言語の選択</label>
          <select 
            value={selectedLang} 
            onChange={(e) => setSelectedLang(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
          >
            <option value="ja">🇯🇵 日本語 (Japanese)</option>
            <option value="en">🇺🇸 英語 (English)</option>
            <option value="zh">🇨🇳 中国語 (Simplified Chinese)</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setNovelSettingsModal(null)} 
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold transition-colors"
          >
            キャンセル
          </button>
          <button 
            onClick={() => {
              handleStartNovel(selectedLang);
              setNovelSettingsModal(null);
            }} 
            className="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-lg font-bold shadow-lg transition-colors"
          >
            作成を開始する
          </button>
        </div>
      </div>
    </div>
  );
}