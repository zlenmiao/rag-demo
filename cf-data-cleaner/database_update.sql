-- 数据库更新脚本：增加内容类型字段
-- 执行此脚本来更新现有的数据库结构

-- 1. 增加内容类型字段
ALTER TABLE cleaned_data
ADD COLUMN content_type VARCHAR(20) DEFAULT 'text' NOT NULL;

-- 2. 增加注释说明
COMMENT ON COLUMN cleaned_data.content_type IS '内容类型: text(文本) 或 image(图片)';

-- 3. 为现有记录设置默认值（如果有数据的话）
UPDATE cleaned_data SET content_type = 'text' WHERE content_type IS NULL;

-- 4. 可选：创建索引以提高查询性能
CREATE INDEX idx_cleaned_data_content_type ON cleaned_data(content_type);

-- 5. 验证更新结果
SELECT
    content_type,
    COUNT(*) as count
FROM cleaned_data
GROUP BY content_type;