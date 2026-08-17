import React, { useState } from "react";

type Props = {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  isLoginMode: boolean;
  setIsLoginMode: React.Dispatch<React.SetStateAction<boolean>>;
  authLoading: boolean;
  handleEmailAuth: (e: React.FormEvent) => Promise<void>;
  handleGoogleAuth: () => Promise<void>;
};

export default function LoginView({ email, setEmail, password, setPassword, isLoginMode, setIsLoginMode, authLoading, handleEmailAuth, handleGoogleAuth }: Props) {
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoginMode && (!agreeTerms || !agreePrivacy)) {
      alert("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }
    handleEmailAuth(e);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-md shadow-2xl my-auto">
        <h1 className="text-3xl font-extrabold text-center text-emerald-400 mb-6">AI GM MORPG</h1>
        <h2 className="text-xl font-bold text-center mb-6">{isLoginMode ? "ログイン" : "新規アカウント登録"}</h2>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">メールアドレス</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">パスワード</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>

          {/* 新規登録時のみ同意チェックボックスを表示 */}
          {!isLoginMode && (
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg mt-4 space-y-3 text-xs text-slate-300">
              <label className="flex items-start gap-2 cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" checked={agreeTerms} onChange={e=>setAgreeTerms(e.target.checked)} className="w-4 h-4 mt-0.5 accent-emerald-500" />
                <span className="leading-tight"><a href="/terms" target="_blank" className="text-emerald-400 underline hover:text-emerald-300">利用規約</a> および <a href="/tokushoho" target="_blank" className="text-emerald-400 underline hover:text-emerald-300">特定商取引法に基づく表記</a> に同意する</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" checked={agreePrivacy} onChange={e=>setAgreePrivacy(e.target.checked)} className="w-4 h-4 mt-0.5 accent-emerald-500" />
                <span className="leading-tight"><a href="/privacy" target="_blank" className="text-emerald-400 underline hover:text-emerald-300">プライバシーポリシー</a> に同意する</span>
              </label>
            </div>
          )}

          <button type="submit" disabled={authLoading || (!isLoginMode && (!agreeTerms || !agreePrivacy))} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold py-3 rounded shadow mt-4 transition-colors">
            {authLoading ? "処理中..." : (isLoginMode ? "ログイン" : "同意してアカウントを作成")}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-700 pt-6">
          {/* Google連携時も同意済みかチェックしたい場合は、ボタン側にもdisabled条件を加えます */}
          <button 
            onClick={() => {
              if (!isLoginMode && (!agreeTerms || !agreePrivacy)) {
                alert("利用規約とプライバシーポリシーへの同意が必要です。");
                return;
              }
              handleGoogleAuth();
            }} 
            disabled={authLoading} 
            className="w-full bg-white text-slate-900 hover:bg-slate-200 font-bold py-3 rounded shadow flex items-center justify-center gap-2 transition-colors"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" /> Googleで{isLoginMode ? "ログイン" : "登録"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => {
            setIsLoginMode(!isLoginMode);
            setAgreeTerms(false);
            setAgreePrivacy(false);
          }} className="text-xs text-slate-400 hover:text-white underline transition-colors">
            {isLoginMode ? "初めての方はこちら（新規登録）" : "既にアカウントをお持ちの方はこちら（ログイン）"}
          </button>
        </div>
      </div>
    </div>
  );
}