/**
 * Minimal hand-written schema for the one table this app owns. Regenerate with
 * `npx supabase gen types typescript --project-id <id>` once the project exists.
 */
export type PlayerProfile = {
  id: string;
  display_name: string | null;
  credits: number;
  best_win: number;
  spins: number;
  updated_at: string;
}

export type PlayerProfileUpdate = Partial<
  Omit<PlayerProfile, "id" | "updated_at">
>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: PlayerProfile;
        Insert: Partial<PlayerProfile> & { id: string };
        Update: PlayerProfileUpdate;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
