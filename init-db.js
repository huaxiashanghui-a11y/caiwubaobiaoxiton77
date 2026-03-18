const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 折扣收益表
db.exec(`
  CREATE TABLE IF NOT EXISTS discount_income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 提成奖励表
db.exec(`
  CREATE TABLE IF NOT EXISTS commission_reward (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    product_name TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 积分优惠表
db.exec(`
  CREATE TABLE IF NOT EXISTS points_discount (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    customer_name TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 资金支出表
db.exec(`
  CREATE TABLE IF NOT EXISTS expense (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 资金分类表（各币种余额）
db.exec(`
  CREATE TABLE IF NOT EXISTS balance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_method TEXT NOT NULL UNIQUE,
    balance REAL NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 赊账表
db.exec(`
  CREATE TABLE IF NOT EXISTS credit_account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    telegram_account TEXT,
    wechat_account TEXT,
    phone TEXT,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT '未结账',
    settled_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 骑手表
db.exec(`
  CREATE TABLE IF NOT EXISTS rider (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 骑手补贴表
db.exec(`
  CREATE TABLE IF NOT EXISTS rider_subsidy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    rider_id INTEGER NOT NULL,
    subsidy_amount REAL NOT NULL DEFAULT 0,
    advance_amount REAL NOT NULL DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rider_id) REFERENCES rider(id)
  )
`);

// 初始化默认骑手
const riders = ['小仙', '阿兴', '小耀'];
const insertRider = db.prepare('INSERT OR IGNORE INTO rider (name) VALUES (?)');
const insertMany = db.transaction((names) => {
  for (const name of names) {
    insertRider.run(name);
  }
});
insertMany(riders);

// 初始化默认资金分类余额
const paymentMethods = ['微信', '支付宝', '云闪付', 'KBZ', 'USDT', '人民币现金', '缅币'];
const insertBalance = db.prepare('INSERT OR IGNORE INTO balance (payment_method, balance) VALUES (?, 0)');
const insertManyBalances = db.transaction((methods) => {
  for (const method of methods) {
    insertBalance.run(method);
  }
});
insertManyBalances(paymentMethods);

// 创建视图：仪表盘数据
db.exec(`
  CREATE VIEW IF NOT EXISTS dashboard_view AS
  SELECT
    date('now', 'localtime') as report_date,
    (SELECT COALESCE(SUM(amount), 0) FROM discount_income WHERE date = date('now', 'localtime')) as discount_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM points_discount WHERE date = date('now', 'localtime')) as points_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM commission_reward WHERE date = date('now', 'localtime')) as commission_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM expense WHERE date = date('now', 'localtime')) as expense_balance,
    (SELECT COALESCE(SUM(subsidy_amount + advance_amount), 0) FROM rider_subsidy WHERE date = date('now', 'localtime')) as subsidy_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM credit_account WHERE status = '未结账') as credit_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM discount_income WHERE date = date('now', 'localtime'))
      + (SELECT COALESCE(SUM(amount), 0) FROM commission_reward WHERE date = date('now', 'localtime'))
      - (SELECT COALESCE(SUM(amount), 0) FROM expense WHERE date = date('now', 'localtime'))
      - (SELECT COALESCE(SUM(subsidy_amount + advance_amount), 0) FROM rider_subsidy WHERE date = date('now', 'localtime')) as daily_balance
`);

console.log('数据库初始化完成！');
db.close();
