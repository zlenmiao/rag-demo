-- 数据库更新脚本 v2：添加图片数据存储字段
-- 执行此脚本来添加图片存储功能

-- 1. 添加图片数据字段（如果之前没有添加content_type的话，也包含进来）
DO $$
BEGIN
    -- 检查并添加content_type字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='cleaned_data' AND column_name='content_type'
    ) THEN
        ALTER TABLE cleaned_data
        ADD COLUMN content_type VARCHAR(20) DEFAULT 'text' NOT NULL;

        COMMENT ON COLUMN cleaned_data.content_type IS '内容类型: text(文本) 或 image(图片)';

        -- 为现有记录设置默认值
        UPDATE cleaned_data SET content_type = 'text' WHERE content_type IS NULL;

        -- 创建索引
        CREATE INDEX idx_cleaned_data_content_type ON cleaned_data(content_type);
    END IF;

    -- 检查并添加image_data字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='cleaned_data' AND column_name='image_data'
    ) THEN
        ALTER TABLE cleaned_data
        ADD COLUMN image_data TEXT;

        COMMENT ON COLUMN cleaned_data.image_data IS '图片数据: Base64编码的图片内容，仅在content_type为image时使用';
    END IF;
END $$;

-- 2. 验证更新结果
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE
        WHEN column_name = 'content_type' THEN '内容类型字段'
        WHEN column_name = 'image_data' THEN '图片数据字段'
        ELSE '其他字段'
    END as description
FROM information_schema.columns
WHERE table_name = 'cleaned_data'
  AND column_name IN ('content_type', 'image_data')
ORDER BY column_name;

-- 3. 查看数据统计
SELECT
    content_type,
    COUNT(*) as count,
    COUNT(image_data) as has_image_data
FROM cleaned_data
GROUP BY content_type;