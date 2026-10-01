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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          active: boolean
          address_type: string
          city: string
          country_code: string
          create_date: string
          fsp_id: string
          id: string
          line_1: string
          line_2: string | null
          postal_code: string | null
          primary: boolean
          province: string | null
          suburb: string | null
          update_date: string
        }
        Insert: {
          active?: boolean
          address_type: string
          city: string
          country_code?: string
          create_date?: string
          fsp_id: string
          id?: string
          line_1: string
          line_2?: string | null
          postal_code?: string | null
          primary?: boolean
          province?: string | null
          suburb?: string | null
          update_date?: string
        }
        Update: {
          active?: boolean
          address_type?: string
          city?: string
          country_code?: string
          create_date?: string
          fsp_id?: string
          id?: string
          line_1?: string
          line_2?: string | null
          postal_code?: string | null
          primary?: boolean
          province?: string | null
          suburb?: string | null
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_review_jobs: {
        Row: {
          attempt_count: number
          attempt_id: string
          available_date: string
          complete_date: string | null
          create_date: string
          error_category: string | null
          id: string
          locked_date: string | null
          max_attempts: number
          review_id: string
          status: string
          submission_id: string
          worker_id: string | null
        }
        Insert: {
          attempt_count?: number
          attempt_id: string
          available_date?: string
          complete_date?: string | null
          create_date?: string
          error_category?: string | null
          id?: string
          locked_date?: string | null
          max_attempts?: number
          review_id: string
          status?: string
          submission_id: string
          worker_id?: string | null
        }
        Update: {
          attempt_count?: number
          attempt_id?: string
          available_date?: string
          complete_date?: string | null
          create_date?: string
          error_category?: string | null
          id?: string
          locked_date?: string | null
          max_attempts?: number
          review_id?: string
          status?: string
          submission_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_review_jobs_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "submission_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_review_jobs_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "submission_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_review_jobs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          actor_user_id: string | null
          entity_id: string | null
          entity_type: string
          event_type: string
          fsp_id: string | null
          id: string
          metadata: Json | null
          occurrence_date: string
          submission_id: string | null
          tenant_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          entity_id?: string | null
          entity_type: string
          event_type: string
          fsp_id?: string | null
          id?: string
          metadata?: Json | null
          occurrence_date?: string
          submission_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          fsp_id?: string | null
          id?: string
          metadata?: Json | null
          occurrence_date?: string
          submission_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          active: boolean
          contact_number: string | null
          create_date: string
          email: string | null
          first_name: string
          fsp_id: string
          id: string
          job_title: string | null
          last_name: string
          primary: boolean
          update_date: string
        }
        Insert: {
          active?: boolean
          contact_number?: string | null
          create_date?: string
          email?: string | null
          first_name: string
          fsp_id: string
          id?: string
          job_title?: string | null
          last_name: string
          primary?: boolean
          update_date?: string
        }
        Update: {
          active?: boolean
          contact_number?: string | null
          create_date?: string
          email?: string | null
          first_name?: string
          fsp_id?: string
          id?: string
          job_title?: string | null
          last_name?: string
          primary?: boolean
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
        ]
      }
      declaration_templates: {
        Row: {
          active: boolean
          code: string
          create_date: string
          declaration_text: string
          id: string
          questionnaire_version_id: string
          title: string
          version_number: number
        }
        Insert: {
          active?: boolean
          code: string
          create_date?: string
          declaration_text: string
          id?: string
          questionnaire_version_id: string
          title: string
          version_number: number
        }
        Update: {
          active?: boolean
          code?: string
          create_date?: string
          declaration_text?: string
          id?: string
          questionnaire_version_id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "declaration_templates_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          document_id: string
          id: string
          mime_type: string
          original_filename: string
          sha256: string
          size_bytes: number
          storage_path: string
          upload_date: string
          uploaded_by: string
        }
        Insert: {
          document_id: string
          id?: string
          mime_type: string
          original_filename: string
          sha256: string
          size_bytes: number
          storage_path: string
          upload_date?: string
          uploaded_by: string
        }
        Update: {
          document_id?: string
          id?: string
          mime_type?: string
          original_filename?: string
          sha256?: string
          size_bytes?: number
          storage_path?: string
          upload_date?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          create_date: string
          created_by: string
          current_version_id: string | null
          document_type: string
          id: string
          status: string
          submission_id: string
          update_date: string
        }
        Insert: {
          create_date?: string
          created_by: string
          current_version_id?: string | null
          document_type: string
          id?: string
          status?: string
          submission_id: string
          update_date?: string
        }
        Update: {
          create_date?: string
          created_by?: string
          current_version_id?: string | null
          document_type?: string
          id?: string
          status?: string
          submission_id?: string
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_current_version_fk"
            columns: ["current_version_id", "id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id", "document_id"]
          },
          {
            foreignKeyName: "documents_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      fsp_invitations: {
        Row: {
          accepted_by: string | null
          accepted_date: string | null
          create_date: string
          delivery_date: string | null
          delivery_error_code: string | null
          delivery_status: string
          email: string
          email_normalized: string
          expiry_date: string
          fsp_id: string
          id: string
          invite_date: string
          invited_by: string
          revoked_by: string | null
          revoked_date: string | null
          role: string
          status: string
          token_hash: string
          update_date: string
        }
        Insert: {
          accepted_by?: string | null
          accepted_date?: string | null
          create_date?: string
          delivery_date?: string | null
          delivery_error_code?: string | null
          delivery_status?: string
          email: string
          email_normalized: string
          expiry_date: string
          fsp_id: string
          id?: string
          invite_date?: string
          invited_by: string
          revoked_by?: string | null
          revoked_date?: string | null
          role: string
          status?: string
          token_hash: string
          update_date?: string
        }
        Update: {
          accepted_by?: string | null
          accepted_date?: string | null
          create_date?: string
          delivery_date?: string | null
          delivery_error_code?: string | null
          delivery_status?: string
          email?: string
          email_normalized?: string
          expiry_date?: string
          fsp_id?: string
          id?: string
          invite_date?: string
          invited_by?: string
          revoked_by?: string | null
          revoked_date?: string | null
          role?: string
          status?: string
          token_hash?: string
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fsp_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_invitations_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_invitations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fsp_link_requests: {
        Row: {
          fsp_id: string
          id: string
          rejection: string | null
          request_date: string
          review_date: string | null
          reviewed_by: string | null
          status: string
          user_id: string
          verification_method: string | null
        }
        Insert: {
          fsp_id: string
          id?: string
          rejection?: string | null
          request_date?: string
          review_date?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
          verification_method?: string | null
        }
        Update: {
          fsp_id?: string
          id?: string
          rejection?: string | null
          request_date?: string
          review_date?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fsp_link_requests_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_link_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_link_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fsp_registry_changes: {
        Row: {
          change_type: string
          detected_date: string
          field_name: string
          fsp_id: string
          id: string
          import_id: string
          new_value: Json | null
          previous_value: Json | null
          source_effective_date: string | null
          source_record_id: string
        }
        Insert: {
          change_type: string
          detected_date?: string
          field_name: string
          fsp_id: string
          id?: string
          import_id: string
          new_value?: Json | null
          previous_value?: Json | null
          source_effective_date?: string | null
          source_record_id: string
        }
        Update: {
          change_type?: string
          detected_date?: string
          field_name?: string
          fsp_id?: string
          id?: string
          import_id?: string
          new_value?: Json | null
          previous_value?: Json | null
          source_effective_date?: string | null
          source_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fsp_registry_changes_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_registry_changes_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "fsp_registry_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_registry_changes_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "fsp_source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      fsp_registry_imports: {
        Row: {
          completed_date: string | null
          confirmed_by: string | null
          confirmed_date: string | null
          conflicted_count: number
          create_date: string
          error_code: string | null
          error_summary: string | null
          failed_count: number
          file_hash: string | null
          file_size_bytes: number | null
          id: string
          inserted_count: number
          invalid_count: number
          metadata: Json
          mime_type: string | null
          original_file_name: string | null
          processed_count: number
          reprocess_of: string | null
          schema_version: string
          source_id: string
          source_mode: string
          started_by: string | null
          started_date: string
          status: string
          status_change_count: number
          storage_path: string | null
          total_count: number
          unchanged_count: number
          update_date: string
          updated_count: number
          valid_count: number
          validated_date: string | null
        }
        Insert: {
          completed_date?: string | null
          confirmed_by?: string | null
          confirmed_date?: string | null
          conflicted_count?: number
          create_date?: string
          error_code?: string | null
          error_summary?: string | null
          failed_count?: number
          file_hash?: string | null
          file_size_bytes?: number | null
          id?: string
          inserted_count?: number
          invalid_count?: number
          metadata?: Json
          mime_type?: string | null
          original_file_name?: string | null
          processed_count?: number
          reprocess_of?: string | null
          schema_version: string
          source_id: string
          source_mode: string
          started_by?: string | null
          started_date?: string
          status?: string
          status_change_count?: number
          storage_path?: string | null
          total_count?: number
          unchanged_count?: number
          update_date?: string
          updated_count?: number
          valid_count?: number
          validated_date?: string | null
        }
        Update: {
          completed_date?: string | null
          confirmed_by?: string | null
          confirmed_date?: string | null
          conflicted_count?: number
          create_date?: string
          error_code?: string | null
          error_summary?: string | null
          failed_count?: number
          file_hash?: string | null
          file_size_bytes?: number | null
          id?: string
          inserted_count?: number
          invalid_count?: number
          metadata?: Json
          mime_type?: string | null
          original_file_name?: string | null
          processed_count?: number
          reprocess_of?: string | null
          schema_version?: string
          source_id?: string
          source_mode?: string
          started_by?: string | null
          started_date?: string
          status?: string
          status_change_count?: number
          storage_path?: string | null
          total_count?: number
          unchanged_count?: number
          update_date?: string
          updated_count?: number
          valid_count?: number
          validated_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fsp_registry_imports_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_registry_imports_reprocess_of_fkey"
            columns: ["reprocess_of"]
            isOneToOne: false
            referencedRelation: "fsp_registry_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_registry_imports_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "fsp_registry_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_registry_imports_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fsp_registry_sources: {
        Row: {
          active: boolean
          authority: string
          code: string
          configuration: Json
          create_date: string
          freshness_threshold_days: number
          id: string
          name: string
          production_enabled: boolean
          provider_type: string
          schema_version: string
          source_mode: string
          update_date: string
        }
        Insert: {
          active?: boolean
          authority: string
          code: string
          configuration?: Json
          create_date?: string
          freshness_threshold_days?: number
          id?: string
          name: string
          production_enabled?: boolean
          provider_type: string
          schema_version?: string
          source_mode?: string
          update_date?: string
        }
        Update: {
          active?: boolean
          authority?: string
          code?: string
          configuration?: Json
          create_date?: string
          freshness_threshold_days?: number
          id?: string
          name?: string
          production_enabled?: boolean
          provider_type?: string
          schema_version?: string
          source_mode?: string
          update_date?: string
        }
        Relationships: []
      }
      fsp_source_records: {
        Row: {
          applied_date: string | null
          attempt_count: number
          create_date: string
          error_code: string | null
          error_message: string | null
          fsp_id: string | null
          id: string
          import_id: string
          lease_date: string | null
          match_status: string | null
          normalized_payload: Json | null
          processing_status: string
          proposed_changes: Json
          row_number: number
          source_hash: string | null
          source_id: string
          source_payload: Json
          source_record_key: string | null
          update_date: string
          validation_status: string
          worker_id: string | null
        }
        Insert: {
          applied_date?: string | null
          attempt_count?: number
          create_date?: string
          error_code?: string | null
          error_message?: string | null
          fsp_id?: string | null
          id?: string
          import_id: string
          lease_date?: string | null
          match_status?: string | null
          normalized_payload?: Json | null
          processing_status?: string
          proposed_changes?: Json
          row_number: number
          source_hash?: string | null
          source_id: string
          source_payload: Json
          source_record_key?: string | null
          update_date?: string
          validation_status: string
          worker_id?: string | null
        }
        Update: {
          applied_date?: string | null
          attempt_count?: number
          create_date?: string
          error_code?: string | null
          error_message?: string | null
          fsp_id?: string | null
          id?: string
          import_id?: string
          lease_date?: string | null
          match_status?: string | null
          normalized_payload?: Json | null
          processing_status?: string
          proposed_changes?: Json
          row_number?: number
          source_hash?: string | null
          source_id?: string
          source_payload?: Json
          source_record_key?: string | null
          update_date?: string
          validation_status?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fsp_source_records_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_source_records_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "fsp_registry_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_source_records_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "fsp_registry_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      fsp_users: {
        Row: {
          create_date: string
          fsp_id: string
          id: string
          primary: boolean
          revoked_by: string | null
          revoked_date: string | null
          role: string
          status: string
          update_date: string
          user_id: string
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          create_date?: string
          fsp_id: string
          id?: string
          primary?: boolean
          revoked_by?: string | null
          revoked_date?: string | null
          role: string
          status?: string
          update_date?: string
          user_id: string
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          create_date?: string
          fsp_id?: string
          id?: string
          primary?: boolean
          revoked_by?: string | null
          revoked_date?: string | null
          role?: string
          status?: string
          update_date?: string
          user_id?: string
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fsp_users_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_users_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsp_users_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fsps: {
        Row: {
          active: boolean
          create_date: string
          fsp_number: string
          fsp_type: string | null
          id: string
          registered_name: string
          registration_number: string | null
          registry_import_id: string | null
          registry_source_id: string | null
          registry_source_record_id: string | null
          registry_update_date: string | null
          source: string | null
          source_last_check_date: string | null
          status: string | null
          status_effective_date: string | null
          trade_name: string | null
          update_date: string
        }
        Insert: {
          active?: boolean
          create_date?: string
          fsp_number: string
          fsp_type?: string | null
          id?: string
          registered_name: string
          registration_number?: string | null
          registry_import_id?: string | null
          registry_source_id?: string | null
          registry_source_record_id?: string | null
          registry_update_date?: string | null
          source?: string | null
          source_last_check_date?: string | null
          status?: string | null
          status_effective_date?: string | null
          trade_name?: string | null
          update_date?: string
        }
        Update: {
          active?: boolean
          create_date?: string
          fsp_number?: string
          fsp_type?: string | null
          id?: string
          registered_name?: string
          registration_number?: string | null
          registry_import_id?: string | null
          registry_source_id?: string | null
          registry_source_record_id?: string | null
          registry_update_date?: string | null
          source?: string | null
          source_last_check_date?: string | null
          status?: string | null
          status_effective_date?: string | null
          trade_name?: string | null
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fsps_registry_import_id_fkey"
            columns: ["registry_import_id"]
            isOneToOne: false
            referencedRelation: "fsp_registry_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsps_registry_source_id_fkey"
            columns: ["registry_source_id"]
            isOneToOne: false
            referencedRelation: "fsp_registry_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fsps_registry_source_record_id_fkey"
            columns: ["registry_source_record_id"]
            isOneToOne: false
            referencedRelation: "fsp_source_records"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempt_count: number
          channel: string
          create_date: string
          event_id: string
          failed_date: string | null
          id: string
          last_error_code: string | null
          locked_date: string | null
          max_attempts: number
          next_attempt_date: string
          notification_id: string
          provider: string | null
          provider_message_id: string | null
          recipient_address: string
          requires_active_membership: boolean
          sent_date: string | null
          status: string
          update_date: string
          user_id: string
          worker_id: string | null
        }
        Insert: {
          attempt_count?: number
          channel?: string
          create_date?: string
          event_id: string
          failed_date?: string | null
          id?: string
          last_error_code?: string | null
          locked_date?: string | null
          max_attempts?: number
          next_attempt_date?: string
          notification_id: string
          provider?: string | null
          provider_message_id?: string | null
          recipient_address: string
          requires_active_membership?: boolean
          sent_date?: string | null
          status?: string
          update_date?: string
          user_id: string
          worker_id?: string | null
        }
        Update: {
          attempt_count?: number
          channel?: string
          create_date?: string
          event_id?: string
          failed_date?: string | null
          id?: string
          last_error_code?: string | null
          locked_date?: string | null
          max_attempts?: number
          next_attempt_date?: string
          notification_id?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient_address?: string
          requires_active_membership?: boolean
          sent_date?: string | null
          status?: string
          update_date?: string
          user_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          actor_id: string | null
          attempt_count: number
          available_date: string
          create_date: string
          event_type: string
          failed_date: string | null
          fsp_id: string | null
          id: string
          idempotency_key: string
          last_error_code: string | null
          locked_date: string | null
          max_attempts: number
          metadata: Json
          occurrence_date: string
          processed_date: string | null
          recipient_user_id: string | null
          status: string
          submission_id: string | null
          tenant_id: string | null
          worker_id: string | null
        }
        Insert: {
          actor_id?: string | null
          attempt_count?: number
          available_date?: string
          create_date?: string
          event_type: string
          failed_date?: string | null
          fsp_id?: string | null
          id?: string
          idempotency_key: string
          last_error_code?: string | null
          locked_date?: string | null
          max_attempts?: number
          metadata?: Json
          occurrence_date?: string
          processed_date?: string | null
          recipient_user_id?: string | null
          status?: string
          submission_id?: string | null
          tenant_id?: string | null
          worker_id?: string | null
        }
        Update: {
          actor_id?: string | null
          attempt_count?: number
          available_date?: string
          create_date?: string
          event_type?: string
          failed_date?: string | null
          fsp_id?: string | null
          id?: string
          idempotency_key?: string
          last_error_code?: string | null
          locked_date?: string | null
          max_attempts?: number
          metadata?: Json
          occurrence_date?: string
          processed_date?: string | null
          recipient_user_id?: string | null
          status?: string
          submission_id?: string | null
          tenant_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: string
          create_date: string
          email_enabled: boolean
          update_date: string
          user_id: string
        }
        Insert: {
          category: string
          create_date?: string
          email_enabled?: boolean
          update_date?: string
          user_id: string
        }
        Update: {
          category?: string
          create_date?: string
          email_enabled?: boolean
          update_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_path: string | null
          body: string
          category: string
          create_date: string
          event_id: string
          fsp_id: string | null
          id: string
          priority: string
          read_date: string | null
          submission_id: string | null
          tenant_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_path?: string | null
          body: string
          category: string
          create_date?: string
          event_id: string
          fsp_id?: string | null
          id?: string
          priority?: string
          read_date?: string | null
          submission_id?: string | null
          tenant_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_path?: string | null
          body?: string
          category?: string
          create_date?: string
          event_id?: string
          fsp_id?: string | null
          id?: string
          priority?: string
          read_date?: string | null
          submission_id?: string | null
          tenant_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_memberships: {
        Row: {
          create_date: string
          id: string
          role: string
          status: string
          update_date: string
          user_id: string
        }
        Insert: {
          create_date?: string
          id?: string
          role?: string
          status?: string
          update_date?: string
          user_id: string
        }
        Update: {
          create_date?: string
          id?: string
          role?: string
          status?: string
          update_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          contact_number: string | null
          create_date: string
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          update_date: string
        }
        Insert: {
          active?: boolean
          contact_number?: string | null
          create_date?: string
          first_name?: string
          id: string
          job_title?: string | null
          last_name?: string
          update_date?: string
        }
        Update: {
          active?: boolean
          contact_number?: string | null
          create_date?: string
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          update_date?: string
        }
        Relationships: []
      }
      question_conditions: {
        Row: {
          action: string
          comparison_value: Json | null
          id: string
          operator: string
          questionnaire_question_id: string
          sort_order: number
          source_questionnaire_question_id: string
        }
        Insert: {
          action: string
          comparison_value?: Json | null
          id?: string
          operator: string
          questionnaire_question_id: string
          sort_order?: number
          source_questionnaire_question_id: string
        }
        Update: {
          action?: string
          comparison_value?: Json | null
          id?: string
          operator?: string
          questionnaire_question_id?: string
          sort_order?: number
          source_questionnaire_question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_conditions_questionnaire_question_id_fkey"
            columns: ["questionnaire_question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_conditions_source_questionnaire_question_id_fkey"
            columns: ["source_questionnaire_question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_types: {
        Row: {
          active: boolean
          allows_multiple_values: boolean
          allows_value_set: boolean
          code: string
          data_type: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          allows_multiple_values?: boolean
          allows_value_set?: boolean
          code: string
          data_type: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          allows_multiple_values?: boolean
          allows_value_set?: boolean
          code?: string
          data_type?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      questionnaire_questions: {
        Row: {
          default_value: Json | null
          id: string
          question_id: string
          questionnaire_version_id: string
          read_only: boolean
          required: boolean
          section_id: string
          sort_order: number
        }
        Insert: {
          default_value?: Json | null
          id?: string
          question_id: string
          questionnaire_version_id: string
          read_only?: boolean
          required?: boolean
          section_id: string
          sort_order: number
        }
        Update: {
          default_value?: Json | null
          id?: string
          question_id?: string
          questionnaire_version_id?: string
          read_only?: boolean
          required?: boolean
          section_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_questions_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_questions_section_version_fk"
            columns: ["section_id", "questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_sections"
            referencedColumns: ["id", "questionnaire_version_id"]
          },
        ]
      }
      questionnaire_sections: {
        Row: {
          code: string
          description: string | null
          id: string
          questionnaire_version_id: string
          sort_order: number
          title: string
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
          questionnaire_version_id: string
          sort_order: number
          title: string
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
          questionnaire_version_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_sections_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_versions: {
        Row: {
          create_date: string
          effective_from: string | null
          effective_to: string | null
          id: string
          published_by: string | null
          published_date: string | null
          questionnaire_id: string
          status: string
          version_number: number
        }
        Insert: {
          create_date?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          published_by?: string | null
          published_date?: string | null
          questionnaire_id: string
          status?: string
          version_number: number
        }
        Update: {
          create_date?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          published_by?: string | null
          published_date?: string | null
          questionnaire_id?: string
          status?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_versions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          active: boolean
          code: string
          create_date: string
          description: string | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          active?: boolean
          code: string
          create_date?: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          create_date?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questionnaires_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          active: boolean
          code: string
          create_date: string
          help_text: string | null
          id: string
          label: string
          placeholder: string | null
          question_type_id: string
          system: boolean
          tenant_id: string | null
          update_date: string
          validation_rules: Json | null
          value_set_id: string | null
        }
        Insert: {
          active?: boolean
          code: string
          create_date?: string
          help_text?: string | null
          id?: string
          label: string
          placeholder?: string | null
          question_type_id: string
          system?: boolean
          tenant_id?: string | null
          update_date?: string
          validation_rules?: Json | null
          value_set_id?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          create_date?: string
          help_text?: string | null
          id?: string
          label?: string
          placeholder?: string | null
          question_type_id?: string
          system?: boolean
          tenant_id?: string | null
          update_date?: string
          validation_rules?: Json | null
          value_set_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_question_type_id_fkey"
            columns: ["question_type_id"]
            isOneToOne: false
            referencedRelation: "question_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_value_set_id_fkey"
            columns: ["value_set_id"]
            isOneToOne: false
            referencedRelation: "value_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_attempt_documents: {
        Row: {
          attempt_id: string
          document_id: string
          document_version_id: string
        }
        Insert: {
          attempt_id: string
          document_id: string
          document_version_id: string
        }
        Update: {
          attempt_id?: string
          document_id?: string
          document_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_attempt_documents_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "submission_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_attempt_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_attempt_documents_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_attempts: {
        Row: {
          attempt_number: number
          create_date: string
          declaration_snapshot: Json | null
          id: string
          questionnaire_version_id: string
          response_snapshot: Json
          review_mode: string
          submission_id: string
          submission_route: string
          submit_date: string
          submitted_by: string
        }
        Insert: {
          attempt_number: number
          create_date?: string
          declaration_snapshot?: Json | null
          id?: string
          questionnaire_version_id: string
          response_snapshot: Json
          review_mode: string
          submission_id: string
          submission_route: string
          submit_date?: string
          submitted_by: string
        }
        Update: {
          attempt_number?: number
          create_date?: string
          declaration_snapshot?: Json | null
          id?: string
          questionnaire_version_id?: string
          response_snapshot?: Json
          review_mode?: string
          submission_id?: string
          submission_route?: string
          submit_date?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_attempts_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_attempts_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_attempts_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_declarations: {
        Row: {
          accepted_date: string
          declarant_name: string
          declarant_user_id: string
          declaration_template_id: string
          id: string
          submission_id: string
        }
        Insert: {
          accepted_date?: string
          declarant_name: string
          declarant_user_id: string
          declaration_template_id: string
          id?: string
          submission_id: string
        }
        Update: {
          accepted_date?: string
          declarant_name?: string
          declarant_user_id?: string
          declaration_template_id?: string
          id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_declarations_declarant_user_id_fkey"
            columns: ["declarant_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_declarations_declaration_template_id_fkey"
            columns: ["declaration_template_id"]
            isOneToOne: false
            referencedRelation: "declaration_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_declarations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_periods: {
        Row: {
          close_date: string
          create_date: string
          id: string
          name: string
          open_date: string
          questionnaire_version_id: string
          review_mode: string
          status: string
          tenant_id: string
          year: number
        }
        Insert: {
          close_date: string
          create_date?: string
          id?: string
          name: string
          open_date: string
          questionnaire_version_id: string
          review_mode?: string
          status?: string
          tenant_id: string
          year: number
        }
        Update: {
          close_date?: string
          create_date?: string
          id?: string
          name?: string
          open_date?: string
          questionnaire_version_id?: string
          review_mode?: string
          status?: string
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "submission_periods_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_response_options: {
        Row: {
          response_id: string
          value_set_option_id: string
        }
        Insert: {
          response_id: string
          value_set_option_id: string
        }
        Update: {
          response_id?: string
          value_set_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_response_options_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "submission_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_response_options_value_set_option_id_fkey"
            columns: ["value_set_option_id"]
            isOneToOne: false
            referencedRelation: "value_set_options"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_responses: {
        Row: {
          answered_by: string | null
          answered_date: string | null
          boolean_value: boolean | null
          date_value: string | null
          id: string
          numeric_value: number | null
          questionnaire_question_id: string
          selected_option_id: string | null
          submission_id: string
          text_value: string | null
          update_date: string
        }
        Insert: {
          answered_by?: string | null
          answered_date?: string | null
          boolean_value?: boolean | null
          date_value?: string | null
          id?: string
          numeric_value?: number | null
          questionnaire_question_id: string
          selected_option_id?: string | null
          submission_id: string
          text_value?: string | null
          update_date?: string
        }
        Update: {
          answered_by?: string | null
          answered_date?: string | null
          boolean_value?: boolean | null
          date_value?: string | null
          id?: string
          numeric_value?: number | null
          questionnaire_question_id?: string
          selected_option_id?: string | null
          submission_id?: string
          text_value?: string | null
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_responses_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_responses_questionnaire_question_id_fkey"
            columns: ["questionnaire_question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_responses_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "value_set_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_review_findings: {
        Row: {
          category: string
          code: string | null
          confidence: string | null
          create_date: string
          description: string
          document_id: string | null
          fsp_visible: boolean
          id: string
          questionnaire_question_id: string | null
          resolution_status: string
          review_id: string
          severity: string
          source: string
          title: string
        }
        Insert: {
          category: string
          code?: string | null
          confidence?: string | null
          create_date?: string
          description: string
          document_id?: string | null
          fsp_visible?: boolean
          id?: string
          questionnaire_question_id?: string | null
          resolution_status?: string
          review_id: string
          severity: string
          source: string
          title: string
        }
        Update: {
          category?: string
          code?: string | null
          confidence?: string | null
          create_date?: string
          description?: string
          document_id?: string | null
          fsp_visible?: boolean
          id?: string
          questionnaire_question_id?: string | null
          resolution_status?: string
          review_id?: string
          severity?: string
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_review_findings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_review_findings_questionnaire_question_id_fkey"
            columns: ["questionnaire_question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_review_findings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "submission_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_reviews: {
        Row: {
          attempt_id: string
          complete_date: string | null
          config_version: string | null
          create_date: string
          id: string
          model: string | null
          outcome: string | null
          provider: string | null
          retry_count: number
          review_type: string
          reviewer_id: string | null
          rule_set_version: string | null
          start_date: string | null
          status: string
          submission_id: string
          summary: string | null
        }
        Insert: {
          attempt_id: string
          complete_date?: string | null
          config_version?: string | null
          create_date?: string
          id?: string
          model?: string | null
          outcome?: string | null
          provider?: string | null
          retry_count?: number
          review_type: string
          reviewer_id?: string | null
          rule_set_version?: string | null
          start_date?: string | null
          status?: string
          submission_id: string
          summary?: string | null
        }
        Update: {
          attempt_id?: string
          complete_date?: string | null
          config_version?: string | null
          create_date?: string
          id?: string
          model?: string | null
          outcome?: string | null
          provider?: string | null
          retry_count?: number
          review_type?: string
          reviewer_id?: string | null
          rule_set_version?: string | null
          start_date?: string | null
          status?: string
          submission_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_reviews_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "submission_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_route_rules: {
        Row: {
          active: boolean
          comparison_value: Json
          create_date: string
          id: string
          operator: string
          priority: number
          questionnaire_version_id: string
          source_questionnaire_question_id: string
          submission_route: string
        }
        Insert: {
          active?: boolean
          comparison_value: Json
          create_date?: string
          id?: string
          operator: string
          priority?: number
          questionnaire_version_id: string
          source_questionnaire_question_id: string
          submission_route: string
        }
        Update: {
          active?: boolean
          comparison_value?: Json
          create_date?: string
          id?: string
          operator?: string
          priority?: number
          questionnaire_version_id?: string
          source_questionnaire_question_id?: string
          submission_route?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_route_rules_question_version_fk"
            columns: [
              "source_questionnaire_question_id",
              "questionnaire_version_id",
            ]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id", "questionnaire_version_id"]
          },
          {
            foreignKeyName: "submission_route_rules_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_status_history: {
        Row: {
          actor_id: string | null
          actor_type: string
          from_status: string | null
          id: string
          occurrence_date: string
          reason: string | null
          review_id: string | null
          submission_id: string
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          from_status?: string | null
          id?: string
          occurrence_date?: string
          reason?: string | null
          review_id?: string | null
          submission_id: string
          to_status: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          from_status?: string | null
          id?: string
          occurrence_date?: string
          reason?: string | null
          review_id?: string | null
          submission_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_status_history_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "submission_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_status_history_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          create_date: string
          id: string
          review_mode: string
          start_date: string | null
          started_by: string | null
          status: string
          submission_period_id: string
          submission_route: string | null
          submit_date: string | null
          submitted_by: string | null
          tenant_fsp_id: string
          update_date: string
        }
        Insert: {
          create_date?: string
          id?: string
          review_mode?: string
          start_date?: string | null
          started_by?: string | null
          status?: string
          submission_period_id: string
          submission_route?: string | null
          submit_date?: string | null
          submitted_by?: string | null
          tenant_fsp_id: string
          update_date?: string
        }
        Update: {
          create_date?: string
          id?: string
          review_mode?: string
          start_date?: string | null
          started_by?: string | null
          status?: string
          submission_period_id?: string
          submission_route?: string | null
          submit_date?: string | null
          submitted_by?: string | null
          tenant_fsp_id?: string
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submission_period_id_fkey"
            columns: ["submission_period_id"]
            isOneToOne: false
            referencedRelation: "submission_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_tenant_fsp_id_fkey"
            columns: ["tenant_fsp_id"]
            isOneToOne: false
            referencedRelation: "tenant_fsps"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_fsps: {
        Row: {
          broker_reference: string | null
          create_date: string
          delink_date: string | null
          fsp_id: string
          id: string
          link_date: string
          status: string
          tenant_id: string
          update_date: string
        }
        Insert: {
          broker_reference?: string | null
          create_date?: string
          delink_date?: string | null
          fsp_id: string
          id?: string
          link_date?: string
          status?: string
          tenant_id: string
          update_date?: string
        }
        Update: {
          broker_reference?: string | null
          create_date?: string
          delink_date?: string | null
          fsp_id?: string
          id?: string
          link_date?: string
          status?: string
          tenant_id?: string
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_fsps_fsp_id_fkey"
            columns: ["fsp_id"]
            isOneToOne: false
            referencedRelation: "fsps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_fsps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_by: string | null
          accepted_date: string | null
          create_date: string
          delivery_date: string | null
          delivery_error_code: string | null
          delivery_status: string
          email: string
          email_normalized: string
          expiry_date: string
          id: string
          invite_date: string
          invited_by: string
          revoked_by: string | null
          revoked_date: string | null
          role: string
          status: string
          tenant_id: string
          token_hash: string
          update_date: string
        }
        Insert: {
          accepted_by?: string | null
          accepted_date?: string | null
          create_date?: string
          delivery_date?: string | null
          delivery_error_code?: string | null
          delivery_status?: string
          email: string
          email_normalized: string
          expiry_date: string
          id?: string
          invite_date?: string
          invited_by: string
          revoked_by?: string | null
          revoked_date?: string | null
          role: string
          status?: string
          tenant_id: string
          token_hash: string
          update_date?: string
        }
        Update: {
          accepted_by?: string | null
          accepted_date?: string | null
          create_date?: string
          delivery_date?: string | null
          delivery_error_code?: string | null
          delivery_status?: string
          email?: string
          email_normalized?: string
          expiry_date?: string
          id?: string
          invite_date?: string
          invited_by?: string
          revoked_by?: string | null
          revoked_date?: string | null
          role?: string
          status?: string
          tenant_id?: string
          token_hash?: string
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          create_date: string
          id: string
          revoked_by: string | null
          revoked_date: string | null
          role: string
          status: string
          tenant_id: string
          update_date: string
          user_id: string
        }
        Insert: {
          create_date?: string
          id?: string
          revoked_by?: string | null
          revoked_date?: string | null
          role: string
          status?: string
          tenant_id: string
          update_date?: string
          user_id: string
        }
        Update: {
          create_date?: string
          id?: string
          revoked_by?: string | null
          revoked_date?: string | null
          role?: string
          status?: string
          tenant_id?: string
          update_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_notification_settings: {
        Row: {
          create_date: string
          notify_admin_ai_events: boolean
          notify_admin_review_required: boolean
          reminder_offsets: number[]
          reminder_send_hour: number
          tenant_id: string
          timezone: string
          update_date: string
        }
        Insert: {
          create_date?: string
          notify_admin_ai_events?: boolean
          notify_admin_review_required?: boolean
          reminder_offsets?: number[]
          reminder_send_hour?: number
          tenant_id: string
          timezone?: string
          update_date?: string
        }
        Update: {
          create_date?: string
          notify_admin_ai_events?: boolean
          notify_admin_review_required?: boolean
          reminder_offsets?: number[]
          reminder_send_hour?: number
          tenant_id?: string
          timezone?: string
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_notification_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean
          code: string
          create_date: string
          id: string
          name: string
          status: string
          update_date: string
        }
        Insert: {
          active?: boolean
          code: string
          create_date?: string
          id?: string
          name: string
          status?: string
          update_date?: string
        }
        Update: {
          active?: boolean
          code?: string
          create_date?: string
          id?: string
          name?: string
          status?: string
          update_date?: string
        }
        Relationships: []
      }
      value_set_options: {
        Row: {
          active: boolean
          code: string
          create_date: string
          id: string
          label: string
          metadata: Json | null
          sort_order: number
          value_set_id: string
        }
        Insert: {
          active?: boolean
          code: string
          create_date?: string
          id?: string
          label: string
          metadata?: Json | null
          sort_order?: number
          value_set_id: string
        }
        Update: {
          active?: boolean
          code?: string
          create_date?: string
          id?: string
          label?: string
          metadata?: Json | null
          sort_order?: number
          value_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_set_options_value_set_id_fkey"
            columns: ["value_set_id"]
            isOneToOne: false
            referencedRelation: "value_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      value_sets: {
        Row: {
          active: boolean
          code: string
          create_date: string
          description: string | null
          id: string
          name: string
          system: boolean
          tenant_id: string | null
          update_date: string
        }
        Insert: {
          active?: boolean
          code: string
          create_date?: string
          description?: string | null
          id?: string
          name: string
          system?: boolean
          tenant_id?: string | null
          update_date?: string
        }
        Update: {
          active?: boolean
          code?: string
          create_date?: string
          description?: string | null
          id?: string
          name?: string
          system?: boolean
          tenant_id?: string | null
          update_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "value_sets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_fsp_invitation: {
        Args: { target_token_hash: string }
        Returns: {
          fsp_id: string
          membership_id: string
        }[]
      }
      accept_tenant_invitation: {
        Args: { target_token_hash: string }
        Returns: {
          membership_id: string
          tenant_id: string
        }[]
      }
      acknowledge_submission_declaration: {
        Args: { target_submission_id: string }
        Returns: {
          accepted_date: string
          declarant_name: string
          declaration_id: string
        }[]
      }
      add_platform_questionnaire_question: {
        Args: {
          target_question_id: string
          target_required: boolean
          target_section_id: string
          target_version_id: string
        }
        Returns: string
      }
      add_platform_questionnaire_section: {
        Args: {
          target_code: string
          target_description: string
          target_title: string
          target_version_id: string
        }
        Returns: string
      }
      apply_ai_review_result: {
        Args: {
          target_confidence: string
          target_config_version: string
          target_findings: Json
          target_job_id: string
          target_model: string
          target_provider: string
          target_recommendation: string
          target_rule_set_version: string
          target_summary: string
        }
        Returns: {
          review_outcome: string
          submission_status: string
        }[]
      }
      apply_fsp_registry_record: {
        Args: { claim_worker_id: string; target_record_id: string }
        Returns: string
      }
      approve_fsp_link_request: {
        Args: { target_request_id: string }
        Returns: {
          assigned_role: string
          membership_id: string
          request_id: string
          request_status: string
        }[]
      }
      authorize_fsp_attempt_document: {
        Args: {
          target_attempt_id: string
          target_document_version_id: string
          target_fsp_id: string
          target_submission_id: string
        }
        Returns: boolean
      }
      authorize_tenant_attempt_document: {
        Args: {
          target_attempt_id: string
          target_document_version_id: string
          target_submission_id: string
          target_tenant_id: string
        }
        Returns: boolean
      }
      cancel_certificate_upload: {
        Args: { target_document_version_id: string }
        Returns: undefined
      }
      change_fsp_member_role: {
        Args: { target_membership_id: string; target_role: string }
        Returns: undefined
      }
      change_tenant_member_role: {
        Args: { target_membership_id: string; target_role: string }
        Returns: undefined
      }
      claim_ai_review_job: {
        Args: { target_worker_id: string }
        Returns: {
          attempt_count: number
          attempt_id: string
          job_id: string
          max_attempts: number
          review_id: string
          submission_id: string
        }[]
      }
      claim_fsp_registry_records: {
        Args: { claim_limit?: number; claim_worker_id: string }
        Returns: {
          applied_date: string | null
          attempt_count: number
          create_date: string
          error_code: string | null
          error_message: string | null
          fsp_id: string | null
          id: string
          import_id: string
          lease_date: string | null
          match_status: string | null
          normalized_payload: Json | null
          processing_status: string
          proposed_changes: Json
          row_number: number
          source_hash: string | null
          source_id: string
          source_payload: Json
          source_record_key: string | null
          update_date: string
          validation_status: string
          worker_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "fsp_source_records"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_notification_deliveries: {
        Args: { target_batch_size?: number; target_worker_id: string }
        Returns: {
          delivery_id: string
        }[]
      }
      claim_notification_events: {
        Args: { target_batch_size?: number; target_worker_id: string }
        Returns: {
          event_id: string
        }[]
      }
      complete_notification_delivery: {
        Args: {
          target_delivery_id: string
          target_provider: string
          target_provider_message_id: string
          target_worker_id: string
        }
        Returns: undefined
      }
      confirm_fsp_registry_import: {
        Args: { target_import_id: string }
        Returns: {
          completed_date: string | null
          confirmed_by: string | null
          confirmed_date: string | null
          conflicted_count: number
          create_date: string
          error_code: string | null
          error_summary: string | null
          failed_count: number
          file_hash: string | null
          file_size_bytes: number | null
          id: string
          inserted_count: number
          invalid_count: number
          metadata: Json
          mime_type: string | null
          original_file_name: string | null
          processed_count: number
          reprocess_of: string | null
          schema_version: string
          source_id: string
          source_mode: string
          started_by: string | null
          started_date: string
          status: string
          status_change_count: number
          storage_path: string | null
          total_count: number
          unchanged_count: number
          update_date: string
          updated_count: number
          valid_count: number
          validated_date: string | null
        }
        SetofOptions: {
          from: "*"
          to: "fsp_registry_imports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_fsp_invitation: {
        Args: {
          target_email: string
          target_fsp_id: string
          target_role: string
          target_token_hash: string
        }
        Returns: {
          email: string
          expiry_date: string
          invitation_id: string
          role: string
        }[]
      }
      create_platform_question: {
        Args: {
          target_code: string
          target_help_text: string
          target_label: string
          target_question_type_id: string
          target_value_set_id: string
        }
        Returns: string
      }
      create_platform_questionnaire: {
        Args: {
          target_code: string
          target_description: string
          target_name: string
          target_tenant_id: string
        }
        Returns: {
          questionnaire_id: string
          version_id: string
        }[]
      }
      create_platform_questionnaire_version: {
        Args: { target_questionnaire_id: string }
        Returns: string
      }
      create_platform_tenant: {
        Args: {
          target_admin_email: string
          target_code: string
          target_name: string
          target_token_hash: string
        }
        Returns: {
          admin_email: string
          expiry_date: string
          invitation_id: string
          tenant_id: string
        }[]
      }
      create_platform_value_set: {
        Args: {
          target_code: string
          target_description: string
          target_name: string
          target_options: Json
        }
        Returns: string
      }
      create_tenant_invitation: {
        Args: {
          target_email: string
          target_role: string
          target_tenant_id: string
          target_token_hash: string
        }
        Returns: {
          email: string
          expiry_date: string
          invitation_id: string
          role: string
        }[]
      }
      create_tenant_submission_period: {
        Args: {
          target_close_date: string
          target_name: string
          target_open_date: string
          target_questionnaire_version_id: string
          target_status: string
          target_tenant_id: string
          target_year: number
        }
        Returns: {
          period_id: string
        }[]
      }
      create_tenant_submission_period_v2: {
        Args: {
          target_close_date: string
          target_name: string
          target_open_date: string
          target_questionnaire_version_id: string
          target_review_mode: string
          target_status: string
          target_tenant_id: string
          target_year: number
        }
        Returns: {
          period_id: string
        }[]
      }
      decide_submission_review: {
        Args: {
          target_decision: string
          target_expected_status: string
          target_submission_id: string
          target_summary: string
        }
        Returns: {
          review_id: string
          submission_status: string
        }[]
      }
      delete_tenant_submission_period: {
        Args: { target_period_id: string }
        Returns: undefined
      }
      delink_tenant_fsp: {
        Args: { target_tenant_fsp_id: string }
        Returns: undefined
      }
      enqueue_deadline_reminders: {
        Args: { target_today: string }
        Returns: number
      }
      fail_ai_review_job: {
        Args: { target_error_category: string; target_job_id: string }
        Returns: {
          job_status: string
          submission_status: string
        }[]
      }
      fail_fsp_registry_record: {
        Args: {
          claim_worker_id: string
          failure_code: string
          failure_message: string
          target_record_id: string
        }
        Returns: undefined
      }
      fail_notification_delivery: {
        Args: {
          target_delivery_id: string
          target_error_code: string
          target_permanent?: boolean
          target_worker_id: string
        }
        Returns: undefined
      }
      fail_notification_event: {
        Args: {
          target_error_code: string
          target_event_id: string
          target_worker_id: string
        }
        Returns: undefined
      }
      finalize_certificate_upload: {
        Args: { target_document_version_id: string }
        Returns: {
          document_id: string
          document_version_id: string
        }[]
      }
      get_ai_review_context: {
        Args: { target_job_id: string }
        Returns: {
          attempt_id: string
          declaration_snapshot: Json
          document_snapshot: Json
          job_id: string
          questionnaire_version_id: string
          response_snapshot: Json
          review_id: string
          review_mode: string
          submission_id: string
          submission_route: string
        }[]
      }
      get_fsp_for_onboarding: {
        Args: { target_fsp_id: string }
        Returns: {
          address_line_1: string
          address_line_2: string
          city: string
          claimable: boolean
          country_code: string
          fsp_number: string
          fsp_type: string
          id: string
          postal_code: string
          province: string
          registered_name: string
          registration_number: string
          status: string
          status_effective_date: string
          suburb: string
          trade_name: string
        }[]
      }
      get_fsp_invitation_context: {
        Args: { target_token_hash: string }
        Returns: {
          expiry_date: string
          fsp_name: string
          fsp_number: string
          role: string
        }[]
      }
      get_fsp_registry_provenance: {
        Args: { target_fsp_id: string }
        Returns: {
          last_checked_at: string
          last_import_id: string
          last_import_status: string
          registry_updated_at: string
          source_authority: string
          source_code: string
          source_name: string
        }[]
      }
      get_my_fsp_memberships: {
        Args: never
        Returns: {
          fsp_id: string
          fsp_number: string
          is_primary: boolean
          membership_id: string
          registered_name: string
          role: string
          trade_name: string
        }[]
      }
      get_my_fsp_onboarding_state: {
        Args: never
        Returns: {
          fsp_id: string
          fsp_name: string
          fsp_number: string
          onboarding_state: string
          rejection_reason: string
          request_date: string
          request_id: string
          request_status: string
        }[]
      }
      get_my_notification_preferences: {
        Args: never
        Returns: {
          category: string
          email_enabled: boolean
        }[]
      }
      get_my_notification_unread_count: { Args: never; Returns: number }
      get_my_platform_access: { Args: never; Returns: boolean }
      get_my_submission_feedback: {
        Args: { target_submission_id: string }
        Returns: {
          document_id: string
          finding_description: string
          finding_title: string
          questionnaire_question_id: string
          review_mode: string
          submission_status: string
          summary: string
        }[]
      }
      get_notification_delivery_context: {
        Args: { target_delivery_id: string; target_worker_id: string }
        Returns: {
          action_path: string
          body: string
          delivery_id: string
          event_type: string
          recipient_address: string
          title: string
        }[]
      }
      get_platform_dashboard: {
        Args: never
        Returns: {
          active_fsps: number
          active_tenants: number
          draft_questionnaires: number
          published_questionnaires: number
        }[]
      }
      get_platform_questionnaire_version: {
        Args: { target_version_id: string }
        Returns: Json
      }
      get_tenant_dashboard: {
        Args: { target_tenant_id: string; target_today: string }
        Returns: {
          completed_submissions: number
          outstanding_fsps: number
          period_close_date: string
          period_id: string
          period_name: string
          period_open_date: string
          period_year: number
          submitted_fsps: number
          total_fsps: number
          under_review_submissions: number
        }[]
      }
      get_tenant_invitation_context: {
        Args: { target_token_hash: string }
        Returns: {
          expiry_date: string
          role: string
          tenant_name: string
        }[]
      }
      get_tenant_notification_settings: {
        Args: { target_tenant_id: string }
        Returns: {
          notify_admin_ai_events: boolean
          notify_admin_review_required: boolean
          reminder_offsets: number[]
          reminder_send_hour: number
          tenant_id: string
          timezone: string
        }[]
      }
      get_tenant_reporting: {
        Args: { target_tenant_id: string; window_days?: number }
        Returns: Json
      }
      get_tenant_review_dashboard: {
        Args: { target_tenant_id: string; target_today: string }
        Returns: {
          completed_submissions: number
          needs_review_submissions: number
          outstanding_fsps: number
          submitted_fsps: number
          total_fsps: number
        }[]
      }
      get_tenant_settings: {
        Args: { target_tenant_id: string }
        Returns: {
          tenant_active: boolean
          tenant_code: string
          tenant_id: string
          tenant_name: string
          tenant_status: string
          update_date: string
        }[]
      }
      get_tenant_submission_header: {
        Args: { target_submission_id: string; target_tenant_id: string }
        Returns: {
          broker_reference: string
          fsp_id: string
          fsp_number: string
          period_id: string
          period_name: string
          period_year: number
          questionnaire_name: string
          questionnaire_version: number
          questionnaire_version_id: string
          registered_name: string
          start_date: string
          submission_id: string
          submission_route: string
          submission_status: string
          submit_date: string
          tenant_fsp_id: string
          trade_name: string
        }[]
      }
      get_tenant_submission_review: {
        Args: { target_submission_id: string; target_tenant_id: string }
        Returns: {
          attempt_number: number
          complete_date: string
          config_version: string
          model: string
          outcome: string
          provider: string
          retry_count: number
          review_id: string
          review_mode: string
          review_status: string
          review_type: string
          reviewer_name: string
          rule_set_version: string
          start_date: string
          submission_status: string
          summary: string
        }[]
      }
      link_tenant_fsp: {
        Args: {
          target_broker_reference?: string
          target_fsp_id: string
          target_tenant_id: string
        }
        Returns: {
          relationship_status: string
          tenant_fsp_id: string
        }[]
      }
      list_fsp_invitations: {
        Args: { target_fsp_id: string }
        Returns: {
          delivery_date: string
          delivery_status: string
          email: string
          expiry_date: string
          invitation_id: string
          invite_date: string
          role: string
          status: string
        }[]
      }
      list_fsp_members: {
        Args: { target_fsp_id: string }
        Returns: {
          create_date: string
          email: string
          first_name: string
          is_primary: boolean
          last_name: string
          membership_id: string
          role: string
          status: string
          update_date: string
          user_id: string
        }[]
      }
      list_fsp_submission_attempts: {
        Args: { target_fsp_id: string; target_submission_id: string }
        Returns: {
          attempt_id: string
          attempt_number: number
          declaration_snapshot: Json
          declaration_text: string
          declaration_title: string
          documents: Json
          questionnaire_name: string
          questionnaire_version: number
          questionnaire_version_id: string
          response_snapshot: Json
          review_mode: string
          submission_route: string
          submit_date: string
          submitted_by_name: string
        }[]
      }
      list_fsp_submission_timeline: {
        Args: { target_fsp_id: string; target_submission_id: string }
        Returns: {
          actor_label: string
          actor_type: string
          from_status: string
          history_id: string
          occurrence_date: string
          to_status: string
        }[]
      }
      list_manageable_questionnaire_versions: {
        Args: { target_tenant_id: string }
        Returns: {
          effective_from: string
          effective_to: string
          questionnaire_name: string
          questionnaire_version_id: string
          version_number: number
        }[]
      }
      list_my_fsp_submission_history: {
        Args: {
          target_fsp_id: string
          target_period_id?: string
          target_status?: string
        }
        Returns: {
          completed_date: string
          period_id: string
          period_name: string
          period_year: number
          review_mode: string
          start_date: string
          submission_id: string
          submission_route: string
          submission_status: string
          submit_date: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      list_my_notifications: {
        Args: {
          page_number?: number
          page_size?: number
          unread_only?: boolean
        }
        Returns: {
          action_path: string
          body: string
          category: string
          create_date: string
          event_type: string
          fsp_id: string
          notification_id: string
          priority: string
          read_date: string
          submission_id: string
          tenant_id: string
          title: string
          total_count: number
        }[]
      }
      list_my_tenant_memberships: {
        Args: never
        Returns: {
          membership_id: string
          tenant_code: string
          tenant_id: string
          tenant_name: string
          tenant_role: string
        }[]
      }
      list_platform_questionnaires: {
        Args: never
        Returns: {
          active: boolean
          description: string
          latest_status: string
          latest_version: number
          latest_version_id: string
          question_count: number
          questionnaire_code: string
          questionnaire_id: string
          questionnaire_name: string
          section_count: number
          tenant_id: string
          tenant_name: string
        }[]
      }
      list_platform_questions: {
        Args: never
        Returns: {
          active: boolean
          help_text: string
          question_code: string
          question_id: string
          question_label: string
          question_type_code: string
          question_type_id: string
          question_type_name: string
          value_set_id: string
          value_set_name: string
        }[]
      }
      list_platform_tenants: {
        Args: never
        Returns: {
          administrator_count: number
          create_date: string
          fsp_count: number
          submission_period_count: number
          tenant_active: boolean
          tenant_code: string
          tenant_id: string
          tenant_name: string
          tenant_status: string
          update_date: string
        }[]
      }
      list_platform_value_sets: {
        Args: never
        Returns: {
          active: boolean
          description: string
          option_count: number
          options: Json
          value_set_code: string
          value_set_id: string
          value_set_name: string
        }[]
      }
      list_tenant_fsp_relationships: {
        Args: {
          page_number: number
          page_size: number
          search_query: string
          target_tenant_id: string
        }
        Returns: {
          broker_reference: string
          delink_date: string
          fsp_id: string
          fsp_number: string
          link_date: string
          registered_name: string
          regulatory_status: string
          relationship_status: string
          submission_count: number
          tenant_fsp_id: string
          total_count: number
          trade_name: string
        }[]
      }
      list_tenant_fsps: {
        Args: {
          page_number: number
          page_size: number
          regulatory_filter: string
          relationship_filter: string
          search_query: string
          sort_direction: string
          sort_field: string
          submission_filter: string
          target_tenant_id: string
          target_today: string
        }
        Returns: {
          broker_reference: string
          fsp_id: string
          fsp_number: string
          period_id: string
          period_name: string
          registered_name: string
          regulatory_status: string
          relationship_status: string
          submission_id: string
          submission_route: string
          submission_status: string
          submit_date: string
          tenant_fsp_id: string
          total_count: number
          trade_name: string
        }[]
      }
      list_tenant_invitations: {
        Args: { target_tenant_id: string }
        Returns: {
          delivery_date: string
          delivery_status: string
          email: string
          expiry_date: string
          invitation_id: string
          invite_date: string
          role: string
          status: string
        }[]
      }
      list_tenant_members: {
        Args: { target_tenant_id: string }
        Returns: {
          create_date: string
          email: string
          first_name: string
          last_name: string
          membership_id: string
          role: string
          status: string
          update_date: string
          user_id: string
        }[]
      }
      list_tenant_periods: {
        Args: { target_tenant_id: string }
        Returns: {
          close_date: string
          open_date: string
          period_id: string
          period_name: string
          period_status: string
          period_year: number
        }[]
      }
      list_tenant_review_submissions: {
        Args: {
          page_number: number
          page_size: number
          review_mode_filter: string
          route_filter: string
          search_query: string
          sort_direction: string
          sort_field: string
          target_period_id: string
          target_tenant_id: string
          target_today: string
          work_filter: string
        }
        Returns: {
          broker_reference: string
          fsp_id: string
          fsp_number: string
          period_id: string
          period_name: string
          period_year: number
          registered_name: string
          review_mode: string
          review_status: string
          start_date: string
          submission_id: string
          submission_route: string
          submission_status: string
          submit_date: string
          tenant_fsp_id: string
          total_count: number
          trade_name: string
        }[]
      }
      list_tenant_settings_periods: {
        Args: { target_tenant_id: string }
        Returns: {
          close_date: string
          display_status: string
          open_date: string
          period_id: string
          period_name: string
          period_year: number
          questionnaire_name: string
          questionnaire_version: number
          questionnaire_version_id: string
          stored_status: string
          submission_count: number
        }[]
      }
      list_tenant_settings_periods_v2: {
        Args: { target_tenant_id: string }
        Returns: {
          ai_review_available: boolean
          close_date: string
          display_status: string
          open_date: string
          period_id: string
          period_name: string
          period_year: number
          questionnaire_name: string
          questionnaire_version: number
          questionnaire_version_id: string
          review_mode: string
          stored_status: string
          submission_count: number
        }[]
      }
      list_tenant_submission_attempts: {
        Args: { target_submission_id: string; target_tenant_id: string }
        Returns: {
          attempt_id: string
          attempt_number: number
          declaration_snapshot: Json
          declaration_text: string
          declaration_title: string
          documents: Json
          questionnaire_name: string
          questionnaire_version: number
          questionnaire_version_id: string
          response_snapshot: Json
          review_mode: string
          submission_route: string
          submit_date: string
          submitted_by_name: string
        }[]
      }
      list_tenant_submission_audit: {
        Args: {
          page_number?: number
          page_size?: number
          target_submission_id: string
          target_tenant_id: string
        }
        Returns: {
          actor_label: string
          audit_id: string
          entity_label: string
          event_detail: string
          event_label: string
          event_type: string
          occurrence_date: string
          total_count: number
        }[]
      }
      list_tenant_submission_findings: {
        Args: { target_submission_id: string; target_tenant_id: string }
        Returns: {
          attempt_number: number
          category: string
          code: string
          confidence: string
          create_date: string
          description: string
          document_id: string
          finding_id: string
          questionnaire_question_id: string
          resolution_status: string
          review_id: string
          severity: string
          source: string
          title: string
        }[]
      }
      list_tenant_submission_timeline: {
        Args: { target_submission_id: string; target_tenant_id: string }
        Returns: {
          actor_label: string
          actor_type: string
          from_status: string
          history_id: string
          occurrence_date: string
          reason: string
          to_status: string
        }[]
      }
      list_tenant_submissions: {
        Args: {
          page_number: number
          page_size: number
          route_filter: string
          search_query: string
          sort_direction: string
          sort_field: string
          status_filter: string
          target_period_id: string
          target_tenant_id: string
          target_today: string
        }
        Returns: {
          broker_reference: string
          fsp_id: string
          fsp_number: string
          period_id: string
          period_name: string
          period_year: number
          registered_name: string
          start_date: string
          submission_id: string
          submission_route: string
          submission_status: string
          submit_date: string
          tenant_fsp_id: string
          total_count: number
          trade_name: string
        }[]
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { target_notification_id: string }
        Returns: {
          action_path: string
          fsp_id: string
          submission_id: string
          tenant_id: string
        }[]
      }
      materialize_notification_event: {
        Args: { target_event_id: string; target_worker_id: string }
        Returns: number
      }
      prepare_certificate_upload: {
        Args: {
          target_filename: string
          target_mime_type: string
          target_sha256: string
          target_size_bytes: number
          target_submission_id: string
        }
        Returns: {
          document_id: string
          document_version_id: string
          storage_path: string
        }[]
      }
      publish_platform_questionnaire: {
        Args: {
          target_effective_from: string
          target_effective_to: string
          target_version_id: string
        }
        Returns: undefined
      }
      record_fsp_invitation_delivery: {
        Args: {
          target_error_code?: string
          target_invitation_id: string
          target_status: string
        }
        Returns: undefined
      }
      record_tenant_invitation_delivery: {
        Args: {
          target_error_code?: string
          target_invitation_id: string
          target_status: string
        }
        Returns: undefined
      }
      reject_fsp_link_request: {
        Args: { rejection_reason: string; target_request_id: string }
        Returns: {
          request_id: string
          request_status: string
        }[]
      }
      remove_fsp_address: {
        Args: { target_address_id: string; target_fsp_id: string }
        Returns: undefined
      }
      remove_fsp_contact: {
        Args: { target_contact_id: string; target_fsp_id: string }
        Returns: undefined
      }
      remove_platform_questionnaire_item: {
        Args: { target_item_id: string; target_item_type: string }
        Returns: undefined
      }
      reopen_submission_for_changes: {
        Args: { target_submission_id: string }
        Returns: {
          submission_id: string
          submission_status: string
        }[]
      }
      request_fsp_link: {
        Args: { target_fsp_id: string }
        Returns: {
          outcome: string
          request_date: string
          request_id: string
          request_status: string
        }[]
      }
      resend_fsp_invitation: {
        Args: { target_invitation_id: string; target_token_hash: string }
        Returns: {
          email: string
          expiry_date: string
          invitation_id: string
          role: string
        }[]
      }
      resend_tenant_invitation: {
        Args: { target_invitation_id: string; target_token_hash: string }
        Returns: {
          email: string
          expiry_date: string
          invitation_id: string
          role: string
        }[]
      }
      reserve_report_email: {
        Args: { target_request_id: string; target_tenant_id: string }
        Returns: boolean
      }
      retry_ai_review: {
        Args: { target_submission_id: string }
        Returns: {
          job_id: string
          review_id: string
        }[]
      }
      revoke_fsp_invitation: {
        Args: { target_invitation_id: string }
        Returns: undefined
      }
      revoke_fsp_member: {
        Args: { target_membership_id: string }
        Returns: undefined
      }
      revoke_tenant_invitation: {
        Args: { target_invitation_id: string }
        Returns: undefined
      }
      revoke_tenant_member: {
        Args: { target_membership_id: string }
        Returns: undefined
      }
      save_fsp_address: {
        Args: {
          target_address_id: string
          target_address_type: string
          target_city: string
          target_country_code: string
          target_fsp_id: string
          target_line_1: string
          target_line_2: string
          target_postal_code: string
          target_primary: boolean
          target_province: string
          target_suburb: string
        }
        Returns: string
      }
      save_fsp_contact: {
        Args: {
          target_contact_id: string
          target_contact_number: string
          target_email: string
          target_first_name: string
          target_fsp_id: string
          target_job_title: string
          target_last_name: string
          target_primary: boolean
        }
        Returns: string
      }
      save_submission_response: {
        Args: {
          target_question_id: string
          target_submission_id: string
          target_value: Json
        }
        Returns: {
          response_id: string
          submission_route: string
        }[]
      }
      search_fsps_for_onboarding: {
        Args: {
          result_limit?: number
          result_offset?: number
          search_query: string
        }
        Returns: {
          claimable: boolean
          fsp_number: string
          id: string
          registered_name: string
          status: string
          status_effective_date: string
          total_count: number
          trade_name: string
        }[]
      }
      search_fsps_for_tenant_link: {
        Args: {
          result_limit?: number
          search_query: string
          target_tenant_id: string
        }
        Returns: {
          fsp_id: string
          fsp_number: string
          registered_name: string
          regulatory_status: string
          relationship_id: string
          relationship_status: string
          trade_name: string
        }[]
      }
      set_my_notification_preference: {
        Args: { target_category: string; target_email_enabled: boolean }
        Returns: undefined
      }
      start_submission: {
        Args: { target_period_id: string; target_tenant_fsp_id: string }
        Returns: {
          submission_id: string
          submission_route: string
          submission_status: string
        }[]
      }
      submit_submission: {
        Args: { target_submission_id: string }
        Returns: {
          submission_id: string
          submission_status: string
          submit_date: string
        }[]
      }
      update_fsp_profile: {
        Args: { target_fsp_id: string; target_trade_name: string }
        Returns: undefined
      }
      update_platform_tenant: {
        Args: {
          target_name: string
          target_status: string
          target_tenant_id: string
        }
        Returns: undefined
      }
      update_tenant_fsp_relationship: {
        Args: { target_broker_reference?: string; target_tenant_fsp_id: string }
        Returns: undefined
      }
      update_tenant_notification_settings: {
        Args: {
          target_notify_admin_ai_events: boolean
          target_notify_admin_review_required: boolean
          target_reminder_offsets: number[]
          target_tenant_id: string
        }
        Returns: undefined
      }
      update_tenant_organisation: {
        Args: { target_name: string; target_tenant_id: string }
        Returns: {
          tenant_id: string
          tenant_name: string
          update_date: string
        }[]
      }
      update_tenant_submission_period: {
        Args: {
          target_close_date: string
          target_name: string
          target_open_date: string
          target_period_id: string
          target_questionnaire_version_id: string
          target_status: string
          target_year: number
        }
        Returns: undefined
      }
      update_tenant_submission_period_v2: {
        Args: {
          target_close_date: string
          target_name: string
          target_open_date: string
          target_period_id: string
          target_questionnaire_version_id: string
          target_review_mode: string
          target_status: string
          target_year: number
        }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
