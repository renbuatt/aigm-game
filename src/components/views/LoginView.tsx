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
  email, setEmail, password, setPassword, isLoginMode, setIsLoginMode, authLoading, handleEmailAuth, handleGoogleAuth
}: Props) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-extrabold text-emerald-400 mb-6 text-center">AI GM MORPG</h1>
        
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">メールアドレス</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" 
              required 
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">パスワード</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={authLoading} 
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg shadow-lg transition-colors mt-2"
          >
            {authLoading ? '処理中...' : (isLoginMode ? 'ログイン' : '新規登録')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button 
            type="button" 
            onClick={() => setIsLoginMode(!isLoginMode)} 
            className="text-xs text-emerald-400 hover:text-emerald-300 underline"
          >
            {isLoginMode ? 'アカウントを新規作成する' : 'すでにアカウントをお持ちの方はこちら'}
          </button>
        </div>

        <div className="mt-6 border-t border-slate-700 pt-6">
          <button 
            type="button" 
            onClick={handleGoogleAuth} 
            disabled={authLoading} 
            className="w-full bg-white text-slate-800 hover:bg-gray-100 font-bold py-3 rounded-lg shadow transition-colors flex items-center justify-center gap-2"
          >
            {/* GoogleロゴのSVG */}
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.116-11.283-7.5l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            Googleでログイン
          </button>
        </div>
      </div>
    </div>
  );
}