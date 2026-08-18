export type ViewState = "login" | "signup" | "onboarding" | "lobby" | "game" | "evaluation" | "admin" | "banned" | "maintenance" | "scenarioEdit" | "userProfile" | "library";

export type RoomDifficulty = "beginner" | "easy" | "normal" | "hard" | "pro" | "oni";
export type GameRule = "dnd" | "coc_en" | "coc_jp" | "sw25" | "storytelling";

export type UserProfile = {
  id: string;
  handleName: string;
  fullName?: string;
  address?: string;
  phone?: string;
  avatarUrl: string;
  bio: string;
  discordId: string;
  ratingSum: number;
  ratingCount: number;
  isAdmin: boolean;
  isTester: boolean;
  isBanned: boolean;
  email: string;
  friendIds?: string[];
  blockedUserIds?: string[];
  points?: number;            
  ticketsNormal?: number;     
  ticketsSilver?: number;     
  ticketsGold?: number;       
  ticketsPlatinum?: number;
  ticketsDiamond?: number;   // ★ 追加：Opus用チケット
  imageGenCredits?: number;  // ★ 追加：プレミアム画像生成用クレジット
};

export type Character = {
  id: string;
  name: string;
  job: string;
  genderOrRace?: string;
  personality: string;
  imageUrl: string;
  hp: number;
  san: number;
  str: number;
  dex: number;
  int: number;
  con: number;
  wis: number;
  cha: number;
  items?: string;
  playerName?: string;
};

export type Scenario = {
  id: string;
  title: string;
  system: string;
  tags: string;
  setting: string;
  npcList: string;
  plot: string;
  prologue?: string;
  epilogue?: string;
  imageUrl: string;
  presetCharacters: Character[];
  ratingSum: number;
  ratingCount: number;
  authorId?: string;
  price?: number;
  playLimit?: number;
  giftLimit?: number;
  purchasedTickets?: Record<string, number>;
  isBanned?: boolean;
  playTime?: number;
  isPlayableByOthers?: boolean;
  isTrialOk?: boolean;
  itemVisibility?: "all" | "self" | "none";
  requiredScenarioId?: string;
  playCount?: number;
  viewCount?: number;
};

export type Scene = {
  id: string;
  name: string;
  memberIds: string[];
  leaderId?: string;
  isMerged?: boolean;
};

export type RoomStatus = "recruiting" | "playing" | "splitting" | "finished";

export type Room = {
  id: string;
  scenario_id: string;
  scenario?: Scenario;
  host_name: string;
  host_id: string;
  status: RoomStatus;
  scenes: Scene[];
  privacy: 'open' | 'secret';
  host_message: string;
  joined_users: Record<string, string>;
  current_summary?: string;
  difficulty: RoomDifficulty;
  rule: GameRule;
  is_paused?: boolean;
  afk_users?: string[];
  is_trial?: boolean;
  show_items?: boolean; 
  item_visibility?: "all" | "self" | "none"; 
  inventories?: Record<string, string>;
  current_chapter_index?: number;
  isWarning?: boolean;
  spectator_ids?: string[];
  ai_model?: string; // ★ 追加：部屋が使用するAIモデル情報
};

export type Message = {
  sender: "player" | "gm" | "ai_player" | "system";
  text: string;
  type: "system" | "ic" | "ooc" | "image";
  sceneId?: string;
  charName?: string;
  channel?: string;
  imageUrl?: string;
};

export type ChatTab = "story" | "consult" | "gm";

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type BanAppeal = {
  id: string;
  userId: string;
  reason: string;
  appealText: string;
  status: 'banned' | 'appealing' | 'resolved';
  createdAt: string;
};

export type Report = {
  id: string;
  reporterId: string;
  targetType: 'user' | 'scenario' | 'scenario_appeal' | 'room';
  targetId: string;
  roomId?: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
};

export type PlayArchive = {
  id: string;
  userId: string;
  scenarioId?: string;
  scenarioTitle: string;
  scenarioImage: string;
  characterName: string;
  chatLogs: Message[];
  createdAt: string;
  rule?: string;
  coPlayers?: string[];
  novels?: Record<string, string>;
  characters?: Character[];
};