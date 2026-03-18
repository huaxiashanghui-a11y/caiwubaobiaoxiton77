const express = require('express');
const path = require('path');
const moment = require('moment');
const app = express();
const PORT = 3000;

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 数据库
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// ==================== 辅助函数 ====================

// 获取今日日期
const getToday = () => moment().format('YYYY-MM-DD');

// 获取本月开始日期
const getMonthStart = () => moment().startOf('month').format('YYYY-MM-DD');

// ==================== API 路由 ====================

// 1. 仪表盘数据
app.get('/api/dashboard', (req, res) => {
  try {
    const dashboard = db.prepare('SELECT * FROM dashboard_view').get();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. 折扣收益
app.get('/api/discount-income', (req, res) => {
  try {
    const date = req.query.date || getToday();
    const records = db.prepare('SELECT * FROM discount_income WHERE date = ? ORDER BY created_at DESC').all(date);
    const total = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM discount_income WHERE date = ?').get(date);
    res.json({ records, total: total.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/discount-income', (req, res) => {
  try {
    const { date, amount, description } = req.body;
    const stmt = db.prepare('INSERT INTO discount_income (date, amount, description) VALUES (?, ?, ?)');
    const result = stmt.run(date || getToday(), amount, description);
    res.json({ id: result.lastInsertRowid, message: '折扣收益记录成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. 提成奖励
app.get('/api/commission', (req, res) => {
  try {
    const date = req.query.date || getToday();
    const records = db.prepare('SELECT * FROM commission_reward WHERE date = ? ORDER BY created_at DESC').all(date);
    const total = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM commission_reward WHERE date = ?').get(date);
    res.json({ records, total: total.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/commission', (req, res) => {
  try {
    const { date, amount, product_name, description } = req.body;
    const stmt = db.prepare('INSERT INTO commission_reward (date, amount, product_name, description) VALUES (?, ?, ?, ?)');
    const result = stmt.run(date || getToday(), amount, product_name, description);
    res.json({ id: result.lastInsertRowid, message: '提成奖励记录成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. 积分优惠
app.get('/api/points-discount', (req, res) => {
  try {
    const date = req.query.date || getToday();
    const records = db.prepare('SELECT * FROM points_discount WHERE date = ? ORDER BY created_at DESC').all(date);
    const total = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM points_discount WHERE date = ?').get(date);
    res.json({ records, total: total.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/points-discount', (req, res) => {
  try {
    const { date, amount, customer_name, description } = req.body;
    const stmt = db.prepare('INSERT INTO points_discount (date, amount, customer_name, description) VALUES (?, ?, ?, ?)');
    const result = stmt.run(date || getToday(), amount, customer_name, description);
    res.json({ id: result.lastInsertRowid, message: '积分优惠记录成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. 资金支出
app.get('/api/expense', (req, res) => {
  try {
    const date = req.query.date || getToday();
    const records = db.prepare('SELECT * FROM expense WHERE date = ? ORDER BY created_at DESC').all(date);
    const total = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expense WHERE date = ?').get(date);
    res.json({ records, total: total.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expense', (req, res) => {
  try {
    const { date, amount, category, payment_method, description } = req.body;

    // 插入支出记录
    const stmt = db.prepare('INSERT INTO expense (date, amount, category, payment_method, description) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(date || getToday(), amount, category, payment_method, description);

    // 扣减对应支付方式余额
    const updateBalance = db.prepare('UPDATE balance SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE payment_method = ?');
    updateBalance.run(amount, payment_method);

    res.json({ id: result.lastInsertRowid, message: '支出记录成功，余额已更新' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. 资金分类余额
app.get('/api/balance', (req, res) => {
  try {
    const balances = db.prepare('SELECT * FROM balance ORDER BY payment_method').all();
    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/balance', (req, res) => {
  try {
    const { payment_method, balance } = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO balance (payment_method, balance, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    stmt.run(payment_method, balance);
    res.json({ message: '余额更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. 赊账列表
app.get('/api/credit', (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM credit_account';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY date DESC, created_at DESC';
    const records = db.prepare(query).all(...params);

    const unpaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM credit_account WHERE status = "未结账"').get();
    const paid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM credit_account WHERE status = "已结账"').get();

    res.json({ records, unpaid_total: unpaid.total, paid_total: paid.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/credit', (req, res) => {
  try {
    const { date, customer_name, telegram_account, wechat_account, phone, amount } = req.body;
    const stmt = db.prepare(`
      INSERT INTO credit_account (date, customer_name, telegram_account, wechat_account, phone, amount, status)
      VALUES (?, ?, ?, ?, ?, ?, '未结账')
    `);
    const result = stmt.run(date || getToday(), customer_name, telegram_account, wechat_account, phone, amount);
    res.json({ id: result.lastInsertRowid, message: '赊账记录成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/credit/:id/settle', (req, res) => {
  try {
    const id = req.params.id;
    const settled_date = req.body.settled_date || getToday();
    const stmt = db.prepare('UPDATE credit_account SET status = "已结账", settled_date = ? WHERE id = ?');
    stmt.run(settled_date, id);
    res.json({ message: '结账成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. 骑手
app.get('/api/riders', (req, res) => {
  try {
    const riders = db.prepare('SELECT * FROM rider ORDER BY name').all();
    res.json(riders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/riders', (req, res) => {
  try {
    const { name } = req.body;
    const stmt = db.prepare('INSERT INTO rider (name) VALUES (?)');
    const result = stmt.run(name);
    res.json({ id: result.lastInsertRowid, message: '骑手添加成功' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: '该骑手已存在' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 9. 骑手补贴
app.get('/api/rider-subsidy', (req, res) => {
  try {
    const { range, rider_id, date } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (range === 'month') {
      where += ' AND date >= ?';
      params.push(getMonthStart());
    } else if (date) {
      where += ' AND date = ?';
      params.push(date);
    }

    if (rider_id) {
      where += ' AND rider_id = ?';
      params.push(rider_id);
    }

    const records = db.prepare(`
      SELECT rs.*, r.name as rider_name
      FROM rider_subsidy rs
      JOIN rider r ON rs.rider_id = r.id
      ${where}
      ORDER BY date DESC, created_at DESC
    `).all(...params);

    // 统计
    const totalSubsidy = db.prepare(`SELECT COALESCE(SUM(subsidy_amount), 0) as total FROM rider_subsidy ${where}`).get(...params);
    const totalAdvance = db.prepare(`SELECT COALESCE(SUM(advance_amount), 0) as total FROM rider_subsidy ${where}`).get(...params);

    res.json({
      records,
      total_subsidy: totalSubsidy.total,
      total_advance: totalAdvance.total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rider-subsidy', (req, res) => {
  try {
    const { date, rider_id, subsidy_amount, advance_amount, description } = req.body;
    const stmt = db.prepare('INSERT INTO rider_subsidy (date, rider_id, subsidy_amount, advance_amount, description) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(date || getToday(), rider_id, subsidy_amount || 0, advance_amount || 0, description);
    res.json({ id: result.lastInsertRowid, message: '补贴记录成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. 资金列表（按支付方式统计）
app.get('/api/expense-summary', (req, res) => {
  try {
    const date = req.query.date || getToday();

    const byMethod = db.prepare(`
      SELECT payment_method, COALESCE(SUM(amount), 0) as total
      FROM expense
      WHERE date = ?
      GROUP BY payment_method
    `).all(date);

    const grandTotal = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expense WHERE date = ?').get(date);

    res.json({ records: byMethod, total: grandTotal.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 根路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`财务报表系统运行中: http://localhost:${PORT}`);
});
