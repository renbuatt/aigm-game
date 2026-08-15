import React from "react";

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

export default function LoginView({
  email,
  setEmail,
  password,
  setPassword,
  isLoginMode,
  setIsLoginMode,
  authLoading,
  handleEmailAuth,
  handleGoogleAuth,
}: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 w-full min-h-0 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-extrabold text-emerald-400 mb-2 text-center">AI GM MORPG</h1>
        <p className="text-slate-400 text-sm text-center mb-8">ログインして冒険を始める</p>
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            placeholder="メールアドレス" 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white" 
          />
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            placeholder="パスワード" 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white" 
          />
          <button 
            type="submit" 
            disabled={authLoading} 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl"
          >
            {isLoginMode ? "ログイン" : "新規登録してはじめる"}
          </button>
        </form>
        <div className="mt-4">
          <button 
            onClick={handleGoogleAuth} 
            disabled={authLoading} 
            className="w-full bg-white text-slate-800 font-bold py-3 rounded-xl hover:bg-slate-200"
          >
            Googleでログイン
          </button>
        </div>
        <div className="text-center mt-6">
          <button 
            onClick={() => setIsLoginMode(!isLoginMode)} 
            type="button" 
            className="text-sm text-emerald-400 underline"
          >
            {isLoginMode ? "新規登録はこちら" : "ログインはこちら"}
          </button>
        </div>
      </div>
    </div>
  );
}