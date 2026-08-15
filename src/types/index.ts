export type ViewState = "login" | "lobby" | "scenarioEdit" | "game" | "evaluation" | "admin" | "maintenance" | "banned";

export type UserProfile = { 
  id: string; handleName: string; avatarUrl: string; bio: string; discordId?: string;
  ratingSum: number; ratingCount: number; isAdmin: boolean; isBanned: boolean; email?: string;
};

export type Notification = {
  id: string; userId: string; title: string; message: string; isRead: boolean; createdAt: string;
};

export type BanAppeal = {
  id: string; userId: string; reason: string; appealText: string; status: string; createdAt: string;
};

export type Report = {
  id: string; reporterId: string; targetType: 'user' | 'scenario' | 'scenario_appeal'; targetId: string;
  reason: string; status: string; createdAt: string;
};

export type Character = {
  id: string; name: string; job: string; personality: string; imageUrl: string;
  hp: number; san: number; str: number; dex: number; int: number; con: number; wis: number; cha: number;
};

export type Scenario = {
  id: string; title: string; system: string; tags: string; setting: string;
  npcList: string; plot: string; imageUrl: string; presetCharacters: Character[];
  ratingSum: number; ratingCount: number;
  authorId?: string; price?: number; playLimit?: number; giftLimit?: number;
  purchasedTickets?: Record<string, number>;
  isBanned?: boolean; playTime?: number;
};

export type Scene = { id: string; name: string; memberIds: string[]; leaderId?: string; isMerged?: boolean; };

export type Room = { 
  id: string; scenario_id: string; scenario?: Scenario; 
  host_name: string; status: "recruiting" | "playing" | "splitting" | "finished"; scenes: Scene[]; 
  host_id?: string;
  privacy: "open" | "secret";      
  host_message: string;            
  joined_users: Record<string, string>; 
};

export type ChatTab = "story" | "consult" | "gm";

export type Message = { sender: "player" | "gm" | "ai_player"; text: string; type?: "ic" | "ooc" | "system"; sceneId?: string; charName?: string; channel?: ChatTab | "system"; };