import React from "react";

type Props = {
  handleLogout: () => Promise<void>;
};

export default function BannedView({ handleLogout }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 w-full overflow-y-auto min-h-0">
      <div className="bg-slate-800 border border-red-700/50 rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6 relative mt-10">
        <h1 className="text-3xl font-extrabold text-red-500 border-b border-slate-700 pb-4">⛔ アカウント利用停止</h1>
        <p className="text-slate-300 text-sm leading-relaxed">規約違反によりアカウントが停止されています。</p>
        <button onClick={handleLogout} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl mt-4">ログアウト</button>
      </div>
    </div>
  );
}