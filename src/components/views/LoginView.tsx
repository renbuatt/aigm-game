import React from "react";
import { ViewState } from "../../types";

type Props = {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  authLoading: boolean;
  handleEmailAuth: (e: React.FormEvent) => Promise<void>;
  handleGoogleAuth: () => Promise<void>;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  isMaintenance: boolean; // ★追加
};

export default function LoginView({ email, setEmail, password, setPassword, authLoading, handleEmailAuth, handleGoogleAuth, setCurrentView, isMaintenance }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-md shadow-2xl my-auto">
        <h1 className="text-3xl font-extrabold text-center text-emerald-400 mb-6">AI GM MORPG</h1>
        <h2 className="text-xl font-bold text-center mb-6">ログイン</h2>

        {/* ★メンテナンス中のお知らせ */}
        {isMaintenance && (
          <div className="mb-4 bg-amber-900/50 border border-amber-500 rounded p-3 text-amber-400 text-xs font-bold text-center">
            現在メンテナンス中です。管理者のみログイン可能です。
          </div>
        )}
        
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">メールアドレス</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">パスワード</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
          </div>

          <button type="submit" disabled={authLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold py-3 rounded shadow mt-4 transition-colors">
            {authLoading ? "処理中..." : "ログイン"}
          </button>
        </form>

        {/* ★メンテナンス中は以下を非表示にする */}
        {!isMaintenance && (
          <>
            <div className="mt-6 border-t border-slate-700 pt-6">
              <button onClick={handleGoogleAuth} disabled={authLoading} className="w-full bg-white text-slate-900 hover:bg-slate-200 font-bold py-3 rounded shadow flex items-center justify-center gap-2 transition-colors">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" /> Googleでログイン
              </button>
            </div>

            <div className="mt-6 text-center">
              <button onClick={() => setCurrentView("signup")} className="text-sm font-bold text-emerald-400 hover:text-emerald-300 underline transition-colors">
                初めての方はこちら（新規アカウント登録）
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}