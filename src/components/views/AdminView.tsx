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
};

export default function AdminView({
  isMaintenance, toggleMaintenance,
  isTicketSystemEnabled, toggleTicketSystem,
  geminiFlashModel, toggleGeminiFlashModel,
  reports, allUsers, scenarios, resolveReport,
  setBanTargetUser, setBanReason,
  setBanTargetScenario, setScenarioBanReason,
  unbanScenarioFromAppeal,
  userSearchQuery, setUserSearchQuery, toggleAdminStatus, toggleTesterStatus, unbanUser,
  scenarioSearchQuery, setScenarioSearchQuery,
  setCurrentView, executeCreateTester
}: Props) {
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'scenarios' | 'reports'>('dashboard');

  const pendingReports = reports.filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status === 'resolved');

  const filteredUsers = allUsers.filter(u => 
    u.handleName?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.id.includes(userSearchQuery)
  );

  const filteredScenarios = scenarios.filter(s => 
    s.title.toLowerCase().includes(scenarioSearchQuery.toLowerCase()) ||
    s.id.includes(scenarioSearchQuery)
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* ヘッダー */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center z-10 shadow-md flex-shrink-0">
        <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
          ⚙️ 運営・システム管理パネル
        </h2>
        <button onClick={() => setCurrentView("lobby")} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm font-bold shadow transition-colors">
          ロビーに戻る
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー（タブ） */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 p-4 flex flex-col gap-2 overflow-y-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded text-left font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
            📊 ダッシュボード・設定
          </button>
          <button onClick={() => setActiveTab('users')} className={`p-3 rounded text-left font-bold transition-colors ${activeTab === 'users' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
            👥 ユーザー管理
          </button>
          <button onClick={() => setActiveTab('scenarios')} className={`p-3 rounded text-left font-bold transition-colors ${activeTab === 'scenarios' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
            📚 シナリオ管理
          </button>
          <button onClick={() => setActiveTab('reports')} className={`p-3 rounded text-left font-bold flex justify-between items-center transition-colors ${activeTab === 'reports' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
            <span>🚨 通報・審査</span>
            {pendingReports.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingReports.length}</span>}
          </button>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900/50">
          
          {/* ダッシュボードタブ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-2">システム全体設定</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
                  <h4 className="font-bold text-lg mb-2 text-amber-400">メンテナンスモード</h4>
                  <p className="text-xs text-slate-400 mb-4">ONにすると、管理者・テスター以外の一般ユーザーはログインおよびアプリへのアクセスができなくなります。</p>
                  <button onClick={toggleMaintenance} className={`w-full py-3 rounded font-bold shadow-lg transition-colors ${isMaintenance ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                    {isMaintenance ? "🔴 メンテナンス中（解除する）" : "⚪ 通常稼働中（ONにする）"}
                  </button>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
                  <h4 className="font-bold text-lg mb-2 text-blue-400">チケット（課金）システム</h4>
                  <p className="text-xs text-slate-400 mb-4">ONにすると、部屋作成時や入室時、高度な機能の利用時にチケットの消費が求められるようになります。</p>
                  <button onClick={toggleTicketSystem} className={`w-full py-3 rounded font-bold shadow-lg transition-colors ${isTicketSystemEnabled ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                    {isTicketSystemEnabled ? "🔵 チケット制 有効（無効にする）" : "⚪ 完全無料モード（有効にする）"}
                  </button>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg md:col-span-2">
                  <h4 className="font-bold text-lg mb-2 text-fuchsia-400">AIモデルの切り替え (Flash / Flash Lite)</h4>
                  <p className="text-xs text-slate-400 mb-4">「ブロンズ」「シルバー」およびバックグラウンドの処理で使用するGeminiのモデルバージョンを切り替えます。</p>
                  <div className="flex gap-4">
                    <button onClick={() => toggleGeminiFlashModel('3.5-lite')} className={`flex-1 py-3 rounded font-bold shadow transition-colors ${geminiFlashModel === '3.5-lite' ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                      ⚡ Flash Lite 8B (超高速・低コスト)
                    </button>
                    <button onClick={() => toggleGeminiFlashModel('3.6')} className={`flex-1 py-3 rounded font-bold shadow transition-colors ${geminiFlashModel === '3.6' ? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                      🧠 Flash 1.5/1.2 (高品質・通常版)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ユーザー管理タブ */}
          {activeTab === 'users' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2">ユーザー管理</h3>
                <input 
                  type="text" 
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  placeholder="ユーザー名、メール、IDで検索..."
                  className="w-64 bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase">
                      <th className="p-4 border-b border-slate-700 font-medium">ユーザー情報</th>
                      <th className="p-4 border-b border-slate-700 font-medium hidden md:table-cell">権限</th>
                      <th className="p-4 border-b border-slate-700 font-medium text-center">状態</th>
                      <th className="p-4 border-b border-slate-700 font-medium text-right">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={u.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde"} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                            <div>
                              <p className="font-bold text-white text-sm">{u.handleName}</p>
                              <p className="text-[10px] text-slate-400">{u.email} | ID: {u.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <div className="flex flex-col gap-2 items-start">
                            <label className="text-[10px] flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={u.isAdmin} onChange={() => toggleAdminStatus(u.id, !!u.isAdmin)} className="accent-emerald-500" />
                              <span className={u.isAdmin ? "text-emerald-400 font-bold" : "text-slate-500"}>管理者権限</span>
                            </label>
                            <label className="text-[10px] flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={u.isTester} onChange={() => toggleTesterStatus(u.id, !!u.isTester)} className="accent-indigo-500" />
                              <span className={u.isTester ? "text-indigo-400 font-bold" : "text-slate-500"}>テスター権限</span>
                            </label>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {u.isBanned ? (
                            <span className="bg-red-900/50 text-red-400 font-bold px-3 py-1 rounded text-xs">BAN済</span>
                          ) : (
                            <span className="bg-emerald-900/30 text-emerald-400 font-bold px-3 py-1 rounded text-xs">正常</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {u.isBanned ? (
                             <button onClick={() => unbanUser(u.id)} className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1.5 rounded font-bold shadow text-slate-300">
                               解除する...
                             </button>
                          ) : (
                            <button onClick={() => { setBanTargetUser(u); setBanReason(""); }} className="bg-red-900/80 hover:bg-red-700 text-xs px-3 py-1.5 rounded font-bold shadow text-white border border-red-500/50 transition-colors">
                              BAN措置...
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500 text-sm">ユーザーが見つかりません。</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* シナリオ管理タブ */}
          {activeTab === 'scenarios' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2">シナリオ管理</h3>
                <input 
                  type="text" 
                  value={scenarioSearchQuery}
                  onChange={e => setScenarioSearchQuery(e.target.value)}
                  placeholder="タイトル、IDで検索..."
                  className="w-64 bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase">
                      <th className="p-4 border-b border-slate-700 font-medium">シナリオ情報</th>
                      <th className="p-4 border-b border-slate-700 font-medium text-center">ステータス</th>
                      <th className="p-4 border-b border-slate-700 font-medium text-right">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScenarios.map(s => (
                      <tr key={s.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={s.imageUrl || "https://images.unsplash.com/photo-1614729939124-03290b5609ce"} className="w-12 h-12 rounded object-cover border border-slate-600" />
                            <div>
                              <p className="font-bold text-white text-sm">{s.title}</p>
                              <p className="text-[10px] text-slate-400">ID: {s.id} | 作者: {s.authorId?.substring(0, 6) || "公式"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {s.isBanned ? (
                            <span className="bg-red-900/50 text-red-400 font-bold px-3 py-1 rounded text-xs border border-red-700/50">非公開措置中</span>
                          ) : (
                            <span className="bg-emerald-900/30 text-emerald-400 font-bold px-3 py-1 rounded text-xs border border-emerald-700/50">公開中</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => { setBanTargetScenario(s); setScenarioBanReason(""); }} className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1.5 rounded font-bold shadow text-white transition-colors">
                            管理措置...
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredScenarios.length === 0 && (
                      <tr><td colSpan={3} className="p-8 text-center text-slate-500 text-sm">シナリオが見つかりません。</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 通報・審査タブ */}
          {activeTab === 'reports' && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div>
                <h3 className="text-xl font-bold text-red-400 border-b border-slate-700 pb-2 mb-4">🚨 未対応の通報・審査申請</h3>
                {pendingReports.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-slate-800 p-6 rounded-xl text-center shadow border border-slate-700">未対応の案件はありません。</p>
                ) : (
                  <div className="space-y-4">
                    {pendingReports.map(r => (
                      <div key={r.id} className="bg-slate-800 border-l-4 border-red-500 p-5 rounded-r-xl shadow-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="bg-slate-900 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700">対象: {r.targetType}</span>
                            <span className="text-xs text-slate-500 ml-2">ID: {r.targetId}</span>
                          </div>
                          <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded text-sm text-slate-200 whitespace-pre-wrap mb-4">
                          {r.reason}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => resolveReport(r.id)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-4 py-2 rounded font-bold shadow transition-colors">保留・対応済にする</button>
                          {r.targetType === 'scenario_appeal' && (
                            <button onClick={() => unbanScenarioFromAppeal(r.id, r.targetId)} className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-2 rounded font-bold shadow transition-colors">
                              シナリオの非公開を解除
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-400 border-b border-slate-700 pb-2 mb-4">✅ 対応済みの履歴</h3>
                <div className="space-y-3">
                  {resolvedReports.slice(0, 10).map(r => (
                    <div key={r.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex justify-between items-center opacity-70">
                      <div>
                        <span className="text-xs font-bold text-slate-300">[{r.targetType}] {r.targetId}</span>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{r.reason}</p>
                      </div>
                      <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-1 rounded">対応済</span>
                    </div>
                  ))}
                  {resolvedReports.length === 0 && <p className="text-sm text-slate-600">履歴はありません。</p>}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}