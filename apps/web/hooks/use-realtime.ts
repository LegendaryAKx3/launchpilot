"use client";

import { useEffect, useRef } from "react";

import { createRealtimeClient } from "@/lib/supabase";

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 2000;

export function useRealtimeChannel(channel: string, onEvent: (payload: unknown) => void) {
  const reconnectAttempts = useRef(0);
  // Use ref for the callback to avoid resubscribing on every render
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const client = createRealtimeClient();
    if (!client) {
      return;
    }

    let isCancelled = false;

    function subscribe() {
      const subscription = client
        .channel(channel)
        .on("postgres_changes", { event: "*", schema: "public" }, (payload) => onEventRef.current(payload))
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            reconnectAttempts.current = 0;
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (!isCancelled && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts.current += 1;
              setTimeout(() => {
                if (!isCancelled) {
                  client.removeChannel(subscription);
                  subscribe();
                }
              }, RECONNECT_DELAY_MS * reconnectAttempts.current);
            }
          }
        });

      return subscription;
    }

    const sub = subscribe();

    return () => {
      isCancelled = true;
      if (sub) {
        client.removeChannel(sub);
      }
    };
  }, [channel]); // Only re-subscribe when channel changes, not on every callback change
}
