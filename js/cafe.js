// 1. 테마 토글 (라이트 / 다크)
function toggleTheme() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.body.removeAttribute('data-theme');
    document.getElementById('themeIcon').innerText = '🌙';
    document.getElementById('themeText').innerText = '다크';
    localStorage.setItem('sodam-theme', 'light');
  } else {
    document.body.setAttribute('data-theme', 'dark');
    document.getElementById('themeIcon').innerText = '☀️';
    document.getElementById('themeText').innerText = '라이트';
    localStorage.setItem('sodam-theme', 'dark');
  }
}

// 저장된 테마 적용
if (localStorage.getItem('sodam-theme') === 'dark' ||
  (!localStorage.getItem('sodam-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.body.setAttribute('data-theme', 'dark');
  const icon = document.getElementById('themeIcon');
  const text = document.getElementById('themeText');
  if (icon) icon.innerText = '☀️';
  if (text) text.innerText = '라이트';
}

// 2. 모달 제어
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function closeOnBackdrop(e, id) {
  if (e.target.id === id) closeModal(id);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  }
});

// 3. 소담터 카페 상태 및 관리자 로직
let selectedStatusTemp = localStorage.getItem('sodam-admin-status') || 'auto';

function togglePinVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btnEl.innerText = '🙈';
  } else {
    input.type = 'password';
    btnEl.innerText = '👁️';
  }
}

function getAdminPin() {
  return localStorage.getItem('sodam-admin-pin') || '1234';
}

function openAdminModal() {
  const pinInput = document.getElementById('adminPinInput');
  pinInput.value = '';
  pinInput.type = 'password';
  pinInput.style.borderColor = 'var(--border-color)';
  document.getElementById('pinErrorMsg').style.display = 'none';
  openModal('adminAuthModal');
  setTimeout(() => pinInput.focus(), 250);
}

function checkAdminPin() {
  const inputPin = document.getElementById('adminPinInput').value.trim();
  const currentPin = getAdminPin();

  if (inputPin === currentPin) {
    closeModal('adminAuthModal');
    selectedStatusTemp = localStorage.getItem('sodam-admin-status') || 'auto';
    document.getElementById('adminNoticeInput').value = localStorage.getItem('sodam-admin-notice') || '';
    document.getElementById('newPinInput').value = '';
    document.getElementById('newPinInput').type = 'password';
    document.getElementById('currentPinDisplay').innerText = `현재: ${currentPin}`;
    updateStatusBtnUI();
    setTimeout(() => openModal('adminModal'), 180);
  } else {
    const errorEl = document.getElementById('pinErrorMsg');
    errorEl.innerText = '비밀번호가 일치하지 않습니다. 다시 입력해 주세요.';
    errorEl.style.display = 'block';
    const inputEl = document.getElementById('adminPinInput');
    inputEl.style.borderColor = '#EF4444';
    inputEl.value = '';
    inputEl.focus();
  }
}

function changeAdminPin() {
  const newPin = document.getElementById('newPinInput').value.trim();
  if (!newPin || newPin.length < 4) {
    alert('비밀번호는 최소 4자리 이상으로 입력해 주세요.');
    return;
  }
  localStorage.setItem('sodam-admin-pin', newPin);
  document.getElementById('currentPinDisplay').innerText = `현재: ${newPin}`;
  alert(`🔐 관리자 비밀번호가 [ ${newPin} ] (으)로 변경되었습니다!`);
  document.getElementById('newPinInput').value = '';
}

function saveNoticeOnly() {
  const notice = document.getElementById('adminNoticeInput').value.trim();
  localStorage.setItem('sodam-admin-notice', notice);
  refreshCafeStatus();
  alert('📢 알림 공지 문구가 메인 화면에 즉시 반영되었습니다.');
}

async function selectAdminStatus(status) {
  selectedStatusTemp = status;
  updateStatusBtnUI();
  localStorage.setItem('sodam-admin-status', status);
  const notice = document.getElementById('adminNoticeInput').value.trim();
  localStorage.setItem('sodam-admin-notice', notice);
  refreshCafeStatus();

  let label = '🟢 주문 가능 (여유)';
  if (status === 'busy') label = '🟡 혼잡 / 대기 발생';
  else if (status === 'preparing') label = '🟠 재료 준비중';
  else if (status === 'closed') label = '🔴 금일 영업 마감';
  else if (status === 'auto') label = '🔄 자동 시간표 모드 (10:00~15:30 정상 운영)';

  await sendTelegramAlert(label, notice);
}

function updateStatusBtnUI() {
  document.querySelectorAll('.status-opt-btn').forEach(btn => btn.classList.remove('selected'));
  const activeBtn = document.getElementById(`opt-${selectedStatusTemp}`);
  if (activeBtn) activeBtn.classList.add('selected');
}

// 4. 텔레그램 연동
const DEFAULT_BOT_TOKEN = "8965055722:AAGxvP5K8paXcFI5ZYS3PH7w8Ny0LR0AOfc";
const DEFAULT_CHAT_ID = "-1004310072968";

function getMasterPin() {
  return localStorage.getItem('sodam-master-pin') || '9999';
}

function openMasterAuthModal() {
  const pinInput = document.getElementById('masterPinInput');
  pinInput.value = '';
  pinInput.type = 'password';
  pinInput.style.borderColor = 'var(--border-color)';
  document.getElementById('masterPinErrorMsg').style.display = 'none';
  openModal('masterAuthModal');
  setTimeout(() => pinInput.focus(), 250);
}

function checkMasterPin() {
  const inputPin = document.getElementById('masterPinInput').value.trim();
  if (inputPin === getMasterPin()) {
    closeModal('masterAuthModal');
    document.getElementById('teleBotTokenInput').value = localStorage.getItem('sodam-tele-token') || DEFAULT_BOT_TOKEN;
    document.getElementById('teleChatIdInput').value = localStorage.getItem('sodam-tele-chatid') || DEFAULT_CHAT_ID;
    document.getElementById('newMasterPinInput').value = '';
    document.getElementById('newMasterPinInput').type = 'password';
    setTimeout(() => openModal('masterConfigModal'), 180);
  } else {
    const errorEl = document.getElementById('masterPinErrorMsg');
    errorEl.innerText = '마스터 비밀번호가 일치하지 않습니다.';
    errorEl.style.display = 'block';
    const inputEl = document.getElementById('masterPinInput');
    inputEl.style.borderColor = '#EF4444';
    inputEl.value = '';
    inputEl.focus();
  }
}

function changeMasterPin() {
  const newPin = document.getElementById('newMasterPinInput').value.trim();
  if (!newPin || newPin.length < 4) {
    alert('마스터 비밀번호는 최소 4자리 이상으로 설정해 주세요.');
    return;
  }
  localStorage.setItem('sodam-master-pin', newPin);
  alert(`🔑 최고 관리자 마스터 PIN이 [ ${newPin} ] (으)로 변경되었습니다!`);
  document.getElementById('newMasterPinInput').value = '';
}

function resetTelegramConfigDefault() {
  if (confirm('텔레그램 봇 토큰과 채널 ID를 KIOST 초기 기본값으로 복원하시겠습니까?')) {
    document.getElementById('teleBotTokenInput').value = DEFAULT_BOT_TOKEN;
    document.getElementById('teleChatIdInput').value = DEFAULT_CHAT_ID;
    localStorage.removeItem('sodam-tele-token');
    localStorage.removeItem('sodam-tele-chatid');
    alert('🔄 텔레그램 설정이 초기 기본값으로 복원되었습니다.');
  }
}

function saveTelegramConfig() {
  const token = document.getElementById('teleBotTokenInput').value.trim() || DEFAULT_BOT_TOKEN;
  const chatId = document.getElementById('teleChatIdInput').value.trim() || DEFAULT_CHAT_ID;
  localStorage.setItem('sodam-tele-token', token);
  localStorage.setItem('sodam-tele-chatid', chatId);
  alert('✅ 텔레그램 봇 연동 정보가 안전하게 저장되었습니다!');
  closeModal('masterConfigModal');
}

async function sendTelegramAlert(statusText, noticeText) {
  const token = localStorage.getItem('sodam-tele-token') || DEFAULT_BOT_TOKEN;
  const chatId = localStorage.getItem('sodam-tele-chatid') || DEFAULT_CHAT_ID;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let msg = `☕ [KIOST 소담터 카페 상태 알림]\n⏰ 갱신시각: ${timeStr}\n\n📌 상태: ${statusText}\n`;
  if (noticeText) msg += `📢 공지: ${noticeText}\n`;
  msg += `\n🔗 https://sayaki4444.github.io/sodam-cafe/`;

  const directUrl = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(msg)}`;
  let sentSuccess = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(directUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data.ok) sentSuccess = true;
  } catch (e) {
    console.log('사내망 직통 연결 실패, 프록시 우회 릴레이 전환...');
  }

  if (!sentSuccess) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
      const proxyRes = await fetch(proxyUrl);
      const proxyData = await proxyRes.json();
      if (proxyData.ok) sentSuccess = true;
    } catch (err) {
      console.error('우회 릴레이 실패:', err);
    }
  }

  if (sentSuccess) {
    alert(`✅ 상태가 [ ${statusText} ] (으)로 변경되었습니다!\n텔레그램 채널로 실시간 알림이 자동 전송되었습니다.`);
  } else {
    alert(`⚠️ 텔레그램 전송 실패\n메인 화면 상태는 정상적으로 변경되었습니다.`);
  }
}

function refreshCafeStatus() {
  const badge = document.getElementById('stockBadge');
  const badgeText = document.getElementById('stockBadgeText');
  const descText = document.getElementById('statusDescText');
  const fillRect = document.getElementById('coffeeFill');
  const steam1 = document.getElementById('steam1');
  const steam2 = document.getElementById('steam2');

  if (!badge) return;
  badge.className = 'badge-pill';

  const statusMode = localStorage.getItem('sodam-admin-status') || 'auto';
  const customNotice = localStorage.getItem('sodam-admin-notice');

  if (statusMode === 'available') {
    badge.classList.add('badge-green');
    badgeText.innerText = '주문 가능 (여유)';
    descText.innerText = customNotice || '따뜻하고 시원한 커피로 힐링하세요! (관리자 수동 설정)';
    fillRect.setAttribute('y', '60');
    steam1.style.display = 'block';
    steam2.style.display = 'block';
  } else if (statusMode === 'busy') {
    badge.classList.add('badge-yellow');
    badgeText.innerText = '혼잡 (대기 발생)';
    descText.innerText = customNotice || '현재 주문이 밀려 대기 시간이 발생하고 있습니다.';
    fillRect.setAttribute('y', '50');
    steam1.style.display = 'block';
    steam2.style.display = 'block';
  } else if (statusMode === 'preparing') {
    badge.classList.add('badge-yellow');
    badgeText.innerText = '재료 준비중';
    descText.innerText = customNotice || '원두 교체 및 재료 준비 중입니다. 잠시 후 찾아주세요.';
    fillRect.setAttribute('y', '95');
    steam1.style.display = 'none';
    steam2.style.display = 'none';
  } else if (statusMode === 'closed') {
    badge.classList.add('badge-red');
    badgeText.innerText = '금일 영업 마감';
    descText.innerText = customNotice || '오늘 준비된 재료가 모두 소진되었습니다. 내일 만나요!';
    fillRect.setAttribute('y', '125');
    steam1.style.display = 'none';
    steam2.style.display = 'none';
  } else {
    const now = new Date();
    const day = now.getDay();
    const timeNum = now.getHours() * 60 + now.getMinutes();

    if (day === 0 || day === 6) {
      badge.classList.add('badge-gray');
      badgeText.innerText = '주말 휴무';
      descText.innerText = customNotice || '평일 오전 10시에 다시 만나요!';
      fillRect.setAttribute('y', '125');
      steam1.style.display = 'none';
      steam2.style.display = 'none';
    } else if (timeNum < 10 * 60) {
      badge.classList.add('badge-yellow');
      badgeText.innerText = '영업 준비 중 (10:00 오픈)';
      descText.innerText = customNotice || '신선한 원두로 오늘의 커피를 준비하고 있어요.';
      fillRect.setAttribute('y', '95');
      steam1.style.display = 'block';
      steam2.style.display = 'none';
    } else if (timeNum >= 10 * 60 && timeNum < 11 * 60 + 30) {
      badge.classList.add('badge-green');
      badgeText.innerText = '주문 가능 (오전 여유)';
      descText.innerText = customNotice || '대기 없이 바로 맛있는 음료를 받을 수 있어요!';
      fillRect.setAttribute('y', '60');
      steam1.style.display = 'block';
      steam2.style.display = 'block';
    } else if (timeNum >= 11 * 60 + 30 && timeNum < 13 * 60 + 30) {
      badge.classList.add('badge-yellow');
      badgeText.innerText = '점심 피크 (대기 5~10분)';
      descText.innerText = customNotice || '점심 식사 후 주문이 몰리는 시간대입니다.';
      fillRect.setAttribute('y', '50');
      steam1.style.display = 'block';
      steam2.style.display = 'block';
    } else if (timeNum >= 13 * 60 + 30 && timeNum < 15 * 60 + 30) {
      badge.classList.add('badge-green');
      badgeText.innerText = '주문 가능 (오후 여유)';
      descText.innerText = customNotice || '오후 나른함을 깨우는 카페인 한 잔의 여유!';
      fillRect.setAttribute('y', '60');
      steam1.style.display = 'block';
      steam2.style.display = 'block';
    } else {
      badge.classList.add('badge-red');
      badgeText.innerText = '금일 영업 마감';
      descText.innerText = customNotice || '오늘 하루도 수고 많으셨습니다. 내일 10시에 만나요!';
      fillRect.setAttribute('y', '125');
      steam1.style.display = 'none';
      steam2.style.display = 'none';
    }
  }
}

// 초기 실행
refreshCafeStatus();