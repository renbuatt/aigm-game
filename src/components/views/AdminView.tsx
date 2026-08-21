import React, { useState } from "react";
import { UserProfile, Scenario, Report } from "../../types";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
const NO_IMAGE_SCENARIO = "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=400&q=80"; // ★この1行を追加しました

type Props = {
  isMaintenance: boolean;
  toggleMaintenance: () => void;
  isTicketSystemEnabled: boolean;
  toggleTicketSystem: () => void;
  geminiFlashModel: '3.5-lite' | '3.6';
  toggleGeminiFlashModel: (model: '3.5-lite' | '3.6') => void;
  reports: Report[];
  resolveReport: (reportId: string) => void;
  allUsers: UserProfile[];
  scenarios: Scenario[];
  toggleAdminStatus: (userId: string, currentStatus: boolean) => void;
  toggleTesterStatus: (userId: string, currentStatus: boolean) => void;
  adminExecuteBan: (userId: string, reason: string) => Promise<void>;
  adminUnbanUser: (userId: string) => Promise<void>;
  adminSuspendUser: (userId: string) => Promise<void>;
  adminUnsuspendUser: (userId: string) => Promise<void>;
  adminExecuteScenarioBan: (scenarioId: string, reason: string) => Promise<void>;
  adminUnbanScenario: (scenarioId: string) => Promise<void>;
  adminDeleteScenario: (scenarioId: string) => Promise<void>;
  setCurrentView: (view: any) => void;
  executeCreateTester: (email: string, pass: string) => Promise<void>;
  grantPointsToAll: (amount: number) => Promise<void>;
  adminSendMailToUser: (userId: string, body: string) => Promise<void>;
};

export default function AdminView({
  isMaintenance, toggleMaintenance, isTicketSystemEnabled, toggleTicketSystem, geminiFlashModel, toggleGeminiFlashModel,
  reports, allUsers, scenarios, resolveReport, toggleAdminStatus, toggleTesterStatus, 
  adminExecuteBan, adminUnbanUser, adminSuspendUser, adminUnsuspendUser, adminExecuteScenarioBan, 
  adminUnbanScenario, adminDeleteScenario, setCurrentView, executeCreateTester, grantPointsToAll, adminSendMailToUser
}: Props) {

  const [adminTab, setAdminTab] = useState<'settings' | 'logs' | 'scenarios' | 'users' | 'reports'>('settings');
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [scenarioSearchQuery, setScenarioSearchQuery] = useState("");

  const [testerEmail, setTesterEmail] = useState("");
  const [testerPass, setTesterPass] = useState("");

  // モーダル管理ステート
  const [mailModal, setMailModal] = useState<{userId: string, name: string} | null>(null);
  const [mailBody, setMailBody] = useState("");
  
  const [banModalUser, setBanModalUser] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState("");

  const [scenarioDetailModal, setScenarioDetailModal] = useState<Scenario | null>(null);
  
  const [scenarioSuspendModal, setScenarioSuspendModal] = useState<Scenario | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const filteredUsers = allUsers.filter(u => u.handleName?.includes(userSearchQuery) || u.email?.includes(userSearchQuery) || u.id.includes(userSearchQuery));
  const filteredScenarios = scenarios.filter(s => s.title?.includes(scenarioSearchQuery) || s.id.includes(scenarioSearchQuery));

  // エラーログと通常の通報を分離
  const errorLogs = reports.filter(r => r.reason.includes('【自動記録：AIシステムエラー】') || r.targetType === 'room');
  const generalReports = reports.filter(r => !r.reason.includes('【自動記録：AIシステムエラー】') && r.targetType !== 'room');

  const openMailModal = (userId: string, name: string) => {
    setMailModal({ userId, name });
    setMailBody("");
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 p-4 md:p-8 overflow-y-auto custom-scrollbar relative">
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
        <button onClick={() => setAdminTab('settings')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${adminTab === 'settings' ? 'bg-slate-800 text-red-400 border-b-2 border-red-500' : 'text-slate-400 hover:bg-slate-800'}`}>ダッシュボード</button>
        <button onClick={() => setAdminTab('logs')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${adminTab === 'logs' ? 'bg-slate-800 text-pink-400 border-b-2 border-pink-500' : 'text-slate-400 hover:bg-slate-800'}`}>
          ログ管理 {errorLogs.filter(r => r.status === 'pending').length > 0 && <span className="bg-pink-600 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{errorLogs.filter(r => r.status === 'pending').length}</span>}
        </button>
        <button onClick={() => setAdminTab('scenarios')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${adminTab === 'scenarios' ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-800'}`}>シナリオ管理</button>
        <button onClick={() => setAdminTab('users')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${adminTab === 'users' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800'}`}>ユーザー管理</button>
        <button onClick={() => setAdminTab('reports')} className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${adminTab === 'reports' ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500' : 'text-slate-400 hover:bg-slate-800'}`}>
          通報管理 {generalReports.filter(r => r.status === 'pending').length > 0 && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{generalReports.filter(r => r.status === 'pending').length}</span>}
        </button>
      </div>

      {adminTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
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

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg h-fit">
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

      {adminTab === 'logs' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col h-[70vh]">
          <h2 className="text-lg font-bold text-pink-400 mb-4 border-b border-slate-700 pb-2">💻 エラーログ抽出</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {errorLogs.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">エラーログはありません。</p> : errorLogs.map(r => (
              <div key={r.id} className={`p-4 rounded-lg border ${r.status === 'pending' ? 'bg-slate-900 border-pink-500/50' : 'bg-slate-800/50 border-slate-700 opacity-60'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold px-2 py-1 rounded bg-pink-900/50 text-pink-300 border border-pink-700">AIシステムエラー</span>
                  <span className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-300 mb-3 bg-slate-950 p-3 rounded whitespace-pre-wrap font-mono">
                  {r.reason}
                </div>
                <div className="text-[10px] text-slate-500 mb-3">
                  発生部屋ID: {r.roomId || r.targetId} | 報告者ID: {r.reporterId}
                </div>
                {r.status === 'pending' && (
                  <button onClick={() => resolveReport(r.id)} className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] px-4 py-1.5 rounded font-bold">
                    確認済にする（クローズ）
                  </button>
                )}
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
                  <img src={s.imageUrl || NO_IMAGE_SCENARIO} className="w-12 h-12 object-cover rounded border border-slate-700 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate flex items-center gap-2">
                      {s.title}
                      {s.isBanned && <span className="bg-amber-900 text-amber-300 text-[8px] px-1.5 py-0.5 rounded border border-amber-500">修正待ち(非公開)</span>}
                    </h4>
                    <p className="text-[9px] text-slate-500 truncate">ID: {s.id} | 作者ID: {s.authorId || '不明'}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setScenarioDetailModal(s)} className="bg-indigo-600 hover:bg-indigo-500 text-[10px] px-3 py-1 rounded text-white font-bold">内容の確認</button>
                  {s.isBanned ? (
                     <button onClick={() => adminUnbanScenario(s.id)} className="bg-slate-700 hover:bg-slate-600 text-[10px] px-3 py-1 rounded text-white font-bold">公開を再開</button>
                  ) : (
                     <button onClick={() => { setScenarioSuspendModal(s); setSuspendReason(""); }} className="bg-amber-900/80 hover:bg-amber-700 text-[10px] px-3 py-1 rounded text-amber-200 border border-amber-500 font-bold">修正依頼(一時停止)</button>
                  )}
                  <button onClick={() => adminDeleteScenario(s.id)} className="bg-red-900/50 hover:bg-red-800 text-[10px] px-3 py-1 rounded text-red-300 border border-red-800/50 font-bold">削除</button>
                </div>
              </div>
            ))}
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
              <div key={u.id} className={`p-3 rounded-lg border flex items-center justify-between gap-4 ${u.isBanned ? 'bg-red-900/20 border-red-800' : u.isSuspended ? 'bg-amber-900/20 border-amber-800' : 'bg-slate-900 border-slate-700'}`}>
                <div className="flex items-center gap-3">
                  <img src={u.avatarUrl || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      {u.handleName} 
                      {u.isAdmin && <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded">管理者</span>}
                      {u.isTester && <span className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded">テスター</span>}
                      {u.isBanned && <span className="bg-red-900 text-red-300 text-[8px] px-1.5 py-0.5 rounded border border-red-500">完全BAN</span>}
                      {u.isSuspended && !u.isBanned && <span className="bg-amber-900 text-amber-300 text-[8px] px-1.5 py-0.5 rounded border border-amber-500">一時BAN(参加不可)</span>}
                    </h4>
                    <p className="text-[9px] text-slate-500">ID: {u.id} | Email: {u.email}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 items-center">
                  <button onClick={() => openMailModal(u.id, u.handleName)} className="bg-blue-600 hover:bg-blue-500 text-[10px] px-3 py-1 rounded text-white font-bold">✉️ メール送信</button>
                  
                  <div className="w-px h-6 bg-slate-700 mx-1"></div>
                  
                  {u.isSuspended ? (
                    <button onClick={() => adminUnsuspendUser(u.id)} className="bg-slate-700 hover:bg-slate-600 text-[10px] px-3 py-1 rounded text-white font-bold">一時BAN解除</button>
                  ) : (
                    <button onClick={() => adminSuspendUser(u.id)} disabled={u.isBanned} className="bg-amber-900/80 hover:bg-amber-700 disabled:opacity-50 text-[10px] px-3 py-1 rounded text-amber-200 border border-amber-500 font-bold">一時BAN</button>
                  )}

                  {u.isBanned ? (
                    <button onClick={() => adminUnbanUser(u.id)} className="bg-slate-700 hover:bg-slate-600 text-[10px] px-3 py-1 rounded text-white font-bold">BAN解除</button>
                  ) : (
                    <button onClick={() => { setBanModalUser(u); setBanReason(""); }} className="bg-red-900/80 hover:bg-red-700 text-[10px] px-3 py-1 rounded text-red-200 border border-red-500 font-bold">BAN</button>
                  )}

                  <div className="w-px h-6 bg-slate-700 mx-1"></div>

                  <button onClick={() => toggleAdminStatus(u.id, u.isAdmin)} className={`text-[10px] px-3 py-1 rounded font-bold border ${u.isAdmin ? 'bg-red-900/50 text-red-300 border-red-700' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>Admin</button>
                  <button onClick={() => toggleTesterStatus(u.id, u.isTester)} className={`text-[10px] px-3 py-1 rounded font-bold border ${u.isTester ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>Tester</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {adminTab === 'reports' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col h-[70vh]">
          <h2 className="text-lg font-bold text-amber-400 mb-4 border-b border-slate-700 pb-2">🚨 ユーザーからの通報・再審査申請</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {generalReports.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">現在対応待ちの案件はありません。</p> : generalReports.map(r => (
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
                    <button onClick={() => openMailModal(r.reporterId, "通報者")} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-4 py-1.5 rounded font-bold shadow">
                      通報者にメール送信
                    </button>
                    <button onClick={() => resolveReport(r.id)} className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] px-4 py-1.5 rounded font-bold">
                      対応完了・クローズ
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* モーダル群（z-index高めに設定） */}
      
      {mailModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-blue-500/50 shadow-2xl">
            <h3 className="font-bold text-blue-400 mb-2">✉️ メール送信</h3>
            <p className="text-xs text-slate-400 mb-4">宛先: {mailModal.name} ({mailModal.userId})</p>
            <textarea className="w-full bg-slate-900 text-white p-3 rounded h-32 text-sm border border-slate-700" value={mailBody} onChange={e=>setMailBody(e.target.value)} placeholder="メッセージ内容..." />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setMailModal(null)} className="flex-1 bg-slate-700 py-2 rounded text-sm font-bold">キャンセル</button>
              <button onClick={() => { adminSendMailToUser(mailModal.userId, mailBody); setMailModal(null); }} disabled={!mailBody.trim()} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 py-2 rounded text-sm font-bold shadow">送信する</button>
            </div>
          </div>
        </div>
      )}

      {banModalUser && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-red-500/50 shadow-2xl">
            <h3 className="font-bold text-red-500 mb-2">⛔ ユーザーを完全BANする</h3>
            <p className="text-xs text-slate-400 mb-4">対象: {banModalUser.handleName} ({banModalUser.email})</p>
            <textarea className="w-full bg-slate-900 text-white p-3 rounded h-32 text-sm border border-slate-700" value={banReason} onChange={e=>setBanReason(e.target.value)} placeholder="BANの理由を入力してください（本人に表示されます）" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setBanModalUser(null)} className="flex-1 bg-slate-700 py-2 rounded text-sm font-bold">キャンセル</button>
              <button onClick={() => { adminExecuteBan(banModalUser.id, banReason); setBanModalUser(null); }} disabled={!banReason.trim()} className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 py-2 rounded text-sm font-bold shadow shadow-red-900/50">BANを実行する</button>
            </div>
          </div>
        </div>
      )}

      {scenarioSuspendModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-amber-500/50 shadow-2xl">
            <h3 className="font-bold text-amber-400 mb-2">⏸️ シナリオ修正依頼 (一時非公開)</h3>
            <p className="text-xs text-slate-400 mb-4">対象シナリオ: {scenarioSuspendModal.title}</p>
            <textarea className="w-full bg-slate-900 text-white p-3 rounded h-32 text-sm border border-slate-700" value={suspendReason} onChange={e=>setSuspendReason(e.target.value)} placeholder="修正を依頼する理由を入力してください（作者にメール通知されます）" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setScenarioSuspendModal(null)} className="flex-1 bg-slate-700 py-2 rounded text-sm font-bold">キャンセル</button>
              <button onClick={() => { adminExecuteScenarioBan(scenarioSuspendModal.id, suspendReason); setScenarioSuspendModal(null); }} disabled={!suspendReason.trim()} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 py-2 rounded text-white text-sm font-bold shadow">依頼を送信</button>
            </div>
          </div>
        </div>
      )}

      {scenarioDetailModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-emerald-500/50 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2 shrink-0">
              <h3 className="font-bold text-emerald-400 text-xl truncate pr-4">{scenarioDetailModal.title}</h3>
              <button onClick={() => setScenarioDetailModal(null)} className="text-2xl text-slate-400 hover:text-white">×</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
              <div>
                <h4 className="text-blue-300 font-bold mb-1 text-sm border-l-4 border-blue-500 pl-2">公開用紹介文・あらすじ</h4>
                <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900 p-3 rounded border border-slate-700">{scenarioDetailModal.description || "未設定"}</p>
              </div>
              <div>
                <h4 className="text-pink-300 font-bold mb-1 text-sm border-l-4 border-pink-500 pl-2">世界観・背景設定</h4>
                <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900 p-3 rounded border border-slate-700">{scenarioDetailModal.setting || "未設定"}</p>
              </div>
              <div>
                <h4 className="text-red-400 font-bold mb-1 text-sm border-l-4 border-red-500 pl-2">プロット・真相 (AI用台本)</h4>
                <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-950 p-3 rounded border border-slate-700 font-mono">
                  {(() => {
                    try {
                      const parsed = JSON.parse(scenarioDetailModal.plot);
                      if (Array.isArray(parsed)) {
                        return parsed.map((p, i) => `【Chapter ${i+1}: ${p.title}】\n${p.content}`).join('\n\n');
                      }
                      return scenarioDetailModal.plot;
                    } catch(e) { return scenarioDetailModal.plot; }
                  })()}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 shrink-0">
              <button onClick={() => setScenarioDetailModal(null)} className="bg-slate-700 hover:bg-slate-600 py-3 rounded w-full font-bold shadow text-sm">閉じる</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}