import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { UserProfile, Report, Scenario } from "../types";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

type UseAdminProps = {
  scenarios: Scenario[];
  fetchData: () => Promise<any>;
  isMaintenance: boolean;
  setIsMaintenance: React.Dispatch<React.SetStateAction<boolean>>;
  isTicketSystemEnabled: boolean;
  setIsTicketSystemEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setGeminiFlashModel: React.Dispatch<React.SetStateAction<'3.5-lite' | '3.6'>>;
  handleLogout: () => Promise<void>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useAdmin({
  scenarios, fetchData, isMaintenance, setIsMaintenance,
  isTicketSystemEnabled, setIsTicketSystemEnabled, setGeminiFlashModel,
  handleLogout, setIsLoading
}: UseAdminProps) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const fetchAdminData = async () => {
    const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (usersData) setAllUsers(usersData.map((d: any) => ({ 
      id: d.id, handleName: d.handle_name, avatarUrl: d.avatar_url, bio: d.bio, discordId: d.discord_id, 
      ratingSum: d.rating_sum || 0, ratingCount: d.rating_count || 0, isAdmin: d.is_admin || false, 
      isTester: d.is_tester || false, isBanned: d.is_banned || false, isSuspended: d.is_suspended || false, 
      email: d.email, points: d.points, ticketsBronze: d.tickets_bronze, ticketsSilver: d.tickets_silver, ticketsGold: d.tickets_gold, ticketsPlatinum: d.tickets_platinum, ticketsDiamond: d.tickets_diamond, ticketsItem: d.tickets_item 
    })));
    const { data: reportsData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (reportsData) setReports(reportsData.map((d: any) => ({ id: d.id, reporterId: d.reporter_id, targetType: d.target_type, targetId: d.target_id, roomId: d.room_id || null, reason: d.reason, status: d.status, createdAt: d.created_at })));
  };

  useEffect(() => { fetchAdminData(); }, []);

  const adminExecuteBan = async (userId: string, reason: string) => {
    await supabase.from('profiles').update({ is_banned: true }).eq('id', userId);
    await supabase.from('ban_appeals').insert({ user_id: userId, reason: reason, status: 'banned' });
    alert("BANを実行しました。"); await fetchAdminData();
  };

  const adminUnbanUser = async (userId: string) => {
    await supabase.from('profiles').update({ is_banned: false }).eq('id', userId);
    await supabase.from('ban_appeals').update({ status: 'resolved' }).eq('user_id', userId);
    alert("BANを解除しました。"); await fetchAdminData();
  };

  const adminSuspendUser = async (userId: string) => {
    await supabase.from('profiles').update({ is_suspended: true }).eq('id', userId);
    alert("一時BAN（参加制限）措置を実行しました。"); await fetchAdminData();
  };

  const adminUnsuspendUser = async (userId: string) => {
    await supabase.from('profiles').update({ is_suspended: false }).eq('id', userId);
    alert("一時BAN（参加制限）を解除しました。"); await fetchAdminData();
  };

  const adminExecuteScenarioBan = async (scenarioId: string, reason: string) => {
    const { error } = await supabase.from('scenarios').update({ is_banned: true }).eq('id', scenarioId);
    if (!error) {
      const s = scenarios.find((x: any) => x.id === scenarioId);
      if (s?.authorId) await supabase.from('notifications').insert({ user_id: s.authorId, title: '【重要】シナリオ修正依頼（一時非公開）', message: `あなたが作成したシナリオ「${s.title}」について、運営から修正依頼があります。\n\n【理由・修正内容】\n${reason}` });
      alert("シナリオを一時非公開にし、作者に修正依頼メールを送信しました。"); await fetchData(); await fetchAdminData();
    }
  };

  const adminUnbanScenario = async (scenarioId: string) => {
    await supabase.from('scenarios').update({ is_banned: false }).eq('id', scenarioId);
    alert("シナリオの非公開設定を解除しました。"); await fetchData(); await fetchAdminData();
  };

  const adminDeleteScenario = async (scenarioId: string) => {
    if(!confirm("本当にこのシナリオを強制削除しますか？\n関連する部屋も削除されます。")) return;
    await supabase.from('rooms').delete().eq('scenario_id', scenarioId);
    const { error } = await supabase.from('scenarios').delete().eq('id', scenarioId);
    if(!error) { alert("シナリオを完全に削除しました。"); await fetchData(); await fetchAdminData(); }
  };

  const adminSendMailToUser = async (userId: string, body: string) => {
    await supabase.from('notifications').insert({ user_id: userId, title: '✉️ 運営からのお知らせ', message: body });
    alert("メールを送信しました！");
  };

  // ★ 追加：全ユーザーへ一斉メール送信
  const adminSendMailToAll = async (title: string, body: string) => {
    if (!confirm(`全 ${allUsers.length} 人のユーザーに一斉メールを送信します。よろしいですか？`)) return;
    setIsLoading(true);
    try {
      const notifications = allUsers.map(u => ({
        user_id: u.id,
        title: title || '✉️ 運営からのお知らせ',
        message: body
      }));
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
      alert("全ユーザーへの一斉メール送信が完了しました！");
    } catch (err: any) {
      alert("送信エラー: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMaintenance = async () => { const newStatus = !isMaintenance; await supabase.from('app_settings').update({ is_maintenance: newStatus }).eq('id', 1); setIsMaintenance(newStatus); alert(`メンテナンスモードを ${newStatus ? "ON" : "OFF"} にしました。`); };
  const toggleTicketSystem = async () => { const newStatus = !isTicketSystemEnabled; await supabase.from('app_settings').update({ is_ticket_system_enabled: newStatus }).eq('id', 1); setIsTicketSystemEnabled(newStatus); alert(`チケットシステムを ${newStatus ? "ON" : "OFF"} にしました。`); };
  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => { const newStatus = !currentStatus; await supabase.from('profiles').update({ is_admin: newStatus }).eq('id', userId); alert(newStatus ? "管理者権限を付与しました。" : "管理者権限を剥奪しました。"); fetchAdminData(); };
  const toggleTesterStatus = async (userId: string, currentStatus: boolean) => { const newStatus = !currentStatus; await supabase.from('profiles').update({ is_tester: newStatus }).eq('id', userId); alert(newStatus ? "テスター権限を付与しました。" : "テスター権限を剥奪しました。"); fetchAdminData(); };
  const toggleGeminiFlashModel = async (newModel: '3.5-lite' | '3.6') => { const { error } = await supabase.from('app_settings').update({ gemini_flash_model: newModel }).eq('id', 1); if (error) { alert(`設定の保存に失敗しました。`); } setGeminiFlashModel(newModel); alert(`AIモデルを ${newModel} に変更しました。`); };
  const resolveReport = async (reportId: string) => { await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId); fetchAdminData(); };
  
  const grantPointsToAll = async (amount: number) => {
    if (!confirm(`全ユーザーに一律 ${amount} ptを付与しますか？`)) return;
    setIsLoading(true);
    for (const user of allUsers) { await supabase.from('profiles').update({ points: (user.points || 0) + amount }).eq('id', user.id); }
    alert(`全ユーザーに ${amount} ptを付与しました！`); await fetchAdminData(); setIsLoading(false);
  };

  const executeCreateTester = async (testerEmail: string, testerPass: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email: testerEmail, password: testerPass });
      if (error) throw error;
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, handle_name: testerEmail.split("@")[0], avatar_url: DEFAULT_AVATAR, is_tester: true, is_admin: false, email: testerEmail });
        alert("テスターアカウントを発行しました！\n再度ログインし直してください。"); await handleLogout();
      }
    } catch (err: any) { alert("作成失敗: " + err.message); }
  };

  const adminGrantItem = async (userId: string, itemType: string, amount: number) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    const dbKeyMap: Record<string, string> = {
      points: 'points', ticketsBronze: 'tickets_bronze', ticketsSilver: 'tickets_silver', ticketsGold: 'tickets_gold', ticketsPlatinum: 'tickets_platinum', ticketsDiamond: 'tickets_diamond', ticketsItem: 'tickets_item'
    };
    const dbKey = dbKeyMap[itemType];
    if (!dbKey) return;
    const currentVal = (user as any)[itemType] || 0;
    const { error } = await supabase.from('profiles').update({ [dbKey]: currentVal + amount }).eq('id', userId);
    if (error) alert("付与に失敗しました: " + error.message);
    else { alert(`ユーザーに ${amount} 個付与しました。`); await fetchAdminData(); }
  };

  return {
    allUsers, reports, fetchAdminData, adminExecuteBan, adminUnbanUser, adminSuspendUser, adminUnsuspendUser, adminExecuteScenarioBan, adminUnbanScenario, adminDeleteScenario, adminSendMailToUser, adminSendMailToAll, toggleMaintenance, toggleTicketSystem, toggleAdminStatus, toggleTesterStatus, toggleGeminiFlashModel, resolveReport, grantPointsToAll, executeCreateTester, adminGrantItem
  };
}