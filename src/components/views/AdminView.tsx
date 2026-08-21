import React, { useState } from "react";
import { UserProfile, Scenario, Report } from "../../types";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

type Props = {
  isMaintenance: boolean;
  toggleMaintenance: () => void;
  isTicketSystemEnabled: boolean;
  toggleTicketSystem: () => void;
  geminiFlashModel: '3.5-lite' | '3.6';
  toggleGeminiFlashModel: (model: '3.5-lite' | '3.6') => void;
  reports: Report[];
  allUsers: UserProfile[];
  scenarios: Scenario[];
  resolveReport: (reportId: string) => void;
  setBanTargetUser: (user: UserProfile | null) => void;
  setBanReason: (reason: string) => void;
  setBanTargetScenario: (scenario: Scenario | null) => void;
  setScenarioBanReason: (reason: string) => void;
  unbanScenarioFromAppeal: (reportId: string, scenarioId: string) => void;
  userSearchQuery: string;
  setUserSearchQuery: (query: string) => void;
  toggleAdminStatus: (userId: string, currentStatus: boolean) => void;
  toggleTesterStatus: (userId: string, currentStatus: boolean) => void;
  unbanUser: (userId: string) => void;
  scenarioSearchQuery: string;
  setScenarioSearchQuery: (query: string) => void;
  setCurrentView: (view: any) => void;
  executeCreateTester: (email: string, pass: string) => void;
  openUserActionModal: (user: UserProfile) => void;
  grantPointsToAll: (amount: number) => Promise<void>;
};

export default function AdminView({
  isMaintenance, toggleMaintenance, isTicketSystemEnabled, toggleTicketSystem, geminiFlashModel, toggleGeminiFlashModel,
  reports, allUsers, scenarios, resolveReport, setBanTargetUser, setBanReason, setBanTargetScenario, setScenarioBanReason,
  unbanScenarioFromAppeal, userSearchQuery, setUserSearchQuery, toggleAdminStatus, toggleTesterStatus, unbanUser,
  scenarioSearchQuery, setScenarioSearchQuery, setCurrentView, executeCreateTester, openUserActionModal, grantPointsToAll
}: Props) {

  const [adminTab, setAdminTab] = useState<'settings' | 'users' | 'scenarios' | 'reports'>('settings');
  const [testerEmail, setTesterEmail] = useState("");
  const [testerPass, setTesterPass] = useState("");

  const filteredUsers = allUsers.filter(u => u.handleName?.includes(userSearchQuery) || u.email?.includes(userSearchQuery) || u.id.includes(userSearchQuery));
  const filteredScenarios = scenarios.filter(s => s.title?.includes(scenarioSearchQuery) || s.id.includes(scenarioSearchQuery));

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <header className="mb-6 flex justify-between items-end border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-red-400 mb-1">⚙️ 管理ダッシュボード</h1>
          <p className="text-xs text-slate-400">システム設定、ユーザー管理、通報対応を行います。</p>
        </div>
        <button onClick={() => setCurrentView("lobby")} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm font-bold shadow transition-colors">
          ロビーに戻る
        </button>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto whitespace-nowrap pb-2 border-b border-slate-700">
        <button onClick={() => setAdminTab('settings')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${adminTab === 'settings' ? 'bg-slate-800 text-red-400 border-b-2 border-red-500' : 'text-slate-400 hover:bg-slate-800'}`}>システム設定</button>
        <button onClick={() => setAdminTab('users')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${adminTab === 'users' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800'}`}>ユーザー管理</button>
        <button onClick={() => setAdminTab('scenarios')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${adminTab === 'scenarios' ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-800'}`}>シナリオ管理</button>
        <button onClick={() => setAdminTab('reports')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${adminTab === 'reports' ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500' : 'text-slate-400 hover:bg-slate-800'}`}>
          通報・対応待ち {reports.filter(r => r.status === 'pending').length > 0 && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{reports.filter(r => r.status === 'pending').length}</span>}
        </button>
      </div>

      {adminTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">🔧 全体システム制御</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900 p-4 rounded border border-slate-700">
                <div>
                  <h3 className="font-bold text-red-400">メンテナンスモード</h3>
                  <p className="text-[10px] text-slate-400">ONにすると一般ユーザーはログインできなくなります。</p>
                </div>
                <button onClick={toggleMaintenance} className={`px-4 py-2 rounded text-xs font-bold transition-colors ${isMaintenance ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  {isMaintenance ? 'ON (稼働中)' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-900 p-4 rounded border border-slate-700">
                <div>
                  <h3 className="font-bold text-blue-400">チケット（課金）システム</h3>
                  <p className="text-[10px] text-slate-400">ONにすると部屋の作成・入室にチケット消費が必要になります。</p>
                </div>
                <button onClick={toggleTicketSystem} className={`px-4 py-2 rounded text-xs font-bold transition-colors ${isTicketSystemEnabled ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  {isTicketSystemEnabled ? 'ON (有効)' : 'OFF (無料開放)'}
                </button>
              </div>

              <div className="flex flex-col bg-slate-900 p-4 rounded border border-slate-700">
                <div className="mb-2">
                  <h3 className="font-bold text-purple-400">裏側AIモデル (Gemini Flash) の切り替え</h3>
                  <p className="text-[10px] text-slate-400">「シルバー部屋」や「システム処理」で使われるFlashのバージョンを変更します。</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleGeminiFlashModel('3.5-lite')} className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${geminiFlashModel === '3.5-lite' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>3.5 Flash Lite (最速)</button>
                  <button onClick={() => toggleGeminiFlashModel('3.6')} className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${geminiFlashModel === '3.6' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>3.6 Flash (通常)</button>
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded border border-yellow-700/50">
                <h3 className="font-bold text-yellow-400 mb-1">💰 全員にポイントを配布（お詫び等）</h3>
                <p className="text-[10px] text-slate-400 mb-3">※登録されている全ユーザーに対して一律でポイントを加算します。</p>
                <div className="flex gap-2">
                  <input type="number" id="allPointAmount" defaultValue={100} className="w-24 bg-slate-800 border border-slate-600 rounded p-2 text-xs text-center text-white" />
                  <button onClick={() => grantPointsToAll(Number((document.getElementById('allPointAmount') as HTMLInputElement).value))} className="bg-yellow-600 hover:bg-yellow-500 px-4 rounded text-xs font-bold shadow text-white flex-1">
                    全ユーザーに付与する
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">🧪 テスターアカウント発行</h2>
            <div className="space-y-4">
              <p className="text-xs text-slate-400">メンテナンス中もログインでき、チケット消費を無視できる専用アカウントを作成します。</p>
              <div>
                <label className="text-[10px] text-slate-400">メールアドレス</label>
                <input type="email" value={testerEmail} onChange={e=>setTesterEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" placeholder="tester@example.com" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">パスワード（6文字以上）</label>
                <input type="password" value={testerPass} onChange={e=>setTesterPass(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <button onClick={() => { executeCreateTester(testerEmail, testerPass); setTesterEmail(""); setTesterPass(""); }} disabled={!testerEmail || testerPass.length < 6} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 py-2 rounded text-sm font-bold transition-colors">
                発行する（※自動的にログアウトされます）
              </button>
            </div>
          </div>
        </div>
      )}

      {adminTab === 'users' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col h-[70vh]">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h2 className="text-lg font-bold text-blue-400">👥 登録ユーザー一覧 ({allUsers.length}人)</h2>
            <input type="text" placeholder="名前・IDで検索..." value={userSearchQuery} onChange={e=>setUserSearchQuery(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs w-64" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {filteredUsers.map(u => (
              <div key={u.id} className={`p-3 rounded-lg border flex items-center justify-between gap-4 ${u.isBanned ? 'bg-red-900/20 border-red-800' : 'bg-slate-900 border-slate-700'}`}>
                <div className="flex items-center gap-3">
                  <img src={u.avatarUrl || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      {u.handleName} 
                      {u.isAdmin && <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded">管理者</span>}
                      {u.isTester && <span className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded">テスター</span>}
                      {u.isBanned && <span className="bg-red-900 text-red-300 text-[8px] px-1.5 py-0.5 rounded border border-red-500">BAN</span>}
                    </h4>
                    <p className="text-[9px] text-slate-500">ID: {u.id} | Pts: {u.points || 0}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openUserActionModal(u)} className="bg-indigo-600 hover:bg-indigo-500 text-[10px] px-3 py-1 rounded text-white font-bold">操作</button>
                  <button onClick={() => toggleAdminStatus(u.id, u.isAdmin)} className={`text-[10px] px-3 py-1 rounded font-bold border ${u.isAdmin ? 'bg-red-900/50 text-red-300 border-red-700' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>Admin権限</button>
                  <button onClick={() => toggleTesterStatus(u.id, u.isTester)} className={`text-[10px] px-3 py-1 rounded font-bold border ${u.isTester ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>Tester権限</button>
                  {u.isBanned ? (
                    <button onClick={() => unbanUser(u.id)} className="bg-slate-700 hover:bg-slate-600 text-[10px] px-3 py-1 rounded text-white font-bold">BAN解除</button>
                  ) : (
                    <button onClick={() => { setBanTargetUser(u); setBanReason(""); }} className="bg-red-900/80 hover:bg-red-700 text-[10px] px-3 py-1 rounded text-red-200 border border-red-500 font-bold">BAN</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {adminTab === 'scenarios' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col h-[70vh]">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
            <h2 className="text-lg font-bold text-emerald-400">📖 シナリオ管理 ({scenarios.length}件)</h2>
            <input type="text" placeholder="タイトル・IDで検索..." value={scenarioSearchQuery} onChange={e=>setScenarioSearchQuery(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs w-64" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {filteredScenarios.map(s => (
              <div key={s.id} className={`p-3 rounded-lg border flex items-center justify-between gap-4 ${s.isBanned ? 'bg-amber-900/20 border-amber-800' : 'bg-slate-900 border-slate-700'}`}>
                <div className="flex items-center gap-3 w-2/3">
                  <img src={s.imageUrl} className="w-12 h-12 object-cover rounded border border-slate-700 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate flex items-center gap-2">
                      {s.title}
                      {s.isBanned && <span className="bg-amber-900 text-amber-300 text-[8px] px-1.5 py-0.5 rounded border border-amber-500">非公開</span>}
                    </h4>
                    <p className="text-[9px] text-slate-500 truncate">ID: {s.id} | 作者ID: {s.authorId || '不明'}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setBanTargetScenario(s); setScenarioBanReason(""); }} className="bg-amber-900/80 hover:bg-amber-700 text-[10px] px-3 py-1 rounded text-amber-200 border border-amber-500 font-bold">
                    {s.isBanned ? '管理・解除' : '措置・非公開'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {adminTab === 'reports' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col h-[70vh]">
          <h2 className="text-lg font-bold text-amber-400 mb-4 border-b border-slate-700 pb-2">🚨 通報と再審査申請</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {reports.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">現在対応待ちの案件はありません。</p> : reports.map(r => (
              <div key={r.id} className={`p-4 rounded-lg border ${r.status === 'pending' ? 'bg-slate-900 border-amber-500/50' : 'bg-slate-800/50 border-slate-700 opacity-60'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${r.targetType === 'scenario_appeal' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
                    {r.targetType === 'scenario_appeal' ? '📝 シナリオ再審査申請' : r.targetType === 'scenario' ? '🚩 シナリオ通報' : r.targetType === 'room' ? '🚩 セッション通報' : '🚩 ユーザー通報'}
                  </span>
                  <span className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-300 mb-3 bg-slate-950 p-3 rounded whitespace-pre-wrap font-mono">
                  {r.reason}
                </div>
                <div className="text-[10px] text-slate-500 mb-3">
                  対象ID: {r.targetId} {r.roomId ? `| 部屋ID: ${r.roomId}` : ''} | 通報者ID: {r.reporterId}
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    {r.targetType === 'scenario_appeal' && (
                      <button onClick={() => unbanScenarioFromAppeal(r.id, r.targetId)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-4 py-1.5 rounded font-bold shadow">
                        承認して非公開を解除
                      </button>
                    )}
                    <button onClick={() => resolveReport(r.id)} className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] px-4 py-1.5 rounded font-bold">
                      対応完了・却下（クローズ）
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}