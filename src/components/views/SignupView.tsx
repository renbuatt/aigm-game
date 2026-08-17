import React, { useState } from "react";
import { ViewState } from "../../types";

type Props = {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  authLoading: boolean;
  handleEmailSignUp: (e: React.FormEvent, name: string, addr: string, phone: string) => Promise<void>;
  handleGoogleAuth: () => Promise<void>;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  isMaintenance: boolean; // ★追加
};

export default function SignupView({ email, setEmail, password, setPassword, authLoading, handleEmailSignUp, handleGoogleAuth, setCurrentView, isMaintenance }: Props) {
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // ★メンテナンス中ブロック
  if (isMaintenance) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-md shadow-2xl my-auto text-center">
          <h2 className="text-xl font-bold text-amber-400 mb-4">現在メンテナンス中です</h2>
          <p className="text-sm text-slate-300 mb-6">新規アカウントの登録は一時的に停止しております。</p>
          <button onClick={() => setCurrentView("login")} className="bg-slate-700 px-4 py-2 rounded text-sm font-bold text-white hover:bg-slate-600 transition-colors">
            ログイン画面へ戻る
          </button>
        </div>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      alert("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }
    handleEmailSignUp(e, fullName, address, phone);
  };

  const onGoogleSubmit = () => {
    if (!agreeTerms) {
      alert("利用規約とプライバシーポリシーへの同意が必要です。");
      return;
    }
    handleGoogleAuth();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-xl shadow-2xl my-auto">
        <h1 className="text-3xl font-extrabold text-center text-emerald-400 mb-2">AI GM MORPG</h1>
        <h2 className="text-xl font-bold text-center mb-6">新規アカウント登録</h2>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">氏名（本名） <span className="text-red-400">*</span></label>
              <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} required placeholder="山田 太郎" className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">電話番号 <span className="text-red-400">*</span></label>
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} required placeholder="090-1234-5678" className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">住所 <span className="text-red-400">*</span></label>
            <input type="text" value={address} onChange={e=>setAddress(e.target.value)} required placeholder="千葉県柏市..." className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">メールアドレス <span className="text-red-400">*</span></label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">パスワード <span className="text-red-400">*</span></label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="mt-6 border border-slate-600 rounded-lg p-4 bg-slate-900">
            <h3 className="text-sm font-bold text-emerald-400 mb-2">利用規約および特商法の確認</h3>
            <div className="h-32 overflow-y-auto text-xs text-slate-300 pr-2 custom-scrollbar bg-slate-800 p-2 rounded mb-3 whitespace-pre-wrap">
              【販売事業者】五輪警備保障株式会社{'\n'}
              【運営統括責任者】山本 高大{'\n'}
              【所在地】千葉県柏市南柏1-4-16{'\n'}
              【電話番号】04-7144-9425{'\n\n'}
              ※ デジタル役務という性質上、購入後のキャンセル・返金はできません。{'\n'}
              ※ 詳細は以下のリンクより全文をご確認ください。
            </div>
            <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
              <input type="checkbox" checked={agreeTerms} onChange={e=>setAgreeTerms(e.target.checked)} className="w-5 h-5 accent-emerald-500 cursor-pointer" />
              <span className="font-bold text-sm"><a href="/terms" target="_blank" className="text-emerald-400 underline">利用規約</a>・<a href="/privacy" target="_blank" className="text-emerald-400 underline">プライバシーポリシー</a>・<a href="/tokushoho" target="_blank" className="text-emerald-400 underline">特商法表記</a> に同意する</span>
            </label>
          </div>

          <button type="submit" disabled={authLoading || !agreeTerms} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold py-3 rounded shadow mt-4 transition-colors">
            {authLoading ? "処理中..." : "同意してアカウントを作成"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center">
          <span className="text-xs text-slate-500">または</span>
        </div>

        <div className="mt-4">
          <button onClick={onGoogleSubmit} disabled={authLoading || !agreeTerms} className="w-full bg-white text-slate-900 hover:bg-slate-200 disabled:opacity-50 font-bold py-3 rounded shadow flex items-center justify-center gap-2 transition-colors">
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" /> 同意してGoogleで登録
          </button>
          <p className="text-[10px] text-slate-500 text-center mt-2">※Google登録の場合、住所等は後日マイページからご入力いただけます。</p>
        </div>

        <div className="mt-6 text-center border-t border-slate-700 pt-6">
          <button onClick={() => setCurrentView("login")} className="text-sm font-bold text-slate-400 hover:text-white underline transition-colors">
            既にアカウントをお持ちの方はこちら（ログイン）
          </button>
        </div>
      </div>
    </div>
  );
}