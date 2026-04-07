// Types manuellement définis pour correspondre au schéma Supabase.
// Format compatible Supabase JS v2.100+ (PostgREST 12).
// Ajouter Relationships: [] sur chaque table et CompositeTypes sur le schéma.

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          created_at: string
          last_seen_at: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          avatar_url?: string | null
          created_at?: string
          last_seen_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          created_at?: string
          last_seen_at?: string | null
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          id: string
          user_id: string
          plan: 'bootcamp' | 'trial' | 'free' | 'pro' | 'editor' | 'admin'
          started_at: string
          expires_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          plan: 'bootcamp' | 'trial' | 'free' | 'pro' | 'editor' | 'admin'
          started_at?: string
          expires_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          plan?: 'bootcamp' | 'trial' | 'free' | 'pro' | 'editor' | 'admin'
          started_at?: string
          expires_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      cohorts: {
        Row: {
          id: string
          name: string
          starts_at: string
          ends_at: string
          is_open: boolean
        }
        Insert: {
          id?: string
          name: string
          starts_at: string
          ends_at: string
          is_open?: boolean
        }
        Update: {
          id?: string
          name?: string
          starts_at?: string
          ends_at?: string
          is_open?: boolean
        }
        Relationships: []
      }
      cohort_members: {
        Row: {
          user_id: string
          cohort_id: string
          joined_at: string
        }
        Insert: {
          user_id: string
          cohort_id: string
          joined_at?: string
        }
        Update: {
          user_id?: string
          cohort_id?: string
          joined_at?: string
        }
        Relationships: []
      }
      contents: {
        Row: {
          id: string
          position: number
          title: string
          description: string | null
          is_published: boolean
        }
        Insert: {
          id?: string
          position: number
          title: string
          description?: string | null
          is_published?: boolean
        }
        Update: {
          id?: string
          position?: number
          title?: string
          description?: string | null
          is_published?: boolean
        }
        Relationships: []
      }
      weeks: {
        Row: {
          id: string
          content_id: string | null
          position: number
          title: string
          description: string | null
          is_published: boolean
        }
        Insert: {
          id?: string
          content_id?: string | null
          position: number
          title: string
          description?: string | null
          is_published?: boolean
        }
        Update: {
          id?: string
          content_id?: string | null
          position?: number
          title?: string
          description?: string | null
          is_published?: boolean
        }
        Relationships: []
      }
      modules: {
        Row: {
          id: string
          week_id: string
          position: number
          title: string
          slug: string
          description: string | null
          ai_context: string | null
          required_plan: 'free' | 'pro'
          is_published: boolean
          figma_url: string | null
          preview_url: string | null
          asset_url: string | null
          asset_type: 'video' | 'pdf' | 'image' | null
        }
        Insert: {
          id?: string
          week_id: string
          position: number
          title: string
          slug: string
          description?: string | null
          ai_context?: string | null
          required_plan?: 'free' | 'pro'
          is_published?: boolean
          figma_url?: string | null
          preview_url?: string | null
          asset_url?: string | null
          asset_type?: 'video' | 'pdf' | 'image' | null
        }
        Update: {
          id?: string
          week_id?: string
          position?: number
          title?: string
          slug?: string
          description?: string | null
          ai_context?: string | null
          required_plan?: 'free' | 'pro'
          is_published?: boolean
          figma_url?: string | null
          preview_url?: string | null
          asset_url?: string | null
          asset_type?: 'video' | 'pdf' | 'image' | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          id: string
          module_id: string
          position: number
          title: string
          type: 'video' | 'figma' | 'resource' | 'ui_challenge' | 'text'
          content_url: string | null
          content_body: string | null
          estimated_minutes: number | null
          is_published: boolean
        }
        Insert: {
          id?: string
          module_id: string
          position: number
          title: string
          type: 'video' | 'figma' | 'resource' | 'ui_challenge' | 'text'
          content_url?: string | null
          content_body?: string | null
          estimated_minutes?: number | null
          is_published?: boolean
        }
        Update: {
          id?: string
          module_id?: string
          position?: number
          title?: string
          type?: 'video' | 'figma' | 'resource' | 'ui_challenge' | 'text'
          content_url?: string | null
          content_body?: string | null
          estimated_minutes?: number | null
          is_published?: boolean
        }
        Relationships: []
      }
      lesson_completions: {
        Row: {
          user_id: string
          lesson_id: string
          completed_at: string
          time_spent_secs: number | null
        }
        Insert: {
          user_id: string
          lesson_id: string
          completed_at?: string
          time_spent_secs?: number | null
        }
        Update: {
          user_id?: string
          lesson_id?: string
          completed_at?: string
          time_spent_secs?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          brief_text: string | null
          brief_summary: string | null
          status: 'draft' | 'active' | 'archived' | 'done' | 'deleted'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          brief_text?: string | null
          brief_summary?: string | null
          status?: 'draft' | 'active' | 'archived' | 'done' | 'deleted'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          brief_text?: string | null
          brief_summary?: string | null
          status?: 'draft' | 'active' | 'archived' | 'done' | 'deleted'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          id: string
          project_id: string
          file_name: string
          file_type: 'pdf' | 'image' | 'link'
          storage_url: string
          extracted_text: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          project_id: string
          file_name: string
          file_type: 'pdf' | 'image' | 'link'
          storage_url: string
          extracted_text?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          file_name?: string
          file_type?: 'pdf' | 'image' | 'link'
          storage_url?: string
          extracted_text?: string | null
          uploaded_at?: string
        }
        Relationships: []
      }
      agent_templates: {
        Row: {
          id: string
          name: string
          description: string
          base_system_prompt: string
          context_variables: Record<string, string> | null
          icon: string | null
          position: number | null
          is_published: boolean
        }
        Insert: {
          id?: string
          name: string
          description: string
          base_system_prompt: string
          context_variables?: Record<string, string> | null
          icon?: string | null
          position?: number | null
          is_published?: boolean
        }
        Update: {
          id?: string
          name?: string
          description?: string
          base_system_prompt?: string
          context_variables?: Record<string, string> | null
          icon?: string | null
          position?: number | null
          is_published?: boolean
        }
        Relationships: []
      }
      project_agents: {
        Row: {
          id: string
          project_id: string
          template_id: string
          custom_name: string | null
          context_values: Record<string, string> | null
          compiled_prompt: string | null
          prompt_version: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          template_id: string
          custom_name?: string | null
          context_values?: Record<string, string> | null
          compiled_prompt?: string | null
          prompt_version?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          template_id?: string
          custom_name?: string | null
          context_values?: Record<string, string> | null
          compiled_prompt?: string | null
          prompt_version?: number
          created_at?: string
        }
        Relationships: []
      }
      ai_sessions: {
        Row: {
          id: string
          user_id: string
          agent_type: 'tutor' | 'general' | 'practice_chat' | 'practice_agent' | null
          context_module_id: string | null
          project_id: string | null
          project_agent_id: string | null
          started_at: string
          ended_at: string | null
          total_tokens_used: number
          message_count: number
        }
        Insert: {
          id?: string
          user_id: string
          agent_type?: 'tutor' | 'general' | 'practice_chat' | 'practice_agent' | null
          context_module_id?: string | null
          project_id?: string | null
          project_agent_id?: string | null
          started_at?: string
          ended_at?: string | null
          total_tokens_used?: number
          message_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          agent_type?: 'tutor' | 'general' | 'practice_chat' | 'practice_agent' | null
          context_module_id?: string | null
          project_id?: string | null
          project_agent_id?: string | null
          started_at?: string
          ended_at?: string | null
          total_tokens_used?: number
          message_count?: number
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
          tokens_used: number | null
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
          tokens_used?: number | null
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string
          tokens_used?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      trial_daily_usage: {
        Row: {
          user_id: string
          messages_today: number | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
