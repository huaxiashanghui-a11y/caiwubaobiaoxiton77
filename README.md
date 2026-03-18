# 财务报表系统 - 北苍星际速充

一个功能完善的财务管理系统，支持折扣收益、提成奖励、积分优惠、资金支出、赊账管理、骑手补贴等功能。

## 功能特性

### 📊 仪表盘
- 实时显示当日余额汇总
- 折扣、积分、提成、支出、补贴、赊账一目了然

### 💰 核心功能
- **折扣收益** - 记录当日折扣收入
- **提成奖励** - 统计商品销售分成
- **积分优惠** - 记录客户消费优惠
- **资金支出** - 按支付方式分类统计
- **赊账管理** - 客户赊账与结账记录
- **骑手补贴** - 补价与垫付管理
- **资金分类** - 各币种余额管理

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite (better-sqlite3)
- **前端**: 原生 HTML/CSS/JavaScript

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
node init-db.js
```

### 3. 启动服务

```bash
npm start
```

### 4. 访问系统

打开浏览器访问: http://localhost:3000

## 数据库结构

### 主要表
- `discount_income` - 折扣收益
- `commission_reward` - 提成奖励
- `points_discount` - 积分优惠
- `expense` - 资金支出
- `balance` - 资金分类余额
- `credit_account` - 赊账记录
- `rider` - 骑手信息
- `rider_subsidy` - 骑手补贴

## 默认配置

### 默认骑手
- 小仙
- 阿兴
- 小耀

### 支付方式
- 微信
- 支付宝
- 云闪付
- KBZ
- USDT
- 人民币现金
- 缅币

## API 接口

### 仪表盘
- `GET /api/dashboard` - 获取仪表盘数据

### 折扣收益
- `GET /api/discount-income?date=YYYY-MM-DD` - 获取折扣收益
- `POST /api/discount-income` - 添加折扣收益

### 提成奖励
- `GET /api/commission?date=YYYY-MM-DD` - 获取提成奖励
- `POST /api/commission` - 添加提成奖励

### 积分优惠
- `GET /api/points-discount?date=YYYY-MM-DD` - 获取积分优惠
- `POST /api/points-discount` - 添加积分优惠

### 资金支出
- `GET /api/expense?date=YYYY-MM-DD` - 获取支出记录
- `POST /api/expense` - 添加支出

### 资金分类
- `GET /api/balance` - 获取所有余额
- `POST /api/balance` - 更新余额

### 赊账
- `GET /api/credit?status=未结账|已结账` - 获取赊账列表
- `POST /api/credit` - 添加赊账
- `PUT /api/credit/:id/settle` - 结账

### 骑手
- `GET /api/riders` - 获取骑手列表
- `POST /api/riders` - 添加骑手

### 骑手补贴
- `GET /api/rider-subsidy?range=day|month` - 获取补贴记录
- `POST /api/rider-subsidy` - 添加补贴

### 支出统计
- `GET /api/expense-summary?date=YYYY-MM-DD` - 按支付方式统计

## 部署

### 使用 PM2 (推荐)

```bash
npm install -g pm2
pm2 start server.js --name financial-system
pm2 save
pm2 startup
```

### 使用 systemd

创建 `/etc/systemd/system/financial-system.service`:

```ini
[Unit]
Description=Financial Report System
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/financial-report-system
ExecStart=/usr/bin/node /path/to/financial-report-system/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable financial-system
sudo systemctl start financial-system
```

## 数据备份

数据库文件: `database.db`

定期备份:

```bash
cp database.db database.db.backup.$(date +%Y%m%d)
```

## 许可证

MIT
