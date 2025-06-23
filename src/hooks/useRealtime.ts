import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { notifications } from "@/lib/notifications";

export function useRealtimeMessages(
  conversationId: string | null,
  userId: string | null,
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const messageChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `listing_id=eq.${conversationId}`,
        },
        (payload) => {
          // Handle new message
          window.dispatchEvent(
            new CustomEvent("newMessage", { detail: payload.new }),
          );
        },
      )
      .subscribe();

    setChannel(messageChannel);

    return () => {
      messageChannel.unsubscribe();
    };
  }, [conversationId, userId]);

  return channel;
}

export function useRealtimeListings() {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const listingsChannel = supabase
      .channel("listings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
        },
        (payload) => {
          // Handle listing changes
          window.dispatchEvent(
            new CustomEvent("listingUpdate", { detail: payload }),
          );
        },
      )
      .subscribe();

    setChannel(listingsChannel);

    return () => {
      listingsChannel.unsubscribe();
    };
  }, []);

  return channel;
}

export function useRealtimeTrades(userId: string | null) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const tradesChannel = supabase
      .channel(`trades:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trades",
          filter: `or(initiator_id.eq.${userId},receiver_id.eq.${userId})`,
        },
        (payload) => {
          // Handle trade updates
          window.dispatchEvent(
            new CustomEvent("tradeUpdate", { detail: payload }),
          );
        },
      )
      .subscribe();

    setChannel(tradesChannel);

    return () => {
      tradesChannel.unsubscribe();
    };
  }, [userId]);

  return channel;
}

export function useRealtimeNotifications(userId: string | null) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const notificationsChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as any;

          // Show browser notification
          notifications.showBrowserNotification(notification.title, {
            body: notification.message,
            tag: notification.id,
            data: notification.data,
          });

          // Dispatch custom event for UI updates
          window.dispatchEvent(
            new CustomEvent("newNotification", { detail: notification }),
          );
        },
      )
      .subscribe();

    setChannel(notificationsChannel);

    return () => {
      notificationsChannel.unsubscribe();
    };
  }, [userId]);

  return channel;
}

export function useRealtimeUserActivity(userId: string | null) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const activityChannel = supabase
      .channel(`user-activity:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trade_proposals",
          filter: `or(initiator_id.eq.${userId},receiver_id.eq.${userId})`,
        },
        (payload) => {
          // Handle trade proposal updates
          window.dispatchEvent(
            new CustomEvent("tradeProposalUpdate", { detail: payload }),
          );
        },
      )
      .subscribe();

    setChannel(activityChannel);

    return () => {
      activityChannel.unsubscribe();
    };
  }, [userId]);

  return channel;
}
