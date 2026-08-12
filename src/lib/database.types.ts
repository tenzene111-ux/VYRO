export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          name: string;
          bio: string | null;
          location: string | null;
          verified: boolean;
          coins: number;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          name: string;
          bio?: string | null;
          location?: string | null;
          verified?: boolean;
          coins?: number;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          name?: string;
          bio?: string | null;
          location?: string | null;
          verified?: boolean;
          coins?: number;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          text: string;
          image_url: string | null;
          video_url: string | null;
          cover_url: string | null;
          video_duration_seconds: number | null;
          comments_enabled: boolean;
          visibility: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          text: string;
          image_url?: string | null;
          video_url?: string | null;
          cover_url?: string | null;
          video_duration_seconds?: number | null;
          comments_enabled?: boolean;
          visibility?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          text?: string;
          image_url?: string | null;
          video_url?: string | null;
          cover_url?: string | null;
          video_duration_seconds?: number | null;
          comments_enabled?: boolean;
          visibility?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_likes: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          text?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          is_group: boolean;
          title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          is_group?: boolean;
          title?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          is_group?: boolean;
          title?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          text?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          privacy: string;
          creator_id: string;
          conversation_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          privacy?: string;
          creator_id: string;
          conversation_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          privacy?: string;
          creator_id?: string;
          conversation_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      marketplace_listings: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          description: string | null;
          price: number;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          title: string;
          description?: string | null;
          price?: number;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          title?: string;
          description?: string | null;
          price?: number;
          category?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          host_id: string;
          title: string;
          description: string | null;
          location: string | null;
          starts_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          title: string;
          description?: string | null;
          location?: string | null;
          starts_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          title?: string;
          description?: string | null;
          location?: string | null;
          starts_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          event_id: string;
          user_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      stories: {
        Row: {
          id: string;
          author_id: string;
          caption: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          caption: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          caption?: string;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      story_views: {
        Row: {
          story_id: string;
          viewer_id: string;
          viewed_at: string;
        };
        Insert: {
          story_id: string;
          viewer_id: string;
          viewed_at?: string;
        };
        Update: {
          story_id?: string;
          viewer_id?: string;
          viewed_at?: string;
        };
        Relationships: [];
      };
      coin_transactions: {
        Row: {
          id: string;
          user_id: string;
          delta: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          delta: number;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          delta?: number;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      gifts_sent: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          gift_key: string;
          coin_cost: number;
          live_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          gift_key: string;
          coin_cost: number;
          live_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          gift_key?: string;
          coin_cost?: number;
          live_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      live_sessions: {
        Row: {
          id: string;
          host_id: string;
          title: string;
          category: string;
          privacy: string;
          status: string;
          room_name: string;
          started_at: string | null;
          ended_at: string | null;
          peak_viewers: number;
          replay_url: string | null;
          replay_ready: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          title: string;
          category?: string;
          privacy?: string;
          status?: string;
          room_name?: string;
          started_at?: string | null;
          ended_at?: string | null;
          peak_viewers?: number;
          replay_url?: string | null;
          replay_ready?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          title?: string;
          category?: string;
          privacy?: string;
          status?: string;
          room_name?: string;
          started_at?: string | null;
          ended_at?: string | null;
          peak_viewers?: number;
          replay_url?: string | null;
          replay_ready?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      live_guests: {
        Row: {
          id: string;
          live_id: string;
          guest_id: string;
          status: string;
          invited_at: string;
          joined_at: string | null;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          live_id: string;
          guest_id: string;
          status?: string;
          invited_at?: string;
          joined_at?: string | null;
          left_at?: string | null;
        };
        Update: {
          id?: string;
          live_id?: string;
          guest_id?: string;
          status?: string;
          invited_at?: string;
          joined_at?: string | null;
          left_at?: string | null;
        };
        Relationships: [];
      };
      live_viewer_sessions: {
        Row: {
          id: string;
          live_id: string;
          viewer_id: string;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          live_id: string;
          viewer_id: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          id?: string;
          live_id?: string;
          viewer_id?: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Relationships: [];
      };
      live_blocked_viewers: {
        Row: { live_id: string; user_id: string; created_at: string };
        Insert: { live_id: string; user_id: string; created_at?: string };
        Update: { live_id?: string; user_id?: string; created_at?: string };
        Relationships: [];
      };
      live_messages: {
        Row: {
          id: string;
          live_id: string;
          sender_id: string;
          text: string;
          pinned: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          live_id: string;
          sender_id: string;
          text: string;
          pinned?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          live_id?: string;
          sender_id?: string;
          text?: string;
          pinned?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      live_polls: {
        Row: {
          id: string;
          live_id: string;
          question: string;
          options: Json;
          created_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          live_id: string;
          question: string;
          options: Json;
          created_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          live_id?: string;
          question?: string;
          options?: Json;
          created_at?: string;
          closed_at?: string | null;
        };
        Relationships: [];
      };
      live_poll_votes: {
        Row: { poll_id: string; user_id: string; option_index: number; created_at: string };
        Insert: { poll_id: string; user_id: string; option_index: number; created_at?: string };
        Update: { poll_id?: string; user_id?: string; option_index?: number; created_at?: string };
        Relationships: [];
      };
      live_reports: {
        Row: {
          id: string;
          live_id: string;
          reporter_id: string;
          reason: string;
          details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          live_id: string;
          reporter_id: string;
          reason: string;
          details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          live_id?: string;
          reporter_id?: string;
          reason?: string;
          details?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      live_matches: {
        Row: {
          id: string;
          live_id_a: string;
          live_id_b: string;
          started_at: string;
          ends_at: string;
          status: string;
          winner_live_id: string | null;
        };
        Insert: {
          id?: string;
          live_id_a: string;
          live_id_b: string;
          started_at?: string;
          ends_at: string;
          status?: string;
          winner_live_id?: string | null;
        };
        Update: {
          id?: string;
          live_id_a?: string;
          live_id_b?: string;
          started_at?: string;
          ends_at?: string;
          status?: string;
          winner_live_id?: string | null;
        };
        Relationships: [];
      };
      call_logs: {
        Row: {
          id: string;
          caller_id: string;
          callee_id: string;
          kind: string;
          outcome: string;
          duration_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          caller_id: string;
          callee_id: string;
          kind: string;
          outcome?: string;
          duration_seconds?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          caller_id?: string;
          callee_id?: string;
          kind?: string;
          outcome?: string;
          duration_seconds?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: string;
          post_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: string;
          post_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string | null;
          type?: string;
          post_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_conversation_member: {
        Args: { conv_id: string };
        Returns: boolean;
      };
      is_group_member: {
        Args: { g_id: string };
        Returns: boolean;
      };
      create_group: {
        Args: { p_name: string; p_description: string | null; p_privacy: string };
        Returns: string;
      };
      join_group: {
        Args: { p_group_id: string };
        Returns: undefined;
      };
      leave_group: {
        Args: { p_group_id: string };
        Returns: undefined;
      };
      send_gift: {
        Args: { p_receiver_id: string; p_gift_key: string; p_coin_cost: number; p_live_id?: string | null };
        Returns: undefined;
      };
      is_live_host: {
        Args: { l_id: string };
        Returns: boolean;
      };
      can_view_live: {
        Args: { l_id: string };
        Returns: boolean;
      };
      get_match_score: {
        Args: { p_match_id: string };
        Returns: { score_a: number; score_b: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
