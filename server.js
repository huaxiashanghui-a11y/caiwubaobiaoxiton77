const express = require('express');
const path = require('path');
const moment = require('moment');
const postgres = require('postgres');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 数据库连接
const sql = postgres(process.env.DATABASE_URL || 'postgres://localhost:5432/financial', {
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// ==================== 初始化数据库表 ====================
async function initDatabase() {
  try {
    // 折扣收益表
    await sql`
      CREATE TABLE IF NOT EXISTS discount_income (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 提成奖励表
    await sql`
      CREATE TABLE IF NOT EXISTS commission_reward (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        product_name TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 积分优惠表
    await sql`
      CREATE TABLE IF NOT EXISTS points_discount (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        customer_name TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 资金支出表
    await sql`
      CREATE TABLE IF NOT EXISTS expense (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        category TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 资金分类表（各币种余额）
    await sql`
      CREATE TABLE IF NOT EXISTS balance (
        id SERIAL PRIMARY KEY,
        payment_method TEXT NOT NULL UNIQUE,
        balance NUMERIC(10,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 赊账表
    await sql`
      CREATE TABLE IF NOT EXISTS credit_account (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        telegram_account TEXT,
        wechat_account TEXT,
        phone TEXT,
        amount NUMERIC(10,2) NOT NULL,
        status TEXT NOT NULL DEFAULT '未结账',
        settled_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 骑手表
    await sql`
      CREATE TABLE IF NOT EXISTS rider (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 骑手补贴表
    await sql`
      CREATE TABLE IF NOT EXISTS rider_subsidy (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        rider_id INTEGER NOT NULL,
        subsidy_amount NUMERIC(10,2) DEFAULT 0,
        advance_amount NUMERIC(10,2) DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rider_id) REFERENCES rider(id)
      )
    `;

    // 初始化默认骑手
    const riders = ['小仙', '阿兴', '小耀'];
    for (const name of riders) {
      await sql`INSERT INTO rider (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
    }

    // 初始化默认资金分类余额
    const paymentMethods = ['微信', '支付宝', '云闪付', 'KBZ', 'USDT', '人民币现金', '缅币'];
    for (const method of paymentMethods) {
      await sql`INSERT INTO balance (payment_method, balance) VALUES (${method}, 0) ON CONFLICT (payment_method) DO NOTHING`;
    }

    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

// 初始化数据库
initDatabase();

// ==================== 辅助函数 ====================

// 获取今日日期
const getToday = () => moment().format('YYYY-MM-DD');

// 获取本月开始日期
const getMonthStart = () => moment().startOf('month').format('YYYY-MM-DD');

// ==================== API 路由 ====================

// 1. 仪表盘数据
app.get('/api/dashboard', async (req, res) => {
  try {
    const today = getToday();
    const discount_balance = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM discount_income WHERE date = ${today}`)[0]?.total || 0;
    const points_balance = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM points_discount WHERE date = ${today}`)[0]?.total || 0;
    const commission_balance = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM commission_reward WHERE date = ${today}`)[0]?.total || 0;
    const expense_balance = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM expense WHERE date = ${today}`)[0]?.total || 0;
    const subsidy_balance = (await sql`SELECT COALESCE(SUM(subsidy_amount + advance_amount), 0) as total FROM rider_subsidy WHERE date = ${today}`)[0]?.total || 0;
    const credit_balance = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM credit_account WHERE status = '未结账'`)[0]?.total || 0;

    const daily_balance = discount_balance + commission_balance - expense_balance - subsidy_balance;

    res.json({
      report_date: today,
      discount_balance,
      points_balance,
      commission_balance,
      expense_balance,
      subsidy_balance,
      credit_balance,
      daily_balance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. 折扣收益
app.get('/api/discount-income', async (req, res) => {
  try {
    const date = req.query.date || getToday();
    const records = await sql`SELECT * FROM discount_income WHERE date = ${date} ORDER BY created_at DESC`;
    const total = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM discount_income WHERE date = ${date}`)[0]?.total || 0;
    res.json({ records, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/discount-income', async (req, res) => {
  try {
    const { date, amount, description } = req.body;
    const result = await sql`INSERT INTO discount_income (date, amount, description) VALUES (${date || getToday()}, ${amount}, ${description})`;
    res.json({ id: result[0]?.id, message: '折扣收益记录成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. 提成奖励
app.get('/api/commission', async (req, res) => {
  try {
    const date = req.query.date || getToday();
    const records = await sql`SELECT * FROM commission_reward WHERE date = ${date} ORDER BY created_at DESC`;
    const total = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM commission_reward WHERE date = ${date}`)[0]?.total || 0;
    res.json({ records, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/commission', async (req, res) => {
  try {
    const { date, amount, product_name, description } = req.body;
    const result = await sql`INSERT INTO commission_reward (date, amount, product_name, description) VALUES (${date || getToday()}, ${amount}, ${product_name}, ${description})`;
    res.json({ id: result[0]?.id, message: '提成奖励记录成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. 积分优惠
app.get('/api/points-discount', async (req, res) => {
  try {
    const date = req.query.date || getToday();
    const records = await sql`SELECT * FROM points_discount WHERE date = ${date} ORDER BY created_at DESC`;
    const total = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM points_discount WHERE date = ${date}`)[0]?.total || 0;
    res.json({ records, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/points-discount', async (req, res) => {
  try {
    const { date, amount, customer_name, description } = req.body;
    const result = await sql`INSERT INTO points_discount (date, amount, customer_name, description) VALUES (${date || getToday()}, ${amount}, ${customer_name}, ${description})`;
    res.json({ id: result[0]?.id, message: '积分优惠记录成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. 资金支出
app.get('/api/expense', async (req, res) => {
  try {
    const date = req.query.date || getToday();
    const records = await sql`SELECT * FROM expense WHERE date = ${date} ORDER BY created_at DESC`;
    const total = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM expense WHERE date = ${date}`)[0]?.total || 0;
    res.json({ records, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expense', async (req, res) => {
  try {
    const { date, amount, category, payment_method, description } = req.body;

    const result = await sql`INSERT INTO expense (date, amount, category, payment_method, description) VALUES (${date || getToday()}, ${amount}, ${category}, ${payment_method}, ${description})`;

    await sql`UPDATE balance SET balance = balance - ${amount}, updated_at = CURRENT_TIMESTAMP WHERE payment_method = ${payment_method}`;

    res.json({ id: result[0]?.id, message: '支出记录成功，余额已更新' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. 资金分类余额
app.get('/api/balance', async (req, res) => {
  try {
    const balances = await sql`SELECT * FROM balance ORDER BY payment_method`;
    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/balance', async (req, res) => {
  try {
    const { payment_method, balance } = req.body;
    await sql`INSERT INTO balance (payment_method, balance, updated_at) VALUES (${payment_method}, ${balance}, CURRENT_TIMESTAMP) ON CONFLICT (payment_method) DO UPDATE SET balance = ${balance}, updated_at = CURRENT_TIMESTAMP`;
    res.json({ message: '余额更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. 赊账列表
app.get('/api/credit', async (req, res) => {
  try {
    const { status } = req.query;
    let records;
    if (status) {
      records = await sql`SELECT * FROM credit_account WHERE status = ${status} ORDER BY date DESC, created_at DESC`;
    } else {
      records = await sql`SELECT * FROM credit_account ORDER BY date DESC, created_at DESC`;
    }

    const unpaid_total = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM credit_account WHERE status = '未结账'`)[0]?.total || 0;
    const paid_total = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM credit_account WHERE status = '已结账'`)[0]?.total || 0;

    res.json({ records, unpaid_total, paid_total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/credit', async (req, res) => {
  try {
    const { date, customer_name, telegram_account, wechat_account, phone, amount } = req.body;
    const result = await sql`INSERT INTO credit_account (date, customer_name, telegram_account, wechat_account, phone, amount, status) VALUES (${date || getToday()}, ${customer_name}, ${telegram_account}, ${wechat_account}, ${phone}, ${amount}, '未结账')`;
    res.json({ id: result[0]?.id, message: '赊账记录成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/credit/:id/settle', async (req, res) => {
  try {
    const id = req.params.id;
    const settled_date = req.body.settled_date || getToday();
    await sql`UPDATE credit_account SET status = '已结账', settled_date = ${settled_date} WHERE id = ${id}`;
    res.json({ message: '结账成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. 骑手
app.get('/api/riders', async (req, res) => {
  try {
    const riders = await sql`SELECT * FROM rider ORDER BY name`;
    res.json(riders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/riders', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await sql`INSERT INTO rider (name) VALUES (${name})`;
    res.json({ id: result[0]?.id, message: '骑手添加成功' });
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      res.status(400).json({ error: '该骑手已存在' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 9. 骑手补贴
app.get('/api/rider-subsidy', async (req, res) => {
  try {
    const { range, rider_id, date } = req.query;

    let query = sql`SELECT rs.*, r.name as rider_name FROM rider_subsidy rs JOIN rider r ON rs.rider_id = r.id WHERE 1=1`;
    const params = [];

    if (range === 'month') {
      query = query(sql`AND date >= ${getMonthStart()}`);
    } else if (date) {
      query = query(sql`AND date = ${date}`);
    }

    if (rider_id) {
      query = query(sql`AND rider_id = ${rider_id}`);
    }

    const records = await query.orderBy(sql`date DESC, created_at DESC`);

    let total_subsidy = 0;
    let total_advance = 0;

    for (const r of records) {
      total_subsidy += Number(r.subsidy_amount) || 0;
      total_advance += Number(r.advance_amount) || 0;
    }

    res.json({ records, total_subsidy, total_advance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rider-subsidy', async (req, res) => {
  try {
    const { date, rider_id, subsidy_amount, advance_amount, description } = req.body;
    const result = await sql`INSERT INTO rider_subsidy (date, rider_id, subsidy_amount, advance_amount, description) VALUES (${date || getToday()}, ${rider_id}, ${subsidy_amount || 0}, ${advance_amount || 0}, ${description})`;
    res.json({ id: result[0]?.id, message: '补贴记录成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. 资金列表（按支付方式统计）
app.get('/api/expense-summary', async (req, res) => {
  try {
    const date = req.query.date || getToday();

    const byMethod = await sql`SELECT payment_method, COALESCE(SUM(amount), 0) as total FROM expense WHERE date = ${date} GROUP BY payment_method`;
    const grandTotal = (await sql`SELECT COALESCE(SUM(amount), 0) as total FROM expense WHERE date = ${date}`)[0]?.total || 0;

    res.json({ records: byMethod, total: grandTotal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 健康检查（Vercel 需要）
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 根路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`财务报表系统运行中: http://localhost:${PORT}`);
});
