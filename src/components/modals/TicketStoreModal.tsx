import React from "react";
import { UserProfile } from "../../types";

type Props = {
  isOpen: boolean;
  closeModal: () => void;
  currentUser: UserProfile | null;
  adViewInfo: { count: number; date: string };
  openAdModalForPoints: () => void;
  exchangeTicketWithPoints: (type: 'bronze'|'item'|'silver'|'gold'|'platinum'|'diamond', cost: number) => void;
};

export default function TicketStoreModal({ 
  isOpen, closeModal, currentUser, adViewInfo, openAdModalForPoints, exchangeTicketWithPoints 
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-4xl shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
          <h3 className="text-xl font-bold text-emerald-400">🎟️ チケット購入・交換ストア</h3>
          <button onClick={closeModal} className="text-2xl text-slate-400 hover:text-white">×</button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col justify-center items-center shadow-inner">
             <span className="text-sm text-slate-400 mb-1">現在の所持ポイント</span>
             <span className="text-3xl font-bold text-yellow-400">🪙 {currentUser?.points || 0} pt</span>
          </div>
          <div className="flex-1 bg-pink-900/20 border border-pink-500/50 rounded-lg p-4 flex flex-col justify-center items-center shadow-inner relative overflow-hidden">
             <span className="text-xs text-pink-300 mb-2 font-bold">ログインボーナス（1日3回まで）</span>
             {adViewInfo.count < 3 ? (
               <button 
                 onClick={openAdModalForPoints} 
                 className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 rounded-lg shadow-lg flex items-center justify-center gap-2"
               >
                 📺 動画を見て 20pt 獲得する ({adViewInfo.count}/3)
               </button>
             ) : (
               <div className="w-full bg-slate-700 text-slate-400 font-bold py-2 rounded-lg text-center text-sm">
                 本日の上限に達しました (3/3)
               </div>
             )}
             <p className="text-[10px] text-pink-400/70 mt-2">※3回視聴でブロンズチケット1枚分(60pt)になります。</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
           {/* ブロンズ */}
           <div className="bg-stone-800/50 border border-stone-600 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-bold text-stone-300">ブロンズ</h4>
                  <span className="bg-stone-600 text-white text-[10px] px-2 py-1 rounded font-bold">所持: {currentUser?.ticketsBronze || 0}枚</span>
                </div>
                <p className="text-[11px] text-stone-400">日常的な探索やテストプレイに。<br/>超高速・低コストな最安プラン。</p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-600">
                <div className="flex gap-2 mb-2">
                  <button onClick={() => alert("※決済システム準備中")} className="flex-1 bg-stone-600 hover:bg-stone-500 text-white text-xs py-2 rounded font-bold shadow">¥240</button>
                  <button onClick={() => exchangeTicketWithPoints('bronze', 60)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 rounded font-bold shadow flex items-center justify-center gap-1">🪙 60pt</button>
                </div>
                <button onClick={() => alert("※決済システム準備中")} className="w-full bg-stone-700/50 hover:bg-stone-600 text-stone-300 text-[10px] py-1.5 rounded font-bold border border-stone-600 transition-colors">3枚セット - ¥640 (11%OFF)</button>
              </div>
           </div>
           
           {/* シルバー */}
           <div className="bg-slate-700/30 border border-slate-600 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-bold text-slate-300">シルバー</h4>
                  <span className="bg-slate-600 text-white text-[10px] px-2 py-1 rounded font-bold">所持: {currentUser?.ticketsSilver || 0}枚</span>
                </div>
                <p className="text-[11px] text-slate-400">手軽にサクッと遊びたい方向け。<br/>テンポの良いスピーディーなセッション。</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-600">
                <div className="flex gap-2 mb-2">
                  <button onClick={() => alert("※決済システム準備中")} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded font-bold shadow">¥360</button>
                  <button onClick={() => exchangeTicketWithPoints('silver', 100)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 rounded font-bold shadow flex items-center justify-center gap-1">🪙 100pt</button>
                </div>
                <button onClick={() => alert("※決済システム準備中")} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] py-1.5 rounded font-bold border border-slate-600 transition-colors">3枚セット - ¥970 (10%OFF)</button>
              </div>
           </div>
           
           {/* ゴールド */}
           <div className="bg-amber-900/10 border border-amber-700/50 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-bold text-amber-400">ゴールド</h4>
                  <span className="bg-amber-600 text-white text-[10px] px-2 py-1 rounded font-bold">所持: {currentUser?.ticketsGold || 0}枚</span>
                </div>
                <p className="text-[11px] text-amber-500/70">論理的で緻密なシナリオ向け。<br/>※AIプレイヤーは参加できません。</p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-900/50">
                <div className="flex flex-col gap-2">
                  <button onClick={() => alert("※決済システム準備中")} className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs py-2 rounded font-bold shadow">1枚購入 - ¥600</button>
                  <button onClick={() => alert("※決済システム準備中")} className="w-full bg-amber-900/50 hover:bg-amber-800/80 text-amber-300 text-[10px] py-1.5 rounded font-bold border border-amber-700/50 transition-colors">3枚セット - ¥1,620 (10%OFF)</button>
                </div>
              </div>
           </div>
           
           {/* プラチナ */}
           <div className="bg-indigo-900/10 border border-indigo-700/50 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-bold text-indigo-300">プラチナ</h4>
                  <span className="bg-indigo-600 text-white text-[10px] px-2 py-1 rounded font-bold">所持: {currentUser?.ticketsPlatinum || 0}枚</span>
                </div>
                <p className="text-[11px] text-indigo-400/70">エモーショナルな体験を求める方向け。<br/>※AIプレイヤーは参加できません。</p>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-900/50">
                <div className="flex flex-col gap-2">
                  <button onClick={() => alert("※決済システム準備中")} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded font-bold shadow">1枚購入 - ¥1,200</button>
                  <button onClick={() => alert("※決済システム準備中")} className="w-full bg-indigo-900/50 hover:bg-indigo-800/80 text-indigo-300 text-[10px] py-1.5 rounded font-bold border border-indigo-700/50 transition-colors">3枚セット - ¥3,240 (10%OFF)</button>
                </div>
              </div>
           </div>
           
           {/* ダイヤモンド */}
           <div className="bg-gradient-to-br from-fuchsia-900/40 to-rose-900/20 border-2 border-fuchsia-500/50 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden lg:col-span-2">
              <div className="absolute top-0 right-0 bg-fuchsia-600 text-white text-[8px] font-bold px-4 py-1 rotate-45 translate-x-3 translate-y-2 shadow-lg">最高級</div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-bold text-fuchsia-300">ダイヤモンド</h4>
                  <span className="bg-fuchsia-600 text-white text-[10px] px-2 py-1 rounded font-bold relative z-10">所持: {currentUser?.ticketsDiamond || 0}枚</span>
                </div>
                <p className="text-[11px] text-fuchsia-200/80 relative z-10">最高峰のVIP TRPG体験。人間を超える神業GMで、絶対に失敗できない究極のセッションを。<br/>※AIプレイヤーは参加できません。</p>
              </div>
              <div className="mt-4 pt-3 border-t border-fuchsia-900/50 relative z-10">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={() => alert("※決済システム準備中")} className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs py-2 rounded font-bold shadow">1枚購入 - ¥1,800</button>
                  <button onClick={() => alert("※決済システム準備中")} className="flex-1 bg-fuchsia-900/50 hover:bg-fuchsia-800/80 text-fuchsia-300 text-[10px] py-2 rounded font-bold border border-fuchsia-700/50 transition-colors">3枚セット - ¥4,860 (10%OFF)</button>
                </div>
              </div>
           </div>
           
           {/* アイテム */}
           <div className="bg-slate-700/30 border border-slate-600 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-bold text-white">アイテム</h4>
                  <span className="bg-slate-500 text-white text-[10px] px-2 py-1 rounded font-bold">所持: {currentUser?.ticketsItem || 0}枚</span>
                </div>
                <p className="text-[11px] text-slate-400">高品質画像生成(3回分)や、<br/>小説執筆、書庫保存などに使用します。</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-600">
                <div className="flex gap-2 mb-2">
                  <button onClick={() => alert("※決済システム準備中")} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-xs py-2 rounded font-bold shadow">¥200</button>
                  <button onClick={() => exchangeTicketWithPoints('item', 500)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 rounded font-bold shadow flex items-center justify-center gap-1">🪙 500pt</button>
                </div>
                <button onClick={() => alert("※決済システム準備中")} className="w-full bg-slate-800 border border-slate-500 hover:bg-slate-700 text-slate-300 text-[10px] py-1.5 rounded font-bold transition-colors">3枚セット - ¥540 (10%OFF)</button>
              </div>
           </div>
           
        </div>
      </div>
    </div>
  );
}