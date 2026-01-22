--- 1. EXTENSIONS ---
plpgsql                   | 1.0
pg_stat_statements        | 1.11
pgcrypto                  | 1.3
supabase_vault            | 0.3.1
uuid-ossp                 | 1.1
vector                    | 0.8.0
pg_graphql                | 1.5.11
pg_cron                   | 1.6.4

--- 2. SCHEMAS ---
extensions
realtime
vault
graphql_public
graphql
storage
auth
public
cron

--- 3. ROLES ---
dashboard_user
supabase_admin
postgres
authenticated
supabase_auth_admin
supabase_etl_admin
supabase_read_only_user
anon
service_role
authenticator
supabase_realtime_admin
supabase_replication_admin
supabase_storage_admin

--- 4. TABLES AND COLUMNS ---
auth.audit_log_entries -> instance_id (uuid) | Nullable: YES | Default: NULL
auth.audit_log_entries -> id (uuid) | Nullable: NO | Default: NULL
auth.audit_log_entries -> payload (json) | Nullable: YES | Default: NULL
auth.audit_log_entries -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.audit_log_entries -> ip_address (varchar) | Nullable: NO | Default: ''::character varying
auth.flow_state -> id (uuid) | Nullable: NO | Default: NULL
auth.flow_state -> user_id (uuid) | Nullable: YES | Default: NULL
auth.flow_state -> auth_code (text) | Nullable: NO | Default: NULL
auth.flow_state -> code_challenge_method (code_challenge_method) | Nullable: NO | Default: NULL
auth.flow_state -> code_challenge (text) | Nullable: NO | Default: NULL
auth.flow_state -> provider_type (text) | Nullable: NO | Default: NULL
auth.flow_state -> provider_access_token (text) | Nullable: YES | Default: NULL
auth.flow_state -> provider_refresh_token (text) | Nullable: YES | Default: NULL
auth.flow_state -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.flow_state -> updated_at (timestamptz) | Nullable: YES | Default: NULL
auth.flow_state -> authentication_method (text) | Nullable: NO | Default: NULL
auth.flow_state -> auth_code_issued_at (timestamptz) | Nullable: YES | Default: NULL
auth.identities -> provider_id (text) | Nullable: NO | Default: NULL
auth.identities -> user_id (uuid) | Nullable: NO | Default: NULL
auth.identities -> identity_data (jsonb) | Nullable: NO | Default: NULL
auth.identities -> provider (text) | Nullable: NO | Default: NULL
auth.identities -> last_sign_in_at (timestamptz) | Nullable: YES | Default: NULL
auth.identities -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.identities -> updated_at (timestamptz) | Nullable: YES | Default: NULL
auth.identities -> email (text) | Nullable: YES | Default: NULL
auth.identities -> id (uuid) | Nullable: NO | Default: gen_random_uuid()
auth.instances -> id (uuid) | Nullable: NO | Default: NULL
auth.instances -> uuid (uuid) | Nullable: YES | Default: NULL
auth.instances -> raw_base_config (text) | Nullable: YES | Default: NULL
auth.instances -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.instances -> updated_at (timestamptz) | Nullable: YES | Default: NULL
auth.mfa_amr_claims -> session_id (uuid) | Nullable: NO | Default: NULL
auth.mfa_amr_claims -> created_at (timestamptz) | Nullable: NO | Default: NULL
auth.mfa_amr_claims -> updated_at (timestamptz) | Nullable: NO | Default: NULL
auth.mfa_amr_claims -> authentication_method (text) | Nullable: NO | Default: NULL
auth.mfa_amr_claims -> id (uuid) | Nullable: NO | Default: NULL
auth.mfa_challenges -> id (uuid) | Nullable: NO | Default: NULL
auth.mfa_challenges -> factor_id (uuid) | Nullable: NO | Default: NULL
auth.mfa_challenges -> created_at (timestamptz) | Nullable: NO | Default: NULL
auth.mfa_challenges -> verified_at (timestamptz) | Nullable: YES | Default: NULL
auth.mfa_challenges -> ip_address (inet) | Nullable: NO | Default: NULL
auth.mfa_challenges -> otp_code (text) | Nullable: YES | Default: NULL
auth.mfa_challenges -> web_authn_session_data (jsonb) | Nullable: YES | Default: NULL
auth.mfa_factors -> id (uuid) | Nullable: NO | Default: NULL
auth.mfa_factors -> user_id (uuid) | Nullable: NO | Default: NULL
auth.mfa_factors -> friendly_name (text) | Nullable: YES | Default: NULL
auth.mfa_factors -> factor_type (factor_type) | Nullable: NO | Default: NULL
auth.mfa_factors -> status (factor_status) | Nullable: NO | Default: NULL
auth.mfa_factors -> created_at (timestamptz) | Nullable: NO | Default: NULL
auth.mfa_factors -> updated_at (timestamptz) | Nullable: NO | Default: NULL
auth.mfa_factors -> secret (text) | Nullable: YES | Default: NULL
auth.mfa_factors -> phone (text) | Nullable: YES | Default: NULL
auth.mfa_factors -> last_challenged_at (timestamptz) | Nullable: YES | Default: NULL
auth.mfa_factors -> web_authn_credential (jsonb) | Nullable: YES | Default: NULL
auth.mfa_factors -> web_authn_aaguid (uuid) | Nullable: YES | Default: NULL
auth.mfa_factors -> last_webauthn_challenge_data (jsonb) | Nullable: YES | Default: NULL
auth.oauth_authorizations -> id (uuid) | Nullable: NO | Default: NULL
auth.oauth_authorizations -> authorization_id (text) | Nullable: NO | Default: NULL
auth.oauth_authorizations -> client_id (uuid) | Nullable: NO | Default: NULL
auth.oauth_authorizations -> user_id (uuid) | Nullable: YES | Default: NULL
auth.oauth_authorizations -> redirect_uri (text) | Nullable: NO | Default: NULL
auth.oauth_authorizations -> scope (text) | Nullable: NO | Default: NULL
auth.oauth_authorizations -> state (text) | Nullable: YES | Default: NULL
auth.oauth_authorizations -> resource (text) | Nullable: YES | Default: NULL
auth.oauth_authorizations -> code_challenge (text) | Nullable: YES | Default: NULL
auth.oauth_authorizations -> code_challenge_method (code_challenge_method) | Nullable: YES | Default: NULL
auth.oauth_authorizations -> response_type (oauth_response_type) | Nullable: NO | Default: 'code'::auth.oauth_response_type
auth.oauth_authorizations -> status (oauth_authorization_status) | Nullable: NO | Default: 'pending'::auth.oauth_authorization_status
auth.oauth_authorizations -> authorization_code (text) | Nullable: YES | Default: NULL
auth.oauth_authorizations -> created_at (timestamptz) | Nullable: NO | Default: now()
auth.oauth_authorizations -> expires_at (timestamptz) | Nullable: NO | Default: (now() + '00:03:00'::interval)
auth.oauth_authorizations -> approved_at (timestamptz) | Nullable: YES | Default: NULL
auth.oauth_authorizations -> nonce (text) | Nullable: YES | Default: NULL
auth.oauth_client_states -> id (uuid) | Nullable: NO | Default: NULL
auth.oauth_client_states -> provider_type (text) | Nullable: NO | Default: NULL
auth.oauth_client_states -> code_verifier (text) | Nullable: YES | Default: NULL
auth.oauth_client_states -> created_at (timestamptz) | Nullable: NO | Default: NULL
auth.oauth_clients -> id (uuid) | Nullable: NO | Default: NULL
auth.oauth_clients -> client_secret_hash (text) | Nullable: YES | Default: NULL
auth.oauth_clients -> registration_type (oauth_registration_type) | Nullable: NO | Default: NULL
auth.oauth_clients -> redirect_uris (text) | Nullable: NO | Default: NULL
auth.oauth_clients -> grant_types (text) | Nullable: NO | Default: NULL
auth.oauth_clients -> client_name (text) | Nullable: YES | Default: NULL
auth.oauth_clients -> client_uri (text) | Nullable: YES | Default: NULL
auth.oauth_clients -> logo_uri (text) | Nullable: YES | Default: NULL
auth.oauth_clients -> created_at (timestamptz) | Nullable: NO | Default: now()
auth.oauth_clients -> updated_at (timestamptz) | Nullable: NO | Default: now()
auth.oauth_clients -> deleted_at (timestamptz) | Nullable: YES | Default: NULL
auth.oauth_clients -> client_type (oauth_client_type) | Nullable: NO | Default: 'confidential'::auth.oauth_client_type
auth.oauth_consents -> id (uuid) | Nullable: NO | Default: NULL
auth.oauth_consents -> user_id (uuid) | Nullable: NO | Default: NULL
auth.oauth_consents -> client_id (uuid) | Nullable: NO | Default: NULL
auth.oauth_consents -> scopes (text) | Nullable: NO | Default: NULL
auth.oauth_consents -> granted_at (timestamptz) | Nullable: NO | Default: now()
auth.oauth_consents -> revoked_at (timestamptz) | Nullable: YES | Default: NULL
auth.one_time_tokens -> id (uuid) | Nullable: NO | Default: NULL
auth.one_time_tokens -> user_id (uuid) | Nullable: NO | Default: NULL
auth.one_time_tokens -> token_type (one_time_token_type) | Nullable: NO | Default: NULL
auth.one_time_tokens -> token_hash (text) | Nullable: NO | Default: NULL
auth.one_time_tokens -> relates_to (text) | Nullable: NO | Default: NULL
auth.one_time_tokens -> created_at (timestamp) | Nullable: NO | Default: now()
auth.one_time_tokens -> updated_at (timestamp) | Nullable: NO | Default: now()
auth.refresh_tokens -> instance_id (uuid) | Nullable: YES | Default: NULL
auth.refresh_tokens -> id (int8) | Nullable: NO | Default: nextval('auth.refresh_tokens_id_seq'::regclass)
auth.refresh_tokens -> token (varchar) | Nullable: YES | Default: NULL
auth.refresh_tokens -> user_id (varchar) | Nullable: YES | Default: NULL
auth.refresh_tokens -> revoked (bool) | Nullable: YES | Default: NULL
auth.refresh_tokens -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.refresh_tokens -> updated_at (timestamptz) | Nullable: YES | Default: NULL
auth.refresh_tokens -> parent (varchar) | Nullable: YES | Default: NULL
auth.refresh_tokens -> session_id (uuid) | Nullable: YES | Default: NULL
auth.saml_providers -> id (uuid) | Nullable: NO | Default: NULL
auth.saml_providers -> sso_provider_id (uuid) | Nullable: NO | Default: NULL
auth.saml_providers -> entity_id (text) | Nullable: NO | Default: NULL
auth.saml_providers -> metadata_xml (text) | Nullable: NO | Default: NULL
auth.saml_providers -> metadata_url (text) | Nullable: YES | Default: NULL
auth.saml_providers -> attribute_mapping (jsonb) | Nullable: YES | Default: NULL
auth.saml_providers -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.saml_providers -> updated_at (timestamptz) | Nullable: YES | Default: NULL
auth.saml_providers -> name_id_format (text) | Nullable: YES | Default: NULL
auth.saml_relay_states -> id (uuid) | Nullable: NO | Default: NULL
auth.saml_relay_states -> sso_provider_id (uuid) | Nullable: NO | Default: NULL
auth.saml_relay_states -> request_id (text) | Nullable: NO | Default: NULL
auth.saml_relay_states -> for_email (text) | Nullable: YES | Default: NULL
auth.saml_relay_states -> redirect_to (text) | Nullable: YES | Default: NULL
auth.saml_relay_states -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.saml_relay_states -> updated_at (timestamptz) | Nullable: YES | Default: NULL
auth.saml_relay_states -> flow_state_id (uuid) | Nullable: YES | Default: NULL
auth.schema_migrations -> version (varchar) | Nullable: NO | Default: NULL
auth.sessions -> id (uuid) | Nullable: NO | Default: NULL
auth.sessions -> user_id (uuid) | Nullable: NO | Default: NULL
auth.sessions -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.sessions -> updated_at (timestamptz) | Nullable: YES | Default: NULL
auth.sessions -> factor_id (uuid) | Nullable: YES | Default: NULL
auth.sessions -> aal (aal_level) | Nullable: YES | Default: NULL
auth.sessions -> not_after (timestamptz) | Nullable: YES | Default: NULL
auth.sessions -> refreshed_at (timestamp) | Nullable: YES | Default: NULL
auth.sessions -> user_agent (text) | Nullable: YES | Default: NULL
auth.sessions -> ip (inet) | Nullable: YES | Default: NULL
auth.sessions -> tag (text) | Nullable: YES | Default: NULL
auth.sessions -> oauth_client_id (uuid) | Nullable: YES | Default: NULL
auth.sessions -> refresh_token_hmac_key (text) | Nullable: YES | Default: NULL
auth.sessions -> refresh_token_counter (int8) | Nullable: YES | Default: NULL
auth.sessions -> scopes (text) | Nullable: YES | Default: NULL
auth.sso_domains -> id (uuid) | Nullable: NO | Default: NULL
auth.sso_domains -> sso_provider_id (uuid) | Nullable: NO | Default: NULL
auth.sso_domains -> domain (text) | Nullable: NO | Default: NULL
auth.sso_domains -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.sso_domains -> updated_at (timestamptz) | Nullable: YES | Default: NULL
auth.sso_providers -> id (uuid) | Nullable: NO | Default: NULL
auth.sso_providers -> resource_id (text) | Nullable: YES | Default: NULL
auth.sso_providers -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.sso_providers -> updated_at (timestamptz) | Nullable: YES | Default: NULL
auth.sso_providers -> disabled (bool) | Nullable: YES | Default: NULL
auth.users -> instance_id (uuid) | Nullable: YES | Default: NULL
auth.users -> id (uuid) | Nullable: NO | Default: NULL
auth.users -> aud (varchar) | Nullable: YES | Default: NULL
auth.users -> role (varchar) | Nullable: YES | Default: NULL
auth.users -> email (varchar) | Nullable: YES | Default: NULL
auth.users -> encrypted_password (varchar) | Nullable: YES | Default: NULL
auth.users -> email_confirmed_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> invited_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> confirmation_token (varchar) | Nullable: YES | Default: NULL
auth.users -> confirmation_sent_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> recovery_token (varchar) | Nullable: YES | Default: NULL
auth.users -> recovery_sent_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> email_change_token_new (varchar) | Nullable: YES | Default: NULL
auth.users -> email_change (varchar) | Nullable: YES | Default: NULL
auth.users -> email_change_sent_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> last_sign_in_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> raw_app_meta_data (jsonb) | Nullable: YES | Default: NULL
auth.users -> raw_user_meta_data (jsonb) | Nullable: YES | Default: NULL
auth.users -> is_super_admin (bool) | Nullable: YES | Default: NULL
auth.users -> created_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> updated_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> phone (text) | Nullable: YES | Default: NULL::character varying
auth.users -> phone_confirmed_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> phone_change (text) | Nullable: YES | Default: ''::character varying
auth.users -> phone_change_token (varchar) | Nullable: YES | Default: ''::character varying
auth.users -> phone_change_sent_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> confirmed_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> email_change_token_current (varchar) | Nullable: YES | Default: ''::character varying
auth.users -> email_change_confirm_status (int2) | Nullable: YES | Default: 0
auth.users -> banned_until (timestamptz) | Nullable: YES | Default: NULL
auth.users -> reauthentication_token (varchar) | Nullable: YES | Default: ''::character varying
auth.users -> reauthentication_sent_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> is_sso_user (bool) | Nullable: NO | Default: false
auth.users -> deleted_at (timestamptz) | Nullable: YES | Default: NULL
auth.users -> is_anonymous (bool) | Nullable: NO | Default: false
public.activity_log -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.activity_log -> entity_type (varchar) | Nullable: NO | Default: NULL
public.activity_log -> entity_id (varchar) | Nullable: NO | Default: NULL
public.activity_log -> action (varchar) | Nullable: NO | Default: NULL
public.activity_log -> actor_type (varchar) | Nullable: NO | Default: NULL
public.activity_log -> user_id (uuid) | Nullable: YES | Default: NULL
public.activity_log -> changes (jsonb) | Nullable: YES | Default: NULL
public.activity_log -> created_at (timestamptz) | Nullable: YES | Default: now()
public.admin_audit_log -> id (uuid) | Nullable: NO | Default: gen_random_uuid()
public.admin_audit_log -> admin_id (uuid) | Nullable: NO | Default: NULL
public.admin_audit_log -> action (varchar) | Nullable: NO | Default: NULL
public.admin_audit_log -> entity_type (varchar) | Nullable: YES | Default: NULL
public.admin_audit_log -> entity_id (varchar) | Nullable: YES | Default: NULL
public.admin_audit_log -> old_value (jsonb) | Nullable: YES | Default: NULL
public.admin_audit_log -> new_value (jsonb) | Nullable: YES | Default: NULL
public.admin_audit_log -> metadata (jsonb) | Nullable: YES | Default: NULL
public.admin_audit_log -> ip_address (varchar) | Nullable: YES | Default: NULL
public.admin_audit_log -> user_agent (text) | Nullable: YES | Default: NULL
public.admin_audit_log -> created_at (timestamptz) | Nullable: YES | Default: now()
public.agent_jobs -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.agent_jobs -> execution_id (varchar) | Nullable: NO | Default: NULL
public.agent_jobs -> node_id (varchar) | Nullable: NO | Default: NULL
public.agent_jobs -> job_type (varchar) | Nullable: NO | Default: NULL
public.agent_jobs -> status (varchar) | Nullable: YES | Default: 'pending'::character varying
public.agent_jobs -> input_data_json (jsonb) | Nullable: YES | Default: NULL
public.agent_jobs -> output_data_json (jsonb) | Nullable: YES | Default: NULL
public.agent_jobs -> error_message (text) | Nullable: YES | Default: NULL
public.agent_jobs -> tokens_used (int4) | Nullable: YES | Default: 0
public.agent_jobs -> started_at (timestamptz) | Nullable: YES | Default: NULL
public.agent_jobs -> completed_at (timestamptz) | Nullable: YES | Default: NULL
public.agent_jobs -> created_at (timestamptz) | Nullable: YES | Default: now()
public.ai_usage_log -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.ai_usage_log -> user_id (uuid) | Nullable: NO | Default: NULL
public.ai_usage_log -> workspace_id (varchar) | Nullable: YES | Default: NULL
public.ai_usage_log -> project_id (varchar) | Nullable: YES | Default: NULL
public.ai_usage_log -> model (varchar) | Nullable: NO | Default: NULL
public.ai_usage_log -> provider (varchar) | Nullable: NO | Default: NULL
public.ai_usage_log -> request_type (varchar) | Nullable: NO | Default: NULL
public.ai_usage_log -> input_tokens (int4) | Nullable: YES | Default: 0
public.ai_usage_log -> output_tokens (int4) | Nullable: YES | Default: 0
public.ai_usage_log -> total_tokens (int4) | Nullable: YES | Default: 0
public.ai_usage_log -> input_cost (numeric) | Nullable: YES | Default: 0
public.ai_usage_log -> output_cost (numeric) | Nullable: YES | Default: 0
public.ai_usage_log -> total_cost (numeric) | Nullable: YES | Default: 0
public.ai_usage_log -> prompt_preview (text) | Nullable: YES | Default: NULL
public.ai_usage_log -> response_preview (text) | Nullable: YES | Default: NULL
public.ai_usage_log -> tool_calls (jsonb) | Nullable: YES | Default: NULL
public.ai_usage_log -> created_at (timestamptz) | Nullable: YES | Default: now()
public.ai_usage_log -> duration_ms (int4) | Nullable: YES | Default: NULL
public.asset_usage_history -> id (varchar) | Nullable: NO | Default: NULL
public.asset_usage_history -> asset_id (varchar) | Nullable: NO | Default: NULL
public.asset_usage_history -> generation_id (varchar) | Nullable: YES | Default: NULL
public.asset_usage_history -> used_at (timestamptz) | Nullable: NO | Default: now()
public.assistant_asset_selection -> id (varchar) | Nullable: NO | Default: NULL
public.assistant_asset_selection -> settings_id (varchar) | Nullable: NO | Default: NULL
public.assistant_asset_selection -> asset_id (varchar) | Nullable: NO | Default: NULL
public.assistant_asset_selection -> is_enabled (bool) | Nullable: NO | Default: NULL
public.assistant_asset_selection -> created_at (timestamptz) | Nullable: YES | Default: now()
public.assistant_visual_settings -> id (varchar) | Nullable: NO | Default: NULL
public.assistant_visual_settings -> project_id (varchar) | Nullable: NO | Default: NULL
public.assistant_visual_settings -> is_enabled (bool) | Nullable: NO | Default: NULL
public.assistant_visual_settings -> mode (varchar) | Nullable: NO | Default: NULL
public.assistant_visual_settings -> assets_per_category (int4) | Nullable: NO | Default: NULL
public.assistant_visual_settings -> created_at (timestamptz) | Nullable: YES | Default: now()
public.assistant_visual_settings -> updated_at (timestamptz) | Nullable: YES | Default: NULL
public.chat_conversations -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.chat_conversations -> user_id (uuid) | Nullable: NO | Default: NULL
public.chat_conversations -> project_id (varchar) | Nullable: YES | Default: NULL
public.chat_conversations -> workspace_id (varchar) | Nullable: NO | Default: NULL
public.chat_conversations -> title (varchar) | Nullable: YES | Default: NULL
public.chat_conversations -> summary (text) | Nullable: YES | Default: NULL
public.chat_conversations -> messages_json (jsonb) | Nullable: YES | Default: '[]'::jsonb
public.chat_conversations -> model_used (varchar) | Nullable: YES | Default: NULL
public.chat_conversations -> document_ids_context (jsonb) | Nullable: YES | Default: '[]'::jsonb
public.chat_conversations -> folder_ids_context (jsonb) | Nullable: YES | Default: '[]'::jsonb
public.chat_conversations -> created_document_ids (jsonb) | Nullable: YES | Default: '[]'::jsonb
public.chat_conversations -> is_archived (bool) | Nullable: YES | Default: false
public.chat_conversations -> message_count (int4) | Nullable: YES | Default: 0
public.chat_conversations -> last_message_at (timestamptz) | Nullable: YES | Default: NULL
public.chat_conversations -> created_at (timestamptz) | Nullable: YES | Default: now()
public.chat_conversations -> updated_at (timestamptz) | Nullable: YES | Default: NULL
public.document_attachments -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.document_attachments -> document_id (varchar) | Nullable: NO | Default: NULL
public.document_attachments -> image_id (varchar) | Nullable: NO | Default: NULL
public.document_attachments -> is_primary (bool) | Nullable: YES | Default: false
public.document_attachments -> attachment_order (int4) | Nullable: YES | Default: 0
public.document_attachments -> created_by_workflow_id (varchar) | Nullable: YES | Default: NULL
public.document_attachments -> created_at (timestamptz) | Nullable: YES | Default: now()
public.documents -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.documents -> title (varchar) | Nullable: YES | Default: NULL
public.documents -> content (text) | Nullable: YES | Default: NULL
public.documents -> status (varchar) | Nullable: YES | Default: 'draft'::character varying
public.documents -> project_id (varchar) | Nullable: YES | Default: NULL
public.documents -> folder_id (varchar) | Nullable: YES | Default: NULL
public.documents -> media_type (varchar) | Nullable: YES | Default: 'text'::character varying
public.documents -> file_url (varchar) | Nullable: YES | Default: NULL
public.documents -> thumbnail_url (varchar) | Nullable: YES | Default: NULL
public.documents -> generation_metadata (jsonb) | Nullable: YES | Default: NULL
public.documents -> is_reference_asset (bool) | Nullable: YES | Default: false
public.documents -> asset_type (varchar) | Nullable: YES | Default: NULL
public.documents -> asset_metadata (jsonb) | Nullable: YES | Default: NULL
public.documents -> is_public (bool) | Nullable: YES | Default: false
public.documents -> share_token (varchar) | Nullable: YES | Default: NULL
public.documents -> share_expires_at (timestamptz) | Nullable: YES | Default: NULL
public.documents -> created_at (timestamptz) | Nullable: YES | Default: now()
public.documents -> updated_at (timestamptz) | Nullable: YES | Default: NULL
public.documents -> deleted_at (timestamptz) | Nullable: YES | Default: NULL
public.documents -> is_context (bool) | Nullable: YES | Default: false
public.documents -> asset_category (varchar) | Nullable: YES | Default: NULL
public.documents -> asset_tags (_text) | Nullable: YES | Default: NULL
public.documents -> ai_description (text) | Nullable: YES | Default: NULL
public.documents -> original_image_id (varchar) | Nullable: YES | Default: NULL
public.documents -> refinement_history (jsonb) | Nullable: YES | Default: '[]'::jsonb
public.documents -> variation_set_id (uuid) | Nullable: YES | Default: NULL
public.documents -> variation_index (int4) | Nullable: YES | Default: NULL
public.documents -> variation_modifier (text) | Nullable: YES | Default: NULL
public.folders -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.folders -> name (varchar) | Nullable: NO | Default: NULL
public.folders -> parent_folder_id (varchar) | Nullable: YES | Default: NULL
public.folders -> project_id (varchar) | Nullable: NO | Default: NULL
public.folders -> created_at (timestamptz) | Nullable: YES | Default: now()
public.folders -> updated_at (timestamptz) | Nullable: YES | Default: NULL
public.folders -> deleted_at (timestamptz) | Nullable: YES | Default: NULL
public.langchain_pg_collection -> name (varchar) | Nullable: NO | Default: NULL
public.langchain_pg_collection -> cmetadata (jsonb) | Nullable: YES | Default: NULL
public.langchain_pg_collection -> uuid (uuid) | Nullable: NO | Default: uuid_generate_v4()
public.langchain_pg_embedding -> collection_id (uuid) | Nullable: YES | Default: NULL
public.langchain_pg_embedding -> embedding (vector) | Nullable: YES | Default: NULL
public.langchain_pg_embedding -> document (text) | Nullable: YES | Default: NULL
public.langchain_pg_embedding -> cmetadata (jsonb) | Nullable: YES | Default: NULL
public.langchain_pg_embedding -> custom_id (varchar) | Nullable: YES | Default: NULL
public.langchain_pg_embedding -> uuid (uuid) | Nullable: NO | Default: uuid_generate_v4()
public.node_outputs -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.node_outputs -> execution_id (varchar) | Nullable: NO | Default: NULL
public.node_outputs -> node_id (varchar) | Nullable: NO | Default: NULL
public.node_outputs -> node_name (varchar) | Nullable: NO | Default: NULL
public.node_outputs -> node_type (varchar) | Nullable: NO | Default: NULL
public.node_outputs -> outputs (jsonb) | Nullable: NO | Default: NULL
public.node_outputs -> execution_order (int4) | Nullable: NO | Default: NULL
public.node_outputs -> iteration_number (int4) | Nullable: YES | Default: 0
public.node_outputs -> started_at (timestamptz) | Nullable: YES | Default: NULL
public.node_outputs -> completed_at (timestamptz) | Nullable: YES | Default: NULL
public.node_outputs -> created_at (timestamptz) | Nullable: YES | Default: now()
public.projects -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.projects -> name (varchar) | Nullable: NO | Default: NULL
public.projects -> description (text) | Nullable: YES | Default: NULL
public.projects -> workspace_id (varchar) | Nullable: YES | Default: NULL
public.projects -> created_at (timestamptz) | Nullable: YES | Default: now()
public.projects -> settings (jsonb) | Nullable: YES | Default: '{}'::jsonb
public.projects -> deleted_at (timestamptz) | Nullable: YES | Default: NULL
public.style_presets -> id (uuid) | Nullable: NO | Default: gen_random_uuid()
public.style_presets -> name (varchar) | Nullable: NO | Default: NULL
public.style_presets -> name_pt (varchar) | Nullable: NO | Default: NULL
public.style_presets -> slug (varchar) | Nullable: NO | Default: NULL
public.style_presets -> prompt_modifier (text) | Nullable: NO | Default: NULL
public.style_presets -> thumbnail_url (text) | Nullable: YES | Default: NULL
public.style_presets -> category (varchar) | Nullable: YES | Default: 'general'::character varying
public.style_presets -> sort_order (int4) | Nullable: YES | Default: 0
public.style_presets -> is_active (bool) | Nullable: YES | Default: true
public.style_presets -> created_at (timestamptz) | Nullable: YES | Default: now()
public.style_presets -> preset_type (varchar) | Nullable: YES | Default: 'visual_style'::character varying
public.system_config -> id (uuid) | Nullable: NO | Default: gen_random_uuid()
public.system_config -> key (varchar) | Nullable: NO | Default: NULL
public.system_config -> value (jsonb) | Nullable: NO | Default: NULL
public.system_config -> description (text) | Nullable: YES | Default: NULL
public.system_config -> updated_at (timestamptz) | Nullable: YES | Default: now()
public.system_config -> updated_by (uuid) | Nullable: YES | Default: NULL
public.templates -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.templates -> workspace_id (varchar) | Nullable: YES | Default: NULL
public.templates -> user_id (uuid) | Nullable: YES | Default: NULL
public.templates -> name (varchar) | Nullable: NO | Default: NULL
public.templates -> description (text) | Nullable: YES | Default: NULL
public.templates -> category (varchar) | Nullable: NO | Default: NULL
public.templates -> icon (varchar) | Nullable: YES | Default: NULL
public.templates -> prompt (text) | Nullable: NO | Default: NULL
public.templates -> is_system (bool) | Nullable: YES | Default: false
public.templates -> is_active (bool) | Nullable: YES | Default: true
public.templates -> tags (jsonb) | Nullable: YES | Default: NULL
public.templates -> usage_count (int4) | Nullable: YES | Default: 0
public.templates -> created_at (timestamptz) | Nullable: YES | Default: now()
public.templates -> updated_at (timestamptz) | Nullable: YES | Default: NULL
public.templates -> variables (jsonb) | Nullable: YES | Default: '[]'::jsonb
public.templates -> initial_message (text) | Nullable: YES | Default: NULL
public.templates -> expert_name (varchar) | Nullable: YES | Default: NULL
public.templates -> estimated_outputs (varchar) | Nullable: YES | Default: NULL
public.templates -> is_featured (bool) | Nullable: YES | Default: false
public.user_memories -> id (uuid) | Nullable: NO | Default: NULL
public.user_memories -> user_id (uuid) | Nullable: NO | Default: NULL
public.user_memories -> project_id (varchar) | Nullable: NO | Default: NULL
public.user_memories -> content (text) | Nullable: NO | Default: NULL
public.user_memories -> content_hash (varchar) | Nullable: NO | Default: NULL
public.user_memories -> embedding (vector) | Nullable: YES | Default: NULL
public.user_memories -> category (varchar) | Nullable: YES | Default: NULL
public.user_memories -> source_conversation_id (varchar) | Nullable: YES | Default: NULL
public.user_memories -> created_at (timestamptz) | Nullable: NO | Default: now()
public.user_memories -> updated_at (timestamptz) | Nullable: NO | Default: now()
public.user_preferences -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.user_preferences -> user_id (uuid) | Nullable: NO | Default: NULL
public.user_preferences -> autonomous_mode (bool) | Nullable: YES | Default: false
public.user_preferences -> max_iterations (int4) | Nullable: YES | Default: 25
public.user_preferences -> default_model (varchar) | Nullable: YES | Default: NULL
public.user_preferences -> use_rag_by_default (bool) | Nullable: YES | Default: true
public.user_preferences -> settings (jsonb) | Nullable: YES | Default: '{}'::jsonb
public.user_preferences -> created_at (timestamptz) | Nullable: YES | Default: now()
public.user_preferences -> updated_at (timestamptz) | Nullable: YES | Default: NULL
public.users -> id (uuid) | Nullable: NO | Default: NULL
public.users -> email (varchar) | Nullable: NO | Default: NULL
public.users -> full_name (varchar) | Nullable: YES | Default: NULL
public.users -> created_at (timestamptz) | Nullable: YES | Default: now()
public.users -> updated_at (timestamptz) | Nullable: YES | Default: NULL
public.users -> is_super_admin (bool) | Nullable: YES | Default: false
public.users -> is_blocked (bool) | Nullable: YES | Default: false
public.users -> blocked_at (timestamptz) | Nullable: YES | Default: NULL
public.users -> blocked_by (uuid) | Nullable: YES | Default: NULL
public.workflow_executions -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.workflow_executions -> template_id (varchar) | Nullable: NO | Default: NULL
public.workflow_executions -> project_id (varchar) | Nullable: NO | Default: NULL
public.workflow_executions -> workspace_id (varchar) | Nullable: NO | Default: NULL
public.workflow_executions -> user_id (uuid) | Nullable: NO | Default: NULL
public.workflow_executions -> status (varchar) | Nullable: YES | Default: 'pending'::character varying
public.workflow_executions -> config_json (jsonb) | Nullable: YES | Default: '{}'::jsonb
public.workflow_executions -> execution_context (jsonb) | Nullable: YES | Default: '{}'::jsonb
public.workflow_executions -> progress_percent (int4) | Nullable: YES | Default: 0
public.workflow_executions -> current_node_id (varchar) | Nullable: YES | Default: NULL
public.workflow_executions -> celery_task_id (varchar) | Nullable: YES | Default: NULL
public.workflow_executions -> error_message (text) | Nullable: YES | Default: NULL
public.workflow_executions -> total_cost (numeric) | Nullable: YES | Default: 0
public.workflow_executions -> total_tokens_used (int4) | Nullable: YES | Default: 0
public.workflow_executions -> generated_document_ids (jsonb) | Nullable: YES | Default: '[]'::jsonb
public.workflow_executions -> started_at (timestamptz) | Nullable: YES | Default: NULL
public.workflow_executions -> completed_at (timestamptz) | Nullable: YES | Default: NULL
public.workflow_executions -> created_at (timestamptz) | Nullable: YES | Default: now()
public.workflow_executions -> deleted_at (timestamptz) | Nullable: YES | Default: NULL
public.workflow_templates -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.workflow_templates -> workspace_id (varchar) | Nullable: YES | Default: NULL
public.workflow_templates -> project_id (varchar) | Nullable: YES | Default: NULL
public.workflow_templates -> name (varchar) | Nullable: NO | Default: NULL
public.workflow_templates -> description (text) | Nullable: YES | Default: NULL
public.workflow_templates -> category (varchar) | Nullable: YES | Default: NULL
public.workflow_templates -> nodes_json (jsonb) | Nullable: YES | Default: '[]'::jsonb
public.workflow_templates -> edges_json (jsonb) | Nullable: YES | Default: '[]'::jsonb
public.workflow_templates -> default_params_json (jsonb) | Nullable: YES | Default: '{}'::jsonb
public.workflow_templates -> is_system (bool) | Nullable: YES | Default: false
public.workflow_templates -> is_recommended (bool) | Nullable: YES | Default: false
public.workflow_templates -> usage_count (int4) | Nullable: YES | Default: 0
public.workflow_templates -> version (varchar) | Nullable: YES | Default: '1.0'::character varying
public.workflow_templates -> created_by (uuid) | Nullable: YES | Default: NULL
public.workflow_templates -> created_at (timestamptz) | Nullable: YES | Default: now()
public.workflow_templates -> updated_at (timestamptz) | Nullable: YES | Default: NULL
public.workflow_templates -> deleted_at (timestamptz) | Nullable: YES | Default: NULL
public.workspace_invites -> id (varchar) | Nullable: NO | Default: NULL
public.workspace_invites -> workspace_id (varchar) | Nullable: NO | Default: NULL
public.workspace_invites -> email (varchar) | Nullable: NO | Default: NULL
public.workspace_invites -> role (varchar) | Nullable: NO | Default: 'member'::character varying
public.workspace_invites -> invited_by_id (uuid) | Nullable: NO | Default: NULL
public.workspace_invites -> token (varchar) | Nullable: NO | Default: NULL
public.workspace_invites -> created_at (timestamptz) | Nullable: YES | Default: now()
public.workspace_invites -> expires_at (timestamptz) | Nullable: NO | Default: NULL
public.workspace_invites -> accepted_at (timestamptz) | Nullable: YES | Default: NULL
public.workspace_invites -> status (varchar) | Nullable: NO | Default: 'pending'::character varying
public.workspace_invites -> temp_password (varchar) | Nullable: YES | Default: NULL
public.workspace_users -> workspace_id (varchar) | Nullable: NO | Default: NULL
public.workspace_users -> user_id (uuid) | Nullable: NO | Default: NULL
public.workspace_users -> role (varchar) | Nullable: YES | Default: 'member'::character varying
public.workspaces -> id (varchar) | Nullable: NO | Default: (uuid_generate_v4())::text
public.workspaces -> name (varchar) | Nullable: NO | Default: NULL
public.workspaces -> description (text) | Nullable: YES | Default: NULL
public.workspaces -> default_text_model (varchar) | Nullable: YES | Default: NULL
public.workspaces -> default_vision_model (varchar) | Nullable: YES | Default: NULL
public.workspaces -> attachment_analysis_model (varchar) | Nullable: YES | Default: NULL
public.workspaces -> created_at (timestamptz) | Nullable: YES | Default: now()

--- 5. CONSTRAINTS ---
auth.audit_log_entries (audit_log_entries_pkey) | p: PRIMARY KEY (id)
auth.flow_state (flow_state_pkey) | p: PRIMARY KEY (id)
auth.identities (identities_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
auth.identities (identities_pkey) | p: PRIMARY KEY (id)
auth.identities (identities_provider_id_provider_unique) | u: UNIQUE (provider_id, provider)
auth.instances (instances_pkey) | p: PRIMARY KEY (id)
auth.mfa_amr_claims (mfa_amr_claims_session_id_fkey) | f: FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE
auth.mfa_amr_claims (amr_id_pk) | p: PRIMARY KEY (id)
auth.mfa_amr_claims (mfa_amr_claims_session_id_authentication_method_pkey) | u: UNIQUE (session_id, authentication_method)
auth.mfa_challenges (mfa_challenges_auth_factor_id_fkey) | f: FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE
auth.mfa_challenges (mfa_challenges_pkey) | p: PRIMARY KEY (id)
auth.mfa_factors (mfa_factors_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
auth.mfa_factors (mfa_factors_pkey) | p: PRIMARY KEY (id)
auth.mfa_factors (mfa_factors_last_challenged_at_key) | u: UNIQUE (last_challenged_at)
auth.oauth_authorizations (oauth_authorizations_scope_length) | c: CHECK ((char_length(scope) <= 4096))
auth.oauth_authorizations (oauth_authorizations_resource_length) | c: CHECK ((char_length(resource) <= 2048))
auth.oauth_authorizations (oauth_authorizations_nonce_length) | c: CHECK ((char_length(nonce) <= 255))
auth.oauth_authorizations (oauth_authorizations_expires_at_future) | c: CHECK ((expires_at > created_at))
auth.oauth_authorizations (oauth_authorizations_code_challenge_length) | c: CHECK ((char_length(code_challenge) <= 128))
auth.oauth_authorizations (oauth_authorizations_redirect_uri_length) | c: CHECK ((char_length(redirect_uri) <= 2048))
auth.oauth_authorizations (oauth_authorizations_state_length) | c: CHECK ((char_length(state) <= 4096))
auth.oauth_authorizations (oauth_authorizations_authorization_code_length) | c: CHECK ((char_length(authorization_code) <= 255))
auth.oauth_authorizations (oauth_authorizations_client_id_fkey) | f: FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE
auth.oauth_authorizations (oauth_authorizations_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
auth.oauth_authorizations (oauth_authorizations_pkey) | p: PRIMARY KEY (id)
auth.oauth_authorizations (oauth_authorizations_authorization_id_key) | u: UNIQUE (authorization_id)
auth.oauth_authorizations (oauth_authorizations_authorization_code_key) | u: UNIQUE (authorization_code)
auth.oauth_client_states (oauth_client_states_pkey) | p: PRIMARY KEY (id)
auth.oauth_clients (oauth_clients_client_name_length) | c: CHECK ((char_length(client_name) <= 1024))
auth.oauth_clients (oauth_clients_client_uri_length) | c: CHECK ((char_length(client_uri) <= 2048))
auth.oauth_clients (oauth_clients_logo_uri_length) | c: CHECK ((char_length(logo_uri) <= 2048))
auth.oauth_clients (oauth_clients_pkey) | p: PRIMARY KEY (id)
auth.oauth_consents (oauth_consents_scopes_length) | c: CHECK ((char_length(scopes) <= 2048))
auth.oauth_consents (oauth_consents_revoked_after_granted) | c: CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at)))
auth.oauth_consents (oauth_consents_scopes_not_empty) | c: CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
auth.oauth_consents (oauth_consents_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
auth.oauth_consents (oauth_consents_client_id_fkey) | f: FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE
auth.oauth_consents (oauth_consents_pkey) | p: PRIMARY KEY (id)
auth.oauth_consents (oauth_consents_user_client_unique) | u: UNIQUE (user_id, client_id)
auth.one_time_tokens (one_time_tokens_token_hash_check) | c: CHECK ((char_length(token_hash) > 0))
auth.one_time_tokens (one_time_tokens_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
auth.one_time_tokens (one_time_tokens_pkey) | p: PRIMARY KEY (id)
auth.refresh_tokens (refresh_tokens_session_id_fkey) | f: FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE
auth.refresh_tokens (refresh_tokens_pkey) | p: PRIMARY KEY (id)
auth.refresh_tokens (refresh_tokens_token_unique) | u: UNIQUE (token)
auth.saml_providers (entity_id not empty) | c: CHECK ((char_length(entity_id) > 0))
auth.saml_providers (metadata_xml not empty) | c: CHECK ((char_length(metadata_xml) > 0))
auth.saml_providers (metadata_url not empty) | c: CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0)))
auth.saml_providers (saml_providers_sso_provider_id_fkey) | f: FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE
auth.saml_providers (saml_providers_pkey) | p: PRIMARY KEY (id)
auth.saml_providers (saml_providers_entity_id_key) | u: UNIQUE (entity_id)
auth.saml_relay_states (request_id not empty) | c: CHECK ((char_length(request_id) > 0))
auth.saml_relay_states (saml_relay_states_sso_provider_id_fkey) | f: FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE
auth.saml_relay_states (saml_relay_states_flow_state_id_fkey) | f: FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE
auth.saml_relay_states (saml_relay_states_pkey) | p: PRIMARY KEY (id)
auth.schema_migrations (schema_migrations_pkey) | p: PRIMARY KEY (version)
auth.sessions (sessions_scopes_length) | c: CHECK ((char_length(scopes) <= 4096))
auth.sessions (sessions_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
auth.sessions (sessions_oauth_client_id_fkey) | f: FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE
auth.sessions (sessions_pkey) | p: PRIMARY KEY (id)
auth.sso_domains (domain not empty) | c: CHECK ((char_length(domain) > 0))
auth.sso_domains (sso_domains_sso_provider_id_fkey) | f: FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE
auth.sso_domains (sso_domains_pkey) | p: PRIMARY KEY (id)
auth.sso_providers (resource_id not empty) | c: CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
auth.sso_providers (sso_providers_pkey) | p: PRIMARY KEY (id)
auth.users (users_email_change_confirm_status_check) | c: CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
auth.users (users_pkey) | p: PRIMARY KEY (id)
auth.users (users_phone_key) | u: UNIQUE (phone)
public.activity_log (activity_log_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
public.activity_log (activity_log_pkey) | p: PRIMARY KEY (id)
public.admin_audit_log (admin_audit_log_admin_id_fkey) | f: FOREIGN KEY (admin_id) REFERENCES users(id)
public.admin_audit_log (admin_audit_log_pkey) | p: PRIMARY KEY (id)
public.agent_jobs (agent_jobs_execution_id_fkey) | f: FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE
public.agent_jobs (agent_jobs_pkey) | p: PRIMARY KEY (id)
public.ai_usage_log (ai_usage_log_workspace_id_fkey) | f: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
public.ai_usage_log (ai_usage_log_project_id_fkey) | f: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
public.ai_usage_log (ai_usage_log_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
public.ai_usage_log (ai_usage_log_pkey) | p: PRIMARY KEY (id)
public.asset_usage_history (asset_usage_history_asset_id_fkey) | f: FOREIGN KEY (asset_id) REFERENCES documents(id) ON DELETE CASCADE
public.asset_usage_history (asset_usage_history_pkey) | p: PRIMARY KEY (id)
public.assistant_asset_selection (assistant_asset_selection_settings_id_fkey) | f: FOREIGN KEY (settings_id) REFERENCES assistant_visual_settings(id) ON DELETE CASCADE
public.assistant_asset_selection (assistant_asset_selection_asset_id_fkey) | f: FOREIGN KEY (asset_id) REFERENCES documents(id) ON DELETE CASCADE
public.assistant_asset_selection (assistant_asset_selection_pkey) | p: PRIMARY KEY (id)
public.assistant_visual_settings (assistant_visual_settings_project_id_fkey) | f: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
public.assistant_visual_settings (assistant_visual_settings_pkey) | p: PRIMARY KEY (id)
public.chat_conversations (chat_conversations_workspace_id_fkey) | f: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
public.chat_conversations (chat_conversations_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
public.chat_conversations (chat_conversations_project_id_fkey) | f: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
public.chat_conversations (chat_conversations_pkey) | p: PRIMARY KEY (id)
public.document_attachments (document_attachments_created_by_workflow_id_fkey) | f: FOREIGN KEY (created_by_workflow_id) REFERENCES workflow_executions(id) ON DELETE SET NULL
public.document_attachments (document_attachments_document_id_fkey) | f: FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
public.document_attachments (document_attachments_image_id_fkey) | f: FOREIGN KEY (image_id) REFERENCES documents(id) ON DELETE CASCADE
public.document_attachments (document_attachments_pkey) | p: PRIMARY KEY (id)
public.documents (chk_asset_category) | c: CHECK (((asset_category IS NULL) OR ((asset_category)::text = ANY (ARRAY[('Logo'::character varying)::text, ('Pessoa'::character varying)::text, ('Background'::character varying)::text, ('Produto'::character varying)::text, ('Referência'::character varying)::text, ('Outro'::character varying)::text]))))
public.documents (documents_folder_id_fkey) | f: FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
public.documents (documents_project_id_fkey) | f: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
public.documents (documents_original_image_id_fkey) | f: FOREIGN KEY (original_image_id) REFERENCES documents(id)
public.documents (documents_pkey) | p: PRIMARY KEY (id)
public.documents (documents_share_token_key) | u: UNIQUE (share_token)
public.folders (folders_project_id_fkey) | f: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
public.folders (folders_parent_folder_id_fkey) | f: FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE SET NULL
public.folders (folders_pkey) | p: PRIMARY KEY (id)
public.langchain_pg_collection (langchain_pg_collection_pkey) | p: PRIMARY KEY (uuid)
public.langchain_pg_embedding (langchain_pg_embedding_collection_id_fkey) | f: FOREIGN KEY (collection_id) REFERENCES langchain_pg_collection(uuid) ON DELETE CASCADE
public.langchain_pg_embedding (langchain_pg_embedding_pkey) | p: PRIMARY KEY (uuid)
public.node_outputs (node_outputs_execution_id_fkey) | f: FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE
public.node_outputs (node_outputs_pkey) | p: PRIMARY KEY (id)
public.projects (projects_workspace_id_fkey) | f: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
public.projects (projects_pkey) | p: PRIMARY KEY (id)
public.style_presets (style_presets_pkey) | p: PRIMARY KEY (id)
public.style_presets (style_presets_slug_key) | u: UNIQUE (slug)
public.system_config (system_config_updated_by_fkey) | f: FOREIGN KEY (updated_by) REFERENCES users(id)
public.system_config (system_config_pkey) | p: PRIMARY KEY (id)
public.system_config (system_config_key_key) | u: UNIQUE (key)
public.templates (templates_workspace_id_fkey) | f: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
public.templates (templates_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
public.templates (templates_pkey) | p: PRIMARY KEY (id)
public.user_memories (valid_memory_category) | c: CHECK (((category)::text = ANY (ARRAY[('personal'::character varying)::text, ('professional'::character varying)::text, ('preference'::character varying)::text, ('plan'::character varying)::text, ('health'::character varying)::text, ('other'::character varying)::text])))
public.user_memories (user_memories_source_conversation_id_fkey) | f: FOREIGN KEY (source_conversation_id) REFERENCES chat_conversations(id) ON DELETE SET NULL
public.user_memories (user_memories_project_id_fkey) | f: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
public.user_memories (user_memories_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
public.user_memories (user_memories_pkey) | p: PRIMARY KEY (id)
public.user_preferences (user_preferences_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
public.user_preferences (user_preferences_pkey) | p: PRIMARY KEY (id)
public.user_preferences (user_preferences_user_id_key) | u: UNIQUE (user_id)
public.users (users_id_fkey) | f: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
public.users (users_blocked_by_fkey) | f: FOREIGN KEY (blocked_by) REFERENCES users(id)
public.users (users_pkey) | p: PRIMARY KEY (id)
public.users (users_email_key) | u: UNIQUE (email)
public.workflow_executions (workflow_executions_workspace_id_fkey) | f: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
public.workflow_executions (workflow_executions_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
public.workflow_executions (workflow_executions_template_id_fkey) | f: FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE
public.workflow_executions (workflow_executions_project_id_fkey) | f: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
public.workflow_executions (workflow_executions_pkey) | p: PRIMARY KEY (id)
public.workflow_templates (workflow_templates_project_id_fkey) | f: FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
public.workflow_templates (workflow_templates_workspace_id_fkey) | f: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
public.workflow_templates (workflow_templates_created_by_fkey) | f: FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
public.workflow_templates (workflow_templates_pkey) | p: PRIMARY KEY (id)
public.workspace_invites (workspace_invites_workspace_id_fkey) | f: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
public.workspace_invites (workspace_invites_invited_by_id_fkey) | f: FOREIGN KEY (invited_by_id) REFERENCES users(id)
public.workspace_invites (workspace_invites_pkey) | p: PRIMARY KEY (id)
public.workspace_invites (workspace_invites_token_key) | u: UNIQUE (token)
public.workspace_users (workspace_users_user_id_fkey) | f: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
public.workspace_users (workspace_users_workspace_id_fkey) | f: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
public.workspace_users (workspace_users_pkey) | p: PRIMARY KEY (workspace_id, user_id)
public.workspaces (workspaces_pkey) | p: PRIMARY KEY (id)

--- 6. INDEXES ---
CREATE UNIQUE INDEX audit_log_entries_pkey ON auth.audit_log_entries USING btree (id);
CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);
CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);
CREATE UNIQUE INDEX flow_state_pkey ON auth.flow_state USING btree (id);
CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);
CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);
CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);
CREATE UNIQUE INDEX identities_pkey ON auth.identities USING btree (id);
CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider);
CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);
CREATE UNIQUE INDEX instances_pkey ON auth.instances USING btree (id);
CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id);
CREATE UNIQUE INDEX mfa_amr_claims_session_id_authentication_method_pkey ON auth.mfa_amr_claims USING btree (session_id, authentication_method);
CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);
CREATE UNIQUE INDEX mfa_challenges_pkey ON auth.mfa_challenges USING btree (id);
CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);
CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at);
CREATE UNIQUE INDEX mfa_factors_pkey ON auth.mfa_factors USING btree (id);
CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);
CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);
CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);
CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);
CREATE UNIQUE INDEX oauth_authorizations_authorization_code_key ON auth.oauth_authorizations USING btree (authorization_code);
CREATE UNIQUE INDEX oauth_authorizations_authorization_id_key ON auth.oauth_authorizations USING btree (authorization_id);
CREATE UNIQUE INDEX oauth_authorizations_pkey ON auth.oauth_authorizations USING btree (id);
CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);
CREATE UNIQUE INDEX oauth_client_states_pkey ON auth.oauth_client_states USING btree (id);
CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);
CREATE UNIQUE INDEX oauth_clients_pkey ON auth.oauth_clients USING btree (id);
CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);
CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);
CREATE UNIQUE INDEX oauth_consents_pkey ON auth.oauth_consents USING btree (id);
CREATE UNIQUE INDEX oauth_consents_user_client_unique ON auth.oauth_consents USING btree (user_id, client_id);
CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);
CREATE UNIQUE INDEX one_time_tokens_pkey ON auth.one_time_tokens USING btree (id);
CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);
CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);
CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);
CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);
CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);
CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);
CREATE UNIQUE INDEX refresh_tokens_pkey ON auth.refresh_tokens USING btree (id);
CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);
CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token);
CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);
CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id);
CREATE UNIQUE INDEX saml_providers_pkey ON auth.saml_providers USING btree (id);
CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);
CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);
CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);
CREATE UNIQUE INDEX saml_relay_states_pkey ON auth.saml_relay_states USING btree (id);
CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);
CREATE UNIQUE INDEX schema_migrations_pkey ON auth.schema_migrations USING btree (version);
CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);
CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);
CREATE UNIQUE INDEX sessions_pkey ON auth.sessions USING btree (id);
CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);
CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);
CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));
CREATE UNIQUE INDEX sso_domains_pkey ON auth.sso_domains USING btree (id);
CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);
CREATE UNIQUE INDEX sso_providers_pkey ON auth.sso_providers USING btree (id);
CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));
CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);
CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);
CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);
CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));
CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);
CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);
CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone);
CREATE UNIQUE INDEX users_pkey ON auth.users USING btree (id);
CREATE UNIQUE INDEX activity_log_pkey ON public.activity_log USING btree (id);
CREATE INDEX idx_activity_entity ON public.activity_log USING btree (entity_type, entity_id);
CREATE INDEX idx_activity_user ON public.activity_log USING btree (user_id);
CREATE UNIQUE INDEX admin_audit_log_pkey ON public.admin_audit_log USING btree (id);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log USING btree (action);
CREATE INDEX idx_admin_audit_log_admin_id ON public.admin_audit_log USING btree (admin_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log USING btree (created_at DESC);
CREATE UNIQUE INDEX agent_jobs_pkey ON public.agent_jobs USING btree (id);
CREATE INDEX idx_agent_jobs_execution ON public.agent_jobs USING btree (execution_id);
CREATE INDEX idx_agent_jobs_status ON public.agent_jobs USING btree (status);
CREATE UNIQUE INDEX ai_usage_log_pkey ON public.ai_usage_log USING btree (id);
CREATE INDEX idx_ai_usage_created ON public.ai_usage_log USING btree (created_at);
CREATE INDEX idx_ai_usage_user ON public.ai_usage_log USING btree (user_id);
CREATE INDEX idx_ai_usage_workspace ON public.ai_usage_log USING btree (workspace_id);
CREATE UNIQUE INDEX asset_usage_history_pkey ON public.asset_usage_history USING btree (id);
CREATE INDEX idx_usage_history_asset ON public.asset_usage_history USING btree (asset_id, used_at DESC);
CREATE INDEX ix_asset_usage_history_asset_id ON public.asset_usage_history USING btree (asset_id);
CREATE UNIQUE INDEX assistant_asset_selection_pkey ON public.assistant_asset_selection USING btree (id);
CREATE INDEX idx_asset_selection_settings ON public.assistant_asset_selection USING btree (settings_id) WHERE (is_enabled = true);
CREATE INDEX ix_assistant_asset_selection_asset_id ON public.assistant_asset_selection USING btree (asset_id);
CREATE INDEX ix_assistant_asset_selection_settings_id ON public.assistant_asset_selection USING btree (settings_id);
CREATE UNIQUE INDEX assistant_visual_settings_pkey ON public.assistant_visual_settings USING btree (id);
CREATE UNIQUE INDEX ix_assistant_visual_settings_project_id ON public.assistant_visual_settings USING btree (project_id);
CREATE UNIQUE INDEX chat_conversations_pkey ON public.chat_conversations USING btree (id);
CREATE INDEX idx_chat_conversations_project ON public.chat_conversations USING btree (project_id);
CREATE INDEX idx_chat_conversations_user ON public.chat_conversations USING btree (user_id);
CREATE INDEX idx_chat_conversations_user_workspace ON public.chat_conversations USING btree (user_id, workspace_id);
CREATE INDEX idx_chat_conversations_workspace ON public.chat_conversations USING btree (workspace_id);
CREATE UNIQUE INDEX document_attachments_pkey ON public.document_attachments USING btree (id);
CREATE INDEX idx_document_attachments_document ON public.document_attachments USING btree (document_id);
CREATE INDEX idx_document_attachments_image ON public.document_attachments USING btree (image_id);
CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);
CREATE UNIQUE INDEX documents_share_token_key ON public.documents USING btree (share_token);
CREATE INDEX idx_document_variation_set_id ON public.documents USING btree (variation_set_id) WHERE (variation_set_id IS NOT NULL);
CREATE INDEX idx_documents_asset_category ON public.documents USING btree (project_id, asset_category) WHERE (is_reference_asset = true);
CREATE INDEX idx_documents_deleted ON public.documents USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_documents_folder ON public.documents USING btree (folder_id);
CREATE INDEX idx_documents_is_context ON public.documents USING btree (is_context) WHERE (is_context = true);
CREATE INDEX idx_documents_original_image_id ON public.documents USING btree (original_image_id) WHERE (original_image_id IS NOT NULL);
CREATE INDEX idx_documents_project ON public.documents USING btree (project_id);
CREATE INDEX idx_documents_project_context ON public.documents USING btree (project_id, is_context) WHERE ((is_context = true) AND (deleted_at IS NULL));
CREATE INDEX idx_documents_share_token ON public.documents USING btree (share_token);
CREATE INDEX idx_documents_status ON public.documents USING btree (status);
CREATE UNIQUE INDEX folders_pkey ON public.folders USING btree (id);
CREATE INDEX idx_folders_deleted ON public.folders USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_folders_parent ON public.folders USING btree (parent_folder_id);
CREATE INDEX idx_folders_project ON public.folders USING btree (project_id);
CREATE UNIQUE INDEX langchain_pg_collection_pkey ON public.langchain_pg_collection USING btree (uuid);
CREATE INDEX idx_langchain_embedding_collection ON public.langchain_pg_embedding USING btree (collection_id);
CREATE UNIQUE INDEX langchain_pg_embedding_pkey ON public.langchain_pg_embedding USING btree (uuid);
CREATE INDEX idx_node_outputs_execution ON public.node_outputs USING btree (execution_id);
CREATE INDEX idx_node_outputs_node ON public.node_outputs USING btree (node_id);
CREATE UNIQUE INDEX node_outputs_pkey ON public.node_outputs USING btree (id);
CREATE INDEX idx_projects_deleted_at ON public.projects USING btree (deleted_at);
CREATE INDEX idx_projects_name ON public.projects USING btree (name);
CREATE INDEX idx_projects_settings_gin ON public.projects USING gin (settings);
CREATE INDEX idx_projects_workspace ON public.projects USING btree (workspace_id);
CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);
CREATE INDEX idx_style_presets_active ON public.style_presets USING btree (is_active, sort_order) WHERE (is_active = true);
CREATE UNIQUE INDEX style_presets_pkey ON public.style_presets USING btree (id);
CREATE UNIQUE INDEX style_presets_slug_key ON public.style_presets USING btree (slug);
CREATE INDEX idx_system_config_key ON public.system_config USING btree (key);
CREATE UNIQUE INDEX system_config_key_key ON public.system_config USING btree (key);
CREATE UNIQUE INDEX system_config_pkey ON public.system_config USING btree (id);
CREATE INDEX idx_templates_category ON public.templates USING btree (category);
CREATE INDEX idx_templates_is_system ON public.templates USING btree (is_system);
CREATE INDEX idx_templates_name ON public.templates USING btree (name);
CREATE INDEX idx_templates_system ON public.templates USING btree (is_system) WHERE (is_system = true);
CREATE INDEX idx_templates_user ON public.templates USING btree (user_id);
CREATE INDEX idx_templates_workspace ON public.templates USING btree (workspace_id);
CREATE UNIQUE INDEX templates_pkey ON public.templates USING btree (id);
CREATE INDEX ix_user_memories_project_id ON public.user_memories USING btree (project_id);
CREATE INDEX ix_user_memories_user_id ON public.user_memories USING btree (user_id);
CREATE UNIQUE INDEX user_memories_pkey ON public.user_memories USING btree (id);
CREATE INDEX idx_user_preferences_user ON public.user_preferences USING btree (user_id);
CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (id);
CREATE UNIQUE INDEX user_preferences_user_id_key ON public.user_preferences USING btree (user_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_is_blocked ON public.users USING btree (is_blocked);
CREATE INDEX idx_users_is_super_admin ON public.users USING btree (is_super_admin);
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);
CREATE INDEX idx_workflow_executions_celery ON public.workflow_executions USING btree (celery_task_id);
CREATE INDEX idx_workflow_executions_deleted_at ON public.workflow_executions USING btree (deleted_at);
CREATE INDEX idx_workflow_executions_project ON public.workflow_executions USING btree (project_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions USING btree (status);
CREATE INDEX idx_workflow_executions_template ON public.workflow_executions USING btree (template_id);
CREATE INDEX idx_workflow_executions_workspace ON public.workflow_executions USING btree (workspace_id);
CREATE UNIQUE INDEX workflow_executions_pkey ON public.workflow_executions USING btree (id);
CREATE INDEX idx_workflow_templates_category ON public.workflow_templates USING btree (category);
CREATE INDEX idx_workflow_templates_deleted_at ON public.workflow_templates USING btree (deleted_at);
CREATE INDEX idx_workflow_templates_is_recommended ON public.workflow_templates USING btree (is_recommended);
CREATE INDEX idx_workflow_templates_is_system ON public.workflow_templates USING btree (is_system);
CREATE INDEX idx_workflow_templates_project ON public.workflow_templates USING btree (project_id);
CREATE INDEX idx_workflow_templates_workspace ON public.workflow_templates USING btree (workspace_id);
CREATE UNIQUE INDEX workflow_templates_pkey ON public.workflow_templates USING btree (id);
CREATE INDEX idx_workspace_invites_email ON public.workspace_invites USING btree (email);
CREATE INDEX idx_workspace_invites_status ON public.workspace_invites USING btree (status);
CREATE INDEX idx_workspace_invites_token ON public.workspace_invites USING btree (token);
CREATE INDEX idx_workspace_invites_workspace_id ON public.workspace_invites USING btree (workspace_id);
CREATE UNIQUE INDEX workspace_invites_pkey ON public.workspace_invites USING btree (id);
CREATE UNIQUE INDEX workspace_invites_token_key ON public.workspace_invites USING btree (token);
CREATE INDEX idx_workspace_users_user_workspace ON public.workspace_users USING btree (user_id, workspace_id);
CREATE UNIQUE INDEX workspace_users_pkey ON public.workspace_users USING btree (workspace_id, user_id);
CREATE INDEX idx_workspaces_name ON public.workspaces USING btree (name);
CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id)

--- 7. VIEWS ---
CREATE OR REPLACE VIEW extensions.pg_stat_statements AS

CREATE OR REPLACE VIEW extensions.pg_stat_statements_info AS

--- 8. CUSTOM FUNCTIONS ---
auth.email() RETURNS text
auth.jwt() RETURNS jsonb
auth.role() RETURNS text
auth.uid() RETURNS uuid
extensions.armor(bytea) RETURNS text
extensions.armor(bytea, text[], text[]) RETURNS text
extensions.array_to_halfvec(integer[], integer, boolean) RETURNS halfvec
extensions.array_to_halfvec(real[], integer, boolean) RETURNS halfvec
extensions.array_to_halfvec(numeric[], integer, boolean) RETURNS halfvec
extensions.array_to_halfvec(double precision[], integer, boolean) RETURNS halfvec
extensions.array_to_sparsevec(integer[], integer, boolean) RETURNS sparsevec
extensions.array_to_sparsevec(real[], integer, boolean) RETURNS sparsevec
extensions.array_to_sparsevec(double precision[], integer, boolean) RETURNS sparsevec
extensions.array_to_sparsevec(numeric[], integer, boolean) RETURNS sparsevec
extensions.array_to_vector(real[], integer, boolean) RETURNS vector
extensions.array_to_vector(double precision[], integer, boolean) RETURNS vector
extensions.array_to_vector(integer[], integer, boolean) RETURNS vector
extensions.array_to_vector(numeric[], integer, boolean) RETURNS vector
extensions.avg(vector) RETURNS vector
extensions.avg(halfvec) RETURNS halfvec
extensions.binary_quantize(halfvec) RETURNS bit
extensions.binary_quantize(vector) RETURNS bit
extensions.cosine_distance(vector, vector) RETURNS double precision
extensions.cosine_distance(sparsevec, sparsevec) RETURNS double precision
extensions.cosine_distance(halfvec, halfvec) RETURNS double precision
extensions.crypt(text, text) RETURNS text
extensions.dearmor(text) RETURNS bytea
extensions.decrypt(bytea, bytea, text) RETURNS bytea
extensions.decrypt_iv(bytea, bytea, bytea, text) RETURNS bytea
extensions.digest(bytea, text) RETURNS bytea
extensions.digest(text, text) RETURNS bytea
extensions.encrypt(bytea, bytea, text) RETURNS bytea
extensions.encrypt_iv(bytea, bytea, bytea, text) RETURNS bytea
extensions.gen_random_bytes(integer) RETURNS bytea
extensions.gen_random_uuid() RETURNS uuid
extensions.gen_salt(text) RETURNS text
extensions.gen_salt(text, integer) RETURNS text
extensions.grant_pg_cron_access() RETURNS event_trigger
extensions.grant_pg_graphql_access() RETURNS event_trigger
extensions.grant_pg_net_access() RETURNS event_trigger
extensions.halfvec(halfvec, integer, boolean) RETURNS halfvec
extensions.halfvec_accum(double precision[], halfvec) RETURNS double precision[]
extensions.halfvec_add(halfvec, halfvec) RETURNS halfvec
extensions.halfvec_avg(double precision[]) RETURNS halfvec
extensions.halfvec_cmp(halfvec, halfvec) RETURNS integer
extensions.halfvec_combine(double precision[], double precision[]) RETURNS double precision[]
extensions.halfvec_concat(halfvec, halfvec) RETURNS halfvec
extensions.halfvec_eq(halfvec, halfvec) RETURNS boolean
extensions.halfvec_ge(halfvec, halfvec) RETURNS boolean
extensions.halfvec_gt(halfvec, halfvec) RETURNS boolean
extensions.halfvec_in(cstring, oid, integer) RETURNS halfvec
extensions.halfvec_l2_squared_distance(halfvec, halfvec) RETURNS double precision
extensions.halfvec_le(halfvec, halfvec) RETURNS boolean
extensions.halfvec_lt(halfvec, halfvec) RETURNS boolean
extensions.halfvec_mul(halfvec, halfvec) RETURNS halfvec
extensions.halfvec_ne(halfvec, halfvec) RETURNS boolean
extensions.halfvec_negative_inner_product(halfvec, halfvec) RETURNS double precision
extensions.halfvec_out(halfvec) RETURNS cstring
extensions.halfvec_recv(internal, oid, integer) RETURNS halfvec
extensions.halfvec_send(halfvec) RETURNS bytea
extensions.halfvec_spherical_distance(halfvec, halfvec) RETURNS double precision
extensions.halfvec_sub(halfvec, halfvec) RETURNS halfvec
extensions.halfvec_to_float4(halfvec, integer, boolean) RETURNS real[]
extensions.halfvec_to_sparsevec(halfvec, integer, boolean) RETURNS sparsevec
extensions.halfvec_to_vector(halfvec, integer, boolean) RETURNS vector
extensions.halfvec_typmod_in(cstring[]) RETURNS integer
extensions.hamming_distance(bit, bit) RETURNS double precision
extensions.hmac(bytea, bytea, text) RETURNS bytea
extensions.hmac(text, text, text) RETURNS bytea
extensions.hnsw_bit_support(internal) RETURNS internal
extensions.hnsw_halfvec_support(internal) RETURNS internal
extensions.hnsw_sparsevec_support(internal) RETURNS internal
extensions.hnswhandler(internal) RETURNS index_am_handler
extensions.inner_product(halfvec, halfvec) RETURNS double precision
extensions.inner_product(sparsevec, sparsevec) RETURNS double precision
extensions.inner_product(vector, vector) RETURNS double precision
extensions.ivfflat_bit_support(internal) RETURNS internal
extensions.ivfflat_halfvec_support(internal) RETURNS internal
extensions.ivfflathandler(internal) RETURNS index_am_handler
extensions.jaccard_distance(bit, bit) RETURNS double precision
extensions.l1_distance(vector, vector) RETURNS double precision
extensions.l1_distance(halfvec, halfvec) RETURNS double precision
extensions.l1_distance(sparsevec, sparsevec) RETURNS double precision
extensions.l2_distance(sparsevec, sparsevec) RETURNS double precision
extensions.l2_distance(halfvec, halfvec) RETURNS double precision
extensions.l2_distance(vector, vector) RETURNS double precision
extensions.l2_norm(sparsevec) RETURNS double precision
extensions.l2_norm(halfvec) RETURNS double precision
extensions.l2_normalize(halfvec) RETURNS halfvec
extensions.l2_normalize(vector) RETURNS vector
extensions.l2_normalize(sparsevec) RETURNS sparsevec
extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) RETURNS SETOF record
extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) RETURNS record
extensions.pg_stat_statements_reset(userid oid DEFAULT 0, dbid oid DEFAULT 0, queryid bigint DEFAULT 0, minmax_only boolean DEFAULT false) RETURNS timestamp with time zone
extensions.pgp_armor_headers(text, OUT key text, OUT value text) RETURNS SETOF record
extensions.pgp_key_id(bytea) RETURNS text
extensions.pgp_pub_decrypt(bytea, bytea, text, text) RETURNS text
extensions.pgp_pub_decrypt(bytea, bytea) RETURNS text
extensions.pgp_pub_decrypt(bytea, bytea, text) RETURNS text
extensions.pgp_pub_decrypt_bytea(bytea, bytea) RETURNS bytea
extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) RETURNS bytea
extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) RETURNS bytea
extensions.pgp_pub_encrypt(text, bytea, text) RETURNS bytea
extensions.pgp_pub_encrypt(text, bytea) RETURNS bytea
extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) RETURNS bytea
extensions.pgp_pub_encrypt_bytea(bytea, bytea) RETURNS bytea
extensions.pgp_sym_decrypt(bytea, text, text) RETURNS text
extensions.pgp_sym_decrypt(bytea, text) RETURNS text
extensions.pgp_sym_decrypt_bytea(bytea, text, text) RETURNS bytea
extensions.pgp_sym_decrypt_bytea(bytea, text) RETURNS bytea
extensions.pgp_sym_encrypt(text, text) RETURNS bytea
extensions.pgp_sym_encrypt(text, text, text) RETURNS bytea
extensions.pgp_sym_encrypt_bytea(bytea, text, text) RETURNS bytea
extensions.pgp_sym_encrypt_bytea(bytea, text) RETURNS bytea
extensions.pgrst_ddl_watch() RETURNS event_trigger
extensions.pgrst_drop_watch() RETURNS event_trigger
extensions.set_graphql_placeholder() RETURNS event_trigger
extensions.sparsevec(sparsevec, integer, boolean) RETURNS sparsevec
extensions.sparsevec_cmp(sparsevec, sparsevec) RETURNS integer
extensions.sparsevec_eq(sparsevec, sparsevec) RETURNS boolean
extensions.sparsevec_ge(sparsevec, sparsevec) RETURNS boolean
extensions.sparsevec_gt(sparsevec, sparsevec) RETURNS boolean
extensions.sparsevec_in(cstring, oid, integer) RETURNS sparsevec
extensions.sparsevec_l2_squared_distance(sparsevec, sparsevec) RETURNS double precision
extensions.sparsevec_le(sparsevec, sparsevec) RETURNS boolean
extensions.sparsevec_lt(sparsevec, sparsevec) RETURNS boolean
extensions.sparsevec_ne(sparsevec, sparsevec) RETURNS boolean
extensions.sparsevec_negative_inner_product(sparsevec, sparsevec) RETURNS double precision
extensions.sparsevec_out(sparsevec) RETURNS cstring
extensions.sparsevec_recv(internal, oid, integer) RETURNS sparsevec
extensions.sparsevec_send(sparsevec) RETURNS bytea
extensions.sparsevec_to_halfvec(sparsevec, integer, boolean) RETURNS halfvec
extensions.sparsevec_to_vector(sparsevec, integer, boolean) RETURNS vector
extensions.sparsevec_typmod_in(cstring[]) RETURNS integer
extensions.subvector(vector, integer, integer) RETURNS vector
extensions.subvector(halfvec, integer, integer) RETURNS halfvec
extensions.sum(vector) RETURNS vector
extensions.sum(halfvec) RETURNS halfvec
extensions.uuid_generate_v1() RETURNS uuid
extensions.uuid_generate_v1mc() RETURNS uuid
extensions.uuid_generate_v3(namespace uuid, name text) RETURNS uuid
extensions.uuid_generate_v4() RETURNS uuid
extensions.uuid_generate_v5(namespace uuid, name text) RETURNS uuid
extensions.uuid_nil() RETURNS uuid
extensions.uuid_ns_dns() RETURNS uuid
extensions.uuid_ns_oid() RETURNS uuid
extensions.uuid_ns_url() RETURNS uuid
extensions.uuid_ns_x500() RETURNS uuid
extensions.vector(vector, integer, boolean) RETURNS vector
extensions.vector_accum(double precision[], vector) RETURNS double precision[]
extensions.vector_add(vector, vector) RETURNS vector
extensions.vector_avg(double precision[]) RETURNS vector
extensions.vector_cmp(vector, vector) RETURNS integer
extensions.vector_combine(double precision[], double precision[]) RETURNS double precision[]
extensions.vector_concat(vector, vector) RETURNS vector
extensions.vector_dims(vector) RETURNS integer
extensions.vector_dims(halfvec) RETURNS integer
extensions.vector_eq(vector, vector) RETURNS boolean
extensions.vector_ge(vector, vector) RETURNS boolean
extensions.vector_gt(vector, vector) RETURNS boolean
extensions.vector_in(cstring, oid, integer) RETURNS vector
extensions.vector_l2_squared_distance(vector, vector) RETURNS double precision
extensions.vector_le(vector, vector) RETURNS boolean
extensions.vector_lt(vector, vector) RETURNS boolean
extensions.vector_mul(vector, vector) RETURNS vector
extensions.vector_ne(vector, vector) RETURNS boolean
extensions.vector_negative_inner_product(vector, vector) RETURNS double precision
extensions.vector_norm(vector) RETURNS double precision
extensions.vector_out(vector) RETURNS cstring
extensions.vector_recv(internal, oid, integer) RETURNS vector
extensions.vector_send(vector) RETURNS bytea
extensions.vector_spherical_distance(vector, vector) RETURNS double precision
extensions.vector_sub(vector, vector) RETURNS vector
extensions.vector_to_float4(vector, integer, boolean) RETURNS real[]
extensions.vector_to_halfvec(vector, integer, boolean) RETURNS halfvec
extensions.vector_to_sparsevec(vector, integer, boolean) RETURNS sparsevec
extensions.vector_typmod_in(cstring[]) RETURNS integer
graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
public.generate_template_uuid(p_name text, p_category text) RETURNS uuid
public.handle_new_user() RETURNS trigger
public.update_system_config_updated_at() RETURNS trigger
public.user_has_document_access(document_project_id uuid) RETURNS boolean
public.user_has_document_access(document_project_id character varying) RETURNS boolean
public.user_is_workspace_admin(workspace_id_param uuid) RETURNS boolean
public.user_is_workspace_admin(workspace_id_param character varying) RETURNS boolean
public.user_is_workspace_member(workspace_id_param character varying) RETURNS boolean
public.user_is_workspace_member(workspace_id_param uuid) RETURNS boolean

--- 9. TRIGGERS ---
on_auth_user_created ON auth.users | EXECUTE FUNCTION handle_new_user()
trigger_system_config_updated_at ON public.system_config | EXECUTE FUNCTION update_system_config_updated_at()

--- 10. RLS POLICIES ---
POLICY Service role can insert audit_logs ON public.admin_audit_log FOR INSERT USING () WITH CHECK (true)
POLICY Super admins can read audit_logs ON public.admin_audit_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_super_admin = true))))) WITH CHECK ()
POLICY chat_conversations_delete_policy ON public.chat_conversations FOR DELETE USING (((user_id)::text = (auth.uid())::text)) WITH CHECK ()
POLICY chat_conversations_insert_policy ON public.chat_conversations FOR INSERT USING () WITH CHECK (((user_id)::text = (auth.uid())::text))
POLICY chat_conversations_select_policy ON public.chat_conversations FOR SELECT USING (((user_id)::text = (auth.uid())::text)) WITH CHECK ()
POLICY chat_conversations_update_policy ON public.chat_conversations FOR UPDATE USING (((user_id)::text = (auth.uid())::text)) WITH CHECK ()
POLICY documents_delete_policy ON public.documents FOR DELETE USING (user_has_document_access(project_id)) WITH CHECK ()
POLICY documents_insert_policy ON public.documents FOR INSERT USING () WITH CHECK (user_has_document_access(project_id))
POLICY documents_select_policy ON public.documents FOR SELECT USING ((user_has_document_access(project_id) OR ((is_public = true) AND ((share_expires_at IS NULL) OR (share_expires_at > now()))))) WITH CHECK ()
POLICY documents_update_policy ON public.documents FOR UPDATE USING (user_has_document_access(project_id)) WITH CHECK ()
POLICY folders_delete_policy ON public.folders FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (projects p
     JOIN workspace_users wu ON (((wu.workspace_id)::text = (p.workspace_id)::text)))
  WHERE (((p.id)::text = (folders.project_id)::text) AND ((wu.user_id)::text = (auth.uid())::text))))) WITH CHECK ()
POLICY folders_insert_policy ON public.folders FOR INSERT USING () WITH CHECK ((EXISTS ( SELECT 1
   FROM (projects p
     JOIN workspace_users wu ON (((wu.workspace_id)::text = (p.workspace_id)::text)))
  WHERE (((p.id)::text = (folders.project_id)::text) AND ((wu.user_id)::text = (auth.uid())::text)))))
POLICY folders_select_policy ON public.folders FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (projects p
     JOIN workspace_users wu ON (((wu.workspace_id)::text = (p.workspace_id)::text)))
  WHERE (((p.id)::text = (folders.project_id)::text) AND ((wu.user_id)::text = (auth.uid())::text))))) WITH CHECK ()
POLICY folders_update_policy ON public.folders FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (projects p
     JOIN workspace_users wu ON (((wu.workspace_id)::text = (p.workspace_id)::text)))
  WHERE (((p.id)::text = (folders.project_id)::text) AND ((wu.user_id)::text = (auth.uid())::text))))) WITH CHECK ()
POLICY projects_delete_policy ON public.projects FOR DELETE USING (user_is_workspace_admin(workspace_id)) WITH CHECK ()
POLICY projects_insert_policy ON public.projects FOR INSERT USING () WITH CHECK (user_is_workspace_member(workspace_id))
POLICY projects_select_policy ON public.projects FOR SELECT USING (user_is_workspace_member(workspace_id)) WITH CHECK ()
POLICY projects_update_policy ON public.projects FOR UPDATE USING (user_is_workspace_member(workspace_id)) WITH CHECK ()
POLICY Super admins can manage system_config ON public.system_config FOR ALL USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_super_admin = true))))) WITH CHECK ()
POLICY templates_delete_policy ON public.templates FOR DELETE USING (((is_system = false) AND ((user_id)::text = (auth.uid())::text))) WITH CHECK ()
POLICY templates_insert_policy ON public.templates FOR INSERT USING () WITH CHECK (((auth.uid() IS NOT NULL) AND (is_system = false) AND ((user_id)::text = (auth.uid())::text)))
POLICY templates_select_policy ON public.templates FOR SELECT USING (((is_system = true) OR ((user_id)::text = (auth.uid())::text) OR ((workspace_id IS NOT NULL) AND user_is_workspace_member(workspace_id)))) WITH CHECK ()
POLICY templates_update_policy ON public.templates FOR UPDATE USING (((is_system = false) AND ((user_id)::text = (auth.uid())::text))) WITH CHECK ()
POLICY user_preferences_insert_policy ON public.user_preferences FOR INSERT USING () WITH CHECK (((user_id)::text = (auth.uid())::text))
POLICY user_preferences_select_policy ON public.user_preferences FOR SELECT USING (((user_id)::text = (auth.uid())::text)) WITH CHECK ()
POLICY user_preferences_update_policy ON public.user_preferences FOR UPDATE USING (((user_id)::text = (auth.uid())::text)) WITH CHECK ()
POLICY workspace_users_delete_policy ON public.workspace_users FOR DELETE USING ((((role)::text <> 'owner'::text) AND user_is_workspace_admin(workspace_id))) WITH CHECK ()
POLICY workspace_users_insert_policy ON public.workspace_users FOR INSERT USING () WITH CHECK ((user_is_workspace_admin(workspace_id) OR (((user_id)::text = (auth.uid())::text) AND ((role)::text = 'owner'::text))))
POLICY workspace_users_select_policy ON public.workspace_users FOR SELECT USING (user_is_workspace_member(workspace_id)) WITH CHECK ()
POLICY workspace_users_update_policy ON public.workspace_users FOR UPDATE USING (user_is_workspace_admin(workspace_id)) WITH CHECK ()
POLICY workspaces_delete_policy ON public.workspaces FOR DELETE USING ((EXISTS ( SELECT 1
   FROM workspace_users
  WHERE (((workspace_users.workspace_id)::text = (workspaces.id)::text) AND ((workspace_users.user_id)::text = (auth.uid())::text) AND ((workspace_users.role)::text = 'owner'::text))))) WITH CHECK ()
POLICY workspaces_insert_policy ON public.workspaces FOR INSERT USING () WITH CHECK ((auth.uid() IS NOT NULL))
POLICY workspaces_select_policy ON public.workspaces FOR SELECT USING (user_is_workspace_member(id)) WITH CHECK ()
POLICY workspaces_update_policy ON public.workspaces FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM workspace_users
  WHERE (((workspace_users.workspace_id)::text = (workspaces.id)::text) AND ((workspace_users.user_id)::text = (auth.uid())::text) AND ((workspace_users.role)::text = 'owner'::text))))) WITH CHECK ()

--- 11. CRON JOBS ---(vazio)