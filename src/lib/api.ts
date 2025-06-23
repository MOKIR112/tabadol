import { supabase } from "./supabase";
import { Database } from "@/types/supabase";

type Tables = Database["public"]["Tables"];
type Listing = Tables["listings"]["Row"];
type ListingInsert = Tables["listings"]["Insert"];
type ListingUpdate = Tables["listings"]["Update"];
type Message = Tables["messages"]["Row"];
type Trade = Tables["trades"]["Row"];
type Rating = Tables["ratings"]["Row"];
type Favorite = Tables["favorites"]["Row"];

// Content moderation utilities
const SUSPICIOUS_KEYWORDS = [
  "$",
  "sell",
  "money",
  "cash",
  "payment",
  "buy",
  "price",
  "cost",
  "scam",
  "fake",
  "stolen",
  "illegal",
  "drugs",
  "weapon",
];

const SPAM_PATTERNS = [
  /\b(viagra|casino|lottery|winner)\b/i,
  /\b(click here|visit now|act now)\b/i,
  /\b(free money|easy money|get rich)\b/i,
  /(.)\1{4,}/, // Repeated characters
  /[A-Z]{10,}/, // All caps words
];

// Auto-flagging function
function autoFlagContent(
  title: string,
  description: string,
): { flagged: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const content = `${title} ${description}`.toLowerCase();

  // Check for suspicious keywords
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (content.includes(keyword)) {
      reasons.push(`Contains suspicious keyword: ${keyword}`);
    }
  }

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      reasons.push("Contains spam-like patterns");
    }
  }

  return { flagged: reasons.length > 0, reasons };
}

// User behavior tracking
const userReports = new Map<string, number>();
const userSpamCount = new Map<string, { count: number; lastSpam: number }>();
const SPAM_THRESHOLD = 3;
const SPAM_WINDOW = 60 * 60 * 1000; // 1 hour

// Search suggestions and analytics
const searchAnalytics = {
  popularSearches: new Map<string, number>(),
  userSearchHistory: new Map<string, string[]>(),

  trackSearch(userId: string, query: string) {
    // Track popular searches
    const count = this.popularSearches.get(query) || 0;
    this.popularSearches.set(query, count + 1);

    // Track user search history
    const history = this.userSearchHistory.get(userId) || [];
    const updatedHistory = [query, ...history.filter((h) => h !== query)].slice(
      0,
      10,
    );
    this.userSearchHistory.set(userId, updatedHistory);
  },

  getPopularSearches(limit: number = 10): string[] {
    return Array.from(this.popularSearches.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([query]) => query);
  },

  getUserSearchHistory(userId: string): string[] {
    return this.userSearchHistory.get(userId) || [];
  },
};

// Enhanced error handling
class APIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = "APIError";
  }
}

const handleError = (error: any, context: string) => {
  console.error(`API Error in ${context}:`, error);

  if (error.code === "PGRST116") {
    throw new APIError("Resource not found", "NOT_FOUND");
  }

  if (error.code === "23505") {
    throw new APIError("Resource already exists", "DUPLICATE");
  }

  if (error.message?.includes("JWT")) {
    throw new APIError("Authentication required", "AUTH_REQUIRED");
  }

  throw new APIError(
    error.message || "An unexpected error occurred",
    error.code,
    error,
  );
};

export const api = {
  // Search and suggestions
  search: {
    async getSuggestions(query: string, userId?: string) {
      const suggestions = [];

      // Add popular searches
      const popular = searchAnalytics
        .getPopularSearches(5)
        .filter((s) => s.toLowerCase().includes(query.toLowerCase()));
      suggestions.push(...popular.map((s) => ({ type: "popular", text: s })));

      // Add user history
      if (userId) {
        const history = searchAnalytics
          .getUserSearchHistory(userId)
          .filter((s) => s.toLowerCase().includes(query.toLowerCase()));
        suggestions.push(...history.map((s) => ({ type: "history", text: s })));
      }

      // Add contextual suggestions
      suggestions.push(
        { type: "contextual", text: `${query} nearby` },
        { type: "contextual", text: `${query} under $100` },
        { type: "contextual", text: `${query} designer` },
      );

      return suggestions.slice(0, 8);
    },

    async saveSearch(userId: string, searchConfig: any) {
      const { data, error } = await supabase
        .from("saved_searches")
        .insert({
          user_id: userId,
          query: searchConfig.query,
          filters: searchConfig,
          notifications_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getSavedSearches(userId: string) {
      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  },

  // Trade proposals and management
  tradeProposals: {
    async create(proposal: {
      initiatorId: string;
      receiverId: string;
      listingId: string;
      offeredItems: string[];
      message?: string;
      terms?: string;
    }) {
      const { data, error } = await supabase
        .from("trade_proposals")
        .insert({
          initiator_id: proposal.initiatorId,
          receiver_id: proposal.receiverId,
          listing_id: proposal.listingId,
          offered_items: proposal.offeredItems,
          message: proposal.message,
          terms: proposal.terms,
          status: "PENDING",
        })
        .select(
          `
          *,
          initiator:users!initiator_id(*),
          receiver:users!receiver_id(*),
          listing:listings(*)
        `,
        )
        .single();

      if (error) throw error;

      // Send notification
      await api.notifications.create({
        user_id: proposal.receiverId,
        title: "New Trade Proposal",
        message: `You have a new trade proposal for your listing`,
        type: "trade",
        data: { proposalId: data.id, listingId: proposal.listingId },
      });

      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("trade_proposals")
        .select(
          `
          *,
          initiator:users!initiator_id(*),
          receiver:users!receiver_id(*),
          listing:listings(*)
        `,
        )
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async updateStatus(proposalId: string, status: string, userId: string) {
      const { data, error } = await supabase
        .from("trade_proposals")
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...(status === "ACCEPTED" && {
            accepted_at: new Date().toISOString(),
          }),
          ...(status === "COMPLETED" && {
            completed_at: new Date().toISOString(),
          }),
        })
        .eq("id", proposalId)
        .select(
          `
          *,
          initiator:users!initiator_id(*),
          receiver:users!receiver_id(*)
        `,
        )
        .single();

      if (error) throw error;

      // Send notification to other party
      const otherUserId =
        data.initiator_id === userId ? data.receiver_id : data.initiator_id;
      await api.notifications.create({
        user_id: otherUserId,
        title: `Trade Proposal ${status}`,
        message: `Your trade proposal has been ${status.toLowerCase()}`,
        type: "trade",
        data: { proposalId, status },
      });

      return data;
    },
  },

  // Analytics and insights
  analytics: {
    async getUserStats(userId: string) {
      const [listings, trades, proposals, ratings] = await Promise.all([
        supabase
          .from("listings")
          .select("id, views, created_at")
          .eq("user_id", userId),
        supabase
          .from("trades")
          .select("id, status, created_at")
          .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`),
        supabase
          .from("trade_proposals")
          .select("id, status, created_at")
          .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`),
        supabase
          .from("ratings")
          .select("rating, created_at")
          .eq("rated_id", userId),
      ]);

      const totalViews =
        listings.data?.reduce((sum, l) => sum + (l.views || 0), 0) || 0;
      const completedTrades =
        trades.data?.filter((t) => t.status === "COMPLETED").length || 0;
      const responseRate = proposals.data?.length
        ? (proposals.data.filter((p) => p.status !== "PENDING").length /
            proposals.data.length) *
          100
        : 0;
      const avgRating = ratings.data?.length
        ? ratings.data.reduce((sum, r) => sum + r.rating, 0) /
          ratings.data.length
        : 0;

      return {
        totalListings: listings.data?.length || 0,
        totalViews,
        completedTrades,
        responseRate: Math.round(responseRate),
        averageRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.data?.length || 0,
        joinDate: listings.data?.[0]?.created_at,
      };
    },

    async getListingAnalytics(listingId: string) {
      const [listing, messages, proposals] = await Promise.all([
        supabase.from("listings").select("*").eq("id", listingId).single(),
        supabase.from("messages").select("id").eq("listing_id", listingId),
        supabase
          .from("trade_proposals")
          .select("id, status")
          .eq("listing_id", listingId),
      ]);

      return {
        views: listing.data?.views || 0,
        messages: messages.data?.length || 0,
        proposals: proposals.data?.length || 0,
        conversionRate: proposals.data?.length
          ? (proposals.data.filter((p) => p.status === "COMPLETED").length /
              proposals.data.length) *
            100
          : 0,
      };
    },

    async getPlatformStats() {
      const [users, listings, trades, messages] = await Promise.all([
        supabase.from("users").select("id", { count: "exact" }),
        supabase
          .from("listings")
          .select("id", { count: "exact" })
          .eq("status", "ACTIVE"),
        supabase
          .from("trades")
          .select("id", { count: "exact" })
          .eq("status", "COMPLETED"),
        supabase.from("messages").select("id", { count: "exact" }),
      ]);

      return {
        totalUsers: users.count || 0,
        activeListings: listings.count || 0,
        completedTrades: trades.count || 0,
        totalMessages: messages.count || 0,
      };
    },
  },

  // Notifications
  notifications: {
    async create(notification: {
      user_id: string;
      title: string;
      message: string;
      type: string;
      data?: any;
    }) {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          ...notification,
          read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },

    async markAsRead(notificationId: string) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },

    async getUnreadCount(userId: string) {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;
      return count || 0;
    },
  },
  // Moderation
  moderation: {
    async flagListing(listingId: string, reason: string, reporterId: string) {
      const { data, error } = await supabase
        .from("listing_reports")
        .insert({
          listing_id: listingId,
          reporter_id: reporterId,
          reason,
          status: "PENDING",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async blockUser(userId: string, blockedUserId: string) {
      const { data, error } = await supabase
        .from("user_blocks")
        .insert({
          user_id: userId,
          blocked_user_id: blockedUserId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async reportUser(
      reporterId: string,
      reportedUserId: string,
      reason: string,
    ) {
      // Track reports for auto-ban
      const currentReports = userReports.get(reportedUserId) || 0;
      userReports.set(reportedUserId, currentReports + 1);

      const { data, error } = await supabase
        .from("user_reports")
        .insert({
          reporter_id: reporterId,
          reported_user_id: reportedUserId,
          reason,
          status: "PENDING",
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-ban if threshold reached
      if (currentReports >= 3) {
        await this.banUser(reportedUserId, "Auto-banned for multiple reports");
      }

      return data;
    },

    async banUser(userId: string, reason: string) {
      const { data, error } = await supabase
        .from("user_bans")
        .insert({
          user_id: userId,
          reason,
          banned_until: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async checkSpam(userId: string, content: string): Promise<boolean> {
      const now = Date.now();
      const userSpam = userSpamCount.get(userId) || { count: 0, lastSpam: 0 };

      // Reset count if outside window
      if (now - userSpam.lastSpam > SPAM_WINDOW) {
        userSpam.count = 0;
      }

      // Check for spam patterns
      const isSpam = SPAM_PATTERNS.some((pattern) => pattern.test(content));

      if (isSpam) {
        userSpam.count += 1;
        userSpam.lastSpam = now;
        userSpamCount.set(userId, userSpam);

        // Auto-ban if threshold reached
        if (userSpam.count >= SPAM_THRESHOLD) {
          await this.banUser(userId, "Auto-banned for spam");
          return true;
        }
      }

      return isSpam;
    },

    async getBlockedUsers(userId: string) {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_user_id")
        .eq("user_id", userId);

      if (error) throw error;
      return data.map((block) => block.blocked_user_id);
    },
  },

  // User stats and badges
  userStats: {
    async calculateBadges(userId: string) {
      const stats = await api.users.getStats(userId);
      const badges = [];

      if (stats.completedTrades >= 5 && stats.averageRating >= 4.5) {
        badges.push({ name: "Trusted Trader", icon: "Shield", color: "blue" });
      }

      if (stats.averageRating >= 4.8) {
        badges.push({ name: "Top Rated", icon: "Star", color: "yellow" });
      }

      if (stats.completedTrades >= 10) {
        badges.push({ name: "Veteran Trader", icon: "Award", color: "purple" });
      }

      return badges;
    },

    async getEcoStats(userId: string) {
      // Calculate environmental impact
      const trades = await api.trades.getByUserId(userId);
      const completedTrades = trades.filter((t) => t.status === "COMPLETED");

      // Estimate weight saved (mock calculation)
      const estimatedWeight = completedTrades.length * 2.5; // 2.5kg per trade average

      return {
        itemsSaved: completedTrades.length,
        weightDiverted: `${estimatedWeight}kg`,
        co2Saved: `${(estimatedWeight * 0.5).toFixed(1)}kg CO2`,
      };
    },
  },

  // Location services
  location: {
    async getListingsWithinRadius(
      lat: number,
      lng: number,
      radiusKm: number = 10,
    ) {
      // This would use PostGIS in a real implementation
      // For now, we'll use a simple approximation
      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          *,
          user:users(*),
          favorites(id)
        `,
        )
        .eq("status", "ACTIVE");

      if (error) throw error;

      // Filter by radius (simplified calculation)
      return data.filter((listing) => {
        if (!listing.latitude || !listing.longitude) return true;

        const distance = this.calculateDistance(
          lat,
          lng,
          listing.latitude,
          listing.longitude,
        );

        return distance <= radiusKm;
      });
    },

    calculateDistance(
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number,
    ): number {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
  },

  // Admin functions
  admin: {
    async getModerationQueue() {
      const { data, error } = await supabase
        .from("listing_reports")
        .select(
          `
          *,
          listing:listings(*),
          reporter:users!reporter_id(*)
        `,
        )
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async resolveReport(
      reportId: string,
      action: "APPROVED" | "REJECTED",
      adminId: string,
    ) {
      const { data, error } = await supabase
        .from("listing_reports")
        .update({
          status: action,
          resolved_by: adminId,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getSystemStats() {
      const [users, listings, trades, reports] = await Promise.all([
        supabase.from("users").select("id", { count: "exact" }),
        supabase
          .from("listings")
          .select("id", { count: "exact" })
          .eq("status", "ACTIVE"),
        supabase
          .from("trades")
          .select("id", { count: "exact" })
          .eq("status", "COMPLETED"),
        supabase
          .from("listing_reports")
          .select("id", { count: "exact" })
          .eq("status", "PENDING"),
      ]);

      return {
        totalUsers: users.count || 0,
        activeListings: listings.count || 0,
        completedTrades: trades.count || 0,
        pendingReports: reports.count || 0,
      };
    },
  },

  // Listings
  listings: {
    async getAll(filters?: {
      search?: string;
      category?: string;
      location?: string;
      limit?: number;
      offset?: number;
    }) {
      let query = supabase
        .from("listings")
        .select(
          `
          *,
          user:users(*),
          favorites(id),
          _count:messages(count)
        `,
        )
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });

      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
        );
      }

      if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      if (filters?.location && filters.location !== "all") {
        query = query.ilike("location", `%${filters.location}%`);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 10) - 1,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          *,
          user:users(*),
          favorites(id)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("listings")
        .select(
          `
          *,
          _count:messages(count)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(listing: ListingInsert) {
      try {
        // Validate required fields
        if (!listing.title || !listing.description || !listing.category) {
          throw new APIError(
            "Missing required fields: title, description, and category are required",
          );
        }

        // Auto-flag suspicious content
        const flagCheck = autoFlagContent(
          listing.title,
          listing.description || "",
        );

        const listingData = {
          ...listing,
          flagged: flagCheck.flagged,
          flag_reasons: flagCheck.reasons,
          status: flagCheck.flagged ? "PENDING_REVIEW" : "ACTIVE",
        };

        const { data, error } = await supabase
          .from("listings")
          .insert(listingData)
          .select()
          .single();

        if (error) handleError(error, "create listing");
        return data;
      } catch (error) {
        if (error instanceof APIError) throw error;
        handleError(error, "create listing");
      }
    },

    async update(id: string, updates: ListingUpdate) {
      const { data, error } = await supabase
        .from("listings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(id: string) {
      const { error } = await supabase.from("listings").delete().eq("id", id);

      if (error) throw error;
    },

    async incrementViews(id: string) {
      const { error } = await supabase.rpc("increment_listing_views", {
        listing_id: id,
      });

      if (error) throw error;
    },
  },

  // Messages
  messages: {
    async getConversations(userId: string) {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*),
          listing:listings(*)
        `,
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Database error in getConversations:", error);
        return [];
      }

      // Group messages by conversation (sender + receiver + listing)
      const conversationMap = new Map();

      data?.forEach((message) => {
        const otherUserId =
          message.sender_id === userId
            ? message.receiver_id
            : message.sender_id;
        const key = `${otherUserId}-${message.listing_id || "no-listing"}`;

        if (
          !conversationMap.has(key) ||
          new Date(message.created_at!) >
            new Date(conversationMap.get(key).created_at!)
        ) {
          conversationMap.set(key, {
            ...message,
            lastMessage: message.content,
            unreadCount: 0, // TODO: Implement unread count
            isOnline: false, // TODO: Implement online status
          });
        }
      });

      return Array.from(conversationMap.values());
    },

    async getConversation(
      userId: string,
      otherUserId: string,
      listingId?: string,
    ) {
      let query = supabase
        .from("messages")
        .select(
          `
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*),
          attachments:message_attachments(*)
        `,
        )
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
        )
        .order("created_at", { ascending: true });

      if (listingId) {
        query = query.eq("listing_id", listingId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async send(message: {
      senderId: string;
      receiverId: string;
      content: string;
      listingId?: string;
      attachments?: File[];
    }) {
      try {
        // Check for spam
        const isSpam = await api.moderation.checkSpam(
          message.senderId,
          message.content,
        );
        if (isSpam) {
          throw new Error("Message flagged as spam");
        }

        // Check if sender is blocked
        const blockedUsers = await api.moderation.getBlockedUsers(
          message.receiverId,
        );
        if (blockedUsers.includes(message.senderId)) {
          throw new Error("You are blocked by this user");
        }

        const { data, error } = await supabase
          .from("messages")
          .insert({
            sender_id: message.senderId,
            receiver_id: message.receiverId,
            content: message.content,
            listing_id: message.listingId,
            read: false,
          })
          .select(
            `
            *,
            sender:users!sender_id(*),
            receiver:users!receiver_id(*)
          `,
          )
          .single();

        if (error) throw error;

        // Handle file attachments
        if (message.attachments && message.attachments.length > 0) {
          for (const file of message.attachments) {
            const fileName = `${Date.now()}-${file.name}`;
            const filePath = `messages/${data.id}/${fileName}`;

            const uploadResult = await api.storage.uploadFile(
              "message-attachments",
              filePath,
              file,
            );

            await api.messageAttachments.create({
              messageId: data.id,
              fileUrl: uploadResult.publicUrl,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            });
          }
        }

        return data;
      } catch (error) {
        console.error("Error sending message:", error);
        throw error;
      }
    },

    async markAsRead(messageIds: string[]) {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .in("id", messageIds);

      if (error) throw error;
    },
  },

  // Favorites
  favorites: {
    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          *,
          listing:listings(
            *,
            user:users(*)
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Database error in getByUserId (favorites):", error);
        return [];
      }
      return data || [];
    },

    async add(userId: string, listingId: string) {
      // Check if already favorited
      const { data: existing } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("listing_id", listingId)
        .single();

      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from("favorites")
        .insert({
          user_id: userId,
          listing_id: listingId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async remove(userId: string, listingId: string) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("listing_id", listingId);

      if (error) throw error;
    },
  },

  // Trades
  trades: {
    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("trades")
        .select(
          `
          *,
          initiator:users!initiator_id(*),
          receiver:users!receiver_id(*),
          listing:listings(*),
          ratings(*)
        `,
        )
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(trade: {
      initiatorId: string;
      receiverId: string;
      listingId: string;
      initiatorItem: string;
      receiverItem: string;
    }) {
      const { data, error } = await supabase
        .from("trades")
        .insert({
          initiator_id: trade.initiatorId,
          receiver_id: trade.receiverId,
          listing_id: trade.listingId,
          initiator_item: trade.initiatorItem,
          receiver_item: trade.receiverItem,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async updateStatus(id: string, status: string) {
      const { data, error } = await supabase
        .from("trades")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async markComplete(
      tradeId: string,
      userId: string,
      comment?: string,
      rating?: number,
    ) {
      const { data, error } = await supabase
        .from("trades")
        .update({
          status: "COMPLETED",
          completed_by: userId,
          completion_comment: comment,
          completion_rating: rating,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tradeId)
        .select(
          `
          *,
          initiator:users!initiator_id(*),
          receiver:users!receiver_id(*),
          listing:listings(*)
        `,
        )
        .single();

      if (error) throw error;

      // Create notification for other party
      const otherUserId =
        data.initiator_id === userId ? data.receiver_id : data.initiator_id;
      await api.notifications.create({
        user_id: otherUserId,
        title: "Trade Completed",
        message: `Your trade for "${data.listing?.title}" has been marked as complete`,
        type: "trade",
        data: { tradeId, listingId: data.listing_id },
      });

      return data;
    },
  },

  // Ratings
  ratings: {
    async create(rating: {
      raterId: string;
      ratedId: string;
      tradeId: string;
      rating: number;
      comment?: string;
    }) {
      const { data, error } = await supabase
        .from("ratings")
        .insert({
          rater_id: rating.raterId,
          rated_id: rating.ratedId,
          trade_id: rating.tradeId,
          rating: rating.rating,
          comment: rating.comment,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("ratings")
        .select(
          `
          *,
          rater:users!rater_id(*),
          trade:trades(*)
        `,
        )
        .eq("rated_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  },

  // User follows
  follows: {
    async follow(followerId: string, followingId: string) {
      const { data, error } = await supabase
        .from("user_follows")
        .insert({
          follower_id: followerId,
          following_id: followingId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async unfollow(followerId: string, followingId: string) {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", followingId);

      if (error) throw error;
    },

    async isFollowing(followerId: string, followingId: string) {
      const { data, error } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .single();

      return !error && !!data;
    },

    async getFollowers(userId: string) {
      const { data, error } = await supabase
        .from("user_follows")
        .select(
          `
          *,
          follower:users!follower_id(*)
        `,
        )
        .eq("following_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async getFollowing(userId: string) {
      const { data, error } = await supabase
        .from("user_follows")
        .select(
          `
          *,
          following:users!following_id(*)
        `,
        )
        .eq("follower_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  },

  // User reviews
  reviews: {
    async create(review: {
      reviewerId: string;
      reviewedUserId: string;
      rating: number;
      comment?: string;
      tradeId?: string;
    }) {
      const { data, error } = await supabase
        .from("user_reviews")
        .insert({
          reviewer_id: review.reviewerId,
          reviewed_user_id: review.reviewedUserId,
          rating: review.rating,
          comment: review.comment,
          trade_id: review.tradeId,
        })
        .select(
          `
          *,
          reviewer:users!reviewer_id(*),
          trade:trades(*)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from("user_reviews")
        .select(
          `
          *,
          reviewer:users!reviewer_id(*),
          trade:trades(*),
          replies:review_replies(
            *,
            user:users(*)
          )
        `,
        )
        .eq("reviewed_user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async reply(reviewId: string, userId: string, reply: string) {
      const { data, error } = await supabase
        .from("review_replies")
        .insert({
          review_id: reviewId,
          user_id: userId,
          reply: reply,
        })
        .select(
          `
          *,
          user:users(*)
        `,
        )
        .single();

      if (error) throw error;
      return data;
    },
  },

  // Message attachments
  messageAttachments: {
    async create(attachment: {
      messageId: string;
      fileUrl: string;
      fileName: string;
      fileType: string;
      fileSize?: number;
    }) {
      const { data, error } = await supabase
        .from("message_attachments")
        .insert({
          message_id: attachment.messageId,
          file_url: attachment.fileUrl,
          file_name: attachment.fileName,
          file_type: attachment.fileType,
          file_size: attachment.fileSize,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getByMessageId(messageId: string) {
      const { data, error } = await supabase
        .from("message_attachments")
        .select("*")
        .eq("message_id", messageId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  },

  // File upload
  storage: {
    async uploadFile(bucket: string, path: string, file: File) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path);

      return { ...data, publicUrl };
    },

    async deleteFile(bucket: string, path: string) {
      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) throw error;
    },
  },

  // Users
  users: {
    async create(userData: {
      id: string;
      email: string;
      name?: string | null;
      avatar?: string | null;
      location?: string | null;
      bio?: string | null;
      phone?: string | null;
      email_verified?: boolean;
      phone_verified?: boolean;
    }) {
      const { data, error } = await supabase
        .from("users")
        .insert(userData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },

    async update(
      id: string,
      updates: {
        name?: string;
        avatar?: string;
        location?: string;
        bio?: string;
        phone?: string;
      },
    ) {
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getStats(userId: string) {
      const [listings, trades, ratings] = await Promise.all([
        supabase.from("listings").select("id").eq("user_id", userId),
        supabase
          .from("trades")
          .select("id")
          .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq("status", "COMPLETED"),
        supabase.from("ratings").select("rating").eq("rated_id", userId),
      ]);

      const avgRating = ratings.data?.length
        ? ratings.data.reduce((sum, r) => sum + r.rating, 0) /
          ratings.data.length
        : 0;

      return {
        totalListings: listings.data?.length || 0,
        completedTrades: trades.data?.length || 0,
        averageRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.data?.length || 0,
      };
    },

    async banUser(
      userId: string,
      reason: string,
      bannedBy: string,
      duration?: number,
    ) {
      const bannedUntil = duration
        ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from("users")
        .update({
          banned_until: bannedUntil,
          ban_reason: reason,
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async unbanUser(userId: string) {
      const { data, error } = await supabase
        .from("users")
        .update({
          banned_until: null,
          ban_reason: null,
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async getAllUsers(filters?: { role?: string; banned?: boolean }) {
      let query = supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.role) {
        query = query.eq("role", filters.role);
      }

      if (filters?.banned !== undefined) {
        if (filters.banned) {
          query = query.not("banned_until", "is", null);
        } else {
          query = query.is("banned_until", null);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  },
};
