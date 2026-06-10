const BACKEND_URL = 'http://localhost:3000'; 
const DEMO_MODE   = BACKEND_URL.includes('localhost');
const API_URL     = BACKEND_URL;
const FIREBASE_CONFIG = {
apiKey:            'ВСТАВЬТЕ_API_KEY',
authDomain:        'ВСТАВЬТЕ.firebaseapp.com',
projectId:         'ВСТАВЬТЕ_PROJECT_ID',
storageBucket:     'ВСТАВЬТЕ.appspot.com',
messagingSenderId: 'ВСТАВЬТЕ_SENDER_ID',
appId:             'ВСТАВЬТЕ_APP_ID',
vapidKey:          'ВСТАВЬТЕ_VAPID_KEY' 
};
const PUSH_ENABLED = !FIREBASE_CONFIG.apiKey.includes('ВСТАВЬТЕ');
const DEMO_ORDERS = [
{
orderId: 'AUR-2024-087', title: 'Кольцо с бриллиантом 0.3ct',
status: 'progress', price: 42500, masterName: 'Петров С.В.',
material: 'Золото 585°, бриллиант', createdAt: '2025-01-10', readyAt: '2025-01-25',
guaranteeMonths: 12, guaranteeUntil: '2026-01-25', weight: '4.20',
step1date: '2025-01-10', step2date: '2025-01-12', step3date: '', step4date: ''
},
{
orderId: 'AUR-2024-089', title: 'Ремонт цепочки золотой',
status: 'ready', price: 1200, masterName: 'Иванов А.П.',
material: 'Золото 585°', createdAt: '2025-01-13', readyAt: '2025-01-15',
guaranteeMonths: 6, guaranteeUntil: '2025-07-15', pickupCode: '7842', weight: '3.98',
step1date: '2025-01-13', step2date: '2025-01-13', step3date: '2025-01-15', step4date: '2025-01-15'
},
{
orderId: 'AUR-2023-234', title: 'Гравировка на кулоне',
status: 'done', price: 800, masterName: 'Иванов А.П.',
material: 'Серебро 925°', createdAt: '2024-12-18', readyAt: '2024-12-20', pickedUpAt: '2024-12-20',
guaranteeMonths: 3, guaranteeUntil: '2025-03-20',
step1date: '2024-12-18', step2date: '2024-12-19', step3date: '2024-12-20', step4date: '2024-12-20'
},
{
orderId: 'AUR-2023-198', title: 'Чистка и полировка серёг',
status: 'done', price: 600, masterName: 'Кузнецова М.А.',
material: 'Золото 585°', createdAt: '2024-11-03', readyAt: '2024-11-05', pickedUpAt: '2024-11-05',
guaranteeMonths: 0, guaranteeUntil: '',
step1date: '2024-11-03', step2date: '2024-11-04', step3date: '2024-11-05', step4date: '2024-11-05'
}
];
const DEMO_BONUSES = [
{ type: 'birthday', amount: 500, description: 'День рождения', createdAt: '2025-01-15' },
{ type: 'earn', amount: 2125, description: 'Кольцо с бриллиантом', createdAt: '2025-01-10' },
{ type: 'spend', amount: -600, description: 'Ремонт цепочки', createdAt: '2025-01-15' },
{ type: 'promo', amount: 48, description: 'Акция «Двойные бонусы»', createdAt: '2024-12-20' }
];
const DEMO_PROMOS = [
{ id:'p001', tag:'🎁 Акция', title:'-20% на гравировку в феврале', validUntil:'2025-02-28' },
{ id:'p002', tag:'⭐ Бонусы ×2', title:'Двойные бонусы за каждый заказ', validUntil:'2025-02-14' },
{ id:'p003', tag:'💍 Новинка', title:'Обручальные кольца по эскизу', validUntil:'2099-12-31' }
];
let appOrders = [];
let appBonuses = [];
let appPromos = [];
const orders = {};
function getToken() {
try { return localStorage.getItem('uvyantra_token'); } catch { return null; }
}
function setToken(t) {
try { localStorage.setItem('uvyantra_token', t); } catch {}
}
function clearToken() {
try { localStorage.removeItem('uvyantra_token'); } catch {}
}
async function api(method, path, body = null) {
const token = getToken();
const opts = {
method,
headers: {
'Content-Type': 'application/json',
...(token ? { 'X-Session-Token': token } : {})
}
};
if (body) opts.body = JSON.stringify(body);
const res = await fetch(BACKEND_URL + path, opts);
const json = await res.json();
if (!json.ok) throw new Error(json.error || 'Ошибка сервера');
return json.data;
}
async function authRequest(phone) {
await fetch(BACKEND_URL + '/auth/request', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ phone })
});
}
async function authVerify(phone, code) {
const res = await fetch(BACKEND_URL + '/auth/verify', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ phone, code })
});
const json = await res.json();
if (!json.ok) throw new Error(json.error);
return json;
}
async function loadFromAPI() {
const [client, orders, bonuses, promos] = await Promise.all([
api('GET', '/client/me'),
api('GET', '/orders'),
api('GET', '/bonuses'),
api('GET', '/promos')
]);
return { client, orders, bonuses, promos };
}
function normalizeOrder(raw) {
raw = {
orderId:        raw.orderId        || raw.order_number,
title:          raw.title,
status:         raw.status,
price:          raw.price,
masterName:     raw.masterName     || raw.master_name,
material:       raw.material,
createdAt:      raw.createdAt      || raw.created_at,
readyAt:        raw.readyAt        || raw.ready_at,
guaranteeMonths:raw.guaranteeMonths|| raw.guarantee_months || 0,
guaranteeUntil: raw.guaranteeUntil || raw.guarantee_until,
pickupCode:     raw.pickupCode     || raw.pickup_code,
weight:         raw.weight          || raw.weight_grams || null,
step1date: raw.step1date || raw.step_received_at,
step2date: raw.step2date || raw.step_progress_at,
step3date: raw.step3date || raw.step_done_at,
step4date: raw.step4date || raw.step_ready_at,
};
const statusMap = { progress:'В работе', ready:'Готово', done:'Получено', pending:'Принят' };
const stepLabels = ['Принят в работу','В работе','Готово','Получено'];
const steps = stepLabels.map((label, i) => {
const dateKey = 'step' + (i+1) + 'date';
const date = raw[dateKey] || '';
const isActive = !date && i > 0 && raw['step' + i + 'date'];
return { name: label, date: date || '—', done: !!date, active: !!isActive };
});
let lastDone = -1;
steps.forEach((s, i) => { if (s.done) lastDone = i; });
if (lastDone >= 0 && lastDone < steps.length - 1) {
steps[lastDone + 1].active = true;
steps[lastDone + 1].done = false;
}
const g = raw.guaranteeMonths > 0 && raw.guaranteeUntil
? raw.guaranteeMonths + ' мес. · до ' + _fmtDate(raw.guaranteeUntil) : null;
return {
orderId:  raw.orderId,
title:    raw.title,
id:       '№ ' + raw.orderId,
status:   raw.status || 'pending',
statusText: statusMap[raw.status] || raw.status,
price:    _fmtMoney(raw.price),
date:     _fmtDate(raw.createdAt),
ready:    raw.readyAt ? _fmtDate(raw.readyAt) : '—',
master:   raw.masterName || '—',
material: raw.material || '—',
pickupCode: raw.pickupCode || '',
weight: raw.weight || null,
steps,
guarantee: g
};
}
function _fmtDate(d) {
if (!d) return '—';
try {
const dt = new Date(d + (d.includes('T') ? '' : 'T00:00:00'));
return dt.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit' });
} catch { return d; }
}
function _fmtMoney(v) {
if (!v) return '—';
return Number(v).toLocaleString('ru-RU') + ' ₽';
}
function normalizeBonusTotal(bonuses) {
return bonuses.reduce((sum, b) => sum + Number(b.amount || 0), 0);
}
function calcBonusLevel(balance) {
if (balance >= 1000000) return { key:'vip',      label:'VIP',     pct:15 };
if (balance >= 500000)  return { key:'platinum', label:'Платина', pct:10 };
if (balance >= 100000)  return { key:'gold',     label:'Золото',  pct:7  };
return { key:'silver', label:'Серебро', pct:5 };
}
async function loadAppData() {
showLoadingState(true);
const user = loadUser();
const phone = user.phone;
try {
let client, rawOrders, rawBonuses, rawPromos;
if (!DEMO_MODE && getToken()) {
({ client, orders: rawOrders, bonuses: rawBonuses, promos: rawPromos } =
await loadFromAPI());
if (client) {
const merged = {
...user,
firstname:  client.first_name  || user.firstname,
lastname:   client.last_name   || user.lastname,
patronymic: client.patronymic  || user.patronymic,
email:      client.email       || user.email,
birthday:   client.birthday ? client.birthday.split('T')[0] : user.birthday
};
saveUser(merged);
applyUserToUI(merged);
}
} else {
rawOrders  = DEMO_ORDERS;
rawBonuses = DEMO_BONUSES;
rawPromos  = DEMO_PROMOS;
if (!DEMO_MODE && !getToken()) showAuthScreen();
}
appOrders  = (rawOrders  || []).map(normalizeOrder);
appBonuses = rawBonuses  || [];
appPromos  = rawPromos   || [];
appOrders.forEach(o => { orders[o.orderId] = o; });
renderHomeOrders();
renderPromos();
renderOrdersList();
renderBonusSection();
renderPickupSelect();
if (DEMO_MODE) showDemoBanner();
} catch(e) {
console.error('Load error:', e);
appOrders  = DEMO_ORDERS.map(normalizeOrder);
appBonuses = DEMO_BONUSES;
appPromos  = DEMO_PROMOS;
appOrders.forEach(o => { orders[o.orderId] = o; });
renderHomeOrders(); renderPromos(); renderOrdersList();
renderBonusSection(); renderPickupSelect();
if (!DEMO_MODE) showToast('⚠️ Нет связи — показаны кешированные данные');
}
showLoadingState(false);
}
function showLoadingState(on) {
document.querySelectorAll('.data-loader').forEach(el => {
el.style.display = on ? 'flex' : 'none';
});
}
function showDemoBanner() {
const b = document.getElementById('demo-banner');
if (b) b.style.display = 'flex';
}
function renderHomeOrders() {
const active = appOrders.filter(o => o.status === 'progress' || o.status === 'ready').slice(0, 3);
const container = document.getElementById('home-orders');
if (!container) { setTimeout(renderHomeOrders, 200); return; }
if (!active.length) {
container.innerHTML = '<div style="text-align:center;padding:20px;font-size:13px;color:var(--text-muted);">Нет активных заказов</div>';
return;
}
const icons = {
progress: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
ready:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 6L9 17l-5-5"/></svg>'
};
container.innerHTML = active.map(o => `
<div class="order-item" onclick="openOrderDetail('${o.orderId}')">
<div class="order-icon">${icons[o.status] || icons.progress}</div>
<div class="order-info">
<div class="order-name">${o.title}</div>
<div class="order-meta">
<span class="badge ${o.status === 'ready' ? 'badge-ready' : 'badge-progress'}">
${o.status === 'ready' ? '✓ ' : '● '}${o.statusText}
</span>
</div>
</div>
<div class="order-date">${o.status === 'ready' ? 'Готов' : 'до ' + o.ready}</div>
</div>`).join('');
}
function renderPromos() {
const container = document.getElementById('promo-scroll');
if (!container) { setTimeout(renderPromos, 200); return; }
if (!appPromos.length) return;
container.innerHTML = appPromos.map(p => `
<div class="promo-card">
<div class="promo-tag">${p.tag || '🎁'}</div>
<div class="promo-title">${p.title}</div>
<div class="promo-until">До ${_fmtDate(p.validUntil)}</div>
</div>`).join('');
}
function renderOrdersList() {
const container = document.getElementById('orders-list');
if (!container) return;
if (!appOrders.length) {
container.innerHTML = '<div style="text-align:center;padding:30px;font-size:13px;color:var(--text-muted);">Заказов пока нет</div>';
document.getElementById('orders-count-label').textContent = 'Нет заказов';
return;
}
document.getElementById('orders-count-label').textContent = appOrders.length + ' ' + _pluralOrder(appOrders.length) + ' в истории';
const badgeClass = { ready:'badge-ready', progress:'badge-progress', done:'badge-done', pending:'badge-pending' };
container.innerHTML = appOrders.map(o => {
const steps = o.steps || [];
const stepsHtml = steps.map(s =>
`<div class="timeline-step ${s.done ? 'done' : s.active ? 'active' : ''}"></div>`
).join('');
const g = o.guarantee ? `<div style="margin-top:8px;"><span class="guarantee-badge">🛡 Гарантия ${o.guarantee}</span></div>` : '';
return `
<div class="order-full" onclick="openOrderDetail('${o.orderId}')" data-status="${o.status}">
<div class="order-full-header">
<div>
<div class="order-full-title">${o.title}</div>
<div class="order-full-id">${o.id}</div>
</div>
<span class="badge ${badgeClass[o.status] || 'badge-done'}">${o.statusText}</span>
</div>
${g}
<div class="order-timeline">${stepsHtml}</div>
<div class="order-footer">
<div class="order-price">${o.price}</div>
<div class="order-date-small">${o.date}</div>
</div>
</div>`;
}).join('');
}
function renderBonusSection() {
const total = normalizeBonusTotal(appBonuses);
const level = calcBonusLevel(total);
const nextLevel = { silver: { label:'Золото', need:100000 }, gold: { label:'Платина', need:500000 }, platinum: { label:'VIP', need:1000000 }, vip: null }[level.key];
const amountEl = document.getElementById('bonus-amount-home');
if (amountEl) amountEl.textContent = total.toLocaleString('ru-RU');
const levelEl = document.getElementById('bonus-level-home');
if (levelEl) levelEl.textContent = 'Уровень «' + level.label + '»';
const balEl = document.getElementById('bonus-amount-screen');
if (balEl) balEl.textContent = total.toLocaleString('ru-RU');
const lvlEl = document.getElementById('bonus-level-screen');
if (lvlEl) lvlEl.textContent = 'Уровень «' + level.label + '»';
if (nextLevel) {
const pct = Math.min(100, Math.round((total / nextLevel.need) * 100));
document.querySelectorAll('.progress-fill').forEach(el => el.style.width = pct + '%');
document.querySelectorAll('.progress-to-label').forEach(el => el.textContent = 'До «' + nextLevel.label + '»');
document.querySelectorAll('.progress-remain').forEach(el =>
el.textContent = (nextLevel.need - total).toLocaleString('ru-RU') + ' ₽');
}
const hist = document.getElementById('bonus-history-list');
if (hist && appBonuses.length) {
const icons = { birthday:'🎂', earn:'💍', spend:'🛍', promo:'⭐' };
hist.innerHTML = appBonuses.slice(0, 20).map(b => {
const pos = Number(b.amount) >= 0;
return `
<div class="bonus-history-item">
<div class="bonus-icon ${pos ? 'positive' : 'negative'}">${icons[b.type] || '💰'}</div>
<div class="bonus-hist-info">
<div class="bonus-hist-title">${b.description}</div>
<div class="bonus-hist-date">${_fmtDate(b.createdAt)}</div>
</div>
<div class="bonus-hist-amount ${pos ? 'positive' : 'negative'}">${pos ? '+' : ''}${Number(b.amount).toLocaleString('ru-RU')}</div>
</div>`;
}).join('');
}
const earned = appBonuses.filter(b => Number(b.amount) > 0).reduce((s,b) => s + Number(b.amount), 0);
const spent  = Math.abs(appBonuses.filter(b => Number(b.amount) < 0).reduce((s,b) => s + Number(b.amount), 0));
const earnEl = document.getElementById('bonus-earned');
const spentEl = document.getElementById('bonus-spent');
if (earnEl) earnEl.textContent = '+' + earned.toLocaleString('ru-RU') + ' ₽';
if (spentEl) spentEl.textContent = '−' + spent.toLocaleString('ru-RU') + ' ₽';
document.querySelectorAll('.level-card').forEach(card => {
card.classList.toggle('current', card.dataset.level === level.key);
const badge = card.querySelector('.level-current-badge');
if (badge) badge.style.display = card.dataset.level === level.key ? 'block' : 'none';
});
}
function renderPickupSelect() {
const sel = document.getElementById('pickup-select');
if (!sel) return;
const ready = appOrders.filter(o => o.status === 'ready');
if (!ready.length) {
sel.innerHTML = '<option value="">Нет заказов к выдаче</option>';
updateQR('');
return;
}
sel.innerHTML = ready.map(o =>
`<option value="${o.orderId}" data-code="${o.pickupCode}">${o.id} — ${o.title}</option>`
).join('');
updateQRFromSelect();
}
function updateQRFromSelect() {
const sel = document.getElementById('pickup-select');
if (!sel || !sel.options[sel.selectedIndex]) return;
const code = sel.options[sel.selectedIndex].dataset.code || '0000';
document.getElementById('pickup-code').textContent = code;
generateQR(code);
}
function _pluralOrder(n) {
if (n % 100 >= 11 && n % 100 <= 19) return 'заказов';
const r = n % 10;
if (r === 1) return 'заказ';
if (r >= 2 && r <= 4) return 'заказа';
return 'заказов';
}
let currentScreen = 'home';
const NAV_SCREENS = ['home','orders','pickup','bonuses','profile'];
function nav(screen) {
const curEl = document.getElementById(currentScreen);
if (curEl) curEl.classList.remove('active');
const curNav = document.getElementById('nav-' + currentScreen);
if (curNav) curNav.classList.remove('active');
currentScreen = screen;
const newEl = document.getElementById(screen);
if (newEl) newEl.classList.add('active');
const newNav = document.getElementById('nav-' + screen);
if (newNav) newNav.classList.add('active');
if (screen === 'chat') {
const profileNav = document.getElementById('nav-profile');
if (profileNav) profileNav.classList.add('active');
setTimeout(initChat, 100);
}
if (screen !== 'chat' && newEl) newEl.scrollTop = 0;
}
function setGreeting() {
const d = new Date();
const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const days = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
document.getElementById('today-date').textContent = d.getDate() + ' ' + months[d.getMonth()] + ', ' + days[d.getDay()];
}
setGreeting();
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', loadAppData);
} else {
loadAppData(); 
}
function openOrderDetail(id) {
const o = orders[id];
if (!o) return;
const badgeClass = { progress: 'badge-progress', ready: 'badge-ready', done: 'badge-done' }[o.status] || 'badge-done';
const stepsHtml = o.steps.map(s => `
<div class="status-step">
<div class="status-dot ${s.done ? 'done' : s.active ? 'active' : ''}">
${s.done ? '✓' : s.active ? '●' : ''}
</div>
<div class="status-info">
<div class="status-name">${s.name}</div>
<div class="status-date">${s.date}</div>
</div>
</div>`).join('');
document.getElementById('modal-body').innerHTML = `
<div class="modal-title">${o.title}</div>
<div class="modal-id">${o.id}</div>
<span class="badge ${badgeClass}" style="margin-bottom:16px;display:inline-flex;">${o.statusText}</span>
${o.guarantee ? `<div style="margin-bottom:16px;"><span class="guarantee-badge">🛡 Гарантия ${o.guarantee}</span></div>` : ''}
<div class="divider"></div>
<div class="detail-row"><span class="detail-label">Стоимость</span><span class="detail-value">${o.price}</span></div>
<div class="detail-row"><span class="detail-label">Принят</span><span class="detail-value">${o.date}</span></div>
<div class="detail-row"><span class="detail-label">Срок выдачи</span><span class="detail-value">${o.ready}</span></div>
<div class="detail-row"><span class="detail-label">Мастер</span><span class="detail-value">${o.master}</span></div>
<div class="detail-row"><span class="detail-label">Материал</span><span class="detail-value">${o.material}</span></div>
<div class="divider"></div>
<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;font-weight:500;">Статус выполнения</div>
<div class="status-timeline">${stepsHtml}</div>
${o.status === 'ready' ? `
<button class="btn btn-gold btn-full" style="margin-top:8px;" onclick="nav('pickup');closeModalDirect()">
📦 Получить заказ
</button>
<button class="btn btn-outline btn-full" style="margin-top:10px;" onclick="closeModalDirect();showReceiptModal()">
📄 Электронная квитанция
</button>` : ''}
${o.status === 'done' ? `<button class="btn btn-outline btn-full" style="margin-top:8px;" onclick="closeModalDirect();showReceiptModal()">📄 Квитанция</button>` : ''}
`;
document.getElementById('order-modal').classList.add('active');
}
function closeModal(e) {
if (e.target === document.getElementById('order-modal')) closeModalDirect();
}
function closeModalDirect() {
document.getElementById('order-modal').classList.remove('active');
}
function showReceiptModal(orderId) {
const o = orderId ? orders[orderId] : (appOrders.find(x => x.status === 'ready') || appOrders[0]);
if (o) {
document.getElementById('receipt-title-num').textContent = 'КВИТАНЦИЯ: №' + o.orderId;
const u = loadUser();
document.getElementById('receipt-client').textContent = getFullName(u) || '—';
document.getElementById('receipt-phone').textContent  = u.phone || '—';
document.getElementById('receipt-master').textContent = o.master || '—';
document.getElementById('receipt-date-in').textContent  = o.date  || '—';
document.getElementById('receipt-date-out').textContent = o.ready || o.date || '—';
const mat = o.material || '—';
const proba = mat.match(/\d{3}°?/)?.[0] || '—';
document.getElementById('receipt-material').textContent = mat;
document.getElementById('receipt-proba').textContent    = proba;
document.getElementById('receipt-weight').textContent   = o.weight ? o.weight + ' г' : '—';
document.getElementById('receipt-desc').textContent     = o.title || '—';
const priceNum = parseFloat((o.price || '0').replace(/\s/g,'').replace('₽','').replace(',','')) || 0;
document.getElementById('receipt-services-list').innerHTML = `
<div style="display:grid;grid-template-columns:1fr auto auto;padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.07);">
<div style="font-size:12px;color:var(--text);">${o.title}</div>
<div style="font-size:12px;color:var(--text);text-align:right;padding:0 10px;">1</div>
<div style="font-size:12px;color:var(--text);text-align:right;">${o.price}</div>
</div>`;
document.getElementById('receipt-prepay').textContent = o.price;
document.getElementById('receipt-total').textContent  = o.price;
document.getElementById('receipt-sum-words').textContent = numToWords(priceNum);
const u2 = loadUser();
const level = calcBonusLevel(normalizeBonusTotal(appBonuses));
const bonusEarned = Math.round(priceNum * level.pct / 100);
document.getElementById('receipt-bonus').textContent = '+' + bonusEarned.toLocaleString('ru-RU') + ' ₽ (' + level.pct + '%)';
document.getElementById('receipt-guarantee').textContent = o.guarantee
? '🛡 ' + o.guarantee
: 'Не предусмотрена';
}
document.getElementById('receipt-modal').classList.add('active');
}
function numToWords(n) {
if (!n || isNaN(n)) return '—';
const units   = ['','один','два','три','четыре','пять','шесть','семь','восемь','девять'];
const teens   = ['десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать','шестнадцать','семнадцать','восемнадцать','девятнадцать'];
const tens    = ['','','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто'];
const hundreds= ['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот'];
const thousands= ['','одна тысяча','две тысячи','три тысячи','четыре тысячи','пять тысяч','шесть тысяч','семь тысяч','восемь тысяч','девять тысяч'];
n = Math.floor(n);
if (n === 0) return 'ноль рублей 00 копеек';
let result = '';
const th = Math.floor(n / 1000);
const rem = n % 1000;
if (th > 0 && th < 10) result += thousands[th] + ' ';
else if (th >= 10) result += th + ' тысяч ';
const h = Math.floor(rem / 100);
const t = Math.floor((rem % 100) / 10);
const u = rem % 10;
if (h) result += hundreds[h] + ' ';
if (t === 1) result += teens[u] + ' ';
else { if (t) result += tens[t] + ' '; if (u) result += units[u] + ' '; }
return (result.trim() || 'ноль') + ' рублей 00 копеек';
}
function closeReceiptModal(e) {
if (!e || e.target === document.getElementById('receipt-modal')) {
document.getElementById('receipt-modal').classList.remove('active');
}
}
function filterOrders(filter, btn) {
document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
btn.classList.add('active');
document.querySelectorAll('#orders-list .order-full').forEach(el => {
const s = el.dataset.status;
el.style.display = (filter === 'all' ||
(filter === 'active' && s === 'active') ||
(filter === 'ready' && s === 'ready') ||
(filter === 'done' && s === 'done')) ? 'block' : 'none';
});
}
function generateQR(code) {
const svg = document.getElementById('qr-svg');
svg.innerHTML = '';
const size = 200;
const modules = 21;
const cellSize = Math.floor(size / modules);
const seed = parseInt(code);
const pattern = [];
for (let i = 0; i < modules; i++) {
pattern[i] = [];
for (let j = 0; j < modules; j++) {
const inTL = (i < 7 && j < 7);
const inTR = (i < 7 && j >= modules - 7);
const inBL = (i >= modules - 7 && j < 7);
if (inTL || inTR || inBL) {
const ri = inTR ? i : inBL ? i - (modules-7) : i;
const rj = inTR ? j - (modules-7) : inBL ? j : j;
pattern[i][j] = (ri === 0 || ri === 6 || rj === 0 || rj === 6) ||
(ri >= 2 && ri <= 4 && rj >= 2 && rj <= 4);
} else {
const hash = ((i * 37 + j * 13 + seed * 7) * 1234567891) % 100;
pattern[i][j] = hash < 50;
}
}
}
const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
for (let i = 0; i < modules; i++) {
for (let j = 0; j < modules; j++) {
if (pattern[i][j]) {
const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
rect.setAttribute('x', j * cellSize + 5);
rect.setAttribute('y', i * cellSize + 5);
rect.setAttribute('width', cellSize - 1);
rect.setAttribute('height', cellSize - 1);
rect.setAttribute('fill', '#0F0E0B');
rect.setAttribute('rx', '1');
g.appendChild(rect);
}
}
}
svg.appendChild(g);
}
function updateQR(orderId) {
const codes = { 'ord-002': '7842' };
const code = codes[orderId] || '0000';
document.getElementById('pickup-code').textContent = code;
generateQR(code);
}
updateQR('ord-002');
function showToast(msg) {
const t = document.getElementById('toast');
t.textContent = msg;
t.classList.add('show');
setTimeout(() => t.classList.remove('show'), 2800);
}
const TG_CONFIG = {
botToken:     '8678659173:AAGWOl_7L7uqSvVjY1u9zEGiHDJuyoKAUDs',
masterChatId: '-5131504174',
pollInterval: 3000
};
const TG_ENABLED = !TG_CONFIG.botToken.includes('ВСТАВЬТЕ');
let chatStore = [];
let tgLastUpdateId = 0;
let tgPollTimer = null;
function loadChatStore() {
try { const s = localStorage.getItem('uvyantra_chat'); if (s) chatStore = JSON.parse(s); } catch {}
}
function saveChatStore() {
try { localStorage.setItem('uvyantra_chat', JSON.stringify(chatStore.slice(-100))); } catch {}
}
function getChatClientId() {
try {
let id = localStorage.getItem('uvyantra_chat_id');
if (!id) { id = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); localStorage.setItem('uvyantra_chat_id', id); }
return id;
} catch { return 'unknown'; }
}
async function sendMessage() {
const input = document.getElementById('chat-input');
const text = input.value.trim();
if (!text) return;
input.value = '';
autoResize(input);
document.getElementById('send-btn').disabled = true;
const u = loadUser();
const msgObj = { id: Date.now(), role: 'user', text, time: new Date().toLocaleTimeString('ru', {hour:'2-digit',minute:'2-digit'}) };
chatStore.push(msgObj);
renderChatMsg(msgObj);
saveChatStore();
if (TG_ENABLED) {
try {
const clientId   = getChatClientId();
const clientName = getFullName(u) || 'Клиент';
const tgText = '💍 *UVYANTRA — сообщение от клиента*\n\n'
+ '👤 *' + clientName + '*\n'
+ '📱 ' + (u.phone || '—') + '\n'
+ '🆔 `' + clientId + '`\n\n'
+ '💬 ' + text + '\n\n'
+ '_Сделайте Reply на это сообщение чтобы клиент получил ответ_';
await fetch('https://api.telegram.org/bot' + TG_CONFIG.botToken + '/sendMessage', {
method: 'POST',
headers: {'Content-Type':'application/json'},
body: JSON.stringify({
chat_id: TG_CONFIG.masterChatId,
text: tgText,
parse_mode: 'Markdown',
parse_mode: 'Markdown'
})
});
updateLastMsgStatus('✓ Доставлено мастеру');
} catch(e) {
updateLastMsgStatus('⚠️ Ошибка отправки');
}
} else {
const demos = [
'Спасибо за обращение! Мастер ответит в рабочие часы пн–сб 10:00–19:00 🕙',
'Сообщение получено. Мастер ответит вам в течение часа. 💍',
'Принято! Срочно — звоните: +7 953 800 00 76'
];
setTimeout(() => {
const r = { id: Date.now(), role: 'master', text: demos[Math.floor(Math.random()*demos.length)], time: new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}) };
chatStore.push(r); renderChatMsg(r); saveChatStore();
}, 1200);
}
document.getElementById('send-btn').disabled = false;
}
function updateLastMsgStatus(s) {
const items = document.querySelectorAll('#chat-messages .msg.user .msg-time');
if (items.length) items[items.length-1].textContent = s;
}
async function pollTgReplies() {
if (!TG_ENABLED) return;
const clientId = getChatClientId();
try {
const res  = await fetch('https://api.telegram.org/bot' + TG_CONFIG.botToken + '/getUpdates?offset=' + (tgLastUpdateId+1) + '&timeout=0');
const data = await res.json();
if (!data.ok || !data.result.length) return;
for (const upd of data.result) {
tgLastUpdateId = upd.update_id;
const msg = upd.message;
if (msg && msg.reply_to_message && msg.text) {
const orig = msg.reply_to_message.text || '';
if (orig.includes(clientId)) {
receiveMasterReply(msg.text);
}
}
}
} catch(e) {}
}
function receiveMasterReply(text) {
if (!text) return;
const r = { id: Date.now(), role: 'master', text, time: new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}) };
chatStore.push(r); renderChatMsg(r); saveChatStore();
showPushBanner('💬 Ответ от мастерской', text.slice(0,80));
}
function renderChatMsg(msg) {
const wrap = document.getElementById('chat-messages');
if (!wrap) return;
const isUser = msg.role === 'user';
const div = document.createElement('div');
div.className = 'msg ' + (isUser ? 'user' : 'bot');
div.dataset.msgId = msg.id;
const masterAvatar = '<div class="msg-avatar" style="background:linear-gradient(135deg,var(--gold-light),var(--gold));padding:6px;"><img src="https://static.tildacdn.com/tild6461-3565-4365-b366-343964653965/svg_1781008987015.svg" style="width:100%;height:100%;object-fit:contain;"></div>';
div.innerHTML = isUser
? '<div><div class="msg-bubble">' + escHtml(msg.text) + '</div><div class="msg-time">' + msg.time + '</div></div>'
: masterAvatar + '<div><div class="msg-bubble">' + escHtml(msg.text) + '</div><div class="msg-time">' + msg.time + '</div></div>';
wrap.appendChild(div);
wrap.scrollTop = wrap.scrollHeight;
}
function renderAllChatMsgs() {
const wrap = document.getElementById('chat-messages');
if (!wrap) return;
const welcome = document.getElementById('chat-welcome-msg')?.closest('.msg');
wrap.innerHTML = '';
if (welcome) wrap.appendChild(welcome);
chatStore.forEach(renderChatMsg);
wrap.scrollTop = wrap.scrollHeight;
}
function initChat() {
loadChatStore();
renderAllChatMsgs();
const wm = document.getElementById('chat-welcome-msg');
if (wm) {
const u = loadUser();
const name = u.firstname ? ', ' + u.firstname : '';
wm.textContent = 'Здравствуйте' + name + '! Напишите вопрос — мастер ответит в ближайшее время. 💍';
}
if (TG_ENABLED) {
if (tgPollTimer) clearInterval(tgPollTimer);
tgPollTimer = setInterval(pollTgReplies, TG_CONFIG.pollInterval);
}
}
function addMessage(text, role) {
const wrap = document.getElementById('chat-messages');
const now = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
const div = document.createElement('div');
div.className = 'msg ' + role;
div.innerHTML = role === 'user'
? `<div><div class="msg-bubble">${escHtml(text)}</div><div class="msg-time">${now}</div></div>`
: `<div class="msg-avatar">A</div><div><div class="msg-bubble">${escHtml(text)}</div><div class="msg-time">${now}</div></div>`;
wrap.appendChild(div);
wrap.scrollTop = wrap.scrollHeight;
return div;
}
function addTyping() {
const wrap = document.getElementById('chat-messages');
const div = document.createElement('div');
div.className = 'msg bot';
div.innerHTML = `<div class="msg-avatar">A</div><div><div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>`;
wrap.appendChild(div);
wrap.scrollTop = wrap.scrollHeight;
return div;
}
function escHtml(t) {
return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}
function autoResize(el) {
el.style.height = 'auto';
el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}
function handleEnter(e) {
if (e.key === 'Enter' && !e.shiftKey) {
e.preventDefault();
sendMessage();
}
}
let authPhone = '';
let resendTimer = null;
function showAuthScreen() {
document.getElementById('auth-screen').classList.add('active');
}
function hideAuthScreen() {
document.getElementById('auth-screen').classList.remove('active');
}
async function authStepRequest() {
const input = document.getElementById('auth-phone-input');
authPhone = input.value.replace(/\D/g, '');
if (authPhone.length < 10) { showToast('Введите номер телефона'); return; }
if (authPhone.startsWith('8')) authPhone = '7' + authPhone.slice(1);
const btn = document.querySelector('#auth-step-phone .btn');
btn.textContent = 'Отправляем...';
btn.disabled = true;
try {
if (!DEMO_MODE) {
await authRequest(authPhone);
}
document.getElementById('auth-step-phone').style.display = 'none';
document.getElementById('auth-step-otp').style.display = 'block';
document.getElementById('auth-phone-display').textContent = '+' + authPhone;
document.getElementById('otp0').focus();
startResendTimer();
if (DEMO_MODE) showToast('Демо: код 1234');
} catch(e) {
showToast('Ошибка отправки SMS');
}
btn.textContent = 'Получить SMS-код';
btn.disabled = false;
}
async function authStepVerify() {
const code = [0,1,2,3].map(i => document.getElementById('otp' + i).value).join('');
if (code.length < 4) { showToast('Введите 4-значный код'); return; }
const btn = document.getElementById('auth-verify-btn');
btn.textContent = 'Проверяем...'; btn.disabled = true;
try {
let token;
if (DEMO_MODE) {
token = 'demo-token-' + Date.now();
} else {
const result = await authVerify(authPhone, code);
token = result.token;
}
setToken(token);
hideAuthScreen();
await loadAppData();
showToast('Добро пожаловать! ✨');
} catch(e) {
showToast('Неверный код. Попробуйте снова.');
[0,1,2,3].forEach(i => { document.getElementById('otp' + i).value = ''; });
document.getElementById('otp0').focus();
}
btn.textContent = 'Войти'; btn.disabled = false;
}
async function authResend() {
document.getElementById('resend-btn').disabled = true;
try {
if (!DEMO_MODE) await authRequest(authPhone);
[0,1,2,3].forEach(i => { document.getElementById('otp' + i).value = ''; });
document.getElementById('otp0').focus();
startResendTimer();
showToast('Код отправлен повторно');
if (DEMO_MODE) showToast('Демо: код 1234');
} catch { showToast('Ошибка. Попробуйте позже.'); }
}
function authBack() {
document.getElementById('auth-step-otp').style.display = 'none';
document.getElementById('auth-step-phone').style.display = 'block';
if (resendTimer) clearInterval(resendTimer);
}
function startResendTimer() {
if (resendTimer) clearInterval(resendTimer);
let sec = 60;
document.getElementById('resend-countdown').textContent = sec;
resendTimer = setInterval(() => {
sec--;
document.getElementById('resend-countdown').textContent = sec;
if (sec <= 0) {
clearInterval(resendTimer);
const btn = document.getElementById('resend-btn');
btn.disabled = false;
btn.textContent = 'Отправить повторно';
}
}, 1000);
}
function otpInput(el, idx) {
el.value = el.value.replace(/[^0-9]/g, '').slice(-1);
if (el.value && idx < 3) {
document.getElementById('otp' + (idx + 1)).focus();
}
if (idx === 3 && el.value) {
setTimeout(authStepVerify, 100);
}
}
function logout() {
if (!confirm('Выйти из аккаунта?')) return;
clearToken();
showAuthScreen();
showToast('Вы вышли из аккаунта');
}
const _origSaveSettings = typeof saveSettings !== 'undefined' ? saveSettings : null;
let firebaseApp = null;
let firebaseMessaging = null;
function initFirebase() {
if (!PUSH_ENABLED) return;
try {
firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
firebaseMessaging = firebase.messaging();
console.log('Firebase инициализирован');
} catch(e) {
console.warn('Firebase init error:', e);
}
}
async function requestPushPermission() {
if (!PUSH_ENABLED || !firebaseMessaging) return null;
try {
const permission = await Notification.requestPermission();
if (permission !== 'granted') {
showToast('Уведомления отключены в браузере');
return null;
}
const token = await firebaseMessaging.getToken({ vapidKey: FIREBASE_CONFIG.vapidKey });
if (token) {
try { localStorage.setItem('uvyantra_fcm_token', token); } catch {}
if (!DEMO_MODE && getToken()) {
await api('POST', '/client/fcm-token', { token }).catch(() => {});
}
console.log('FCM токен получен');
return token;
}
} catch(e) {
console.warn('Push permission error:', e);
}
return null;
}
function setupPushHandlers() {
if (!PUSH_ENABLED || !firebaseMessaging) return;
firebaseMessaging.onMessage((payload) => {
const { title, body } = payload.notification || {};
if (title) {
showPushBanner(title, body || '');
if (payload.data?.orderId) loadAppData();
}
});
}
function showPushBanner(title, body) {
const old = document.getElementById('push-banner');
if (old) old.remove();
const banner = document.createElement('div');
banner.id = 'push-banner';
banner.style.cssText = `
position:fixed;top:16px;left:50%;transform:translateX(-50%);
background:var(--dark-2);border:1px solid rgba(201,168,76,0.35);
border-radius:14px;padding:14px 18px;z-index:999;
max-width:360px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.4);
animation:slideDown 0.3s ease;
`;
banner.innerHTML = `
<div style="display:flex;gap:12px;align-items:flex-start;">
<div style="font-size:22px;flex-shrink:0;">🔔</div>
<div style="flex:1;">
<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px;">${title}</div>
<div style="font-size:12px;color:var(--text-muted);">${body}</div>
</div>
<button onclick="this.parentElement.parentElement.remove()"
style="background:none;border:none;color:var(--text-dim);font-size:18px;cursor:pointer;padding:0;line-height:1;">✕</button>
</div>
`;
document.body.appendChild(banner);
setTimeout(() => banner?.remove(), 5000);
}
const _origAuthVerify = window.authStepVerify;
async function authStepVerify() {
const code = [0,1,2,3].map(i => document.getElementById('otp' + i).value).join('');
if (code.length < 4) { showToast('Введите 4-значный код'); return; }
const btn = document.getElementById('auth-verify-btn');
btn.textContent = 'Проверяем...'; btn.disabled = true;
try {
let token;
if (DEMO_MODE) {
token = 'demo-token-' + Date.now();
} else {
const result = await authVerify(authPhone, code);
token = result.token;
}
setToken(token);
saveConsent();
afterSmsVerified();
setTimeout(() => askPushPermission(), 2000);
} catch(e) {
showToast('Неверный код. Попробуйте снова.');
[0,1,2,3].forEach(i => { document.getElementById('otp' + i).value = ''; });
document.getElementById('otp0').focus();
}
btn.textContent = 'Войти'; btn.disabled = false;
}
function askPushPermission() {
if (!PUSH_ENABLED) return;
if (localStorage.getItem('uvyantra_push_asked')) return;
localStorage.setItem('uvyantra_push_asked', '1');
showPushDialog();
}
function showPushDialog() {
const overlay = document.createElement('div');
overlay.id = 'push-dialog';
overlay.style.cssText = `
position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:400;
display:flex;align-items:flex-end;justify-content:center;
backdrop-filter:blur(4px);
`;
overlay.innerHTML = `
<div style="background:var(--dark-2);border-radius:20px 20px 0 0;
padding:28px 24px 40px;width:100%;max-width:430px;
border-top:1px solid rgba(201,168,76,0.2);">
<div style="text-align:center;margin-bottom:20px;">
<div style="font-size:48px;margin-bottom:12px;">🔔</div>
<div style="font-family:'Cormorant Garamond',serif;font-size:22px;
color:var(--text);margin-bottom:8px;">Включить уведомления</div>
<div style="font-size:13px;color:var(--text-muted);line-height:1.6;">
Сообщим когда заказ будет готов, пришлём бонусы в день рождения
и расскажем об акциях
</div>
</div>
<div style="display:flex;flex-direction:column;gap:10px;">
<button class="btn btn-gold btn-full" onclick="enablePush()">
Включить уведомления
</button>
<button class="btn btn-ghost btn-full" style="font-size:13px;color:var(--text-muted);"
onclick="document.getElementById('push-dialog').remove()">
Позже
</button>
</div>
</div>
`;
document.body.appendChild(overlay);
}
async function enablePush() {
document.getElementById('push-dialog')?.remove();
const token = await requestPushPermission();
if (token) {
showToast('🔔 Уведомления включены!');
updateNotifToggleUI(true);
}
}
function updateNotifToggleUI(on) {
const toggle = el('notif-toggle');
const knob   = el('notif-knob');
if (!toggle || !knob) return;
toggle.style.background = on ? 'var(--gold)' : 'var(--dark-4)';
knob.style.cssText = on
? 'width:18px;height:18px;background:white;border-radius:50%;position:absolute;right:2px;top:2px;transition:right 0.2s;'
: 'width:18px;height:18px;background:white;border-radius:50%;position:absolute;left:2px;top:2px;transition:left 0.2s;';
}
async function toggleNotifications() {
const u = loadUser();
const allOn = u.notif_orders && u.notif_promos && u.notif_bday;
if (!allOn) {
const token = await requestPushPermission();
if (token) {
u.notif_orders = u.notif_promos = u.notif_bday = true;
saveUser(u);
updateNotifToggleUI(true);
showToast('Уведомления включены 🔔');
}
} else {
u.notif_orders = u.notif_promos = u.notif_bday = false;
saveUser(u);
if (!DEMO_MODE && getToken()) {
await api('PATCH', '/client/me', { notifOrders: false, notifPromos: false, notifBday: false }).catch(() => {});
}
updateNotifToggleUI(false);
showToast('Уведомления отключены');
}
}
async function saveSettings() {
const u = loadUser();
u.firstname  = el('s-firstname').value.trim();
u.lastname   = el('s-lastname').value.trim();
u.patronymic = el('s-patronymic').value.trim();
u.phone      = el('s-phone').value.trim();
u.email      = el('s-email').value.trim();
u.birthday   = el('s-birthday').value;
u.gender     = el('s-gender').value;
u.notif_orders = el('t-orders').classList.contains('on');
u.notif_promos = el('t-promos').classList.contains('on');
u.notif_bday   = el('t-bday').classList.contains('on');
saveUser(u);
applyUserToUI(u);
if (!DEMO_MODE && getToken()) {
try {
await api('PATCH', '/client/me', {
firstName:   u.firstname,
lastName:    u.lastname,
patronymic:  u.patronymic,
email:       u.email,
birthday:    u.birthday,
gender:      u.gender,
notifOrders: u.notif_orders,
notifPromos: u.notif_promos,
notifBday:   u.notif_bday
});
} catch(e) {
console.warn('Sync error:', e);
}
}
closeSettingsModal();
showToast('Данные сохранены ✓');
}
const pushStyle = document.createElement('style');
pushStyle.textContent = `
@keyframes slideDown {
from { opacity:0; transform:translateX(-50%) translateY(-20px); }
to   { opacity:1; transform:translateX(-50%) translateY(0); }
}
`;
document.head.appendChild(pushStyle);
initFirebase();
setupPushHandlers();
function triggerLogoUpload() {
document.getElementById('logo-file-input').click();
}
function handleLogoUpload(e) {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = function(ev) {
const img = document.getElementById('logo-img');
const placeholder = document.getElementById('logo-placeholder');
img.src = ev.target.result;
img.style.display = 'block';
placeholder.style.display = 'none';
try { localStorage.setItem('uvyantra_logo', ev.target.result); } catch(err) {}
showToast('Логотип обновлён ✓');
};
reader.readAsDataURL(file);
}
(function() {
try {
const saved = localStorage.getItem('uvyantra_logo');
if (saved) {
const img = document.getElementById('logo-img');
const placeholder = document.getElementById('logo-placeholder');
img.src = saved;
img.style.display = 'block';
placeholder.style.display = 'none';
}
} catch(err) {}
})();
const DEFAULT_USER = {
firstname: 'Елена',
lastname: 'Соколова',
patronymic: '',
phone: '+7 (916) 234-56-78',
email: '',
birthday: '1990-01-15',
gender: 'female',
notif_orders: true,
notif_promos: true,
notif_bday: true
};
function loadUser() {
try {
const saved = localStorage.getItem('uvyantra_user');
return saved ? { ...DEFAULT_USER, ...JSON.parse(saved) } : { ...DEFAULT_USER };
} catch { return { ...DEFAULT_USER }; }
}
function saveUser(data) {
try { localStorage.setItem('uvyantra_user', JSON.stringify(data)); } catch {}
}
function getFullName(u) {
return [u.firstname, u.lastname].filter(Boolean).join(' ') || 'Клиент';
}
function getAvatarLetter(u) {
return (u.firstname || u.lastname || 'К')[0].toUpperCase();
}
function formatBirthdayDisplay(dateStr) {
if (!dateStr) return null;
try {
const d = new Date(dateStr + 'T00:00:00');
const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
return d.getDate() + ' ' + months[d.getMonth()];
} catch { return null; }
}
function applyUserToUI(u) {
const fullName = getFullName(u);
const letter = getAvatarLetter(u);
const bday = formatBirthdayDisplay(u.birthday);
el('profile-name-display').textContent = fullName;
el('profile-phone-display').textContent = u.phone || 'Телефон не указан';
el('profile-avatar-letter').textContent = letter;
if (bday) {
el('profile-bday-display').textContent = '🎂 День рождения: ' + bday;
el('profile-bday-display').style.display = 'inline-flex';
} else {
el('profile-bday-display').style.display = 'none';
}
const h = new Date().getHours();
const g = h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
el('greeting').textContent = g + ', ' + (u.firstname || fullName);
if (u.birthday) {
const today = new Date();
const bd = new Date(u.birthday + 'T00:00:00');
if (today.getDate() === bd.getDate() && today.getMonth() === bd.getMonth()) {
el('birthday-banner').style.display = 'flex';
}
}
}
function el(id) { return document.getElementById(id); }
function openSettings() {
const u = loadUser();
el('s-firstname').value = u.firstname || '';
el('s-lastname').value = u.lastname || '';
el('s-patronymic').value = u.patronymic || '';
el('s-phone').value = u.phone || '';
el('s-email').value = u.email || '';
el('s-birthday').value = u.birthday || '';
el('s-gender').value = u.gender || '';
['orders','promos','bday'].forEach(k => {
const t = el('t-' + k);
const key = 'notif_' + k;
t.classList.toggle('on', u[key] !== false);
});
el('settings-avatar').textContent = getAvatarLetter(u);
el('s-firstname').oninput = el('s-lastname').oninput = function() {
const fn = el('s-firstname').value.trim();
const ln = el('s-lastname').value.trim();
el('settings-avatar').textContent = (fn || ln || 'К')[0].toUpperCase();
};
el('settings-modal').classList.add('active');
}
function closeSettingsModal(e) {
if (!e || e.target === el('settings-modal')) {
el('settings-modal').classList.remove('active');
}
}
function toggleSetting(el) {
el.classList.toggle('on');
}
function saveSettings() {
const u = loadUser();
u.firstname  = el('s-firstname').value.trim();
u.lastname   = el('s-lastname').value.trim();
u.patronymic = el('s-patronymic').value.trim();
u.phone      = el('s-phone').value.trim();
u.email      = el('s-email').value.trim();
u.birthday   = el('s-birthday').value;
u.gender     = el('s-gender').value;
u.notif_orders = el('t-orders').classList.contains('on');
u.notif_promos = el('t-promos').classList.contains('on');
u.notif_bday   = el('t-bday').classList.contains('on');
saveUser(u);
applyUserToUI(u);
closeSettingsModal();
showToast('Данные сохранены ✓');
}
function confirmDeleteData() {
if (confirm('Удалить все ваши данные? Это действие нельзя отменить.')) {
localStorage.removeItem('uvyantra_user');
localStorage.removeItem('uvyantra_logo');
applyUserToUI({ ...DEFAULT_USER });
closeSettingsModal();
showToast('Данные удалены');
}
}
function formatPhone(input) {
const sel = input.selectionStart;
const prevLen = input.value.length;
let digits = input.value.replace(/\D/g, '');
if (digits.startsWith('8')) digits = '7' + digits.slice(1);
if (!digits.startsWith('7') && digits.length > 0) digits = '7' + digits;
digits = digits.slice(0, 11); 
let result = '';
if (digits.length > 0)  result = '+7';
if (digits.length > 1)  result += ' (' + digits.slice(1, 4);
if (digits.length >= 4) result += ') ' + digits.slice(4, 7);
if (digits.length >= 7) result += '-' + digits.slice(7, 9);
if (digits.length >= 9) result += '-' + digits.slice(9, 11);
input.value = result;
const newLen = input.value.length;
const diff = newLen - prevLen;
const newPos = Math.max(0, sel + diff);
try { input.setSelectionRange(newPos, newPos); } catch(e) {}
}
function initPhoneMask(input) {
if (!input.value) {
input.value = '+7 (';
setTimeout(() => input.setSelectionRange(4, 4), 0);
}
}
function toggleNotifications() {
const u = loadUser();
const allOn = u.notif_orders && u.notif_promos && u.notif_bday;
u.notif_orders = u.notif_promos = u.notif_bday = !allOn;
saveUser(u);
const toggle = el('notif-toggle');
const knob = el('notif-knob');
if (!allOn) {
toggle.style.background = 'var(--gold)';
knob.style.right = '2px'; knob.style.left = 'auto';
} else {
toggle.style.background = 'var(--dark-4)';
knob.style.left = '2px'; knob.style.right = 'auto';
}
showToast(allOn ? 'Уведомления отключены' : 'Уведомления включены');
}
function _appInit() {
const u = loadUser();
applyUserToUI(u);
if (!DEMO_MODE && !getToken()) {
if (hasConsent && hasConsent() && !isPinRequired()) {
setToken('local-session-' + Date.now());
return; 
}
setTimeout(() => showAuthScreen(), 100);
return;
}
const allOn = u.notif_orders && u.notif_promos && u.notif_bday;
const toggle = el('notif-toggle');
const knob = el('notif-knob');
if (toggle && !allOn) {
toggle.style.background = 'var(--dark-4)';
if (knob) { knob.style.left = '2px'; knob.style.right = 'auto'; }
}
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', _appInit);
} else {
_appInit();
}
const DOC_CONTENT = {
terms: {
title: 'Пользовательское соглашение',
body: `<b>1. Общие положения</b><br>
Настоящее Соглашение регулирует отношения между ООО "ЮВИЯНТРА" (далее — Компания) и пользователем мобильного приложения UVYANTRA (далее — Приложение).<br><br>
<b>2. Предмет соглашения</b><br>
Компания предоставляет пользователю доступ к функциям Приложения: просмотр статуса заказов, участие в бонусной программе, получение уведомлений, оформление электронных квитанций.<br><br>
<b>3. Права и обязанности пользователя</b><br>
Пользователь обязуется предоставлять достоверные данные, не передавать учётные данные третьим лицам, использовать Приложение в соответствии с законодательством РФ.<br><br>
<b>4. Ответственность</b><br>
Компания не несёт ответственности за перебои в работе Приложения, вызванные действиями третьих лиц или форс-мажорными обстоятельствами.<br><br>
<b>5. Изменения</b><br>
Компания вправе изменять условия Соглашения, уведомив пользователей через Приложение не менее чем за 7 дней.`
},
privacy: {
title: 'Политика конфиденциальности',
body: `<b>Оператор:</b> ООО "ЮВИЯНТРА", ИНН 5406837310<br>
г. Новосибирск, ул. Максима Горького д. 54 офис 315<br><br>
<b>1. Собираемые данные</b><br>
Приложение обрабатывает: ФИО, номер телефона, дату рождения, историю заказов, Push-токен устройства.<br><br>
<b>2. Цели обработки</b><br>
— Идентификация пользователя<br>
— Уведомления о статусе заказов<br>
— Начисление бонусов<br>
— Поздравление с днём рождения<br><br>
<b>3. Основание обработки</b><br>
Обработка осуществляется на основании согласия субъекта персональных данных (ст. 6 Федерального закона № 152-ФЗ).<br><br>
<b>4. Хранение данных</b><br>
Данные хранятся на защищённых серверах на территории РФ. Срок хранения — в течение действия договора и 3 лет после его окончания.<br><br>
<b>5. Права пользователя</b><br>
Вы вправе запросить, изменить или удалить свои данные, обратившись по адресу: info@uvyantra.ru`
},
consent: {
title: 'Согласие на обработку ПД',
body: `Я, субъект персональных данных, в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» даю согласие ООО "ЮВИЯНТРА" (ИНН 5406837310) на обработку следующих персональных данных:<br><br>
— Фамилия, имя, отчество<br>
— Номер мобильного телефона<br>
— Дата рождения<br>
— История обращений и заказов<br>
— Push-токен мобильного устройства<br><br>
<b>Цели обработки:</b> исполнение договора на оказание ювелирных услуг, информирование о статусе заказов, участие в бонусной программе, отправка push-уведомлений.<br><br>
<b>Способы обработки:</b> сбор, запись, систематизация, накопление, хранение, уточнение, использование, передача (при наличии согласия), обезличивание, блокирование, удаление.<br><br>
Согласие действует бессрочно и может быть отозвано путём подачи письменного заявления оператору.<br><br>
<i>Согласие считается предоставленным с момента регистрации в приложении.</i>`
},
bonus: {
title: 'Правила бонусной программы',
body: `<b>1. Участники</b><br>
В бонусной программе участвуют все клиенты, зарегистрированные в приложении UVYANTRA.<br><br>
<b>2. Уровни и начисления</b><br>
🤍 <b>Серебро</b> (от 0 ₽) — 5% от суммы каждого заказа<br>
💛 <b>Золото</b> (от 100 000 ₽) — 7% от суммы заказа<br>
💎 <b>Платина</b> (от 500 000 ₽) — 10% от суммы заказа<br>
👑 <b>VIP</b> (от 1 000 000 ₽) — 15% от суммы заказа<br><br>
<b>3. Условия начисления</b><br>
Бонусы начисляются после получения готового заказа клиентом. Бонусы за день рождения (500 ₽) начисляются автоматически в день рождения клиента.<br><br>
<b>4. Использование бонусов</b><br>
Бонусы применяются при оплате услуг мастерской. Нельзя оплатить бонусами более 50% стоимости заказа.<br><br>
<b>5. Срок действия</b><br>
Бонусы действительны в течение 12 месяцев с момента начисления. Неиспользованные бонусы сгорают.<br><br>
<b>6. Уровень программы</b><br>
Уровень определяется по накопленной сумме всех заказов за всё время. При достижении порога уровень повышается автоматически.`
},
offer: {
title: 'Публичная оферта',
body: `ООО "ЮВИЯНТРА", именуемое в дальнейшем «Исполнитель», публикует настоящую оферту на оказание ювелирных услуг.<br><br>
<b>1. Предмет договора</b><br>
Исполнитель оказывает ювелирные услуги: ремонт, изготовление, чистка, гравировка, закрепка камней и иные работы с ювелирными изделиями.<br><br>
<b>2. Порядок приёма заказа</b><br>
Заказ оформляется в мастерской с выдачей квитанции по форме БО-10ДМ. Клиент несёт ответственность за достоверность информации об изделии.<br><br>
<b>3. Сроки выполнения</b><br>
Сроки указываются в квитанции. Исполнитель вправе продлить срок, уведомив клиента не позднее дня истечения.<br><br>
<b>4. Гарантии</b><br>
Гарантийный срок составляет от 3 до 12 месяцев в зависимости от вида работ и указывается в квитанции.<br><br>
<b>5. Стоимость и оплата</b><br>
Стоимость услуг определяется прейскурантом. Оплата производится при получении заказа наличными или безналичным расчётом.<br><br>
<b>6. Ответственность</b><br>
Исполнитель несёт ответственность за сохранность изделия в период выполнения работ в соответствии с законодательством РФ.`
},
requisites: {
title: 'Реквизиты организации',
body: `<b>Полное наименование:</b><br>Общество с ограниченной ответственностью "ЮВИЯНТРА"<br><br>
<b>Сокращённое наименование:</b> ООО "ЮВИЯНТРА"<br><br>
<b>ИНН:</b> 5406837310<br>
<b>КПП:</b> 540601001<br>
<b>ОГРН:</b> —<br><br>
<b>Юридический адрес:</b><br>г. Новосибирск, ул. Максима Горького д. 54 офис 315<br><br>
<b>Телефон:</b> +7 953 800 00 76<br>
<b>Сайт:</b> www.uvyantra.ru<br>
<b>Email:</b> info@uvyantra.ru<br><br>
<b>Режим работы:</b> пн–сб 10:00–19:00`
}
};
function openDoc(key) {
const doc = DOC_CONTENT[key];
if (!doc) return;
document.getElementById('doc-modal-title').textContent = doc.title;
document.getElementById('doc-modal-body').innerHTML = doc.body;
document.getElementById('doc-modal').classList.add('active');
}
function closeDocModal(e) {
if (!e || e.target === document.getElementById('doc-modal')) {
document.getElementById('doc-modal').classList.remove('active');
}
}
function checkConsentReady() {
const pd    = document.getElementById('consent-pd');
const terms = document.getElementById('consent-terms');
const btn   = document.getElementById('auth-sms-btn');
if (!pd || !terms || !btn) return;
const ready = pd.checked && terms.checked;
btn.disabled = !ready;
btn.style.opacity = ready ? '1' : '0.45';
}
function saveConsent() {
const data = {
pd:    document.getElementById('consent-pd')?.checked    || false,
terms: document.getElementById('consent-terms')?.checked || false,
bonus: document.getElementById('consent-bonus')?.checked || false,
date:  new Date().toISOString()
};
try { localStorage.setItem('uvyantra_consent', JSON.stringify(data)); } catch {}
}
function hasConsent() {
try {
const saved = localStorage.getItem('uvyantra_consent');
if (!saved) return false;
const c = JSON.parse(saved);
return c.pd && c.terms; 
} catch { return false; }
}
let _pinTemp    = '';  
let _pinConfirm = false; 
function getPin()     { try { return localStorage.getItem('uvyantra_pin') || null; } catch { return null; } }
function setPin(pin)  { try { localStorage.setItem('uvyantra_pin', pin); } catch {} }
function clearPin()   { try { localStorage.removeItem('uvyantra_pin'); } catch {} }
function hasPin()     { return !!getPin(); }
function pinInput(el, idx, mode) {
el.value = el.value.replace(/[^0-9]/g, '').slice(-1);
const prefixes = { 'set-pin':'pin', 'confirm-pin':'pinc', 'pin-login':'pinl', 'change':'pinchg' };
const prefix = prefixes[mode];
if (el.value && idx < 3) {
document.getElementById(prefix + (idx+1))?.focus();
}
if (idx === 3 && el.value) {
setTimeout(() => {
const code = [0,1,2,3].map(i => document.getElementById(prefix+i)?.value || '').join('');
if (code.length === 4) handlePinComplete(mode, code);
}, 80);
}
}
function getPinValue(prefix) {
return [0,1,2,3].map(i => document.getElementById(prefix+i)?.value || '').join('');
}
function clearPinInputs(prefix) {
[0,1,2,3].forEach(i => {
const el = document.getElementById(prefix+i);
if (el) el.value = '';
});
document.getElementById(prefix+'0')?.focus();
}
function handlePinComplete(mode, code) {
if (mode === 'set-pin') {
_pinTemp = code;
showPinStep('confirm-pin');
document.getElementById('pinc0')?.focus();
} else if (mode === 'confirm-pin') {
if (code === _pinTemp) {
setPin(code);
_pinTemp = '';
finishAuthWithPin();
} else {
const hint = document.getElementById('pin-confirm-hint');
hint.textContent = '❌ PIN не совпадает, попробуйте снова';
hint.style.color = 'var(--danger)';
clearPinInputs('pinc');
setTimeout(() => { hint.textContent = 'Введите PIN повторно'; hint.style.color = 'var(--text-dim)'; }, 2000);
}
} else if (mode === 'pin-login') {
if (code === getPin()) {
hideAuthScreen();
loadAppData();
showToast('Добро пожаловать! ✨');
} else {
const hint = document.getElementById('pin-login-hint');
hint.textContent = '❌ Неверный PIN';
hint.style.color = 'var(--danger)';
clearPinInputs('pinl');
setTimeout(() => { hint.textContent = ''; }, 2000);
}
} else if (mode === 'change') {
setPin(code);
closePinChange();
updatePinMenuLabel();
showToast('PIN-код обновлён ✓');
}
}
function showPinStep(step) {
['auth-step-phone','auth-step-otp','auth-step-set-pin','auth-step-confirm-pin','auth-step-pin-login']
.forEach(id => {
const el = document.getElementById(id);
if (el) el.style.display = 'none';
});
const target = document.getElementById('auth-step-' + step);
if (target) target.style.display = 'block';
}
function skipPinSetup() {
_pinTemp = '';
finishAuthWithPin();
}
function finishAuthWithPin() {
hideAuthScreen();
loadAppData();
updatePinMenuLabel();
if (hasPin()) showToast('PIN-код установлен 🔐');
else showToast('Добро пожаловать! ✨');
}
function loginWithSmsInstead() {
showPinStep('phone');
const hint = document.getElementById('auth-otp-hint');
_pinRecovery = true;
}
let _pinRecovery = false;
function afterSmsVerified() {
if (!hasPin() || _pinRecovery) {
_pinRecovery = false;
const title = document.querySelector('#auth-step-set-pin .auth-brand-like');
showPinStep('set-pin');
const sub = document.querySelector('#auth-step-set-pin div[style*="font-size:12px"]');
if (sub && _pinRecovery) sub.textContent = 'Установите новый PIN-код';
document.getElementById('pin0')?.focus();
} else {
finishAuthWithPin();
}
}
function openPinChange() {
const title = document.getElementById('pin-change-title');
const sub   = document.getElementById('pin-change-sub');
if (title) title.textContent = hasPin() ? 'Изменить PIN-код' : 'Установить PIN-код';
if (sub)   sub.textContent   = 'Введите новый 4-значный PIN';
clearPinInputs('pinchg');
document.getElementById('pin-change-error').textContent = '';
document.getElementById('pin-change-modal').classList.add('active');
setTimeout(() => document.getElementById('pinchg0')?.focus(), 200);
}
function closePinChange(e) {
if (!e || e.target === document.getElementById('pin-change-modal')) {
document.getElementById('pin-change-modal').classList.remove('active');
}
}
function removePin() {
if (confirm('Удалить PIN-код? Следующий вход потребует SMS.')) {
clearPin();
closePinChange();
updatePinMenuLabel();
showToast('PIN-код удалён');
}
}
function updatePinMenuLabel() {
const title = document.getElementById('pin-menu-title');
const sub   = document.getElementById('pin-menu-sub');
if (title) title.textContent = hasPin() ? 'Изменить PIN-код' : 'Установить PIN-код';
if (sub)   sub.textContent   = hasPin() ? 'PIN активен · быстрый вход' : 'Быстрый вход без SMS';
}
(function() {
setTimeout(updatePinMenuLabel, 300);
})();
function isPinRequired() {
try { return localStorage.getItem('uvyantra_pin_required') !== 'false'; } catch { return true; }
}
function setPinRequired(val) {
try { localStorage.setItem('uvyantra_pin_required', val ? 'true' : 'false'); } catch {}
}
function isBiometricEnabled() {
try { return localStorage.getItem('uvyantra_biometric') === 'true'; } catch { return false; }
}
function setBiometricEnabled(val) {
try { localStorage.setItem('uvyantra_biometric', val ? 'true' : 'false'); } catch {}
}
function togglePinRequired() {
const current = isPinRequired();
if (!current) {
setPinRequired(true);
updateSecurityToggles();
showToast('Защита включена — вход по PIN или SMS');
} else {
if (confirm('Приложение будет открываться без запроса PIN или SMS. Продолжить?')) {
setPinRequired(false);
updateSecurityToggles();
showToast('Защита отключена — приложение открывается сразу');
}
}
}
async function toggleBiometric() {
if (isBiometricEnabled()) {
setBiometricEnabled(false);
updateSecurityToggles();
showToast('Биометрия отключена');
return;
}
if (!window.PublicKeyCredential) {
showToast('Биометрия не поддерживается на этом устройстве');
return;
}
try {
const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
if (!available) {
showToast('Биометрия недоступна — настройте Touch ID в системе');
return;
}
const challenge = new Uint8Array(32);
window.crypto.getRandomValues(challenge);
await navigator.credentials.create({
publicKey: {
challenge,
rp: { name: 'UVYANTRA', id: location.hostname || 'localhost' },
user: {
id: new TextEncoder().encode(loadUser().phone || 'user'),
name: loadUser().phone || 'user',
displayName: getFullName(loadUser()) || 'Клиент'
},
pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
authenticatorSelection: {
authenticatorAttachment: 'platform',
userVerification: 'required'
},
timeout: 30000
}
});
setBiometricEnabled(true);
updateSecurityToggles();
showToast('👆 Биометрия подключена!');
} catch(e) {
if (e.name === 'NotAllowedError') {
showToast('Доступ к биометрии отклонён');
} else {
showToast('Ошибка настройки биометрии');
}
}
}
async function loginWithBiometric() {
try {
const challenge = new Uint8Array(32);
window.crypto.getRandomValues(challenge);
await navigator.credentials.get({
publicKey: {
challenge,
userVerification: 'required',
timeout: 30000
}
});
hideAuthScreen();
loadAppData();
showToast('Добро пожаловать! ✨');
return true;
} catch(e) {
return false;
}
}
function updateSecurityToggles() {
const noPinOn  = !isPinRequired();
const noPinTgl = document.getElementById('no-pin-toggle');
const noPinKnb = document.getElementById('no-pin-knob');
const noPinSub = document.getElementById('no-pin-sub');
if (noPinTgl) noPinTgl.style.background = noPinOn ? 'var(--gold)' : 'var(--dark-4)';
if (noPinKnb) noPinKnb.style.left = noPinOn ? '20px' : '2px';
if (noPinSub) noPinSub.textContent = noPinOn
? 'Приложение открывается сразу'
: 'Защита активна (PIN или SMS)';
const bioOn  = isBiometricEnabled();
const bioTgl = document.getElementById('biometric-toggle');
const bioKnb = document.getElementById('biometric-knob');
const bioSub = document.getElementById('biometric-sub');
if (bioTgl) bioTgl.style.background = bioOn ? 'var(--gold)' : 'var(--dark-4)';
if (bioKnb) bioKnb.style.left = bioOn ? '20px' : '2px';
if (bioSub) bioSub.textContent = bioOn
? 'Touch ID / Face ID активен'
: 'Использовать Touch ID / Face ID';
const bioItem = document.getElementById('biometric-menu-item');
if (bioItem && !window.PublicKeyCredential) {
bioItem.style.display = 'none';
}
updatePinMenuLabel();
}
function showAuthScreen() {
const screen = document.getElementById('auth-screen');
if (!screen) return;
if (isBiometricEnabled() && hasConsent()) {
screen.classList.add('active');
showPinStep('pin-login');
setTimeout(async () => {
const ok = await loginWithBiometric();
if (!ok && hasPin() && isPinRequired()) {
showPinStep('pin-login');
document.getElementById('pinl0')?.focus();
} else if (!ok) {
showPinStep('phone');
}
}, 400);
} else if (hasPin() && isPinRequired() && hasConsent()) {
screen.classList.add('active');
showPinStep('pin-login');
const sub = document.getElementById('pin-login-sub');
if (sub) sub.textContent = 'Введите PIN для входа';
document.getElementById('pinl0')?.focus();
} else if (hasConsent() && !isPinRequired()) {
loadAppData();
return;
} else if (hasConsent()) {
const cb = document.getElementById('consent-block');
if (cb) cb.style.display = 'none';
const btn = document.getElementById('auth-sms-btn');
if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
screen.classList.add('active');
showPinStep('phone');
} else {
screen.classList.add('active');
showPinStep('phone');
}
}
function addBiometricButton() {
if (!isBiometricEnabled()) return;
const loginStep = document.getElementById('auth-step-pin-login');
if (!loginStep || loginStep.querySelector('.bio-btn')) return;
const btn = document.createElement('button');
btn.className = 'btn btn-outline btn-full bio-btn';
btn.style.marginTop = '10px';
btn.innerHTML = '👆 Войти по отпечатку';
btn.onclick = async () => {
const ok = await loginWithBiometric();
if (!ok) showToast('Биометрия не распознана');
};
loginStep.appendChild(btn);
}
(function() {
setTimeout(() => {
updateSecurityToggles();
addBiometricButton();
}, 400);
})();
