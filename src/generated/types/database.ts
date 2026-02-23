export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      air_companies: {
        Row: {
          address: string | null
          ceo_name: string | null
          city: string | null
          clients_count: number | null
          competitors: string | null
          core_values: string | null
          created_at: string | null
          description: string
          email: string | null
          employees_count: number | null
          id: string
          industry: string
          inn: string | null
          key_processes: string | null
          legal_form: string | null
          main_problems: string | null
          mission: string | null
          name: string
          ogrn: string | null
          onboarding_completed: boolean | null
          owner_tg_id: number
          phone: string | null
          products_services: string | null
          revenue_monthly: number | null
          swot_opportunities: string | null
          swot_strengths: string | null
          swot_threats: string | null
          swot_weaknesses: string | null
          updated_at: string | null
          used_systems: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          ceo_name?: string | null
          city?: string | null
          clients_count?: number | null
          competitors?: string | null
          core_values?: string | null
          created_at?: string | null
          description: string
          email?: string | null
          employees_count?: number | null
          id?: string
          industry: string
          inn?: string | null
          key_processes?: string | null
          legal_form?: string | null
          main_problems?: string | null
          mission?: string | null
          name: string
          ogrn?: string | null
          onboarding_completed?: boolean | null
          owner_tg_id: number
          phone?: string | null
          products_services?: string | null
          revenue_monthly?: number | null
          swot_opportunities?: string | null
          swot_strengths?: string | null
          swot_threats?: string | null
          swot_weaknesses?: string | null
          updated_at?: string | null
          used_systems?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          ceo_name?: string | null
          city?: string | null
          clients_count?: number | null
          competitors?: string | null
          core_values?: string | null
          created_at?: string | null
          description?: string
          email?: string | null
          employees_count?: number | null
          id?: string
          industry?: string
          inn?: string | null
          key_processes?: string | null
          legal_form?: string | null
          main_problems?: string | null
          mission?: string | null
          name?: string
          ogrn?: string | null
          onboarding_completed?: boolean | null
          owner_tg_id?: number
          phone?: string | null
          products_services?: string | null
          revenue_monthly?: number | null
          swot_opportunities?: string | null
          swot_strengths?: string | null
          swot_threats?: string | null
          swot_weaknesses?: string | null
          updated_at?: string | null
          used_systems?: string | null
          website?: string | null
        }
        Relationships: []
      }
      air_departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      air_document_templates: {
        Row: {
          created_at: string | null
          default_format: string | null
          description: string | null
          document_type: string
          id: string
          is_active: boolean | null
          name: string
          required_fields: Json | null
          template_content: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_format?: string | null
          description?: string | null
          document_type: string
          id?: string
          is_active?: boolean | null
          name: string
          required_fields?: Json | null
          template_content: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_format?: string | null
          description?: string | null
          document_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          required_fields?: Json | null
          template_content?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      air_documents: {
        Row: {
          chunks_count: number | null
          created_at: string | null
          department_id: number | null
          file_id: string | null
          file_name: string
          file_size: number | null
          id: string
          s3_url: string | null
          user_id: number
        }
        Insert: {
          chunks_count?: number | null
          created_at?: string | null
          department_id?: number | null
          file_id?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          s3_url?: string | null
          user_id: number
        }
        Update: {
          chunks_count?: number | null
          created_at?: string | null
          department_id?: number | null
          file_id?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          s3_url?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "air_documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "air_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "air_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "air_profiles"
            referencedColumns: ["tg_id"]
          },
        ]
      }
      air_favorites: {
        Row: {
          chat_id: number
          created_at: string | null
          id: string
          message_id: number
          message_text: string | null
          message_type: string | null
          user_id: number
        }
        Insert: {
          chat_id: number
          created_at?: string | null
          id?: string
          message_id: number
          message_text?: string | null
          message_type?: string | null
          user_id: number
        }
        Update: {
          chat_id?: number
          created_at?: string | null
          id?: string
          message_id?: number
          message_text?: string | null
          message_type?: string | null
          user_id?: number
        }
        Relationships: []
      }
      air_generated_documents: {
        Row: {
          celery_task_id: string | null
          completed_at: string | null
          created_at: string | null
          document_type: string
          error_message: string | null
          file_format: string
          file_name: string
          file_size_bytes: number | null
          id: string
          is_favorite: boolean | null
          is_vectorized: boolean | null
          metadata: Json | null
          s3_path: string
          s3_url: string | null
          status: string | null
          template_name: string | null
          user_id: number
        }
        Insert: {
          celery_task_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_type: string
          error_message?: string | null
          file_format: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          is_favorite?: boolean | null
          is_vectorized?: boolean | null
          metadata?: Json | null
          s3_path: string
          s3_url?: string | null
          status?: string | null
          template_name?: string | null
          user_id: number
        }
        Update: {
          celery_task_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_type?: string
          error_message?: string | null
          file_format?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          is_favorite?: boolean | null
          is_vectorized?: boolean | null
          metadata?: Json | null
          s3_path?: string
          s3_url?: string | null
          status?: string | null
          template_name?: string | null
          user_id?: number
        }
        Relationships: []
      }
      air_profiles: {
        Row: {
          communication_style: string | null
          created_at: string | null
          department_id: number | null
          full_name: string | null
          id: string
          role: string
          search_mode: string | null
          tg_id: number
          tone: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          communication_style?: string | null
          created_at?: string | null
          department_id?: number | null
          full_name?: string | null
          id?: string
          role?: string
          search_mode?: string | null
          tg_id: number
          tone?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          communication_style?: string | null
          created_at?: string | null
          department_id?: number | null
          full_name?: string | null
          id?: string
          role?: string
          search_mode?: string | null
          tg_id?: number
          tone?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "air_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "air_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      air_role_prompts: {
        Row: {
          id: number
          is_active: boolean | null
          role_key: string
          role_name: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          id?: number
          is_active?: boolean | null
          role_key: string
          role_name: string
          system_prompt: string
          updated_at?: string
        }
        Update: {
          id?: number
          is_active?: boolean | null
          role_key?: string
          role_name?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_entity_links: {
        Row: {
          entity_id: string
          entity_type: string
          file_id: string
          id: string
          linked_at: string | null
          linked_by: string | null
          notes: string | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          file_id: string
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          notes?: string | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          file_id?: string
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_entity_links_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_entity_links_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files_with_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_entity_links_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files_with_item_count"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_id: string
          id: string
          mime_type: string | null
          size: number
          storage_path: string
          version_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_id: string
          id?: string
          mime_type?: string | null
          size: number
          storage_path: string
          version_number: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_id?: string
          id?: string
          mime_type?: string | null
          size?: number
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files_with_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files_with_item_count"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          can_delete: boolean | null
          can_index: boolean | null
          can_read: boolean | null
          can_write: boolean | null
          chunks_count: number | null
          created_at: string | null
          created_by: string | null
          embedding_model: string | null
          id: string
          index_status: string | null
          indexing_error: string | null
          indexing_progress: number | null
          is_folder: boolean | null
          last_indexed: string | null
          mime_type: string | null
          name: string
          parent_id: string | null
          path: string
          size: number | null
          sort_order: number | null
          starred: boolean | null
          storage_path: string
          storage_provider: string
          tags: string[] | null
          type: string
          updated_at: string | null
          updated_by: string | null
          vector_id: string | null
        }
        Insert: {
          bucket: string
          can_delete?: boolean | null
          can_index?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          chunks_count?: number | null
          created_at?: string | null
          created_by?: string | null
          embedding_model?: string | null
          id?: string
          index_status?: string | null
          indexing_error?: string | null
          indexing_progress?: number | null
          is_folder?: boolean | null
          last_indexed?: string | null
          mime_type?: string | null
          name: string
          parent_id?: string | null
          path: string
          size?: number | null
          sort_order?: number | null
          starred?: boolean | null
          storage_path: string
          storage_provider: string
          tags?: string[] | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
          vector_id?: string | null
        }
        Update: {
          bucket?: string
          can_delete?: boolean | null
          can_index?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          chunks_count?: number | null
          created_at?: string | null
          created_by?: string | null
          embedding_model?: string | null
          id?: string
          index_status?: string | null
          indexing_error?: string | null
          indexing_progress?: number | null
          is_folder?: boolean | null
          last_indexed?: string | null
          mime_type?: string | null
          name?: string
          parent_id?: string | null
          path?: string
          size?: number | null
          sort_order?: number | null
          starred?: boolean | null
          storage_path?: string
          storage_provider?: string
          tags?: string[] | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          vector_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files_with_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files_with_item_count"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string | null
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_seen_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_tags: {
        Row: {
          created_at: string
          project_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shared_links: {
        Row: {
          access_level: string
          created_at: string
          created_by: string
          description: string | null
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          never_expires: boolean | null
          password_hash: string | null
          requires_password: boolean | null
          token: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          access_level?: string
          created_at?: string
          created_by: string
          description?: string | null
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          never_expires?: boolean | null
          password_hash?: string | null
          requires_password?: boolean | null
          token: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          access_level?: string
          created_at?: string
          created_by?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          never_expires?: boolean | null
          password_hash?: string | null
          requires_password?: boolean | null
          token?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      task_tags: {
        Row: {
          created_at: string
          tag_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      test_notes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      files_with_entities: {
        Row: {
          bucket: string | null
          can_delete: boolean | null
          can_index: boolean | null
          can_read: boolean | null
          can_write: boolean | null
          chunks_count: number | null
          created_at: string | null
          created_by: string | null
          embedding_model: string | null
          entities: Json | null
          id: string | null
          index_status: string | null
          indexing_error: string | null
          indexing_progress: number | null
          is_folder: boolean | null
          last_indexed: string | null
          mime_type: string | null
          name: string | null
          parent_id: string | null
          path: string | null
          size: number | null
          sort_order: number | null
          starred: boolean | null
          storage_path: string | null
          storage_provider: string | null
          tags: string[] | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          vector_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files_with_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files_with_item_count"
            referencedColumns: ["id"]
          },
        ]
      }
      files_with_item_count: {
        Row: {
          bucket: string | null
          can_delete: boolean | null
          can_index: boolean | null
          can_read: boolean | null
          can_write: boolean | null
          chunks_count: number | null
          created_at: string | null
          created_by: string | null
          embedding_model: string | null
          id: string | null
          index_status: string | null
          indexing_error: string | null
          indexing_progress: number | null
          is_folder: boolean | null
          item_count: number | null
          last_indexed: string | null
          mime_type: string | null
          name: string | null
          parent_id: string | null
          path: string | null
          size: number | null
          sort_order: number | null
          starred: boolean | null
          storage_path: string | null
          storage_provider: string | null
          tags: string[] | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          vector_id: string | null
        }
        Insert: {
          bucket?: string | null
          can_delete?: boolean | null
          can_index?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          chunks_count?: number | null
          created_at?: string | null
          created_by?: string | null
          embedding_model?: string | null
          id?: string | null
          index_status?: string | null
          indexing_error?: string | null
          indexing_progress?: number | null
          is_folder?: boolean | null
          item_count?: never
          last_indexed?: string | null
          mime_type?: string | null
          name?: string | null
          parent_id?: string | null
          path?: string | null
          size?: number | null
          sort_order?: number | null
          starred?: boolean | null
          storage_path?: string | null
          storage_provider?: string | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vector_id?: string | null
        }
        Update: {
          bucket?: string | null
          can_delete?: boolean | null
          can_index?: boolean | null
          can_read?: boolean | null
          can_write?: boolean | null
          chunks_count?: number | null
          created_at?: string | null
          created_by?: string | null
          embedding_model?: string | null
          id?: string | null
          index_status?: string | null
          indexing_error?: string | null
          indexing_progress?: number | null
          is_folder?: boolean | null
          item_count?: never
          last_indexed?: string | null
          mime_type?: string | null
          name?: string | null
          parent_id?: string | null
          path?: string | null
          size?: number | null
          sort_order?: number | null
          starred?: boolean | null
          storage_path?: string | null
          storage_provider?: string | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vector_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files_with_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "files_with_item_count"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_statistics: {
        Row: {
          accepted_invites: number | null
          avg_acceptance_time_seconds: number | null
          expired_invites: number | null
          first_invite_date: string | null
          invited_by: string | null
          last_invite_date: string | null
          pending_invites: number | null
          revoked_invites: number | null
          total_invites: number | null
        }
        Relationships: []
      }
      projects_with_tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          status: string | null
          tags: Json | null
          updated_at: string | null
        }
        Relationships: []
      }
      shared_link_statistics: {
        Row: {
          active_links: number | null
          avg_views: number | null
          created_by: string | null
          entity_type: string | null
          expired_active_links: number | null
          max_views: number | null
          password_protected_links: number | null
          total_links: number | null
          total_views: number | null
          valid_links: number | null
        }
        Relationships: []
      }
      tag_statistics: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string | null
          name: string | null
          project_count: number | null
          slug: string | null
          task_count: number | null
          updated_at: string | null
          usage_count: number | null
        }
        Relationships: []
      }
      tasks_with_tags: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          priority: string | null
          project_id: string | null
          status: string | null
          tags: Json | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_tags"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invite: {
        Args: { invite_token: string; user_id: string }
        Returns: boolean
      }
      can_user_share_entity: {
        Args: { p_entity_id: string; p_entity_type: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_shared_links: {
        Args: never
        Returns: {
          deactivated_count: number
          deleted_count: number
        }[]
      }
      count_folder_items: { Args: { folder_id: string }; Returns: number }
      generate_invite_token: { Args: never; Returns: string }
      generate_share_token: { Args: never; Returns: string }
      get_active_invites: {
        Args: { user_id: string }
        Returns: {
          created_at: string
          days_until_expiry: number
          email: string
          expires_at: string
          id: string
          role: string
          status: string
          token: string
        }[]
      }
      get_share_status: {
        Args: { link_token: string }
        Returns: {
          access_level: string
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          error_message: string
          expires_at: string
          is_valid: boolean
          last_accessed_at: string
          never_expires: boolean
          requires_password: boolean
          view_count: number
        }[]
      }
      get_shared_entity: {
        Args: { link_token: string }
        Returns: {
          access_level: string
          entity_data: Json
          entity_id: string
          entity_type: string
          error_message: string
          expires_at: string
          is_valid: boolean
          requires_password: boolean
          view_count: number
        }[]
      }
      increment_share_view_count: {
        Args: { link_token: string }
        Returns: undefined
      }
      is_invite_valid: { Args: { invite_token: string }; Returns: boolean }
      is_shared_link_valid: { Args: { link_token: string }; Returns: boolean }
      verify_share_password: {
        Args: { link_token: string; password: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
