import React from "react";

type LoginViewProps = {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  authLoading: boolean;
  handleEmailAuth: (e: any) => Promise<void> | void; // ★修正
  handleGoogleAuth: () => Promise<void>;
  setCurrentView: React.Dispatch<React.SetStateAction<any>>;
  isMaintenance: boolean;
  appLanguage?: "ja" | "en" | "zh";
  setAppLanguage?: (lang: "ja" | "en" | "zh") => void;
};

export default function LoginView(props: LoginViewProps) {
  const lang = props.appLanguage || "ja";
  const t = {
    ja: { title: "TRPG AI ログイン", email: "メールアドレス", pass: "パスワード", login: "ログイン", signup: "新規登録はこちら", maint: "メンテナンス中" },
    en: { title: "TRPG AI Login", email: "Email Address", pass: "Password", login: "Login", signup: "Sign Up Here", maint: "Under Maintenance" },
    zh: { title: "TRPG AI 登录", email: "电子邮箱", pass: "密码", login: "登录", signup: "在此注册", maint: "系统维护中" }
  }[lang];

  return (
    <div className="flex justify-center items-center h-screen bg-slate-900 text-slate-100 relative">
      
      {/* 言語スイッチャー */}
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <button onClick={()=>props.setAppLanguage?.("ja")} className={`px-3 py-1.5 text-xs md:text-sm font-bold rounded-lg border transition-colors ${lang==='ja'?'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50':'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}>🇯🇵 日本語</button>
        <button onClick={()=>props.setAppLanguage?.("en")} className={`px-3 py-1.5 text-xs md:text-sm font-bold rounded-lg border transition-colors ${lang==='en'?'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50':'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}>🇺🇸 English</button>
        <button onClick={()=>props.setAppLanguage?.("zh")} className={`px-3 py-1.5 text-xs md:text-sm font-bold rounded-lg border transition-colors ${lang==='zh'?'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50':'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}>🇨🇳 中文</button>
      </div>

      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <h2 className="text-2xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          {t.title}
        </h2>
        
        {props.isMaintenance && (
          <div className="mb-6 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm text-center font-bold">
            ⚠️ {t.maint}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t.email}</label>
            <input 
              type="email" value={props.email} onChange={(e) => props.setEmail(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t.pass}</label>
            <input 
              type="password" value={props.password} onChange={(e) => props.setPassword(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white"
              placeholder="••••••••"
            />
          </div>
          <button 
            onClick={(e) => props.handleEmailAuth(e)} 
            disabled={props.authLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-blue-900/50 disabled:opacity-50 mt-2"
          >
            {props.authLoading ? "..." : t.login}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="border-b border-slate-700 w-1/5"></span>
          <span className="text-xs text-slate-500 uppercase font-semibold">OR</span>
          <span className="border-b border-slate-700 w-1/5"></span>
        </div>

        <div className="mt-6 space-y-4">
          <button 
            onClick={props.handleGoogleAuth} 
            className="w-full bg-white text-slate-900 hover:bg-gray-100 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
        </div>

        <div className="mt-8 text-center">
          <button 
            onClick={() => props.setCurrentView("signup")} 
            className="text-sm text-blue-400 hover:text-blue-300 font-medium hover:underline"
          >
            {t.signup}
          </button>
        </div>
      </div>
    </div>
  );
}