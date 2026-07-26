/**
 * GroupCast Dashboard — client-side JS
 * Handles: navigation, templates, char count, group selection,
 *          preview, broadcast send, analytics refresh.
 */

// ── Smart Templates ──────────────────────────────────────────────
const TEMPLATES = {
  holiday: `Team, wishing you a joyful holiday season! Our office will be closed from [DATE] to [DATE]. We will resume normal operations on [DATE]. For urgent matters, please contact [CONTACT]. Have a wonderful break and see you in the new year!`,

  meeting: `URGENT: Mandatory team meeting scheduled for [DATE] at [TIME]. Venue: [LOCATION / LINK]. Agenda: [TOPIC 1], [TOPIC 2], [TOPIC 3]. Attendance is compulsory. Please confirm your presence by replying to this message. Do not miss it.`,

  reminder: `Friendly reminder: [TASK / DEADLINE] is due on [DATE]. Please ensure all deliverables are submitted before [TIME]. Reach out to [CONTACT] if you need any assistance or an extension.`,

  announcement: `Important company announcement: [ANNOUNCEMENT TITLE]. We are pleased / required to inform you that [DETAILS]. This will take effect from [DATE]. For questions, please contact [CONTACT / DEPARTMENT].`,

  followup: `Following up on [TOPIC / PREVIOUS MESSAGE]. We have not yet received [REQUIRED ACTION] from your end. Could you please update us by [DATE]? Your prompt response is appreciated.`,

  maintenance: `System Maintenance Notice: Our [SYSTEM / PLATFORM] will undergo scheduled maintenance on [DATE] from [START TIME] to [END TIME]. You may experience temporary downtime. We apologize for the inconvenience and thank you for your patience.`
};

// ── DOM References ───────────────────────────────────────────────
const templateSelect = document.getElementById('templateSelect');
const messageText    = document.getElementById('messageText');
const charCount      = document.getElementById('charCount');
const selectAll      = document.getElementById('selectAll');
const groupList      = document.getElementById('groupList');
const selectedInfo   = document.getElementById('selectedInfo');
const sendBtn        = document.getElementById('sendBtn');
const sendBtnText    = document.getElementById('sendBtnText');
const sendBtnSpinner = document.getElementById('sendBtnSpinner');
const previewBtn     = document.getElementById('previewBtn');
const previewBox     = document.getElementById('previewBox');
const previewContent = document.getElementById('previewContent');
const languageSelect = document.getElementById('languageSelect');
const toast          = document.getElementById('toast');
const refreshGroupsBtn = document.getElementById('refreshGroupsBtn');

// ── Navigation ───────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const section = item.dataset.section;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');

    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`section-${section}`).classList.remove('hidden');

    document.getElementById('pageTitle').textContent =
      section === 'compose' ? 'Compose Broadcast' : 'Analytics';

    if (section === 'analytics') loadStats();
  });
});

// ── Template Picker ──────────────────────────────────────────────
templateSelect.addEventListener('change', () => {
  const val = templateSelect.value;
  if (val && TEMPLATES[val]) {
    messageText.value = TEMPLATES[val];
    updateCharCount();
    closePreview();
  }
});

// ── Character Counter ────────────────────────────────────────────
messageText.addEventListener('input', updateCharCount);
function updateCharCount() {
  const len = messageText.value.length;
  charCount.textContent = `${len.toLocaleString()} / 4,096`;
  charCount.style.color = len > 3800 ? '#f87171' : '';
}

// ── Select All Groups ────────────────────────────────────────────
selectAll.addEventListener('change', () => {
  document.querySelectorAll('.group-checkbox').forEach(cb => {
    cb.checked = selectAll.checked;
  });
  updateSelectedInfo();
});

groupList.addEventListener('change', (e) => {
  if (e.target.classList.contains('group-checkbox')) {
    updateSelectedInfo();
    const allChecked = [...document.querySelectorAll('.group-checkbox')].every(c => c.checked);
    selectAll.checked = allChecked;
  }
});

function updateSelectedInfo() {
  const checked = document.querySelectorAll('.group-checkbox:checked').length;
  selectedInfo.textContent = checked === 0
    ? 'No groups selected'
    : `${checked} group${checked !== 1 ? 's' : ''} selected`;
}

// ── Preview ──────────────────────────────────────────────────────
previewBtn.addEventListener('click', async () => {
  const msg = messageText.value.trim();
  if (!msg) return showToast('Type a message to preview.', 'error');

  previewBtn.textContent = 'Generating…';
  previewBtn.disabled = true;

  try {
    const res  = await fetch('/broadcast', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds: [], message: msg, language: languageSelect.value, previewOnly: true })
    });
    // We do a preview-only call — but since we don't send groups, backend skips sending.
    // Instead let's just call Gemini inline via a preview endpoint.
    // Actually we'll call /api/preview directly:
    const res2 = await fetch('/api/preview', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, language: languageSelect.value })
    });
    const data = await res2.json();
    if (data.ok) {
      previewContent.textContent = data.preview;
      previewBox.style.display   = 'block';
    } else {
      showToast(data.error || 'Preview failed.', 'error');
    }
  } catch (err) {
    showToast('Preview failed — check connection.', 'error');
  } finally {
    previewBtn.textContent = 'Preview AI output';
    previewBtn.disabled    = false;
  }
});

function closePreview() {
  previewBox.style.display = 'none';
  previewContent.textContent = '';
}

// ── Send Broadcast ───────────────────────────────────────────────
sendBtn.addEventListener('click', async () => {
  const groupIds = [...document.querySelectorAll('.group-checkbox:checked')].map(c => c.value);
  const message  = messageText.value.trim();
  const language = languageSelect.value;

  if (!groupIds.length) return showToast('Select at least one group to broadcast.', 'error');
  if (!message)         return showToast('Message cannot be empty.', 'error');

  // Confirm
  const groupCount = groupIds.length;
  if (!confirm(`Send to ${groupCount} group${groupCount > 1 ? 's' : ''}? The AI will format your message first.`)) return;

  setBtnLoading(true);

  try {
    const res  = await fetch('/broadcast', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds, message, language })
    });
    const data = await res.json();

    if (data.ok) {
      showToast(`✅ ${data.message}`, 'success');

      // Show AI preview of what was sent
      if (data.preview) {
        previewContent.textContent = data.preview;
        previewBox.style.display   = 'block';
      }

      // Update header stat
      const headerStat = document.getElementById('headerSentCount');
      if (headerStat) {
        headerStat.textContent = parseInt(headerStat.textContent || '0') + data.sent;
      }

      // Optionally clear form
      messageText.value      = '';
      templateSelect.value   = '';
      languageSelect.value   = 'none';
      document.querySelectorAll('.group-checkbox').forEach(c => c.checked = false);
      selectAll.checked = false;
      updateCharCount();
      updateSelectedInfo();

    } else {
      showToast(`❌ ${data.error}`, 'error');
    }
  } catch (err) {
    showToast('Broadcast failed — check your connection.', 'error');
  } finally {
    setBtnLoading(false);
  }
});

function setBtnLoading(loading) {
  sendBtn.disabled         = loading;
  sendBtnText.style.display = loading ? 'none'   : 'inline';
  sendBtnSpinner.style.display = loading ? 'inline-block' : 'none';
}

// ── Refresh Groups ───────────────────────────────────────────────
refreshGroupsBtn.addEventListener('click', async () => {
  refreshGroupsBtn.textContent = '…';
  try {
    const res  = await fetch('/api/groups');
    const data = await res.json();
    if (data.ok) {
      renderGroups(data.groups);
      showToast(`Groups refreshed — ${data.groups.length} registered.`, 'success');
    }
  } catch (e) {
    showToast('Failed to refresh groups.', 'error');
  } finally {
    refreshGroupsBtn.textContent = '⟳';
  }
});

function renderGroups(groups) {
  const list = document.getElementById('groupList');
  const countEl = document.getElementById('groupCount');

  if (groups.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <p>No groups registered yet.</p>
        <p class="empty-hint">Add the bot to a WhatsApp group and type <code>@bot setup</code>.</p>
      </div>`;
    countEl.textContent = 'No groups yet';
    return;
  }

  countEl.textContent = `${groups.length} group${groups.length !== 1 ? 's' : ''}`;
  list.innerHTML = groups.map(g => `
    <label class="group-item">
      <input type="checkbox" class="group-checkbox" name="groupIds" value="${escHtml(g.groupId)}"/>
      <span class="checkmark"></span>
      <div class="group-info">
        <span class="group-name">${escHtml(g.groupName)}</span>
        <span class="group-meta">ID: ${escHtml(g.groupId.substring(0, 20))}…</span>
      </div>
      <span class="group-badge">Group</span>
    </label>`).join('');

  updateSelectedInfo();
}

// ── Analytics Refresh ────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch('/api/stats');
    const data = await res.json();
    if (!data.ok) return;

    const { stats, recent } = data;
    safeSet('statTotalSent',  stats.totalSent);
    safeSet('statTotalCasts', stats.totalCasts);
    safeSet('headerSentCount', stats.totalSent);

    const total = stats.totalSent + (stats.totalFailed || 0);
    const rate  = total > 0 ? Math.round((stats.totalSent / total) * 100) : 100;
    safeSet('statSuccessRate', rate + '%');

    // Update table
    const tbody = document.getElementById('broadcastTableBody');
    if (tbody && recent.length > 0) {
      tbody.innerHTML = recent.map(b => `
        <tr>
          <td class="msg-preview-cell">
            <span class="msg-preview">${escHtml(b.message.substring(0,60))}${b.message.length > 60 ? '…' : ''}</span>
          </td>
          <td>
            ${b.groupNames.slice(0,2).map(n => `<span class="group-tag">${escHtml(n)}</span>`).join('')}
            ${b.groupNames.length > 2 ? `<span class="group-tag muted">+${b.groupNames.length - 2}</span>` : ''}
          </td>
          <td>
            <span class="delivery-badge sent">${b.sentCount} sent</span>
            ${b.failCount > 0 ? `<span class="delivery-badge failed">${b.failCount} failed</span>` : ''}
          </td>
          <td><span class="lang-badge">${b.language === 'none' ? '—' : escHtml(b.language)}</span></td>
          <td class="time-cell">${new Date(b.sentAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
        </tr>`).join('');
    }
  } catch (e) {
    console.error('Stats load error:', e);
  }
}

// ── Toast ────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

// ── Utilities ────────────────────────────────────────────────────
function safeSet(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Init ─────────────────────────────────────────────────────────
updateCharCount();
updateSelectedInfo();
