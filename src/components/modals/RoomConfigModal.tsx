import React from "react";

type Props = {
  config: any; // page.tsx の roomConfigModal ステート
  setConfig: (config: any) => void;
  closeModal: () => void;
  executeCreateRoom: () => void;
  isTicketSystemEnabled: boolean;
};

export default function RoomConfigModal({ 
  config, setConfig, closeModal, executeCreateRoom, isTicketSystemEnabled 
}: Props) {
  if (!config) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      {/* 修正1: flex-col と max-h-[90vh] を追加して、縦に並べつつ高さを画面の90%に制限 */}
      <div className="bg-slate-800 border border-emerald-700/50 rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* 修正2: タイトルが潰れないように shrink-0 を追加 */}
        <h3 className="text-xl font-bold text-emerald-400 mb-4 shrink-0">🚪 部屋の作成: {config.scenario?.title}</h3>
        
        {/* 修正3: フォーム部分に overflow-y-auto と flex-1 を追加して、ここだけスクロールさせる */}
        <div className="space-y-4 mb-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
          
          <div>
            <label className="text-xs text-slate-400 block mb-1">使用するキャラクター <span className="text-red-400">*</span></label>
            <select 
              value={config.charId || ""} 
              onChange={(e) => setConfig({...config, charId: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            >
              <option value="" disabled>選択してください</option>
              {config.scenario?.presetCharacters?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} ({c.job})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">AIモデル (GM) {isTicketSystemEnabled && <span className="text-amber-400 text-[10px]">※チケット消費</span>}</label>
            <select 
              value={config.aiModel || "lite"} 
              onChange={(e) => setConfig({...config, aiModel: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            >
              <option value="lite">🟤 ブロンズ (Flash Lite) {isTicketSystemEnabled ? "(1枚消費)" : "(無料)"}</option>
              <option value="flash">⚪ シルバー (Gemini Flash) {isTicketSystemEnabled ? "(1枚消費)" : "(無料)"}</option>
              <option value="pro">🟡 ゴールド (Gemini Pro) {isTicketSystemEnabled ? "(1枚消費)" : "(無料)"}</option>
              <option value="claude">🟣 プラチナ (Claude Sonnet) {isTicketSystemEnabled ? "(1枚消費)" : "(無料)"}</option>
              <option value="opus">💎 ダイヤモンド (Claude Opus) {isTicketSystemEnabled ? "(1枚消費)" : "(無料)"}</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">ゲームルール（システム）</label>
            <select 
              value={config.rule || "coc_jp"} 
              onChange={(e) => setConfig({...config, rule: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            >
              <option value="coc_jp">🟩 日本クトゥルフ風（ドラマ・探索重視 / 1d100）</option>
              <option value="coc_en">🟦 海外クトゥルフ風（シビア・ホラー / 1d100）</option>
              <option value="dnd">🟥 D&D風（ヒロイック・ファンタジー / 1d20）</option>
              <option value="sw25">🟨 ソードワールド風（明るい冒険 / 2d6）</option>
              <option value="storytelling">🟪 ストーリーテリング（文学的・演出重視 / 1d6）</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs text-slate-400 block mb-1">セッション進行言語（Language）</label>
            <select 
              value={config.language || "ja"} 
              onChange={(e) => setConfig({...config, language: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            >
              <option value="ja">🇯🇵 日本語 (Japanese)</option>
              <option value="en">🇺🇸 英語 (English)</option>
              <option value="zh">🇨🇳 中国語 (Simplified Chinese)</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs text-slate-400 block mb-1">難易度</label>
            <select 
              value={config.difficulty || "normal"} 
              onChange={(e) => setConfig({...config, difficulty: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            >
              <option value="beginner">⬜ 初心者（接待GM / 手取り足取り30分限定）</option>
              <option value="easy">🟩 簡単（やさしいGM / 判定が通りやすい）</option>
              <option value="normal">🟦 普通（標準GM / 一般的なバランス）</option>
              <option value="hard">🟧 難しい（厳しめGM / ヒント少なめ）</option>
              <option value="pro">🟥 プロ（本格派GM / ロストの危険あり）</option>
              <option value="oni">🟪 鬼（容赦ないGM / 死ぬ覚悟で挑むモード）</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">公開設定</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={config.privacy === 'open'} onChange={() => setConfig({...config, privacy: 'open'})} /> 🔓 オープン（誰でも観戦可能）
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={config.privacy === 'secret'} onChange={() => setConfig({...config, privacy: 'secret'})} /> 🔒 シークレット（IDを知る人のみ）
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">アイテム表示機能</label>
            <select 
              value={config.itemVisibility || "none"} 
              onChange={(e) => setConfig({...config, itemVisibility: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            >
              <option value="none">非表示</option>
              <option value="self">自分の所持品のみ表示</option>
              <option value="all">パーティー全員の所持品を表示</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 mt-2">ひとことメッセージ</label>
            <input 
              type="text" 
              value={config.message || ""} 
              onChange={(e) => setConfig({...config, message: e.target.value})} 
              placeholder="例：初心者歓迎！ゆっくり遊びましょう" 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" 
            />
          </div>
        </div>

        {/* 修正4: ボタンエリアが潰れないように shrink-0 を追加し、上に少し余白(pt-2)を設定 */}
        <div className="flex gap-4 shrink-0 pt-2 border-t border-slate-700">
          <button 
            onClick={closeModal} 
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold transition-colors"
          >
            キャンセル
          </button>
          <button 
            onClick={executeCreateRoom} 
            disabled={!config.charId} 
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg shadow-emerald-900/50 transition-colors"
          >
            作成して入室
          </button>
        </div>
      </div>
    </div>
  );
}