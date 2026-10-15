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

  button.addEventListener('click', () => {
    const playerId = input.value.trim();
    if (!playerId) {
      renderStatusError('請先輸入 Player ID。');
      return;
    }

    button.disabled = true;
    button.textContent = 'Checking...';

    const callbackName = '__state618StatusCallback';
    const oldScript = document.getElementById('status-jsonp');
    if (oldScript) oldScript.remove();

    window[callbackName] = (data) => {
      button.disabled = false;
      button.textContent = 'Check status';
      renderStatus(data);
      delete window[callbackName];
      const script = document.getElementById('status-jsonp');
      if (script) script.remove();
    };

    const script = document.createElement('script');
    script.id = 'status-jsonp';
    script.src = WEB_APP_URL
      + '?playerId=' + encodeURIComponent(playerId)
      + '&callback=' + callbackName
      + '&_=' + Date.now();
    script.onerror = () => {
      button.disabled = false;
      button.textContent = 'Check status';
      renderStatusError('目前無法查詢，請稍後再試。');
    };
    document.body.appendChild(script);
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
      row('Status', '<span class="badge ' + statusClass(data.status) + '">' + escapeHtml(data.status) + '</span>'),
      row('Submitted', escapeHtml(data.submittedAt || '—')),
      row('Last updated', escapeHtml(data.lastUpdated || '—'))
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
})();

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
