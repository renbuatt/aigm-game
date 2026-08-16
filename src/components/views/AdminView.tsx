import React, { useState } from "react";
import { ViewState, UserProfile, Report, Scenario, Message } from "../../types";
import { supabase } from "../../lib/supabase";

const NO_IMAGE_SCENARIO = "https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=400&q=80";

type Props = {
  isMaintenance: boolean;
  toggleMaintenance: () => Promise<void>;
  reports: Report[];
  allUsers: UserProfile[];
  scenarios: Scenario[];
  resolveReport: (id: string) => Promise<void>;
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
  isMaintenance, toggleMaintenance, reports, allUsers, scenarios, resolveReport,
  setBanTargetUser, setBanReason, setBanTargetScenario, setScenarioBanReason,
  unbanScenarioFromAppeal, userSearchQuery, setUserSearchQuery, toggleAdminStatus,
  scenarioSearchQuery, setScenarioSearchQuery, setCurrentView,
  executeCreateTester
}: Props) {

  const [previewLogs, setPreviewLogs] = useState<Message[] | null>(null);
  const [previewScenario, setPreviewScenario] = useState<Scenario | null>(null);

  const [showTesterModal, setShowTesterModal] = useState(false);
  const [testerEmail, setTesterEmail] = useState("");
  const [testerPass, setTesterPass] = useState("");

  const handleCheckLogs = async (roomId: string) => {
    const { data } = await supabase.from('chat_logs').select('message').eq('room_id', roomId).order('id', { ascending: true });
    if (data && data.length > 0) {
      setPreviewLogs(data.map((d: any) => d.message));
    } else {
      alert("該当するセッションのログが見つかりませんでした。");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 w-full overflow-y-auto min-h-0 max-w-5xl mx-auto relative">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full shadow-2xl space-y-6 relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-red-600 rounded-t-2xl"></div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-red-400">⚙️ システム管理画面</h1>
          <button onClick={() => setCurrentView("lobby")} className="text-xs text-slate-400 hover:text-white underline">← ロビーに戻る</button>
        </div>
        
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex justify-between items-center">
          <div><h3 className="font-bold text-white mb-1">メンテナンスモード</h3></div>
          <button onClick={toggleMaintenance} className={`px-4 py-2 rounded-lg font-bold text-sm ${isMaintenance ? 'bg-red-600' : 'bg-slate-700'}`}>{isMaintenance ? "🔴 メンテ中" : "🟢 稼働中"}</button>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-red-400 mb-3">🚨 ユーザー・部屋からの通報一覧</h3>
          <div className="h-[300px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
            {reports.filter(r => r.status === 'pending' && r.targetType !== 'scenario_appeal').map(report => {
              const reporter = allUsers.find(u => u.id === report.reporterId);
              const targetName = report.targetType === 'user' 
                ? allUsers.find(u => u.id === report.targetId)?.handleName || "不明なユーザー" 
                : scenarios.find(s => s.id === report.targetId)?.title || "不明なシナリオ・部屋";

              return (
                <div key={report.id} className="bg-slate-800 p-4 rounded-lg border border-red-900/50 flex flex-col gap-2 shadow">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] bg-red-900 text-red-100 px-2 py-0.5 rounded font-bold">
                      {report.targetType === 'user' ? "ユーザー通報" : report.targetType === 'room' ? "部屋通報" : "シナリオ通報"}
                    </span>
                    <span className="text-[10px] text-slate-400">通報者: {reporter?.handleName || "不明"}</span>
                  </div>
                  <p className="text-sm font-bold text-white mt-1">対象: {targetName}</p>
                  <div className="text-xs text-slate-300 bg-slate-900 p-3 rounded border border-slate-700">
                    <span className="text-amber-400 font-bold block mb-1">【通報理由】</span>{report.reason}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-end mt-3 border-t border-slate-700/50 pt-3">
                    
                    {report.roomId && (
                      <button onClick={() => handleCheckLogs(report.roomId!)} className="text-[10px] bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded font-bold shadow-lg mr-auto">
                        🔍 セッションログを確認
                      </button>
                    )}
                    {report.targetType === 'scenario' && (
                      <button onClick={() => { const s = scenarios.find(sc => sc.id === report.targetId); if(s) setPreviewScenario(s); }} className="text-[10px] bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded font-bold shadow-lg mr-auto">
                        📖 シナリオの中身を確認
                      </button>
                    )}

                    {report.targetType === 'user' ? (
                      <button onClick={() => { const u = allUsers.find(user => user.id === report.targetId); if(u){ setBanTargetUser(u); setBanReason(report.reason); } }} className="text-[10px] bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded font-bold shadow-lg">対象者をBANする</button>
                    ) : (
                      <button onClick={() => { const s = scenarios.find(sc => sc.id === report.targetId); if(s){ setBanTargetScenario(s); setScenarioBanReason(report.reason); } }} className="text-[10px] bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded font-bold shadow-lg">シナリオを管理(BAN)</button>
                    )}
                    <button onClick={() => resolveReport(report.id)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-bold">処置済みにする</button>
                  </div>
                </div>
              )
            })}
            {reports.filter(r => r.status === 'pending' && r.targetType !== 'scenario_appeal').length === 0 && <p className="text-xs text-slate-500">現在、未処理の通報はありません。</p>}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-amber-400 mb-3">🚨 シナリオ修正完了・再審査申請</h3>
          <div className="h-[250px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
            {reports.filter(r => r.targetType === 'scenario_appeal' && r.status === 'pending').map(report => {
              const reporter = allUsers.find(u => u.id === report.reporterId);
              const targetScenario = scenarios.find(s => s.id === report.targetId);
              return (
                <div key={report.id} className="bg-slate-800 p-4 rounded-lg border border-amber-900/50 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] bg-amber-900 text-amber-100 px-2 py-0.5 rounded font-bold">再審査申請</span>
                    <span className="text-[10px] text-slate-400">申請者: {reporter?.handleName || "不明"}</span>
                  </div>
                  <p className="text-sm font-bold text-white mt-1">対象シナリオ: {targetScenario?.title || "不明なシナリオ"}</p>
                  <div className="text-xs text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                    <span className="text-emerald-400 font-bold block mb-1">【修正内容・コメント】</span>{report.reason}
                  </div>
                  <div className="flex gap-2 justify-end mt-2">
                    <button onClick={() => unbanScenarioFromAppeal(report.id, report.targetId)} className="text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded font-bold shadow-lg">非公開を解除(承認)</button>
                    <button onClick={() => resolveReport(report.id)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-bold">却下(処置済みにする)</button>
                  </div>
                </div>
              )
            })}
            {reports.filter(r => r.targetType === 'scenario_appeal' && r.status === 'pending').length === 0 && <p className="text-xs text-slate-500">現在、未処理の申請はありません。</p>}
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-white">ユーザー管理</h3>
            <button onClick={() => setShowTesterModal(true)} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded font-bold shadow">
              ＋ テスターアカウント発行
            </button>
          </div>
          <input type="text" placeholder="検索..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 mb-2" />
          <div className="h-[300px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
            {allUsers.filter(u => u.handleName.toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))).map(user => (
              <div key={user.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                  <img src={user.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-bold text-white">
                      {user.handleName} 
                      {user.isAdmin && <span className="text-[10px] bg-red-900 px-1 rounded ml-1">管理</span>}
                      {user.isTester && <span className="text-[10px] bg-indigo-900 px-1 rounded ml-1">テスター</span>}
                    </p>
                    <p className="text-[10px] text-slate-400">{user.email}</p>
                  </div>
                </div>
                {/* ★ BANボタンを復旧しました！ */}
                <div className="flex gap-2">
                  {user.isBanned ? (
                    <span className="text-[10px] px-3 py-2 rounded bg-red-900/50 text-red-400 font-bold border border-red-700/50">BAN済み</span>
                  ) : (
                    <button onClick={() => { setBanTargetUser(user); setBanReason(""); }} className="text-[10px] px-3 py-2 rounded bg-red-900/50 hover:bg-red-800 text-red-300 font-bold border border-red-700/50 transition-colors">BANする</button>
                  )}
                  <button onClick={() => toggleAdminStatus(user.id, user.isAdmin)} className="text-[10px] px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 transition-colors">権限変更</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-white mb-3">シナリオ管理＆治安維持</h3>
          <input type="text" placeholder="シナリオタイトルで検索..." value={scenarioSearchQuery} onChange={(e) => setScenarioSearchQuery(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 mb-2 shadow-inner" />
          <div className="h-[300px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
            {scenarios.filter(s => s.title.toLowerCase().includes(scenarioSearchQuery.toLowerCase())).map(scenario => {
              const author = allUsers.find(u => u.id === scenario.authorId);
              return (
                <div key={scenario.id} className={`flex justify-between items-center p-4 rounded-lg border ${scenario.isBanned ? 'bg-amber-900/20 border-amber-600/50' : 'bg-slate-800 border-slate-700'}`}>
                  <div className="flex items-center gap-3">
                    <img src={scenario.imageUrl || NO_IMAGE_SCENARIO} className="w-10 h-10 object-cover rounded opacity-80" />
                    <div>
                      <p className="text-sm font-bold text-white">
                        {scenario.title} 
                        {scenario.isBanned && <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 ml-2 rounded font-bold">非公開中</span>}
                      </p>
                      <p className="text-[10px] text-slate-400">作者: {author ? author.handleName : "不明"} | 評価: {scenario.ratingCount > 0 ? (scenario.ratingSum / scenario.ratingCount).toFixed(1) : "未評価"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setBanTargetScenario(scenario); setScenarioBanReason(""); }} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded font-bold shadow-lg">⚙️ 管理(削除/非公開)</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ================= モーダル群 ================= */}

      {/* ログ確認モーダル */}
      {previewLogs && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-blue-500/50 rounded-xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
              <h3 className="text-xl font-bold text-blue-400">🔍 該当セッションのログ (証拠)</h3>
              <button onClick={() => setPreviewLogs(null)} className="text-xl text-slate-400 hover:text-white bg-slate-700 px-3 rounded">閉じる</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 bg-slate-900 p-4 rounded-lg border border-slate-700 shadow-inner">
              {previewLogs.length === 0 ? <p className="text-slate-500 text-sm">ログがありません。</p> : previewLogs.map((msg, idx) => (
                <div key={idx} className="mb-3 border-b border-slate-800 pb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${msg.sender === 'gm' || msg.type === 'system' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                    {msg.charName || (msg.type === 'system' ? 'SYSTEM' : 'GM')}
                  </span>
                  <p className="text-sm text-white whitespace-pre-wrap mt-1 ml-1">{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* シナリオ中身確認モーダル */}
      {previewScenario && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-purple-500/50 rounded-xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
              <h3 className="text-xl font-bold text-purple-400">📖 シナリオの中身プレビュー</h3>
              <button onClick={() => setPreviewScenario(null)} className="text-xl text-slate-400 hover:text-white bg-slate-700 px-3 rounded">閉じる</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 bg-slate-900 p-5 rounded-lg border border-slate-700 shadow-inner">
              <h4 className="text-xl font-extrabold text-white border-l-4 border-purple-500 pl-3">{previewScenario.title}</h4>
              <div className="bg-slate-800 p-3 rounded">
                <strong className="text-xs text-slate-400 block mb-1">世界観・設定:</strong>
                <p className="text-sm text-white whitespace-pre-wrap">{previewScenario.setting || "未設定"}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded">
                <strong className="text-xs text-slate-400 block mb-1">NPC一覧:</strong>
                <p className="text-sm text-white whitespace-pre-wrap">{previewScenario.npcList || "未設定"}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded border border-purple-900/50">
                <strong className="text-xs text-purple-300 block mb-1">プロット (AIプロンプト):</strong>
                <p className="text-sm text-white whitespace-pre-wrap">{previewScenario.plot || "未設定"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* テスター発行モーダル */}
      {showTesterModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-indigo-500/50 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-indigo-400 mb-4">🧪 テスターアカウント発行</h3>
            <p className="text-xs text-slate-300 mb-4">
              メンテナンス中でもログイン可能な専用アカウントを発行します。<br/>
              （※管理画面へのアクセス権はありません）
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-slate-400 block mb-1">ログインID (メールアドレス)</label>
                <input type="email" value={testerEmail} onChange={e=>setTesterEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" placeholder="tester@example.com" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">パスワード (6文字以上)</label>
                <input type="password" value={testerPass} onChange={e=>setTesterPass(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" placeholder="••••••" />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setShowTesterModal(false); setTesterEmail(""); setTesterPass(""); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded text-sm font-bold">キャンセル</button>
              <button 
                onClick={() => {
                  setShowTesterModal(false);
                  executeCreateTester(testerEmail, testerPass);
                }} 
                disabled={!testerEmail || testerPass.length < 6} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 py-3 rounded text-sm font-bold shadow-lg"
              >
                発行する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}