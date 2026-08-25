export interface BotLink {
  id: string;
  label: string; // e.g., 'Character.ai', 'Janitor AI', 'Chub.ai', 'Discord'
  url: string;
}

export interface CommentReply {
  id: string;
  nickname: string;
  content: string;
  createdAt: string;
  avatar?: string;
  userId?: string;
  isAdmin?: boolean;
  userBadge?: string;
  likes?: number;
  likedUserIds?: string[];
}

export interface Comment {
  id: string;
  nickname: string;
  content: string;
  createdAt: string;
  isAdmin?: boolean;
  likes?: number;
  likedUserIds?: string[];
  avatar?: string;
  userId?: string;
  replies?: CommentReply[];
  userBadge?: string;
}

export interface Bot {
  id: string;
  name: string;
  type: 'GL' | 'Futa';
  imageUrl?: string;
  tags: string[];
  authorNote: string;
  links: BotLink[];
  createdAt: string;
  updatedAt?: string;
  views: number;
  likes?: number;
  likedUserIds?: string[];
  comments: Comment[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface FeedbackReply {
  id: string;
  nickname: string;
  content: string;
  createdAt: string;
  avatar?: string;
  isAdmin?: boolean;
  userBadge?: string;
}

export interface Feedback {
  id: string;
  nickname: string;
  isAnonymous: boolean;
  content: string;
  createdAt: string;
  reply?: string;
  replies?: FeedbackReply[];
  updatedAt?: string;
  avatar?: string;
  userId?: string;
  userBadge?: string;
}

export interface RequestReply {
  id: string;
  nickname: string;
  content: string;
  createdAt: string;
  isAdmin?: boolean;
  avatar?: string;
  userBadge?: string;
}

export interface BotRequest {
  id: string;
  nickname: string;
  title: string;
  type: 'GL' | 'Futa';
  description: string;
  createdAt: string;
  votes: number;
  votedUserIds?: string[]; // to prevent double voting on client session
  reply?: string;
  status?: string; // "Chờ duyệt" | "Đang làm" | "Đã xong"
  userReplies?: RequestReply[];
  avatar?: string;
  userBadge?: string;
}

export interface AuthorSettings {
  authorName: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeIntro: string;
  bannerUrl?: string;
  facebookUrl?: string;
  discordUrl?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdAt: string;
  votedUsers: { [userId: string]: string }; // Maps userId to optionId
  votedUsersMeta?: { [userId: string]: { nickname: string; avatar: string } }; // Maps userId to nickname & avatar
  closed?: boolean;
  winnerOptionId?: string;
}

export interface VisitorLog {
  id: string;
  nickname: string;
  action: string;
  timestamp: string;
  userAgent?: string;
}

export interface QuotaStats {
  dailyFreeQuota: number;
  totalFirestoreReads: number;
  totalFirestoreWrites: number;
  totalReadsSavedByCache: number;
  readsLastHour: number;
  readsLast24Hours: number;
  estimatedDailyReads: number;
  estimatedQuotaPercent: number;
  currentUsedPercent: number;
  status: 'safe' | 'warning' | 'critical';
  uptimeHours: number;
  lastReadTimestamp: number;
  readCacheTTLSeconds: number;
  timeUntilCacheExpirySeconds: number;
  isCooldownActive: boolean;
  cooldownRemainingSeconds: number;
  pendingWritesCount: number;
}

export interface AppState {
  bots: Bot[];
  announcements: Announcement[];
  feedbacks: Feedback[];
  botRequests: BotRequest[];
  authorSettings?: AuthorSettings;
  polls?: Poll[];
  visitorLogs?: VisitorLog[];
  pendingWritesCount?: number;
  quotaStats?: QuotaStats;
  isStaleFallback?: boolean;
  updatedAt?: string;
  lastUpdated?: number;
}

/**
 * Helper to calculate total comment count for a bot, including nested replies.
 */
export function getBotCommentCount(bot: Bot): number {
  if (!bot.comments) return 0;
  let count = bot.comments.length;
  bot.comments.forEach(c => {
    if (c.replies) {
      count += c.replies.length;
    }
  });
  return count;
}
