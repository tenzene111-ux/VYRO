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
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          name: string;
          bio?: string | null;
          location?: string | null;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          name?: string;
          bio?: string | null;
          location?: string | null;
          verified?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          text?: string;
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
    };
    Views: Record<string, never>;
    Functions: {
      is_conversation_member: {
        Args: { conv_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
