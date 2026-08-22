import React, { useState } from "react";
import { UserProfile, Report, Scenario } from "../../types";

type AdminViewProps = {
  isMaintenance: boolean; toggleMaintenance: () => void;
  isTicketSystemEnabled: boolean; toggleTicketSystem: () => void;
  geminiFlashModel: '3.5-lite' | '3.6'; toggleGeminiFlashModel: (model: '3.5-lite' | '3.6') => void;
  reports: Report[]; resolveReport: (id: string) => void;
  allUsers: UserProfile[]; scenarios: Scenario[];
  toggleAdminStatus: (id: string, status: boolean) => void;
  toggleTesterStatus: (id: string, status: boolean) => void;
  adminExecuteBan: (id: string, reason: string) => void;
  adminUnbanUser: (id: string) => void;
  adminSuspendUser: (id: string) => void;
  adminUnsuspendUser: (id: string) => void;
  adminExecuteScenarioBan: (id: string, reason: string) => void;
  adminUnbanScenario: (id: string) => void;
  adminDeleteScenario: (id: string) => void;
  setCurrentView: (view: any) => void;
  executeCreateTester: (email: string, pass: string) => void;
  grantPointsToAll: (amount: number) => void;
  adminSendMailToUser: (id: string, body: string) => void;
  adminGrantItem?: (id: string, type: string, amount: number) => void;
};

export default function AdminView(props: AdminViewProps) {
  const [tab, setTab] = useState<'system'|'users'|'scenarios'|'errors'>('system');

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center p-6 border-b border-slate-700 shrink-0 mt-8">
        <div>
          <h2 className="text-2xl font-bold text-red-400">⚙️ 管理ダッシュボード</h2>
          <p className="text-sm text-slate-400 mt-1">システム設定、ユーザー管理、通報・エラー対応を行います。</p>
        </div>
        <button onClick={() => props.setCurrentView('lobby')} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 font-bold rounded shadow">ロビーに戻る</button>
      </div>

      <div className="flex border-b border-slate-700 shrink-0">
         <button onClick={() => setTab('system')} className={`flex-1 py-4 font-bold ${tab === 'system' ? 'border-b-2 border-red-500 text-red-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800'}`}>🔧 システム制御</button>
         <button onClick={() => setTab('users')} className={`flex-1 py-4 font-bold ${tab === 'users' ? 'border-b-2 border-red-500 text-red-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800'}`}>👤 ユーザーリスト</button>
         <button onClick={() => setTab('scenarios')} className={`flex-1 py-4 font-bold ${tab === 'scenarios' ? 'border-b-2 border-red-500 text-red-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800'}`}>📚 シナリオリスト</button>
         <button onClick={() => setTab('errors')} className={`flex-1 py-4 font-bold ${tab === 'errors' ? 'border-b-2 border-red-500 text-red-400 bg-slate-800/50' : 'text-slate-400 hover:bg-slate-800'}`}>🚨 エラーログ・通報</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {tab === 'system' && <SystemTab {...props} />}
        {tab === 'users' && <UsersTab {...props} />}
        {tab === 'scenarios' && <ScenariosTab {...props} />}
        {tab === 'errors' && <ErrorsTab {...props} />}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 各タブのコンポーネント
// ----------------------------------------------------

const SystemTab = (props: AdminViewProps) => {
  const [testerEmail, setTesterEmail] = useState("");
  const [testerPass, setTesterPass] = useState("");
  const [pointAmount, setPointAmount] = useState(100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="font-bold text-lg mb-4">🔧 全体システム制御</h3>
          <div className="flex justify-between items-center py-4 border-b border-slate-700">
            <div>
              <div className="font-bold text-red-400">メンテナンスモード</div>
              <div className="text-xs text-slate-400">ONにすると一般ユーザーはログインできなくなります。</div>
            </div>
            <button onClick={props.toggleMaintenance} className={`px-4 py-2 font-bold rounded ${props.isMaintenance ? 'bg-red-600' : 'bg-slate-600'}`}>{props.isMaintenance ? 'ON (稼働中)' : 'OFF'}</button>
          </div>
          <div className="flex justify-between items-center py-4 border-b border-slate-700">
            <div>
              <div className="font-bold text-blue-400">チケット（課金）システム</div>
              <div className="text-xs text-slate-400">ONにすると部屋の作成・入室にチケット消費が必要になります。</div>
            </div>
            <button onClick={props.toggleTicketSystem} className={`px-4 py-2 font-bold rounded ${props.isTicketSystemEnabled ? 'bg-blue-600' : 'bg-slate-600'}`}>{props.isTicketSystemEnabled ? 'ON (有効)' : 'OFF'}</button>
          </div>
          <div className="py-4">
            <div className="font-bold text-purple-400 mb-1">裏側AIモデル (Gemini Flash) の切り替え</div>
            <div className="text-xs text-slate-400 mb-3">「シルバー部屋」や「システム処理」で使われるFlashのバージョンを変更します。</div>
            <div className="flex gap-2">
              <button onClick={() => props.toggleGeminiFlashModel('3.5-lite')} className={`flex-1 py-2 rounded font-bold ${props.geminiFlashModel === '3.5-lite' ? 'bg-purple-600' : 'bg-slate-700'}`}>3.5 Flash Lite (最速)</button>
              <button onClick={() => props.toggleGeminiFlashModel('3.6')} className={`flex-1 py-2 rounded font-bold ${props.geminiFlashModel === '3.6' ? 'bg-slate-600 border border-slate-500' : 'bg-slate-700'}`}>3.6 Flash (通常)</button>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-yellow-700/50">
           <h3 className="font-bold text-yellow-400 mb-2">💰 全員にポイントを配布（お詫び等）</h3>
           <div className="text-xs text-slate-400 mb-4">※登録されている全ユーザーに対して一律でポイントを加算します。</div>
           <div className="flex gap-2">
             <input type="number" value={pointAmount} onChange={e=>setPointAmount(Number(e.target.value))} className="w-24 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
             <button onClick={()=>props.grantPointsToAll(pointAmount)} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-slate-900 rounded font-bold">全ユーザーに付与する</button>
           </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
         <h3 className="font-bold text-emerald-400 text-lg mb-4">🧪 テスターアカウント発行</h3>
         <div className="text-xs text-slate-400 mb-6">メンテナンス中もログインでき、チケット消費を無視できる専用アカウントを作成します。</div>
         <div className="space-y-4">
           <div>
             <label className="block text-xs text-slate-400 mb-1">メールアドレス</label>
             <input type="email" value={testerEmail} onChange={e=>setTesterEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
           </div>
           <div>
             <label className="block text-xs text-slate-400 mb-1">パスワード（6文字以上）</label>
             <input type="password" value={testerPass} onChange={e=>setTesterPass(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
           </div>
           <button onClick={()=>{ if(!testerEmail || !testerPass) return; props.executeCreateTester(testerEmail, testerPass); }} className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded font-bold mt-4">
             発行する（※自動的にログアウトされます）
           </button>
         </div>
      </div>
    </div>
  );
};

const UsersTab = (props: AdminViewProps) => {
  const [mailModal, setMailModal] = useState<string|null>(null);
  const [mailBody, setMailBody] = useState("");
  
  const [grantModal, setGrantModal] = useState<string|null>(null);
  const [grantType, setGrantType] = useState("points");
  const [grantAmount, setGrantAmount] = useState(1);

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-400 mb-4">全 {props.allUsers.length} ユーザー登録</div>
      {props.allUsers.map(u => (
         <div key={u.id} className="p-5 bg-slate-800 rounded-xl border border-slate-700 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 hover:border-slate-600 transition-colors">
            <div>
              <div className="font-bold text-lg">{u.handleName} <span className="text-sm font-normal text-slate-400">({u.email})</span></div>
              <div className="text-xs text-slate-500 mt-1 font-mono">ID: {u.id}</div>
              <div className="flex gap-2 mt-2">
                {u.isAdmin && <span className="bg-red-900 text-red-200 text-[10px] px-2 py-0.5 rounded">Admin</span>}
                {u.isTester && <span className="bg-emerald-900 text-emerald-200 text-[10px] px-2 py-0.5 rounded">Tester</span>}
                {u.isBanned && <span className="bg-slate-900 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-900">BANNED</span>}
                {u.isSuspended && <span className="bg-amber-900 text-amber-200 text-[10px] px-2 py-0.5 rounded">Suspended</span>}
              </div>
              <div className="text-xs text-slate-400 mt-3 flex flex-wrap gap-x-3 gap-y-1">
                <span>💰 ポイント: <strong className="text-yellow-400">{u.points || 0}</strong></span>
                <span>🟤 ブロンズ({u.ticketsBronze || 0})</span>
                <span>⚪ シルバー({u.ticketsSilver || 0})</span>
                <span>🟡 ゴールド({u.ticketsGold || 0})</span>
                <span>🟣 プラチナ({u.ticketsPlatinum || 0})</span>
                <span>💎 ダイヤ({u.ticketsDiamond || 0})</span>
                <span>💼 アイテム({u.ticketsItem || 0})</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full xl:w-auto">
               <button onClick={() => setMailModal(u.id)} className="bg-blue-600 hover:bg-blue-500 text-xs px-4 py-2.5 rounded font-bold">✉️ 個別メール</button>
               <button onClick={() => setGrantModal(u.id)} className="bg-yellow-600 hover:bg-yellow-500 text-xs px-4 py-2.5 rounded text-slate-900 font-bold">🎁 個別付与</button>
               
               {!u.isSuspended ? (
                 <button onClick={() => props.adminSuspendUser(u.id)} className="bg-amber-700 hover:bg-amber-600 text-xs px-4 py-2.5 rounded font-bold">一時BAN</button>
               ) : (
                 <button onClick={() => props.adminUnsuspendUser(u.id)} className="bg-slate-600 hover:bg-slate-500 text-xs px-4 py-2.5 rounded font-bold">一時BAN解除</button>
               )}

               {!u.isBanned ? (
                 <button onClick={() => {
                    const reason = prompt("BANの理由を入力してください:");
                    if(reason) props.adminExecuteBan(u.id, reason);
                 }} className="bg-red-700 hover:bg-red-600 text-xs px-4 py-2.5 rounded font-bold">永久BAN</button>
               ) : (
                 <button onClick={() => props.adminUnbanUser(u.id)} className="bg-slate-600 hover:bg-slate-500 text-xs px-4 py-2.5 rounded font-bold">BAN解除</button>
               )}
            </div>
         </div>
      ))}

      {mailModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-center p-4">
           <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-slate-700">
              <h3 className="font-bold mb-4 text-blue-400">個別メール送信</h3>
              <textarea value={mailBody} onChange={e=>setMailBody(e.target.value)} className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 mb-4 text-sm text-white" placeholder="メッセージを入力..."></textarea>
              <div className="flex gap-3">
                 <button onClick={()=>setMailModal(null)} className="flex-1 bg-slate-700 py-3 rounded font-bold">キャンセル</button>
                 <button onClick={()=>{ props.adminSendMailToUser(mailModal, mailBody); setMailModal(null); setMailBody(""); }} className="flex-1 bg-blue-600 py-3 rounded font-bold shadow-lg">送信</button>
              </div>
           </div>
        </div>
      )}

      {grantModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-center p-4">
           <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-slate-700">
              <h3 className="font-bold mb-4 text-yellow-400">アイテム個別付与</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">付与するアイテム</label>
                  <select value={grantType} onChange={e=>setGrantType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white">
                    <option value="points">💰 ポイント</option>
                    <option value="ticketsBronze">🟤 ブロンズチケット</option>
                    <option value="ticketsSilver">⚪ シルバーチケット</option>
                    <option value="ticketsGold">🟡 ゴールドチケット</option>
                    <option value="ticketsPlatinum">🟣 プラチナチケット</option>
                    <option value="ticketsDiamond">💎 ダイヤチケット</option>
                    <option value="ticketsItem">💼 アイテムチケット</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">付与する数量</label>
                  <input type="number" value={grantAmount} onChange={e=>setGrantAmount(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm text-white" />
                </div>
              </div>
              <div className="flex gap-3">
                 <button onClick={()=>setGrantModal(null)} className="flex-1 bg-slate-700 py-3 rounded font-bold">キャンセル</button>
                 <button onClick={()=>{ if(props.adminGrantItem) props.adminGrantItem(grantModal, grantType, grantAmount); setGrantModal(null); }} className="flex-1 bg-yellow-600 text-slate-900 py-3 rounded font-bold shadow-lg shadow-yellow-900/50">付与する</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const ScenariosTab = (props: AdminViewProps) => {
   return (
     <div className="space-y-4">
        <div className="text-sm text-slate-400 mb-4">全 {props.scenarios.length} シナリオ</div>
        {props.scenarios.map(s => (
           <div key={s.id} className="p-5 bg-slate-800 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-600 transition-colors">
              <div>
                <div className="font-bold text-lg">{s.title}</div>
                <div className="text-xs text-slate-500 mt-1 font-mono">ID: {s.id} | Author: {s.authorId}</div>
                {s.isBanned && <div className="mt-2"><span className="bg-red-900/50 text-red-400 text-xs px-2 py-0.5 rounded border border-red-900">一時非公開（修正依頼中）</span></div>}
              </div>
              
              <div className="flex flex-wrap gap-2">
                 {!s.isBanned ? (
                   <button onClick={() => {
                      const reason = prompt("修正依頼（一時非公開）の理由を入力してください:");
                      if(reason) props.adminExecuteScenarioBan(s.id, reason);
                   }} className="bg-amber-700 hover:bg-amber-600 text-xs px-4 py-2.5 rounded font-bold">期間BAN (修正依頼)</button>
                 ) : (
                   <button onClick={() => props.adminUnbanScenario(s.id)} className="bg-slate-600 hover:bg-slate-500 text-xs px-4 py-2.5 rounded font-bold">非公開解除</button>
                 )}
                 <button onClick={() => props.adminDeleteScenario(s.id)} className="bg-red-700 hover:bg-red-600 text-xs px-4 py-2.5 rounded font-bold">BAN (強制削除)</button>
              </div>
           </div>
        ))}
     </div>
   );
};

const ErrorsTab = (props: AdminViewProps) => {
   const [filter, setFilter] = useState<'all'|'system'>('system');
   const displayed = props.reports.filter(r => {
      if (filter === 'system') return r.reason?.includes('自動記録');
      return true;
   });

   return (
     <div className="space-y-4">
        <div className="flex gap-2 mb-6 border-b border-slate-700 pb-4">
           <button onClick={()=>setFilter('system')} className={`px-4 py-2 text-sm rounded transition-colors ${filter==='system' ? 'bg-red-900/80 text-red-200 border border-red-500 font-bold' : 'bg-slate-800 border border-slate-700 text-red-300'}`}>🚨 エラーログのみ</button>
           <button onClick={()=>setFilter('all')} className={`px-4 py-2 text-sm rounded transition-colors ${filter==='all' ? 'bg-slate-600 font-bold' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}>ユーザー通報を含むすべて</button>
        </div>

        {displayed.length === 0 && <div className="text-slate-500 text-sm py-10 text-center bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">該当するデータはありません。</div>}

        {displayed.map(r => (
           <div key={r.id} className="p-5 bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
              <div className="flex justify-between items-center mb-3">
                 <span className={`text-xs px-2 py-1 rounded font-bold shadow ${r.status === 'resolved' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>
                   {r.status === 'resolved' ? '✅ 解決済み' : '⚠️ 未解決 (Pending)'}
                 </span>
                 <span className="text-xs text-slate-500 font-mono">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-xs text-slate-400 mb-3 bg-slate-900/50 p-2 rounded inline-block">
                <span className="mr-4">Type: <strong className="text-slate-200">{r.targetType}</strong></span>
                <span>Target ID: <strong className="text-slate-200">{r.targetId}</strong></span>
              </div>
              <pre className="text-sm whitespace-pre-wrap font-mono bg-slate-900 p-4 rounded-lg text-slate-300 overflow-x-auto border border-slate-700">
                {r.reason}
              </pre>
              {r.status === 'pending' && (
                 <div className="mt-4 flex justify-end border-t border-slate-700 pt-4">
                   <button onClick={()=>props.resolveReport(r.id)} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 text-sm rounded font-bold shadow-lg transition-colors">解決済みにする</button>
                 </div>
              )}
           </div>
        ))}
     </div>
   );
};