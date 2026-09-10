# 清迈爽玩之

五人 2026 年 9 月 25 日至 10 月 2 日清迈旅行的手机优先网页。页面包含倒计时、可编辑逐日安排、地点打卡、逐地点记账、每日/全程合计、六晚酒吧、Google Maps 导航和离线缓存。

## 本地预览

在本目录运行：

```bash
python3 -m http.server 4173
```

然后打开 `http://127.0.0.1:4173/`。

不要直接双击 HTML 来测试离线功能；Service Worker 需要通过本地或线上 HTTP 地址运行。

## 发布

整个目录可直接部署到 Cloudflare Pages、GitHub Pages 或任意静态网站服务。构建命令留空，输出目录使用项目根目录。

公开发布前继续保持以下原则：不添加民宿完整地址、订单号、确认号、证件号或房间号。Google Maps 与外部官网在离线状态下不可用。

## 开启五人云端同步

页面默认先把修改安全地存在当前手机。要让五台手机自动同步：

1. 新建一个只用于这趟旅行的 Supabase 项目。
2. 在 Supabase 的 SQL Editor 运行 `supabase-setup.sql`。
3. 在 Project Settings → API 复制 Project URL 和“可发布密钥”（`publishable key`；旧界面称为 `anon public` key）。
4. 把这两个值填入 `sync-config.js` 的 `supabaseUrl` 和 `supabaseAnonKey`。
5. 重新部署后，把同一个网页链接发给五个人。页面每 8 秒、每次重新联网及每次回到页面时自动同步。

Supabase 尚未配置时，所有编辑、打卡和花费功能仍可离线使用，顶部会明确显示“仅本机”。`sync-config.js` 中的随机 `tripId` 是这趟旅行的数据房间标识，不要改成姓名、手机号或订单号。
