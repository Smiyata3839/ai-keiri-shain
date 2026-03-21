/* ========================================
   AI経理社員 - 共通処理
   ======================================== */

/**
 * サイドバーナビゲーションHTML生成
 */
function renderSidebar(activePage) {
  const navItems = [
    { type: 'logo' },
    { type: 'divider' },
    { section: 'メイン' },
    { label: 'チャット', icon: '💬', href: 'chat.html', id: 'chat' },
    { type: 'divider' },
    { section: '受発注' },
    { label: '請求書発行', icon: '📝', href: 'invoice-new.html', id: 'invoice-new', sub: true },
    { label: '請求書一覧', icon: '📋', href: 'invoice-list.html', id: 'invoice-list', sub: true },
    { label: '売掛管理', icon: '💰', href: 'receivable.html', id: 'receivable', sub: true },
    { type: 'divider' },
    { section: '会計' },
    { label: '銀行明細取込', icon: '🏦', href: 'bank-import.html', id: 'bank-import', sub: true },
    { label: '仕訳一覧', icon: '📒', href: 'journal.html', id: 'journal', sub: true },
    { label: '総勘定元帳', icon: '📖', href: 'ledger.html', id: 'ledger', sub: true },
    { label: '残高試算表', icon: '📊', href: 'trial-balance.html', id: 'trial-balance', sub: true },
    { label: '貸借対照表', icon: '📈', href: 'balance-sheet.html', id: 'balance-sheet', sub: true },
    { label: '損益計算書', icon: '📉', href: 'profit-loss.html', id: 'profit-loss', sub: true },
    { type: 'divider' },
    { section: '経費' },
    { label: '領収書アップロード', icon: '🧾', href: 'receipt-upload.html', id: 'receipt-upload', sub: true },
    { type: 'divider' },
    { section: '設定' },
    { label: '顧客管理', icon: '👥', href: 'customers.html', id: 'customers', sub: true },
    { label: '自社情報', icon: '🏢', href: 'setup.html', id: 'setup', sub: true },
  ];

  let html = '';

  navItems.forEach(item => {
    if (item.type === 'logo') {
      html += `
        <div class="sidebar-logo">
          <div class="logo-icon">🤖</div>
          <span>AI経理社員</span>
        </div>`;
    } else if (item.type === 'divider') {
      html += '<div class="nav-divider"></div>';
    } else if (item.section) {
      html += `<div class="nav-section">${item.section}</div>`;
    } else {
      const isActive = activePage === item.id ? ' active' : '';
      const subClass = item.sub ? ' nav-sub-item' : '';
      html += `
        <a href="${item.href}" class="nav-item${subClass}${isActive}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>`;
    }
  });

  return html;
}

/**
 * ヘッダーHTML生成
 */
function renderHeader(title) {
  return `
    <button class="hamburger" onclick="toggleSidebar()" aria-label="メニュー">☰</button>
    <h1 class="header-title">${title}</h1>
    <div class="header-right">
      <div class="header-user">
        <span>田中 太郎</span>
        <div class="header-avatar">田</div>
      </div>
    </div>`;
}

/**
 * 共通レイアウト初期化
 * @param {string} pageId - 現在のページID（サイドバーのハイライト用）
 * @param {string} pageTitle - ヘッダーに表示するタイトル
 */
function initLayout(pageId, pageTitle) {
  // サイドバー生成
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML = renderSidebar(pageId);
  }

  // ヘッダー生成
  const header = document.getElementById('header');
  if (header) {
    header.innerHTML = renderHeader(pageTitle);
  }

  // サイドバーオーバーレイ生成
  if (!document.querySelector('.sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
  }
}

/**
 * サイドバー開閉（モバイル）
 */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

/**
 * 金額フォーマット（¥1,234,567）
 */
function formatCurrency(amount) {
  return '¥' + amount.toLocaleString('ja-JP');
}

/**
 * 日付フォーマット（YYYY-MM-DD → YYYY年MM月DD日）
 */
function formatDate(dateStr) {
  const parts = dateStr.split('-');
  return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
}

/**
 * 日付フォーマット（短縮：MM/DD）
 */
function formatDateShort(dateStr) {
  const parts = dateStr.split('-');
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

/**
 * ステータスバッジHTML生成
 */
function getStatusBadge(status) {
  const statusMap = {
    'paid':    { label: '入金確認済み', class: 'badge-green' },
    'pending': { label: '入金待ち', class: 'badge-blue' },
    'overdue': { label: '期日超過', class: 'badge-red' },
    'issued':  { label: '発行済み', class: 'badge-gray' },
    'matched': { label: '消込完了', class: 'badge-green' },
    'unmatched': { label: '未マッチ', class: 'badge-orange' },
    'partial': { label: '一部入金', class: 'badge-orange' },
  };

  const s = statusMap[status] || { label: status, class: 'badge-gray' };
  return `<span class="badge ${s.class}">${s.label}</span>`;
}

/**
 * 発生源アイコン取得
 */
function getSourceIcon(source) {
  const sourceMap = {
    'invoice': '📄',
    'bank':    '🏦',
    'receipt': '🧾',
    'manual':  '✏️',
  };
  return sourceMap[source] || '📄';
}

/**
 * テーブル検索フィルタ
 */
function filterTable(tableId, searchValue, columnIndex) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr');
  const query = searchValue.toLowerCase();

  rows.forEach(row => {
    const cell = row.cells[columnIndex];
    if (cell) {
      const text = cell.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    }
  });
}

/**
 * タブ切り替え
 */
function switchTab(tabGroup, activeTab) {
  // タブUIの切り替え
  document.querySelectorAll(`[data-tab-group="${tabGroup}"]`).forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === activeTab);
  });

  // コンテンツの切り替え
  document.querySelectorAll(`[data-tab-content="${tabGroup}"]`).forEach(content => {
    content.style.display = content.dataset.tabId === activeTab ? '' : 'none';
  });
}

/**
 * 簡易トースト通知
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 14px 24px;
    border-radius: 8px;
    color: white;
    font-size: 0.9rem;
    font-family: 'Noto Sans JP', sans-serif;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;

  const colors = {
    success: '#16a34a',
    error: '#dc2626',
    info: '#2563eb',
    warning: '#f59e0b',
  };

  toast.style.background = colors[type] || colors.success;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// スライドインアニメーション用CSS追加
(function() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
})();
