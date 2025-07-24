# Cloudflare Pages 迁移指南

## 🎯 迁移优势

- ✅ **更好的中国大陆访问性**：Pages域名通常比Workers域名访问更稳定
- ✅ **免费自定义域名**：可以绑定自己的域名改善访问
- ✅ **静态资源优化**：HTML/CSS/JS文件作为静态资源，加载更快
- ✅ **Functions支持**：保持相同的API功能

## 📁 项目结构调整

```
cf-data-cleaner-pages/
├── public/                 # 静态文件目录
│   ├── index.html         # 主页
│   ├── data_cleaner.html  # 数据清洗页面
│   ├── data_viewer.html   # 数据查看页面
│   └── assets/
│       ├── style.css      # 样式文件
│       └── script.js      # 公共脚本
├── functions/             # Pages Functions (替代Workers)
│   └── api/
│       └── data_cleaner/
│           ├── get_default_prompt.js
│           ├── clean_data.js
│           ├── clean_image.js
│           ├── save_data.js
│           ├── data_list.js
│           └── data/
│               └── [id].js
├── _headers               # 自定义HTTP头
├── _redirects            # 重定向规则
└── wrangler.toml         # Pages配置
```

## 🚀 迁移步骤

### 1. 创建Pages项目
```bash
# 创建新目录
mkdir cf-data-cleaner-pages
cd cf-data-cleaner-pages

# 初始化Pages项目
wrangler pages project create cf-data-cleaner-pages
```

### 2. 移动静态文件
将HTML文件从模板中提取为独立文件：
- `src/templates/data_cleaner.js` → `public/data_cleaner.html`
- `src/templates/data_viewer.js` → `public/data_viewer.html`

### 3. 创建Functions
将Worker中的API路由转换为Pages Functions：
- 每个API端点成为独立的函数文件
- 保持相同的请求/响应格式

### 4. 配置域名
在Cloudflare Dashboard中：
- Pages → Custom domains → Add custom domain
- 使用你的域名（如 data-cleaner.your-domain.com）

## 📞 联系方式

如需详细的迁移帮助，请提供：
1. 是否有自己的域名
2. 希望使用哪种方案（Pages vs 自定义域名）

## 🔗 相关文档

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Pages Functions](https://developers.cloudflare.com/pages/platform/functions/)
- [Custom Domains](https://developers.cloudflare.com/pages/platform/custom-domains/)