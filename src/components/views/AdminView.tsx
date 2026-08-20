import React, { useState } from "react";
import { ViewState, UserProfile, Scenario, Report } from "../../types";

type Props = {
  isMaintenance: boolean;
  toggleMaintenance: () => Promise<void>;
  isTicketSystemEnabled: boolean;
  toggleTicketSystem: () => Promise<void>;
  geminiFlashModel: '3.5-lite' | '3.6';
  toggleGeminiFlashModel: (model: '3.5-lite' | '3.6') => Promise<void>;
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
  toggleTesterStatus: (userId: string, currentStatus: boolean) => Promise<void>;
  unbanUser: (userId: string) => Promise<void>;
  scenarioSearchQuery: string;
  setScenarioSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  executeCreateTester: (email: string, pass: string) => Promise<void>;
  openUserActionModal: (user: UserProfile) => void; // ★ 追加
};

export default function AdminView({
  isMaintenance, toggleMaintenance, isTicketSystemEnabled, toggleTicketSystem, geminiFlashModel, toggleGeminiFlashModel,
  reports, allUsers, scenarios, resolveReport, setBanTargetUser, setBanReason, setBanTargetScenario, setScenarioBanReason,
  unbanScenarioFromAppeal, userSearchQuery, setUserSearchQuery, toggleAdminStatus, toggleTesterStatus, unbanUser,
  scenarioSearchQuery, setScenarioSearchQuery, setCurrentView, executeCreateTester, openUserActionModal
}: Props) {
  const [activeTab, setActiveTab] = useState<'users' | 'scenarios' | 'reports' | 'settings'>('users');
  const filteredUsers = allUsers.filter(u => u.handleName.includes(userSearchQuery) || u.email.includes(userSearchQuery));
  const filteredScenarios = scenarios.filter(s => s.title.includes(scenarioSearchQuery));

  return (
    <div className="flex-1 flex flex-col p-4 max-w-6xl mx-auto w-full min-h-0 overflow-hidden">
      <header className="mb-6 flex justify-between items-center border-b border-slate-700 pb-4 shrink-0">
        <h2 className="text-2xl font-bold text-red-400">🛡️ 総合管理ダッシュボード</h2>
        <button onClick={() => setCurrentView("lobby")} className="text-sm bg-slate-700 px-4 py-2 rounded font-bold hover:bg-slate-600">ロビーに戻る</button>
      </header>

      <div className="flex gap-2 mb-4 shrink-0 border-b border-slate-700">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-bold border-b-2 ${activeTab === 'users' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400'}`}>ユーザー管理</button>
        <button onClick={() => setActiveTab('scenarios')} className={`px-4 py-2 text-sm font-bold border-b-2 ${activeTab === 'scenarios' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400'}`}>シナリオ管理</button>
        <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 text-sm font-bold border-b-2 ${activeTab === 'reports' ? 'border-red-500 text-red-400' : 'border-transparent text-slate-400'}`}>通報・申請 ({reports.filter(r => r.status === 'pending').length})</button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-bold border-b-2 ${activeTab === 'settings' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400'}`}>システム設定</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'users' && (
          <div className="space-y-4">
            <input type="text" placeholder="名前やメールアドレスで検索..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr><th className="p-3">ユーザー</th><th className="p-3">権限 / 状態</th><th className="p-3 text-right">アクション</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/50">
                      <td className="p-3">
                        <p className="font-bold text-white">{u.handleName}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="p-3 space-x-2">
                        {u.isAdmin && <span className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded text-xs border border-blue-500/50">管理者</span>}
                        {u.isTester && <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs border border-purple-500/50">テスター</span>}
                        {u.isBanned && <span className="bg-red-900/50 text-red-300 px-2 py-1 rounded text-xs border border-red-500/50">BAN済</span>}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {/* ★ ここでチケット付与／メール送信モーダルを呼び出す */}
                        <button onClick={() => openUserActionModal(u)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded font-bold shadow">
                          🎁 付与/通知
                        </button>
                        <button onClick={() => toggleAdminStatus(u.id, u.isAdmin)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded font-bold shadow">
                          管理者切替
                        </button>
                        <button onClick={() => toggleTesterStatus(u.id, u.isTester)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded font-bold shadow">
                          テスター切替
                        </button>
                        {u.isBanned ? (
                          <button onClick={() => unbanUser(u.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded font-bold shadow">BAN解除</button>
                        ) : (
                          <button onClick={() => setBanTargetUser(u)} className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded font-bold shadow">BAN</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            <input type="text" placeholder="シナリオ名で検索..." value={scenarioSearchQuery} onChange={e => setScenarioSearchQuery(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScenarios.map(s => (
                <div key={s.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl shadow relative">
                  {s.isBanned && <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-2 py-1 rounded font-bold z-10">非公開措置</div>}
                  <h4 className="text-md font-bold text-white mb-2 line-clamp-1">{s.title}</h4>
                  <p className="text-xs text-slate-400 mb-4">作者ID: <span className="text-[10px]">{s.authorId}</span></p>
                  <button onClick={() => setBanTargetScenario(s)} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded font-bold transition-colors">
                    管理メニューを開く
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reports.filter(r => r.status === 'pending').map(r => (
              <div key={r.id} className="bg-slate-800 border border-red-500/30 p-4 rounded-xl shadow">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${r.targetType === 'scenario_appeal' ? 'bg-amber-900/50 text-amber-400' : 'bg-red-900/50 text-red-400'}`}>
                    {r.targetType === 'scenario_appeal' ? '再審査申請' : '通報'} [{r.targetType}]
                  </span>
                  <span className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-white whitespace-pre-wrap mb-4 bg-slate-900 p-3 rounded">{r.reason}</p>
                <div className="flex justify-between items-center border-t border-slate-700 pt-3">
                  <span className="text-[10px] text-slate-400">対象ID: {r.targetId}</span>
                  <div className="flex gap-2">
                    {r.targetType === 'scenario_appeal' && (
                      <button onClick={() => unbanScenarioFromAppeal(r.id, r.targetId)} className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-2 rounded font-bold shadow">
                        非公開を解除して解決
                      </button>
                    )}
                    <button onClick={() => resolveReport(r.id)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-4 py-2 rounded font-bold shadow">
                      対応済みとしてマーク
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {reports.filter(r => r.status === 'pending').length === 0 && <p className="text-center text-slate-500 py-8">未対応の通報・申請はありません。</p>}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow">
              <h3 className="text-lg font-bold text-white mb-4">システム設定</h3>
              <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700 mb-4">
                <div>
                  <p className="font-bold text-white">全体メンテナンスモード</p>
                  <p className="text-xs text-slate-400">一般ユーザーのログインとアクセスを制限します。</p>
                </div>
                <button onClick={toggleMaintenance} className={`px-4 py-2 rounded font-bold text-sm shadow ${isMaintenance ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                  {isMaintenance ? 'ON (制限中)' : 'OFF (通常稼働)'}
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700 mb-4">
                <div>
                  <p className="font-bold text-white">チケット消費システム</p>
                  <p className="text-xs text-slate-400">AIモデル利用時にユーザーのチケットを消費します。</p>
                </div>
                <button onClick={toggleTicketSystem} className={`px-4 py-2 rounded font-bold text-sm shadow ${isTicketSystemEnabled ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                  {isTicketSystemEnabled ? 'ON (有効)' : 'OFF (無効)'}
                </button>
              </div>
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div className="mb-2">
                  <p className="font-bold text-white">Gemini Flash (無料枠) モデルの裏側指定</p>
                  <p className="text-xs text-slate-400">ブロンズ/シルバーチケット消費時のAPIの向き先を変更します。</p>
                </div>
                <select value={geminiFlashModel} onChange={(e) => toggleGeminiFlashModel(e.target.value as '3.5-lite' | '3.6')} className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white">
                  <option value="3.5-lite">Gemini 3.5 Flash Lite (軽量・高速・低コスト)</option>
                  <option value="3.6">Gemini 3.6 Flash (通常版)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}