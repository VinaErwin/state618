const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwSZMVKwKpnsWP6gzwRaGSlGANhqId91BYd3kbo0gUqhIDCP-Lw5XrWVSZ1ZZWzrl3b/exec';

const backendReady = WEB_APP_URL.startsWith('https://script.google.com/macros/s/');

function setSubmitMessage(text, type = '') {
  const el = document.getElementById('submit-result');
  if (!el) return;
  el.textContent = text;
  el.className = 'submit-result ' + type;
}

(function setupApplicationForm() {
  const form = document.getElementById('survey-form');
  if (!form) return;

  const button = document.getElementById('submit-button');
  const frame = document.getElementById('submit-frame');
  let waitingForResponse = false;

  if (!backendReady) {
    button.disabled = true;
    button.textContent = 'Backend not connected';
    setSubmitMessage('資料後台尚未連線。', 'muted');
    return;
  }

  form.action = WEB_APP_URL;
  form.method = 'POST';
  form.target = 'submit-frame';

  form.addEventListener('submit', () => {
    waitingForResponse = true;
    button.disabled = true;
    button.textContent = 'Submitting...';
    setSubmitMessage('正在送出申請，請稍候…', 'muted');
  });

  frame.addEventListener('load', () => {
    if (!waitingForResponse) return;
    waitingForResponse = false;
    form.reset();
    button.disabled = false;
    button.textContent = 'Submit application';
    setSubmitMessage(
      'Application received. 請使用 Player ID 查詢進度，並耐心等候專人通知。',
      'success'
    );
  });
})();

(function setupStatusLookup() {
  const button = document.getElementById('check-status-button');
  const input = document.getElementById('player-id');
  const result = document.getElementById('live-status-result');

  if (!button || !input || !result) return;

  if (!backendReady) {
    button.disabled = true;
    button.textContent = 'Backend not connected';
    return;
  }

  button.disabled = false;
  button.textContent = 'Check status';

  button.addEventListener('click', async () => {
    const playerId = input.value.trim();
    if (!playerId) {
      renderStatusError('請先輸入 Player ID。');
      return;
    }

    button.disabled = true;
    button.textContent = 'Checking...';

    try {
      const response = await fetch(
        WEB_APP_URL + '?playerId=' + encodeURIComponent(playerId) + '&_=' + Date.now(),
        { method: 'GET', cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      const data = await response.json();
      renderStatus(data);
    } catch (error) {
      console.error('Status lookup failed:', error);
      renderStatusError('查詢連線失敗，請重新整理頁面後再試。');
    } finally {
      button.disabled = false;
      button.textContent = 'Check status';
    }
  });

  function renderStatus(data) {
    if (!data || !data.ok) {
      renderStatusError((data && data.message) || '找不到這筆申請。');
      return;
    }

    result.hidden = false;
    result.innerHTML = [
      row('Player ID', escapeHtml(data.playerId)),
      row('Player', escapeHtml(data.playerName)),
      row('Preferred Alliance', escapeHtml(data.preferredAlliance || '—')),
      row('Status', '<span class="badge ' + statusClass(data.status) + '">' + escapeHtml(statusLabel(data.status)) + '</span>'),
      row('Submitted', escapeHtml(data.submittedAt || '—')),
      row('Last updated', escapeHtml(data.lastUpdated || '—')),
      '<div class="status-note">' + escapeHtml(statusMessage(data.status)) + '</div>'
    ].join('');
  }

  function renderStatusError(message) {
    result.hidden = false;
    result.innerHTML = '<div class="status-error">' + escapeHtml(message) + '</div>';
  }

  function row(label, value) {
    return '<div class="result-row"><span>' + label + '</span><strong>' + value + '</strong></div>';
  }

  function statusClass(status) {
    const map = {
      'Received': 'received',
      'Awaiting Interview': 'interview',
      'Under Review': 'reviewing',
      'Approved': 'approved',
      'Waitlist': 'waitlist',
      'Declined': 'declined'
    };
    return map[status] || 'received';
  }

  function statusLabel(status) {
    const map = {
      'Received': 'Received · 已收到申請',
      'Awaiting Interview': 'Awaiting Interview · 等候面試',
      'Under Review': 'Under Review · 審核中',
      'Approved': 'Approved · 已通過',
      'Waitlist': 'Waitlist · 候補中',
      'Declined': 'Declined · 未通過'
    };
    return map[status] || status || 'Received';
  }

  function statusMessage(status) {
    const map = {
      'Received': '申請已收到，請耐心等候專人聯繫。',
      'Awaiting Interview': '目前正等待指定聯盟管理人員聯繫並安排面試，請耐心等候。',
      'Under Review': '申請正在審核中，請耐心等候專人通知。',
      'Approved': '申請已通過，請留意後續聯繫與移民安排。',
      'Waitlist': '目前列入候補名單，請耐心等候後續通知。',
      'Declined': '本次申請未通過；若有疑問，請聯繫 618 管理人員。'
    };
    return map[status] || '請耐心等候專人通知。';
  }
})();

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
