import React from "react";

type Props = {
  novelSettingsModal: any;
  setNovelSettingsModal: React.Dispatch<React.SetStateAction<any>>;
  handleStartNovel: () => Promise<void>;
  isTicketSystemEnabled: boolean;
};

export default function NovelSettingsModal({ 
  novelSettingsModal, setNovelSettingsModal, handleStartNovel, isTicketSystemEnabled 
}: Props) {
  if (!novelSettingsModal) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-emerald-700/50 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold text-emerald-400 mb-4">📖 小説の執筆設定</h3>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs text-slate-400 block mb-1">文体（トーン）</label>
            <select 
              value={novelSettingsModal.options?.tone || 'light'} 
              onChange={(e) => setNovelSettingsModal({...novelSettingsModal, options: {...novelSettingsModal.options, tone: e.target.value}})} 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            >
              <option value="light">ライトノベル風（会話多め・テンポ重視）</option>
              <option value="literature">純文学風（情景・心理描写を重厚に）</option>
              <option value="hardboiled">ハードボイルド風（渋く簡潔な表現）</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">使用するAIモデル</label>
            <select 
              value={novelSettingsModal.aiModel} 
              onChange={(e) => setNovelSettingsModal({...novelSettingsModal, aiModel: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            >
              <option value="lite">🟤 Gemini Flash Lite {isTicketSystemEnabled ? "(消費: ブロンズチケット 1枚)" : "(無料)"}</option>
              <option value="flash">⚪ Gemini Flash {isTicketSystemEnabled ? "(消費: シルバーチケット 1枚)" : "(無料)"}</option>
              <option value="pro">🟡 Gemini Pro {isTicketSystemEnabled ? "(消費: ゴールドチケット 1枚)" : "(無料)"}</option>
              <option value="claude">🟣 Claude 3.5 Sonnet {isTicketSystemEnabled ? "(消費: プラチナチケット 1枚)" : "(無料)"}</option>
              <option value="opus">💎 Claude 3 Opus {isTicketSystemEnabled ? "(消費: ダイヤモンドチケット 1枚)" : "(無料)"}</option>
            </select>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setNovelSettingsModal(null)} 
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold"
          >
            キャンセル
          </button>
          <button 
            onClick={handleStartNovel} 
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded text-sm font-bold shadow-lg"
          >
            執筆開始
          </button>
        </div>
      </div>
    </div>
  );
}