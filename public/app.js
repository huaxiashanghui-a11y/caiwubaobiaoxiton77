// 当前日期
let currentDate = new Date().toISOString().split('T')[0];
let subsidyRange = 'day';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  setDateToday();
  loadAllData();
  loadRiders();
});

// 设置日期为今天
function setDateToday() {
  currentDate = new Date().toISOString().split('T')[0];
  document.getElementById('currentDate').value = currentDate;
}

// 切换日期
function changeDate(days) {
  const date = new Date(currentDate);
  date.setDate(date.getDate() + days);
  currentDate = date.toISOString().split('T')[0];
  document.getElementById('currentDate').value = currentDate;
  loadAllData();
}

// 选择今天
function setToday() {
  setDateToday();
  loadAllData();
}

// 加载所有数据
async function loadAllData() {
  await Promise.all([
    loadDashboard(),
    loadDiscount(),
    loadCommission(),
    loadPoints(),
    loadExpense(),
    loadCredit(),
    loadSubsidy(),
    loadBalance(),
    loadExpenseSummary()
  ]);
}

// ==================== 仪表盘 ====================
async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    document.getElementById('val-discount').textContent = `¥${formatMoney(data.discount_balance)}`;
    document.getElementById('val-points').textContent = `¥${formatMoney(data.points_balance)}`;
    document.getElementById('val-commission').textContent = `¥${formatMoney(data.commission_balance)}`;
    document.getElementById('val-expense').textContent = `-¥${formatMoney(data.expense_balance)}`;
    document.getElementById('val-subsidy').textContent = `-¥${formatMoney(data.subsidy_balance)}`;
    document.getElementById('val-credit').textContent = `¥${formatMoney(data.credit_balance)}`;
    document.getElementById('val-daily').textContent = `¥${formatMoney(data.daily_balance)}`;
  } catch (error) {
    console.error('加载仪表盘失败:', error);
  }
}

// ==================== 折扣收益 ====================
async function loadDiscount() {
  try {
    const res = await fetch(`/api/discount-income?date=${currentDate}`);
    const data = await res.json();
    document.getElementById('discount-total').textContent = `¥${formatMoney(data.total)}`;
    const list = document.getElementById('discount-list');
    list.innerHTML = data.records.map(r => `
      <div class="list-item">
        <div class="info">
          <div class="time">${r.created_at}</div>
          <div class="desc">${r.description || '-'}</div>
        </div>
        <div class="amount">¥${formatMoney(r.amount)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('加载折扣收益失败:', error);
  }
}

async function addDiscount() {
  const amount = parseFloat(document.getElementById('discount-amount').value);
  const description = document.getElementById('discount-desc').value;

  if (!amount) return alert('请输入金额');

  try {
    const res = await fetch('/api/discount-income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: currentDate, amount, description })
    });
    if (res.ok) {
      document.getElementById('discount-amount').value = '';
      document.getElementById('discount-desc').value = '';
      loadDiscount();
      loadDashboard();
    }
  } catch (error) {
    console.error(error);
    alert('添加失败');
  }
}

// ==================== 提成奖励 ====================
async function loadCommission() {
  try {
    const res = await fetch(`/api/commission?date=${currentDate}`);
    const data = await res.json();
    document.getElementById('commission-total').textContent = `¥${formatMoney(data.total)}`;
    const list = document.getElementById('commission-list');
    list.innerHTML = data.records.map(r => `
      <div class="list-item">
        <div class="info">
          <div class="name">${r.product_name || '-'}</div>
          <div class="desc">${r.description || '-'}</div>
        </div>
        <div class="amount">¥${formatMoney(r.amount)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('加载提成奖励失败:', error);
  }
}

async function addCommission() {
  const amount = parseFloat(document.getElementById('commission-amount').value);
  const product_name = document.getElementById('commission-product').value;
  const description = document.getElementById('commission-desc').value;

  if (!amount) return alert('请输入金额');

  try {
    const res = await fetch('/api/commission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: currentDate, amount, product_name, description })
    });
    if (res.ok) {
      document.getElementById('commission-amount').value = '';
      document.getElementById('commission-product').value = '';
      document.getElementById('commission-desc').value = '';
      loadCommission();
      loadDashboard();
    }
  } catch (error) {
    console.error(error);
    alert('添加失败');
  }
}

// ==================== 积分优惠 ====================
async function loadPoints() {
  try {
    const res = await fetch(`/api/points-discount?date=${currentDate}`);
    const data = await res.json();
    document.getElementById('points-total').textContent = `¥${formatMoney(data.total)}`;
    const list = document.getElementById('points-list');
    list.innerHTML = data.records.map(r => `
      <div class="list-item">
        <div class="info">
          <div class="name">${r.customer_name || '-'}</div>
          <div class="desc">${r.description || '-'}</div>
        </div>
        <div class="amount">¥${formatMoney(r.amount)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('加载积分优惠失败:', error);
  }
}

async function addPoints() {
  const amount = parseFloat(document.getElementById('points-amount').value);
  const customer_name = document.getElementById('points-customer').value;
  const description = document.getElementById('points-desc').value;

  if (!amount) return alert('请输入金额');

  try {
    const res = await fetch('/api/points-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: currentDate, amount, customer_name, description })
    });
    if (res.ok) {
      document.getElementById('points-amount').value = '';
      document.getElementById('points-customer').value = '';
      document.getElementById('points-desc').value = '';
      loadPoints();
      loadDashboard();
    }
  } catch (error) {
    console.error(error);
    alert('添加失败');
  }
}

// ==================== 资金支出 ====================
async function loadExpense() {
  try {
    const res = await fetch(`/api/expense?date=${currentDate}`);
    const data = await res.json();
    document.getElementById('expense-total').textContent = `¥${formatMoney(data.total)}`;
    const list = document.getElementById('expense-list');
    list.innerHTML = data.records.map(r => `
      <div class="list-item">
        <div class="info">
          <div class="name">${r.category} - ${r.payment_method}</div>
          <div class="desc">${r.description || '-'}</div>
        </div>
        <div class="amount expense">-¥${formatMoney(r.amount)}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('加载资金支出失败:', error);
  }
}

async function addExpense() {
  const amount = parseFloat(document.getElementById('expense-amount').value);
  const category = document.getElementById('expense-category').value;
  const payment_method = document.getElementById('expense-method').value;
  const description = document.getElementById('expense-desc').value;

  if (!amount) return alert('请输入金额');
  if (!category || !payment_method) return alert('请选择分类和支付方式');

  try {
    const res = await fetch('/api/expense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: currentDate, amount, category, payment_method, description })
    });
    if (res.ok) {
      document.getElementById('expense-amount').value = '';
      document.getElementById('expense-desc').value = '';
      loadExpense();
      loadDashboard();
      loadBalance();
      loadExpenseSummary();
    }
  } catch (error) {
    console.error(error);
    alert('添加失败');
  }
}

// ==================== 赊账 ====================
async function loadCredit() {
  const status = document.querySelector('input[name="credit-filter"]:checked').value;
  try {
    const url = status ? `/api/credit?status=${status}` : '/api/credit';
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('credit-unpaid').textContent = `¥${formatMoney(data.unpaid_total)}`;
    document.getElementById('credit-paid').textContent = `¥${formatMoney(data.paid_total)}`;
    const list = document.getElementById('credit-list');
    list.innerHTML = data.records.map(r => `
      <div class="list-item ${r.status === '未结账' ? 'credit-unpaid' : 'credit-paid'}">
        <div class="info">
          <div class="name">${r.customer_name}</div>
          <div class="desc">
            ${r.telegram_account ? `TG: ${r.telegram_account}` : ''}
            ${r.wechat_account ? ` | 微信: ${r.wechat_account}` : ''}
            ${r.phone ? ` | 📱 ${r.phone}` : ''}
          </div>
          <div class="time">${r.date}</div>
        </div>
        <div>
          <div class="amount">¥${formatMoney(r.amount)}</div>
          ${r.status === '未结账' ? `<button class="settle-btn" onclick="settleCredit(${r.id})">结账</button>` : '<span class="time">已结</span>'}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('加载赊账列表失败:', error);
  }
}

async function addCredit() {
  const customer_name = document.getElementById('credit-customer').value;
  const telegram_account = document.getElementById('credit-telegram').value;
  const wechat_account = document.getElementById('credit-wechat').value;
  const phone = document.getElementById('credit-phone').value;
  const amount = parseFloat(document.getElementById('credit-amount').value);

  if (!customer_name || !amount) return alert('请输入客户名称和金额');

  try {
    const res = await fetch('/api/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: currentDate, customer_name, telegram_account, wechat_account, phone, amount })
    });
    if (res.ok) {
      document.getElementById('credit-customer').value = '';
      document.getElementById('credit-telegram').value = '';
      document.getElementById('credit-wechat').value = '';
      document.getElementById('credit-phone').value = '';
      document.getElementById('credit-amount').value = '';
      loadCredit();
      loadDashboard();
    }
  } catch (error) {
    console.error(error);
    alert('添加失败');
  }
}

async function settleCredit(id) {
  if (!confirm('确认结账？')) return;
  try {
    const res = await fetch(`/api/credit/${id}/settle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settled_date: currentDate })
    });
    if (res.ok) {
      loadCredit();
      loadDashboard();
    }
  } catch (error) {
    console.error(error);
    alert('结账失败');
  }
}

// ==================== 骑手 ====================
async function loadRiders() {
  try {
    const res = await fetch('/api/riders');
    const riders = await res.json();
    const select = document.getElementById('rider-select');
    select.innerHTML = '<option value="">选择骑手</option>' + riders.map(r => `
      <option value="${r.id}">${r.name}</option>
    `).join('');
  } catch (error) {
    console.error('加载骑手列表失败:', error);
  }
}

async function addRider() {
  const name = prompt('请输入骑手姓名:');
  if (!name) return;

  try {
    const res = await fetch('/api/riders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      loadRiders();
      alert('骑手添加成功');
    }
  } catch (error) {
    console.error(error);
    alert('添加失败');
  }
}

// ==================== 骑手补贴 ====================
function setSubsidyRange(range) {
  subsidyRange = range;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
  loadSubsidy();
}

async function loadSubsidy() {
  const rider_id = document.getElementById('rider-select').value;
  try {
    let url = `/api/rider-subsidy?range=${subsidyRange}`;
    if (rider_id) url += `&rider_id=${rider_id}`;

    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('subsidy-total').textContent = `¥${formatMoney(data.total_subsidy)}`;
    document.getElementById('advance-total').textContent = `¥${formatMoney(data.total_advance)}`;

    const list = document.getElementById('subsidy-list');
    list.innerHTML = data.records.map(r => `
      <div class="list-item">
        <div class="info">
          <div class="name">${r.rider_name}</div>
          <div class="desc">${r.description || '-'}</div>
          <div class="time">${r.date}</div>
        </div>
        <div>
          <div class="amount">补贴: ¥${formatMoney(r.subsidy_amount)}</div>
          <div class="amount expense">垫付: ¥${formatMoney(r.advance_amount)}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('加载骑手补贴失败:', error);
  }
}

async function addSubsidy() {
  const rider_id = document.getElementById('rider-select').value;
  const subsidy_amount = parseFloat(document.getElementById('subsidy-amount').value) || 0;
  const advance_amount = parseFloat(document.getElementById('advance-amount').value) || 0;
  const description = document.getElementById('subsidy-desc').value;

  if (!rider_id) return alert('请选择骑手');
  if (!subsidy_amount && !advance_amount) return alert('请输入补贴或垫付金额');

  try {
    const res = await fetch('/api/rider-subsidy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: currentDate, rider_id, subsidy_amount, advance_amount, description })
    });
    if (res.ok) {
      document.getElementById('subsidy-amount').value = '';
      document.getElementById('advance-amount').value = '';
      document.getElementById('subsidy-desc').value = '';
      loadSubsidy();
      loadDashboard();
    }
  } catch (error) {
    console.error(error);
    alert('添加失败');
  }
}

// ==================== 资金分类 ====================
async function loadBalance() {
  try {
    const res = await fetch('/api/balance');
    const balances = await res.json();
    const list = document.getElementById('balance-list');
    list.innerHTML = balances.map(b => `
      <div class="balance-item">
        <div class="method">${b.payment_method}</div>
        <div>
          <input type="number" step="0.01" value="${b.balance}" id="balance-${b.id}" onchange="updateBalance(${b.id}, this.value)">
          <button class="update-btn" onclick="updateBalance(${b.id}, document.getElementById('balance-${b.id}').value)">更新</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('加载资金分类失败:', error);
  }
}

async function updateBalance(id, balance) {
  try {
    const method = document.querySelector(`#balance-${id}`).closest('.balance-item').querySelector('.method').textContent;
    const res = await fetch('/api/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: method, balance: parseFloat(balance) })
    });
    if (res.ok) {
      alert('余额更新成功');
    }
  } catch (error) {
    console.error(error);
    alert('更新失败');
  }
}

// ==================== 支出统计 ====================
async function loadExpenseSummary() {
  try {
    const res = await fetch(`/api/expense-summary?date=${currentDate}`);
    const data = await res.json();
    const summary = document.getElementById('expense-summary');

    let html = data.records.map(r => `
      <div class="expense-item">
        <div class="method">${r.payment_method}</div>
        <div class="amount">-¥${formatMoney(r.total)}</div>
      </div>
    `).join('');

    html += `
      <div class="expense-item grand-total">
        <div>当日总支出</div>
        <div>-¥${formatMoney(data.total)}</div>
      </div>
    `;

    summary.innerHTML = html;
  } catch (error) {
    console.error('加载支出统计失败:', error);
  }
}

// ==================== 工具函数 ====================
function formatMoney(num) {
  return parseFloat(num || 0).toFixed(2);
}
