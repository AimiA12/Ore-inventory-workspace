# Vercel + Supabase 部署说明

## 1. 推到 GitHub

在 GitHub 新建一个仓库，然后把当前项目上传。

需要部署的网站代码在 `web/`，Vercel 会通过根目录的 `vercel.json` 自动构建到 `dist/`。

## 2. 在 Vercel 导入项目

1. 打开 Vercel。
2. New Project。
3. 选择这个 GitHub 仓库。
4. Framework Preset 选择 `Other`。
5. Build Command 使用默认的 `npm run build`。
6. Output Directory 使用 `dist`。
7. Deploy。

## 3. Supabase 建表

1. 打开 Supabase 项目。
2. 进入 SQL Editor。
3. 复制并运行 `supabase/schema.sql`。

这会创建：

- `user_profiles`：用户资料、会员套餐、会员状态和会员到期时间
- `mine_piles`：用户矿堆库存
- `sale_records`：往期出售记录
- `user_sale_prices`：用户自己的金属报价和出售系数记忆

并开启 RLS，用户只能访问自己的数据；矿堆、出售记录和报价记忆还会检查会员是否有效。

## 4. 会员有效期

用户注册后会自动生成一条 `user_profiles` 记录，默认：

```text
membership_status = inactive
membership_expires_at = null
```

你可以在 Supabase 后台手动修改，也可以在 SQL Editor 里执行：

```sql
update public.user_profiles
set membership_status = 'active',
    plan = 'monthly',
    membership_expires_at = now() + interval '1 month'
where user_id = '这里填用户 UUID';
```

续费一个月可以执行：

```sql
update public.user_profiles
set membership_status = 'active',
    membership_expires_at = greatest(coalesce(membership_expires_at, now()), now()) + interval '1 month'
where user_id = '这里填用户 UUID';
```

会员过期后，用户仍然可以登录并读取自己的会员状态，但不能再读取或修改矿堆、出售记录、报价记忆。

## 5. Vercel 环境变量

在 Vercel Project Settings -> Environment Variables 添加：

```text
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_ANON_KEY=你的 anon public key
```

当前网站还是纯前端本地存储版；这些变量先作为后续接 Supabase 的准备。

## 6. 本地预览

```bash
npm run preview
```

然后打开：

```text
http://localhost:4173
```

## 7. 下一步接 Supabase

后续要把 `web/app.js` 里的：

- `localStorage` 读写
- 账号密码登录原型
- 矿堆保存 / 删除
- 出售记录保存 / 恢复 / 删除
- 报价记忆

替换成 Supabase Auth 和数据库请求。
