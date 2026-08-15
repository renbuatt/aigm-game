import React from "react";
import { ViewState, UserProfile, Report, Scenario } from "../../types";

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
};

export default function AdminView({
  isMaintenance, toggleMaintenance, reports, allUsers, scenarios, resolveReport,
  setBanTargetUser, setBanReason, setBanTargetScenario, setScenarioBanReason,
  unbanScenarioFromAppeal, userSearchQuery, setUserSearchQuery, toggleAdminStatus,
  scenarioSearchQuery, setScenarioSearchQuery, setCurrentView
}: Props) {
  return (
    <div className="flex-1 flex flex-col p-6 w-full overflow-y-auto min-h-0 max-w-5xl mx-auto">
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
          <h3 className="font-bold text-red-400 mb-3">🚨 ユーザーからの通報一覧</h3>
          <div className="h-[250px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
            {reports.filter(r => r.status === 'pending' && r.targetType !== 'scenario_appeal').map(report => {
              const reporter = allUsers.find(u => u.id === report.reporterId);
              const targetName = report.targetType === 'user' 
                ? allUsers.find(u => u.id === report.targetId)?.handleName || "不明なユーザー" 
                : scenarios.find(s => s.id === report.targetId)?.title || "不明なシナリオ";

              return (
                <div key={report.id} className="bg-slate-800 p-4 rounded-lg border border-red-900/50 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] bg-red-900 text-red-100 px-2 py-0.5 rounded font-bold">{report.targetType === 'user' ? "ユーザー通報" : "シナリオ通報"}</span>
                    <span className="text-[10px] text-slate-400">通報者: {reporter?.handleName || "不明"}</span>
                  </div>
                  <p className="text-sm font-bold text-white mt-1">対象: {targetName}</p>
                  <div className="text-xs text-slate-300 bg-slate-900 p-2 rounded border border-slate-700">
                    <span className="text-amber-400 font-bold block mb-1">【通報理由】</span>{report.reason}
                  </div>
                  <div className="flex gap-2 justify-end mt-2">
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
          <h3 className="font-bold text-white mb-3">ユーザー管理</h3>
          <input type="text" placeholder="検索..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 mb-2" />
          <div className="h-[300px] overflow-y-scroll space-y-3 pr-2 border border-slate-700/50 p-2 rounded-lg bg-slate-900/50">
            {allUsers.filter(u => u.handleName.toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))).map(user => (
              <div key={user.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                  <img src={user.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-bold text-white">{user.handleName} {user.isAdmin && <span className="text-[10px] bg-red-900 px-1 rounded">管理</span>}</p>
                    <p className="text-[10px] text-slate-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleAdminStatus(user.id, user.isAdmin)} className="text-[10px] px-3 py-2 rounded bg-slate-700">権限変更</button>
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
    </div>
  );
}