import React from "react";
import { Room, Scenario } from "../../types";

type Props = {
  adModal: { isOpen: boolean; step: number; scenario: Scenario | null; room: Room | null; type: string };
  setAdModal: React.Dispatch<React.SetStateAction<any>>;
  executeTrialPlay: () => Promise<void>;
  executeAdReward: () => Promise<void>;
  spectateRoom: (room: Room) => Promise<void>;
};

export default function AdVideoModal({ 
  adModal, setAdModal, executeTrialPlay, executeAdReward, spectateRoom 
}: Props) {
  if (!adModal.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-pink-500/50 rounded-xl p-8 w-full max-w-sm shadow-2xl text-center space-y-6">
        <h3 className="text-xl font-bold text-pink-400">📺 広告を視聴して{adModal.type === 'trial' ? "プレイ" : adModal.type === 'points' ? "ポイント獲得" : "観戦"}</h3>
        <div className="h-32 bg-slate-900 border border-slate-700 flex items-center justify-center rounded">
          <span className="text-slate-500 font-bold animate-pulse">動画広告が再生されています...<br/>({adModal.step}/3)</span>
        </div>
        {adModal.step <= 3 ? (
          <button 
            onClick={() => { 
              if(adModal.step === 3) { 
                if (adModal.type === 'trial') executeTrialPlay(); 
                else if (adModal.type === 'points') executeAdReward(); 
                else if (adModal.type === 'spectate' && adModal.room) { 
                  spectateRoom(adModal.room); 
                  setAdModal({ isOpen: false, step: 0, scenario: null, room: null, type: 'trial' }); 
                } 
              } else { 
                setAdModal({...adModal, step: adModal.step + 1}); 
              } 
            }} 
            className="w-full bg-pink-600 hover:bg-pink-500 py-3 rounded text-sm font-bold text-white shadow-lg"
          >
            {adModal.step === 3 ? (adModal.type === 'trial' ? "お試しプレイを開始する！" : adModal.type === 'points' ? "ポイントを受け取る！" : "観戦を開始する！") : "次の広告へ進む"}
          </button>
        ) : null}
        <button 
          onClick={() => setAdModal({ isOpen: false, step: 0, scenario: null, room: null, type: 'trial' })} 
          className="text-xs text-slate-400 hover:text-white underline"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}