import React, { useState } from "react";
import { ViewState, UserProfile, Scenario, Report } from "../../types";

const NO_IMAGE_SCENARIO = "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=400&q=80";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

type Props = {
  isMaintenance: boolean;
  toggleMaintenance: () => Promise<void>;
  isTicketSystemEnabled: boolean;
  toggleTicketSystem: () => Promise<void>;
  reports: Report[];
  allUsers: UserProfile[];
  scenarios: Scenario[];
  resolveReport: (reportId: string) => Promise<void>;
  setBanTargetUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setBanReason: React.Dispatch<React.SetStateAction<string>>;
  setBanTargetScenario: React.Dispatch<React.SetStateAction<Scenario | null>>;
  setScenarioBanReason: React.Dispatch<React.SetStateAction<string>>;
  unbanScenarioFromAppeal: (reportId: string, scenarioId: string) => Promise<void>;
  userSearchQuery: string;
  setUserSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  toggleAdminStatus: (userId: string, currentStatus: boolean) => Promise<void>;
  scenarioSearchQuery: string;
  setScenarioSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  executeCreateTester: (email: string, pass: string) => Promise<void>;
};

export default function AdminView({
  isMaintenance, toggleMaintenance, isTicketSystemEnabled, toggleTicketSystem,
  reports, allUsers, scenarios, resolveReport, setBanTargetUser, setBanReason,
  setBanTargetScenario, setScenarioBanReason, unbanScenarioFromAppeal,
  userSearchQuery, setUserSearchQuery, toggleAdminStatus,
  scenarioSearchQuery, setScenarioSearchQuery, setCurrentView, executeCreateTester
}: Props) {
  const [adminTab, setAdminTab] = useState<'reports' | 'users' | 'scenarios' | 'settings'>('reports');
  
  const [testerEmail, setTesterEmail] = useState("");
  const [testerPass, setTesterPass] = useState("");

  const filteredUsers = allUsers.filter(u => u.handleName?.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()));
  const filteredScenarios = scenarios.filter(s => s.title?.toLowerCase().includes(scenarioSearchQuery.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col p-6 max-w-6xl mx-auto w-full min-h-0 overflow-y-auto custom-scrollbar">
      <header className="mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-red-400">🛡️ 管理者ダッシュボード</h2>
        <button onClick={() => setCurrentView("lobby")} className="text-sm bg-slate-700 px-4 py-2 rounded font-bold hover:bg-slate-600 transition-colors shadow">ロビーに戻る</button>
      </header>

      <div className="flex gap-4 mb-6 border-b border-slate-700 overflow-x-auto whitespace-nowrap">
        <button onClick={() => setAdminTab('reports')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${adminTab === 'reports' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400 hover:text-white'}`}>🚨 通報・申請 ({reports.filter(r => r.status === 'pending').length})</button>
        <button onClick={() => setAdminTab('users')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${adminTab === 'users' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}>👥 ユーザー管理</button>
        <button onClick={() => setAdminTab('scenarios')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${adminTab === 'scenarios' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>📖 シナリオ管理</button>
        <button onClick={() => setAdminTab('settings')} className={`pb-2 text-sm font-bold transition-colors border-b-2 ${adminTab === 'settings' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'}`}>⚙️ システム設定</button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 space-y-6">
        
        {adminTab === 'reports' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400">未対応の通報および再審査申請</h3>
            {reports.filter(r => r.status === 'pending').length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-800 p-6 rounded text-center border border-slate-700">未対応の通報はありません。</p>
            ) : (
              reports.filter(r => r.status === 'pending').map(r => {
                const targetScenario = scenarios.find(s => s.id === r.targetId);

                return (
                  <div key={r.id} className="bg-slate-800 border border-red-950 p-4 rounded-xl shadow space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs bg-red-900/50 text-red-300 border border-red-700 px-2 py-0.5 rounded font-bold uppercase">{r.targetType}</span>
                        <p className="text-xs text-slate-400 mt-1">対象ID: {r.targetId}</p>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="bg-slate-900 p-3 rounded border border-slate-700 text-sm text-slate-200 whitespace-pre-wrap">
                      {r.reason}
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      {r.targetType === 'scenario_appeal' && targetScenario ? (
                        <button onClick={() => unbanScenarioFromAppeal(r.id, targetScenario.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded font-bold shadow">
                          ✅ 再審査を承認（非公開解除）
                        </button>
                      ) : null}
                      <button onClick={() => resolveReport(r.id)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-4 py-2 rounded font-bold">
                        ✓ 対応済みにする
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {adminTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <input type="text" value={userSearchQuery} onChange={e=>setUserSearchQuery(e.target.value)} placeholder="ユーザー名やメールで検索..." className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white w-64" />
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 shadow space-y-3">
              <h4 className="text-sm font-bold text-amber-400">🔑 テスターアカウント発行</h4>
              <div className="flex gap-2 flex-wrap">
                <input type="email" value={testerEmail} onChange={e=>setTesterEmail(e.target.value)} placeholder="tester@example.com" className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white flex-1" />
                <input type="password" value={testerPass} onChange={e=>setTesterPass(e.target.value)} placeholder="パスワード(6文字以上)" className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white flex-1" />
                <button onClick={() => { if(testerEmail && testerPass) executeCreateTester(testerEmail, testerPass); }} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-xs font-bold">発行する</button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredUsers.map(u => (
                <div key={u.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={u.avatarUrl || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate flex items-center gap-2">
                        {u.handleName}
                        {u.isAdmin && <span className="text-[10px] bg-red-600 px-1.5 py-0.5 rounded text-white">管理者</span>}
                        {u.isTester && <span className="text-[10px] bg-amber-600 px-1.5 py-0.5 rounded text-white">テスター</span>}
                        {u.isBanned && <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">BAN中</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleAdminStatus(u.id, u.isAdmin)} className={`text-[10px] px-3 py-1.5 rounded font-bold ${u.isAdmin ? 'bg-slate-700 text-slate-300' : 'bg-blue-600 text-white'}`}>
                      {u.isAdmin ? '管理者剥奪' : '管理者にする'}
                    </button>
                    {!u.isBanned ? (
                      <button onClick={() => { setBanTargetUser(u); setBanReason(""); }} className="text-[10px] bg-red-900/50 hover:bg-red-800 text-red-300 border border-red-700 px-3 py-1.5 rounded font-bold">BAN</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'scenarios' && (
          <div className="space-y-4">
            <input type="text" value={scenarioSearchQuery} onChange={e=>setScenarioSearchQuery(e.target.value)} placeholder="シナリオ名で検索..." className="bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white w-64" />
            <div className="space-y-3">
              {filteredScenarios.map(s => (
                <div key={s.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={s.imageUrl || NO_IMAGE_SCENARIO} className="w-12 h-12 object-cover rounded flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate flex items-center gap-2">
                        {s.title}
                        {s.isBanned && <span className="text-[10px] bg-red-600 px-1.5 py-0.5 rounded text-white">非公開措置中</span>}
                      </p>
                      <p className="text-[10px] text-slate-400">プレイ数: {s.playCount || 0} / 閲覧数: {s.viewCount || 0}</p>
                    </div>
                  </div>
                  <button onClick={() => setBanTargetScenario(s)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-bold flex-shrink-0">
                    管理措置（非公開・削除）
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-amber-400 mb-2 border-b border-slate-700 pb-2">🎟️ 経済圏（チケットシステム）設定</h3>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-white">チケット・ポイント機能</p>
                  <p className="text-xs text-slate-400 mt-1">
                    セッション開始時のチケット消費、シナリオ制作者へのポイント還元などの機能を有効化します。
                    <br/>（現在の状態：<span className={isTicketSystemEnabled ? "text-emerald-400 font-bold" : "text-slate-500 font-bold"}>{isTicketSystemEnabled ? "ON (有効)" : "OFF (無効)"}</span>）
                  </p>
                </div>
                <button 
                  onClick={toggleTicketSystem}
                  className={`px-4 py-2 rounded text-sm font-bold transition-colors whitespace-nowrap shadow-lg ${isTicketSystemEnabled ? "bg-red-600 hover:bg-red-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
                >
                  {isTicketSystemEnabled ? "システムを無効化" : "システムを有効化"}
                </button>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-blue-400 mb-2 border-b border-slate-700 pb-2">🛠️ メンテナンスモード設定</h3>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-white">緊急メンテナンス</p>
                  <p className="text-xs text-slate-400 mt-1">有効にすると、管理者・テスター以外のユーザーがゲームにアクセスできなくなります。</p>
                </div>
                <button onClick={toggleMaintenance} className={`px-4 py-2 rounded text-sm font-bold transition-colors whitespace-nowrap shadow-lg ${isMaintenance ? "bg-red-600 hover:bg-red-500 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}>
                  {isMaintenance ? "メンテナンス解除 (OFF)" : "メンテナンス発動 (ON)"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}