import React from "react";
import { supabase } from "../lib/supabase";
import { UserProfile, Room, ViewState } from "../types";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

type UseAuthProps = {
  email: string;
  password: string;
  setAuthLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchData: () => Promise<any>;
  fetchProfile: (userId: string, emailStr: string, currentMaintenance: boolean, roomsData: Room[]) => Promise<void>;
  isMaintenance: boolean;
  currentUser: UserProfile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewState>>;
  setActiveRoom: React.Dispatch<React.SetStateAction<Room | null>>;
  setJoinedCharacter: React.Dispatch<React.SetStateAction<any>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useAuth({
  email, password, setAuthLoading, fetchData, fetchProfile, isMaintenance,
  currentUser, setCurrentUser, setCurrentView, setActiveRoom, setJoinedCharacter, setIsLoading
}: UseAuthProps) {

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { formattedRooms } = await fetchData();
      if (data.user) await fetchProfile(data.user.id, email, isMaintenance, formattedRooms);
    } catch (error: any) { alert("ログインエラー: " + error.message); } finally { setAuthLoading(false); }
  };

  const handleEmailSignUp = async (e: React.FormEvent, name: string, addr: string, phone: string) => {
    e.preventDefault();
    if (!email || !password || !name || !addr || !phone) return;
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        const { error: upsertError } = await supabase.from('profiles').upsert({ id: data.user.id, handle_name: name.split(" ")[0] || email.split("@")[0], full_name: name, address: addr, phone: phone, avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", email: email });
        if (upsertError) throw upsertError;
        alert("アカウントを作成しました！");
        const { formattedRooms } = await fetchData();
        await fetchProfile(data.user.id, email, isMaintenance, formattedRooms);
      }
    } catch (error: any) { alert("登録エラー: " + error.message); } finally { setAuthLoading(false); }
  };

  const handleProfileSetup = async (name: string, addr: string, phone: string) => {
    setAuthLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("セッションが見つかりません。");
      const { error: upsertError } = await supabase.from('profiles').upsert({ id: session.user.id, handle_name: name.split(" ")[0] || session.user.email?.split("@")[0], full_name: name, address: addr, phone: phone, avatar_url: DEFAULT_AVATAR, bio: "よろしくお願いします。", email: session.user.email });
      if (upsertError) throw upsertError;
      alert("登録が完了しました！");
      const { formattedRooms } = await fetchData();
      await fetchProfile(session.user.id, session.user.email || "", isMaintenance, formattedRooms);
    } catch (error: any) { alert("登録エラー: " + error.message); } finally { setAuthLoading(false); }
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert("Googleログインの初期設定が未完了です: " + error.message);
    setAuthLoading(false);
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setCurrentUser(null); 
    setCurrentView("login"); 
    setActiveRoom(null); 
    setJoinedCharacter(null); 
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const { error } = await supabase.from('profiles').update({ handle_name: updates.handleName, bio: updates.bio, avatar_url: updates.avatarUrl }).eq('id', currentUser.id);
    if (error) alert("プロフィールの更新に失敗しました: " + error.message);
    else setCurrentUser({ ...currentUser, ...updates });
  };

  const uploadAvatar = async (file: File) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await updateProfile({ avatarUrl: data.publicUrl });
      alert("アイコン画像を更新しました！");
    } catch (e: any) {
      alert("アップロード失敗: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addFriend = async (targetId: string) => {
    if (!currentUser) return;
    if (currentUser.friendIds?.includes(targetId)) { alert("既に友達に登録されています。"); return; }
    const newFriends = [...(currentUser.friendIds || []), targetId];
    const { error } = await supabase.from('profiles').update({ friend_ids: newFriends }).eq('id', currentUser.id);
    if (!error) { setCurrentUser({ ...currentUser, friendIds: newFriends }); alert("友達に追加しました！"); } 
    else { alert("エラーが発生しました: " + error.message); }
  };

  const blockUser = async (targetId: string) => {
    if (!currentUser) return;
    if (confirm("このユーザーをブロックしますか？\n（お互いに作成した部屋が見えなくなり、あなたが参加している部屋も相手から見えなくなります）")) {
      const newBlocked = [...(currentUser.blockedUserIds || []), targetId];
      const newFriends = (currentUser.friendIds || []).filter((id: string) => id !== targetId);
      const { error } = await supabase.from('profiles').update({ blocked_user_ids: newBlocked, friend_ids: newFriends }).eq('id', currentUser.id);
      if (!error) { setCurrentUser({ ...currentUser, blockedUserIds: newBlocked, friendIds: newFriends }); alert("ブロックしました。"); }
    }
  };

  const unblockUser = async (targetId: string) => {
    if (!currentUser) return;
    const newBlocked = (currentUser.blockedUserIds || []).filter((id: string) => id !== targetId);
    const { error } = await supabase.from('profiles').update({ blocked_user_ids: newBlocked }).eq('id', currentUser.id);
    if (!error) { setCurrentUser({ ...currentUser, blockedUserIds: newBlocked }); alert("ブロックを解除しました。"); }
  };

  return {
    handleEmailAuth,
    handleEmailSignUp,
    handleProfileSetup,
    handleGoogleAuth,
    handleLogout,
    updateProfile,
    uploadAvatar,
    addFriend,
    blockUser,
    unblockUser
  };
}