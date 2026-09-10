/**
 * js/cafe.js
 * 소담터 알리미 - 카페 상태 관리, 테마 토글, 텔레그램 연동 및 관리자 인증
 */

// 1. 기본 상수 및 하드코딩된 초기 PIN 설정
const DEFAULT_ADMIN_PIN = '00000000';
const DEFAULT_MASTER_PIN = '316497';

const DEFAULT_TELEGRAM_BOT_TOKEN = '';
const DEFAULT_TELEGRAM_CHAT_ID = '';

// 저장소 키 버전 관리
const KEY_ADMIN_PIN = 'sodam_admin_pin_v2';
const KEY_MASTER_PIN = 'sodam_master_pin_v2';

// 2. PIN 및 설정 저장소 제어 함수
function getAdminPin() {
  return localStorage.getItem(KEY_ADMIN_PIN) || DEFAULT_ADMIN_PIN;
}

function getMasterPin() {
  return localStorage.getItem(KEY_MASTER_PIN) || DEFAULT_MASTER_PIN;
}

function getTelegramConfig() {
  return {
    botToken: localStorage.getItem('sodam_tele_token') || DEFAULT_TELEGRAM_BOT_TOKEN,
    chatId: localStorage.getItem('sodam_tele_chatid') || DEFAULT_TELEGRAM_CHAT_ID
  };
}

// 3. 모달 공통 제어 함수
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = '';
    }
  }
}

function closeOnBackdrop(event, modalId) {
  if (event.target.id === modalId) {
    closeModal(modalId);
  }
}

// 비밀번호 보이기/숨기기 토글
function togglePinVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// 4. 테마 제어 (다크 모드 / 라이트 모드)
function initTheme() {
  const savedTheme = localStorage.getItem('sodam_theme') || 'light';
  applyTheme(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  localStorage.setItem('sodam_theme', newTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  const text = document.getElementById('themeText');
  if (theme === 'dark') {
    if (icon) icon.textContent = '☀️';
    if (text) text.textContent = '라이트';
  } else {
    if (icon) icon.textContent = '🌙';
    if (text) text.textContent = '다크';
  }
}

// 5. 카페 상태 로직
const STATUS_DATA = {
  available: {
    badgeClass: 'badge-green',
    badgeText: '주문 가능',
    desc: '따뜻하고 시원한 커피로 힐링하세요!',
    coffeeHeight: '85',
    steam: true
  },
  busy: {
    badgeClass: 'badge-yellow',
    badgeText: '혼잡 / 대기 발생',
    desc: '현재 주문이 밀려있습니다. 여유를 가지고 방문해주세요!',
    coffeeHeight: '65',
    steam: true
  },
  preparing: {
    badgeClass: 'badge-orange',
    badgeText: '재료 준비중',
    desc: '원두 및 재료를 준비하고 있습니다. 잠시만 기다려주세요!',
    coffeeHeight: '30',
    steam: false
  },
  closed: {
    badgeClass: 'badge-red',
    badgeText: '영업 마감',
    desc: '오늘 영업이 마감되었습니다. 내일 10시에 만나요!',
    coffeeHeight: '0',
    steam: false
  }
};

function updateButtonsUI(activeMode) {
  const allBtns = document.querySelectorAll('.status-opt-btn');
  allBtns.forEach(btn => {
    btn.classList.remove('active');
    btn.style.border = '1px solid var(--border-color)';
    btn.style.boxShadow = 'none';
  });

  const selectedBtn = document.getElementById(`opt-${activeMode}`);
  if (selectedBtn) {
    selectedBtn.classList.add('active');
    selectedBtn.style.border = '2px solid var(--kiost-accent)';
    selectedBtn.style.boxShadow = '0 0 8px rgba(0, 150, 255, 0.4)';
  }
}

function refreshCafeStatus() {
  const adminMode = localStorage.getItem('sodam_admin_mode') || 'auto';
  updateButtonsUI(adminMode);

  if (adminMode !== 'auto' && STATUS_DATA[adminMode]) {
    renderStatus(adminMode, localStorage.getItem('sodam_custom_notice') || STATUS_DATA[adminMode].desc);
    return;
  }

  // 자동 시간표 모드 (평일 10:00 ~ 15:30)
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeVal = hours * 60 + minutes;

  const openTime = 10 * 60;
  const closeTime = 15 * 60 + 30;

  let autoStatus = 'closed';
  if (day >= 1 && day <= 5) {
    if (currentTimeVal >= openTime && currentTimeVal < closeTime) {
      autoStatus = 'available';
    }
  }

  const customNotice = localStorage.getItem('sodam_custom_notice');
  renderStatus(autoStatus, customNotice || STATUS_DATA[autoStatus].desc);
}

function renderStatus(statusKey, descText) {
  const data = STATUS_DATA[statusKey] || STATUS_DATA.closed;
  const badge = document.getElementById('stockBadge');
  const badgeText = document.getElementById('stockBadgeText');
  const desc = document.getElementById('statusDescText');
  const coffeeFill = document.getElementById('coffeeFill');
  const steam1 = document.getElementById('steam1');
  const steam2 = document.getElementById('steam2');

  if (badge) {
    badge.className = `badge-pill ${data.badgeClass}`;
  }
  if (badgeText) badgeText.textContent = data.badgeText;
  if (desc) desc.textContent = descText || data.desc;

  if (coffeeFill) coffeeFill.setAttribute('height', data.coffeeHeight);
  if (steam1) steam1.style.display = data.steam ? 'block' : 'none';
  if (steam2) steam2.style.display = data.steam ? 'block' : 'none';
}

// 6. 관리자 인증 & 권한 제어
function openAdminModal() {
  const input = document.getElementById('adminPinInput');
  const errMsg = document.getElementById('pinErrorMsg');
  if (input) input.value = '';
  if (errMsg) errMsg.style.display = 'none';
  openModal('adminAuthModal');
}

function checkAdminPin() {
  const input = document.getElementById('adminPinInput');
  const errMsg = document.getElementById('pinErrorMsg');
  const enteredPin = input.value.trim();

  if (enteredPin === getAdminPin()) {
    if (errMsg) errMsg.style.display = 'none';
    closeModal('adminAuthModal');

    const noticeInput = document.getElementById('adminNoticeInput');
    if (noticeInput) noticeInput.value = localStorage.getItem('sodam_custom_notice') || '';

    const currentMode = localStorage.getItem('sodam_admin_mode') || 'auto';
    updateButtonsUI(currentMode);

    openModal('adminModal');
  } else {
    if (errMsg) errMsg.style.display = 'block';
    input.focus();
  }
}

function changeAdminPin() {
  const newPinInput = document.getElementById('newPinInput');
  const newPin = newPinInput.value.trim();

  if (newPin.length < 4) {
    alert('비밀번호는 4자리 이상 입력해 주세요.');
    return;
  }

  localStorage.setItem(KEY_ADMIN_PIN, newPin);
  newPinInput.value = '';
  alert('관리자 비밀번호가 변경되었습니다.');
}

// 상태 선택 함수 (실행 즉시 UI 변경 및 알림 피드백)
function selectAdminStatus(statusKey) {
  try {
    localStorage.setItem('sodam_admin_mode', statusKey);
    updateButtonsUI(statusKey);
    refreshCafeStatus();

    const notice = localStorage.getItem('sodam_custom_notice') || '';
    sendTelegramCafeStatus(statusKey, notice);
  } catch (err) {
    console.error('상태 선택 처리 중 오류:', err);
    alert('상태 변경 중 오류가 발생했습니다: ' + err.message);
  }
}

function saveNoticeOnly() {
  const noticeInput = document.getElementById('adminNoticeInput');
  const val = noticeInput ? noticeInput.value.trim() : '';
  localStorage.setItem('sodam_custom_notice', val);
  refreshCafeStatus();

  const currentMode = localStorage.getItem('sodam_admin_mode') || 'auto';
  sendTelegramCafeStatus(currentMode, val);
  alert('한 줄 공지가 저장되었습니다.');
}

// 7. 마스터 관리자 인증 및 텔레그램 연동 설정
function openMasterAuthModal() {
  const input = document.getElementById('masterPinInput');
  const errMsg = document.getElementById('masterPinErrorMsg');
  if (input) input.value = '';
  if (errMsg) errMsg.style.display = 'none';
  openModal('masterAuthModal');
}

function checkMasterPin() {
  const input = document.getElementById('masterPinInput');
  const errMsg = document.getElementById('masterPinErrorMsg');
  const enteredPin = input.value.trim();

  if (enteredPin === getMasterPin()) {
    if (errMsg) errMsg.style.display = 'none';
    closeModal('masterAuthModal');

    const conf = getTelegramConfig();
    const tokenInput = document.getElementById('teleBotTokenInput');
    const chatIdInput = document.getElementById('teleChatIdInput');
    if (tokenInput) tokenInput.value = conf.botToken;
    if (chatIdInput) chatIdInput.value = conf.chatId;

    openModal('masterConfigModal');
  } else {
    if (errMsg) errMsg.style.display = 'block';
    input.focus();
  }
}

function changeMasterPin() {
  const input = document.getElementById('newMasterPinInput');
  const newPin = input.value.trim();

  if (newPin.length < 4) {
    alert('마스터 PIN은 최소 4자리 이상 입력해 주세요.');
    return;
  }

  localStorage.setItem(KEY_MASTER_PIN, newPin);
  input.value = '';
  alert('최고 관리자 PIN이 성공적으로 변경되었습니다.');
}

function saveTelegramConfig() {
  const tokenInput = document.getElementById('teleBotTokenInput');
  const chatIdInput = document.getElementById('teleChatIdInput');

  const botToken = tokenInput ? tokenInput.value.trim() : '';
  const chatId = chatIdInput ? chatIdInput.value.trim() : '';

  localStorage.setItem('sodam_tele_token', botToken);
  localStorage.setItem('sodam_tele_chatid', chatId);

  alert('텔레그램 봇 연동 설정이 저장되었습니다.');
  closeModal('masterConfigModal');
}

function resetTelegramConfigDefault() {
  if (confirm('텔레그램 설정을 기본값으로 복원하시겠습니까?')) {
    localStorage.removeItem('sodam_tele_token');
    localStorage.removeItem('sodam_tele_chatid');

    const conf = getTelegramConfig();
    const tokenInput = document.getElementById('teleBotTokenInput');
    const chatIdInput = document.getElementById('teleChatIdInput');
    if (tokenInput) tokenInput.value = conf.botToken;
    if (chatIdInput) chatIdInput.value = conf.chatId;

    alert('기본값으로 복원되었습니다.');
  }
}

// 8. 텔레그램 메시지 발송 기능
function sendTelegramCafeStatus(statusKey, noticeText) {
  try {
    const conf = getTelegramConfig();
    if (!conf.botToken || !conf.chatId || conf.botToken.trim() === '' || conf.chatId.trim() === '') {
      return;
    }

    const statusLabelMap = {
      available: '🟢 주문 가능 (여유)',
      busy: '🟡 혼잡 / 대기 발생',
      preparing: '🟠 재료 준비중',
      closed: '🔴 영업 마감',
      auto: '🔄 자동 시간표 모드 운영 중'
    };

    const statusName = statusLabelMap[statusKey] || '상태 알 수 없음';
    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    let text = `[KIOST 소담터 알리미] ☕\n\n`;
    text += `⏰ 현재 상태: ${statusName}\n`;
    text += `🕒 갱신 시각: ${timeStr}\n`;
    if (noticeText) {
      text += `📢 전달 사항: ${noticeText}\n`;
    }

    const endpoint = `https://api.telegram.org/bot${conf.botToken}/sendMessage`;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: conf.chatId,
        text: text
      })
    }).catch(err => console.warn('Telegram notification failed:', err));
  } catch (e) {
    console.warn('Telegram send failed safely:', e);
  }
}

// 9. 페이지 로드 초기화
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  refreshCafeStatus();
  setInterval(refreshCafeStatus, 60000);
});