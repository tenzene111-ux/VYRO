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
          public_key_jwk: Json | null;
          referred_by: string | null;
          is_admin: boolean;
          status: string;
          subscription_price_coins: number;
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
          public_key_jwk?: Json | null;
          referred_by?: string | null;
          is_admin?: boolean;
          status?: string;
          subscription_price_coins?: number;
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
          public_key_jwk?: Json | null;
          referred_by?: string | null;
          is_admin?: boolean;
          status?: string;
          subscription_price_coins?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      creator_subscriptions: {
        Row: {
          id: string;
          subscriber_id: string;
          creator_id: string;
          coin_cost: number;
          started_at: string;
          renews_at: string;
        };
        Insert: {
          id?: string;
          subscriber_id: string;
          creator_id: string;
          coin_cost: number;
          started_at?: string;
          renews_at: string;
        };
        Update: {
          id?: string;
          subscriber_id?: string;
          creator_id?: string;
          coin_cost?: number;
          started_at?: string;
          renews_at?: string;
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
          remix_type: string | null;
          remix_of_post_id: string | null;
          community_id: string | null;
          created_at: string;
          edited_at: string | null;
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
          remix_type?: string | null;
          remix_of_post_id?: string | null;
          community_id?: string | null;
          created_at?: string;
          edited_at?: string | null;
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
          remix_type?: string | null;
          remix_of_post_id?: string | null;
          community_id?: string | null;
          created_at?: string;
          edited_at?: string | null;
        };
        Relationships: [];
      };
      communities: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          cover_url: string | null;
          logo_url: string | null;
          category: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          cover_url?: string | null;
          logo_url?: string | null;
          category?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          cover_url?: string | null;
          logo_url?: string | null;
          category?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      community_members: {
        Row: {
          community_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          community_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          community_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      daily_checkins: {
        Row: {
          user_id: string;
          checkin_date: string;
          streak_count: number;
          reward_coins: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          checkin_date: string;
          streak_count?: number;
          reward_coins?: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          checkin_date?: string;
          streak_count?: number;
          reward_coins?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          details: string | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          details?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_type?: string;
          target_id?: string;
          reason?: string;
          details?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      post_likes: {
        Row: {
          post_id: string;
          user_id: string;
          reaction: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          reaction?: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
          reaction?: string;
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
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          text: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          text?: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      comment_likes: {
        Row: {
          comment_id: string;
          user_id: string;
          reaction: string;
          created_at: string;
        };
        Insert: {
          comment_id: string;
          user_id: string;
          reaction?: string;
          created_at?: string;
        };
        Update: {
          comment_id?: string;
          user_id?: string;
          reaction?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      saved_posts: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      video_watch_events: {
        Row: {
          id: string;
          post_id: string;
          viewer_id: string;
          watched_seconds: number;
          video_duration_seconds: number | null;
          completed: boolean;
          replayed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          viewer_id: string;
          watched_seconds?: number;
          video_duration_seconds?: number | null;
          completed?: boolean;
          replayed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          viewer_id?: string;
          watched_seconds?: number;
          video_duration_seconds?: number | null;
          completed?: boolean;
          replayed?: boolean;
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
          is_self: boolean;
          title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          is_group?: boolean;
          is_self?: boolean;
          title?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          is_group?: boolean;
          is_self?: boolean;
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
          last_read_at: string;
          archived: boolean;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          joined_at?: string;
          last_read_at?: string;
          archived?: boolean;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
          joined_at?: string;
          last_read_at?: string;
          archived?: boolean;
        };
        Relationships: [];
      };
      message_reactions: {
        Row: {
          message_id: string;
          conversation_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          conversation_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          message_id?: string;
          conversation_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          text: string | null;
          audio_url: string | null;
          audio_duration_seconds: number | null;
          ciphertext: string | null;
          iv: string | null;
          sender_public_key_jwk: Json | null;
          recipient_public_key_jwk: Json | null;
          reply_to_id: string | null;
          edited_at: string | null;
          deleted_at: string | null;
          pinned: boolean;
          forwarded: boolean;
          image_url: string | null;
          video_url: string | null;
          file_url: string | null;
          file_name: string | null;
          file_size: number | null;
          poll_id: string | null;
          location_lat: number | null;
          location_lng: number | null;
          location_label: string | null;
          shared_profile_id: string | null;
          story_id: string | null;
          story_preview_image_url: string | null;
          story_preview_text: string | null;
          topic_id: string | null;
          sticker_emoji: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          text?: string | null;
          audio_url?: string | null;
          audio_duration_seconds?: number | null;
          ciphertext?: string | null;
          iv?: string | null;
          sender_public_key_jwk?: Json | null;
          recipient_public_key_jwk?: Json | null;
          reply_to_id?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
          pinned?: boolean;
          forwarded?: boolean;
          image_url?: string | null;
          video_url?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          poll_id?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_label?: string | null;
          shared_profile_id?: string | null;
          story_id?: string | null;
          story_preview_image_url?: string | null;
          story_preview_text?: string | null;
          topic_id?: string | null;
          sticker_emoji?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          text?: string | null;
          audio_url?: string | null;
          audio_duration_seconds?: number | null;
          ciphertext?: string | null;
          iv?: string | null;
          sender_public_key_jwk?: Json | null;
          recipient_public_key_jwk?: Json | null;
          reply_to_id?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
          pinned?: boolean;
          forwarded?: boolean;
          image_url?: string | null;
          video_url?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          poll_id?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_label?: string | null;
          shared_profile_id?: string | null;
          story_id?: string | null;
          story_preview_image_url?: string | null;
          story_preview_text?: string | null;
          topic_id?: string | null;
          sticker_emoji?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      polls: {
        Row: {
          id: string;
          conversation_id: string;
          creator_id: string;
          question: string;
          allow_multiple: boolean;
          closed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          creator_id: string;
          question: string;
          allow_multiple?: boolean;
          closed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          creator_id?: string;
          question?: string;
          allow_multiple?: boolean;
          closed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      poll_options: {
        Row: {
          id: string;
          poll_id: string;
          text: string;
          position: number;
        };
        Insert: {
          id?: string;
          poll_id: string;
          text: string;
          position?: number;
        };
        Update: {
          id?: string;
          poll_id?: string;
          text?: string;
          position?: number;
        };
        Relationships: [];
      };
      poll_votes: {
        Row: {
          poll_id: string;
          option_id: string;
          user_id: string;
          conversation_id: string;
          created_at: string;
        };
        Insert: {
          poll_id: string;
          option_id: string;
          user_id: string;
          conversation_id: string;
          created_at?: string;
        };
        Update: {
          poll_id?: string;
          option_id?: string;
          user_id?: string;
          conversation_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_folders: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_folder_conversations: {
        Row: {
          folder_id: string;
          conversation_id: string;
        };
        Insert: {
          folder_id: string;
          conversation_id: string;
        };
        Update: {
          folder_id?: string;
          conversation_id?: string;
        };
        Relationships: [];
      };
      channels: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          privacy: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          privacy?: string;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          privacy?: string;
          owner_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      channel_subscribers: {
        Row: {
          channel_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          channel_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          channel_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      channel_posts: {
        Row: {
          id: string;
          channel_id: string;
          author_id: string;
          text: string | null;
          image_url: string | null;
          video_url: string | null;
          pinned: boolean;
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          author_id: string;
          text?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          pinned?: boolean;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          author_id?: string;
          text?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          pinned?: boolean;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      channel_post_likes: {
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
      channel_post_comments: {
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
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          privacy: string;
          creator_id: string;
          conversation_id: string | null;
          encrypted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          privacy?: string;
          creator_id: string;
          conversation_id?: string | null;
          encrypted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          privacy?: string;
          creator_id?: string;
          conversation_id?: string | null;
          encrypted?: boolean;
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
      group_bans: {
        Row: {
          group_id: string;
          user_id: string;
          banned_by: string | null;
          created_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          banned_by?: string | null;
          created_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          banned_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      group_topics: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          icon: string;
          created_by: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          icon?: string;
          created_by?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          name?: string;
          icon?: string;
          created_by?: string | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      group_keys: {
        Row: {
          group_id: string;
          member_id: string;
          wrapped_key: string;
          wrapped_iv: string;
          wrapper_public_key_jwk: Json;
          created_at: string;
        };
        Insert: {
          group_id: string;
          member_id: string;
          wrapped_key: string;
          wrapped_iv: string;
          wrapper_public_key_jwk: Json;
          created_at?: string;
        };
        Update: {
          group_id?: string;
          member_id?: string;
          wrapped_key?: string;
          wrapped_iv?: string;
          wrapper_public_key_jwk?: Json;
          created_at?: string;
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
          caption: string | null;
          image_url: string | null;
          video_url: string | null;
          audience: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          caption?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          audience?: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          caption?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          audience?: string;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      close_friends: {
        Row: {
          user_id: string;
          friend_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          friend_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          friend_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      story_highlights: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          cover_image_url: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          cover_image_url?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          cover_image_url?: string | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      story_highlight_items: {
        Row: {
          id: string;
          highlight_id: string;
          image_url: string | null;
          video_url: string | null;
          caption: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          highlight_id: string;
          image_url?: string | null;
          video_url?: string | null;
          caption?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          highlight_id?: string;
          image_url?: string | null;
          video_url?: string | null;
          caption?: string | null;
          position?: number;
          created_at?: string;
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
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      passkeys: {
        Row: {
          id: string;
          user_id: string;
          credential_id: string;
          public_key: string;
          counter: number;
          device_type: string | null;
          backed_up: boolean;
          transports: string[] | null;
          name: string | null;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          credential_id: string;
          public_key: string;
          counter?: number;
          device_type?: string | null;
          backed_up?: boolean;
          transports?: string[] | null;
          name?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          credential_id?: string;
          public_key?: string;
          counter?: number;
          device_type?: string | null;
          backed_up?: boolean;
          transports?: string[] | null;
          name?: string | null;
          created_at?: string;
          last_used_at?: string | null;
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
      enable_group_encryption: {
        Args: { p_group_id: string };
        Returns: undefined;
      };
      promote_group_admin: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: undefined;
      };
      demote_group_admin: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: undefined;
      };
      remove_group_member: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: undefined;
      };
      ban_group_member: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: undefined;
      };
      unban_group_member: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: undefined;
      };
      update_group_info: {
        Args: { p_group_id: string; p_name: string; p_description: string | null };
        Returns: undefined;
      };
      admin_delete_group_message: {
        Args: { p_message_id: string };
        Returns: undefined;
      };
      create_channel: {
        Args: { p_name: string; p_description: string | null; p_privacy: string };
        Returns: string;
      };
      join_channel: {
        Args: { p_channel_id: string };
        Returns: undefined;
      };
      leave_channel: {
        Args: { p_channel_id: string };
        Returns: undefined;
      };
      promote_channel_admin: {
        Args: { p_channel_id: string; p_user_id: string };
        Returns: undefined;
      };
      demote_channel_admin: {
        Args: { p_channel_id: string; p_user_id: string };
        Returns: undefined;
      };
      create_channel_post: {
        Args: { p_channel_id: string; p_text: string | null; p_image_url: string | null; p_video_url: string | null };
        Returns: string;
      };
      delete_channel_post: {
        Args: { p_post_id: string };
        Returns: undefined;
      };
      pin_channel_post: {
        Args: { p_channel_id: string; p_post_id: string };
        Returns: undefined;
      };
      unpin_channel_post: {
        Args: { p_post_id: string };
        Returns: undefined;
      };
      create_poll: {
        Args: { p_conversation_id: string; p_question: string; p_options: string[]; p_allow_multiple: boolean };
        Returns: string;
      };
      vote_poll: {
        Args: { p_poll_id: string; p_option_ids: string[] };
        Returns: undefined;
      };
      close_poll: {
        Args: { p_poll_id: string };
        Returns: undefined;
      };
      send_gift: {
        Args: { p_receiver_id: string; p_gift_key: string; p_coin_cost: number; p_live_id?: string | null };
        Returns: undefined;
      };
      subscribe_to_creator: {
        Args: { p_creator_id: string };
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
      create_community: {
        Args: { p_name: string; p_description: string | null; p_category: string | null; p_cover_url: string | null; p_logo_url: string | null };
        Returns: string;
      };
      join_community: {
        Args: { p_community_id: string };
        Returns: undefined;
      };
      leave_community: {
        Args: { p_community_id: string };
        Returns: undefined;
      };
      claim_daily_checkin: {
        Args: Record<string, never>;
        Returns: { streak: number; reward: number }[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_resolve_report: {
        Args: { p_report_id: string; p_status: string };
        Returns: undefined;
      };
      admin_delete_post: {
        Args: { p_post_id: string };
        Returns: undefined;
      };
      admin_set_user_status: {
        Args: { p_user_id: string; p_status: string };
        Returns: undefined;
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
