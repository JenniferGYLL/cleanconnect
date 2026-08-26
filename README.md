# CleanConnect

清洁行业双边平台 — 第一阶段:清洁公司注册/登录 + 仪表盘(客户线索、客户评价)。

这是一个独立于 CGC 自己网站的全新项目。

## 本地运行步骤

1. 安装依赖(在这个文件夹里,用你自己的 Terminal 运行):

   ```bash
   npm install
   ```

2. 去 [supabase.com](https://supabase.com) 新建一个**全新的项目**(跟 CGC 网站用的项目分开),
   项目建好后:

   - 左侧菜单点 **SQL Editor**,新建一个查询,把 `supabase/schema.sql` 里的全部内容粘贴进去,点击 **Run**。
   - 左侧菜单点 **Project Settings -> API**,把 **Project URL** 和 **anon public** 这两个值复制出来。

3. 把 `.env.local.example` 复制一份,改名为 `.env.local`,把上一步复制的两个值填进去。

4. 启动本地开发服务器:

   ```bash
   npm run dev
   ```

   然后在浏览器打开 `http://localhost:3000` 就能看到网站了。

5. 测试流程:先在 `/signup` 注册一个清洁公司账号 -> 去邮箱点验证链接 -> 用 `/login` 登录。
   刚注册的账号默认是"审核中"状态,需要你自己去 Supabase 的 **Table Editor -> companies** 表里,
   把对应那一行的 `approved` 改成 `true`,才能看到仪表盘里的线索和评价。

6. 测试"实时同步"效果:登录后打开仪表盘,保持这个页面开着,然后另外开一个 Supabase 的
   **Table Editor -> reviews** 表,手动插入一行(`company_id` 填你自己账号的 id),
   不用刷新页面,仪表盘应该会立刻自动跳出一条新评价提示。

7. 测试"服务前后对比照片":在 Leads 标签页,每条线索下面有 Before / After 两个方框,
   点击可以直接上传图片,上传完会存进 Supabase Storage 里的 `job-photos` 这个桶。

## 上线步骤

1. 在 GitHub 新建一个**新的空仓库**(和 cgc-website 分开),然后:

   ```bash
   git init
   git add .
   git commit -m "CleanConnect 初始版本"
   git branch -M main
   git remote add origin 你的新仓库地址
   git push -u origin main
   ```

2. 去 [vercel.com](https://vercel.com),导入这个新仓库,在 Environment Variables 里
   填入跟 `.env.local` 一样的两个值,点击 Deploy。

## 目录结构

- `app/page.tsx` — 首页
- `app/signup` — 清洁公司注册
- `app/login` — 清洁公司登录
- `app/dashboard` — 登录后的仪表盘(线索 + 评价两个标签页)
- `lib/supabase` — Supabase 客户端封装
- `supabase/schema.sql` — 数据库表结构 + 权限规则

## 下一步计划

- 客户端(消费者)浏览清洁公司 + 获取报价
- 客户发布需求 + 多家公司竞价
- 员工排班、报价工具等(计划中的独立模块)
