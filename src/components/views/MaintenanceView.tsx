import React from "react";

type Props = {
  handleLogout: () => Promise<void>;
};

export default function MaintenanceView({ handleLogout }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 w-full min-h-0 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center space-y-6">
        <h1 className="text-4xl font-extrabold text-amber-500 mb-2">🚧 メンテナンス中</h1>
        <p className="text-slate-300 text-sm leading-relaxed">現在システムメンテナンスを行っております。</p>
        <button onClick={handleLogout} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-xl mt-4">戻る</button>
      </div>
    </div>
  );
}