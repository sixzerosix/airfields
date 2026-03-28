-- =============================================
-- FILES + ENTITY_FILES + STORAGE
-- =============================================
-- 1. Таблица метаданных файлов
CREATE TABLE files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
    original_name text NOT NULL,
    mime_type text NOT NULL,
    size bigint NOT NULL,
    -- в байтах
    storage_path text NOT NULL,
    -- путь в Supabase Storage
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_files_user ON files (user_id);

ALTER TABLE
    files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own files" ON files FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime
ADD
    TABLE files;

-- 2. Полиморфная M2M связь (файл ↔ любая сущность)
CREATE TABLE entity_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
    file_id uuid REFERENCES files(id) ON DELETE CASCADE NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    -- порядок файлов внутри сущности
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE
    entity_files
ADD
    CONSTRAINT entity_files_unique UNIQUE (file_id, entity_type, entity_id);

CREATE INDEX idx_entity_files_entity ON entity_files (entity_type, entity_id);

CREATE INDEX idx_entity_files_file ON entity_files (file_id);

ALTER TABLE
    entity_files REPLICA IDENTITY FULL;

ALTER TABLE
    entity_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own entity_files" ON entity_files FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime
ADD
    TABLE entity_files;

-- 3. Supabase Storage bucket
-- Выполни отдельно или через Dashboard → Storage → New Bucket
INSERT INTO
    storage.buckets (id, name, public)
VALUES
    ('entity-files', 'entity-files', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own files" ON storage.objects FOR
INSERT
    TO authenticated WITH CHECK (
        bucket_id = 'entity-files'
        AND (storage.foldername(name)) [1] = auth.uid() :: text
    );

CREATE POLICY "Users can view own files" ON storage.objects FOR
SELECT
    TO authenticated USING (
        bucket_id = 'entity-files'
        AND (storage.foldername(name)) [1] = auth.uid() :: text
    );

CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE TO authenticated USING (
    bucket_id = 'entity-files'
    AND (storage.foldername(name)) [1] = auth.uid() :: text
);

-- =============================================
-- STORAGE PROVIDERS + FILES UPDATE
-- =============================================
-- 1. Таблица провайдеров хранилищ
CREATE TABLE storage_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users DEFAULT auth.uid(),
    company_id uuid,
    -- для multi-tenant (phase 2)
    name text NOT NULL,
    -- "My MinIO", "Production S3"
    type text NOT NULL CHECK (type IN ('supabase', 's3')),
    endpoint text,
    -- "https://minio.myserver.com" (null для supabase)
    region text DEFAULT 'us-east-1',
    bucket text NOT NULL,
    access_key text,
    -- encrypted в production
    secret_key text,
    -- encrypted в production
    is_default boolean NOT NULL DEFAULT false,
    is_public boolean NOT NULL DEFAULT false,
    -- bucket публичный?
    base_url text,
    -- CDN URL или custom domain
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_providers_user ON storage_providers (user_id);

ALTER TABLE
    storage_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own storage_providers" ON storage_providers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trigger_update_storage_providers_updated_at BEFORE
UPDATE
    ON storage_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Добавить provider_id в files
ALTER TABLE
    files
ADD
    COLUMN provider_id uuid REFERENCES storage_providers(id) ON DELETE
SET
    NULL;

CREATE INDEX idx_files_provider ON files (provider_id);

-- 3. Дефолтный провайдер (Supabase Storage)
-- Вставь после создания, подставив свой user_id:
INSERT INTO
    storage_providers (user_id, name, type, bucket, is_default)
VALUES
    (
        '4c1a224d-bc95-4804-870c-7832a73462ad',
        'Supabase Storage',
        'supabase',
        'entity-files',
        true
    );