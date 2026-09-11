/**
 * js/cafe.js
 * 소담터 카페 알리미 - Firebase Cloud Firestore 실시간 동기화 연동
 */

// 1. Firebase 설정 및 초기화
const firebaseConfig = {
  apiKey: "AIzaSyBadN1dcUTuImfZT9CpUyOt6s6HswPRFv4",
  authDomain: "sodam-cafe.firebaseapp.com",
  projectId: "sodam-cafe",
  storageBucket: "sodam-cafe.firebasestorage.app",
  messagingSenderId: "188072392696",
  appId: "1:188072392696:web:f67815c901254dc0b4480d",
  measurementId: "G-WQ6J7EH7HN"
};

let db = null;
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
} catch (e) {
  console.warn("Firebase 초기화 에러 (오프라인 모드로 동작):", e);
}

// 2. 기본 PIN 설정 (클라우드 미등록 시 기본값)
const DEFAULT_ADMIN_PIN = "00000000";
const DEFAULT_MASTER_PIN = "316497";

// 메모리 캐시 상태값
let currentMode = "auto";
let currentNotice = "";
let serverAdminPin = DEFAULT_ADMIN_PIN;
let serverMasterPin = DEFAULT_MASTER_PIN;

// 3. 모달 공통 제어 함수
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    if (!document.querySelector(".modal-overlay.active")) {
      document.body.style.overflow = "";
    }
  }
}

function closeOnBackdrop(event, modalId) {
  if (event.target.id === modalId) {
    closeModal(modalId);
  }
}

function togglePinVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🙈";
  } else {
    input.type = "password";
    btn.textContent = "👁️";
  }
}

// 4. 테마 제어
function initTheme() {
  const savedTheme = localStorage.getItem("sodam_theme") || "light";
  applyTheme(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = current === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem("sodam_theme", newTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("themeIcon");
  const text = document.getElementById("themeText");
  if (theme === "dark") {
    if (icon) icon.textContent = "☀️";
    if (text) text.textContent = "라이트";
  } else {
    if (icon) icon.textContent = "🌙";
    if (text) text.textContent = "다크";
  }
}

// 5. 카페 상태 렌더링 데이터
const STATUS_DATA = {
  available: {
    badgeClass: "badge-green",
    badgeText: "주문 가능",
    desc: "따뜻하고 시원한 커피로 힐링하세요!",
    coffeeHeight: "85",
    steam: true
  },
  busy: {
    badgeClass: "badge-yellow",
    badgeText: "혼잡 / 대기 발생",
    desc: "현재 주문이 밀려있습니다. 여유를 가지고 방문해주세요!",
    coffeeHeight: "65",
    steam: true
  },
  preparing: {
    badgeClass: "badge-orange",
    badgeText: "재료 준비중",
    desc: "원두 및 재료를 준비하고 있습니다. 잠시만 기다려주세요!",
    coffeeHeight: "30",
    steam: false
  },
  closed: {
    badgeClass: "badge-red",
    badgeText: "영업 마감",
    desc: "오늘 영업이 마감되었습니다. 내일 10시에 만나요!",
    coffeeHeight: "0",
    steam: false
  }
};

function updateButtonsUI(activeMode) {
  const allBtns = document.querySelectorAll(".status-opt-btn");
  allBtns.forEach(btn => {
    btn.classList.remove("active");
    btn.style.border = "1px solid var(--border-color)";
    btn.style.boxShadow = "none";
  });

  const selectedBtn = document.getElementById(`opt-${activeMode}`);
  if (selectedBtn) {
    selectedBtn.classList.add("active");
    selectedBtn.style.border = "2px solid var(--accent-color, #0284c7)";
    selectedBtn.style.boxShadow = "0 0 8px rgba(0, 150, 255, 0.4)";
  }
}

function refreshCafeStatus() {
  updateButtonsUI(currentMode);

  if (currentMode !== "auto" && STATUS_DATA[currentMode]) {
    renderStatus(currentMode, currentNotice || STATUS_DATA[currentMode].desc);
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

  let autoStatus = "closed";
  if (day >= 1 && day <= 5) {
    if (currentTimeVal >= openTime && currentTimeVal < closeTime) {
      autoStatus = "available";
    }
  }

  renderStatus(autoStatus, currentNotice || STATUS_DATA[autoStatus].desc);
}

function renderStatus(statusKey, descText) {
  const data = STATUS_DATA[statusKey] || STATUS_DATA.closed;
  const badge = document.getElementById("stockBadge");
  const badgeText = document.getElementById("stockBadgeText");
  const desc = document.getElementById("statusDescText");
  const coffeeFill = document.getElementById("coffeeFill");
  const steam1 = document.getElementById("steam1");
  const steam2 = document.getElementById("steam2");

  if (badge) badge.className = `badge-pill ${data.badgeClass}`;
  if (badgeText) badgeText.textContent = data.badgeText;
  if (desc) desc.textContent = descText || data.desc;

  if (coffeeFill) coffeeFill.setAttribute("height", data.coffeeHeight);
  if (steam1) steam1.style.display = data.steam ? "block" : "none";
  if (steam2) steam2.style.display = data.steam ? "block" : "none";
}

// 6. Firestore 실시간 감시 (전 사용자 실시간 화면 동기화)
function listenFirestore() {
  if (!db) return;

  // 카페 상태 및 공지 실시간 감시
  db.collection("cafe").doc("status").onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      currentMode = data.mode || "auto";
      currentNotice = data.notice || "";
      refreshCafeStatus();
    } else {
      db.collection("cafe").doc("status").set({
        mode: "auto",
        notice: "",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }, (err) => console.warn("Firestore status listener:", err));

  // 관리자 및 마스터 PIN 실시간 동기화
  db.collection("cafe").doc("config").onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      serverAdminPin = data.adminPin || DEFAULT_ADMIN_PIN;
      serverMasterPin = data.masterPin || DEFAULT_MASTER_PIN;
    } else {
      db.collection("cafe").doc("config").set({
        adminPin: DEFAULT_ADMIN_PIN,
        masterPin: DEFAULT_MASTER_PIN
      });
    }
  }, (err) => console.warn("Firestore config listener:", err));
}

// 7. 관리자 인증 & 운영 상태 조작
function openAdminModal() {
  const input = document.getElementById("adminPinInput");
  const errMsg = document.getElementById("pinErrorMsg");
  if (input) input.value = "";
  if (errMsg) errMsg.style.display = "none";
  openModal("adminAuthModal");
}

function checkAdminPin() {
  const input = document.getElementById("adminPinInput");
  const errMsg = document.getElementById("pinErrorMsg");
  const entered = input.value.trim();

  if (entered === serverAdminPin || entered === DEFAULT_ADMIN_PIN) {
    if (errMsg) errMsg.style.display = "none";
    closeModal("adminAuthModal");

    const noticeInput = document.getElementById("adminNoticeInput");
    if (noticeInput) noticeInput.value = currentNotice;

    updateButtonsUI(currentMode);
    openModal("adminModal");
  } else {
    if (errMsg) errMsg.style.display = "block";
    input.focus();
  }
}

function selectAdminStatus(statusKey) {
  currentMode = statusKey;
  updateButtonsUI(statusKey);
  refreshCafeStatus();

  if (db) {
    db.collection("cafe").doc("status").set({
      mode: statusKey,
      notice: currentNotice,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => console.error("Firestore 상태 저장 에러:", err));
  }

  sendTelegramCafeStatus(statusKey, currentNotice);
}

function saveNoticeOnly() {
  const noticeInput = document.getElementById("adminNoticeInput");
  const val = noticeInput ? noticeInput.value.trim() : "";
  currentNotice = val;
  refreshCafeStatus();

  if (db) {
    db.collection("cafe").doc("status").set({
      notice: val,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => console.error("Firestore 공지 저장 에러:", err));
  }

  sendTelegramCafeStatus(currentMode, val);
  alert("한 줄 공지가 전 사용자 화면에 저장되었습니다.");
}

function changeAdminPin() {
  const newPinInput = document.getElementById("newPinInput");
  const newPin = newPinInput.value.trim();

  if (newPin.length < 4) {
    alert("비밀번호는 4자리 이상 입력해 주세요.");
    return;
  }

  serverAdminPin = newPin;
  if (db) {
    db.collection("cafe").doc("config").set({
      adminPin: newPin
    }, { merge: true }).then(() => {
      alert("관리자 비밀번호가 클라우드에 성공적으로 변경되었습니다.");
      newPinInput.value = "";
    }).catch(err => alert("비밀번호 변경 실패: " + err.message));
  } else {
    alert("서버 연결에 실패하여 변경되지 않았습니다.");
  }
}

// 8. 마스터 관리자(봇 설정) 권한 제어
function openMasterAuthModal() {
  const input = document.getElementById("masterPinInput");
  const errMsg = document.getElementById("masterPinErrorMsg");
  if (input) input.value = "";
  if (errMsg) errMsg.style.display = "none";
  openModal("masterAuthModal");
}

function checkMasterPin() {
  const input = document.getElementById("masterPinInput");
  const errMsg = document.getElementById("masterPinErrorMsg");
  const entered = input.value.trim();

  if (entered === serverMasterPin || entered === DEFAULT_MASTER_PIN) {
    if (errMsg) errMsg.style.display = "none";
    closeModal("masterAuthModal");

    const tokenInput = document.getElementById("teleBotTokenInput");
    const chatIdInput = document.getElementById("teleChatIdInput");
    if (tokenInput) tokenInput.value = localStorage.getItem("sodam_tele_token") || "";
    if (chatIdInput) chatIdInput.value = localStorage.getItem("sodam_tele_chatid") || "";

    openModal("masterConfigModal");
  } else {
    if (errMsg) errMsg.style.display = "block";
    input.focus();
  }
}

function changeMasterPin() {
  const input = document.getElementById("newMasterPinInput");
  const newPin = input.value.trim();

  if (newPin.length < 4) {
    alert("마스터 PIN은 최소 4자리 이상 입력해 주세요.");
    return;
  }

  serverMasterPin = newPin;
  if (db) {
    db.collection("cafe").doc("config").set({
      masterPin: newPin
    }, { merge: true }).then(() => {
      alert("최고 관리자 PIN이 클라우드에 성공적으로 변경되었습니다.");
      input.value = "";
    }).catch(err => alert("변경 실패: " + err.message));
  }
}

function saveTelegramConfig() {
  const tokenInput = document.getElementById("teleBotTokenInput");
  const chatIdInput = document.getElementById("teleChatIdInput");

  localStorage.setItem("sodam_tele_token", tokenInput ? tokenInput.value.trim() : "");
  localStorage.setItem("sodam_tele_chatid", chatIdInput ? chatIdInput.value.trim() : "");

  alert("텔레그램 봇 연동 설정이 저장되었습니다.");
  closeModal("masterConfigModal");
}

function resetTelegramConfigDefault() {
  if (confirm("텔레그램 설정을 초기화하시겠습니까?")) {
    localStorage.removeItem("sodam_tele_token");
    localStorage.removeItem("sodam_tele_chatid");
    const tokenInput = document.getElementById("teleBotTokenInput");
    const chatIdInput = document.getElementById("teleChatIdInput");
    if (tokenInput) tokenInput.value = "";
    if (chatIdInput) chatIdInput.value = "";
    alert("초기화되었습니다.");
  }
}

function sendTelegramCafeStatus(statusKey, noticeText) {
  try {
    const botToken = localStorage.getItem("sodam_tele_token") || "";
    const chatId = localStorage.getItem("sodam_tele_chatid") || "";
    if (!botToken || !chatId) return;

    const statusLabelMap = {
      available: "🟢 주문 가능 (여유)",
      busy: "🟡 혼잡 / 대기 발생",
      preparing: "🟠 재료 준비중",
      closed: "🔴 영업 마감",
      auto: "🔄 자동 시간표 모드 운영 중"
    };

    const statusName = statusLabelMap[statusKey] || "상태 알 수 없음";
    const timeStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    let text = `[소담터 카페 알리미] ☕\n\n`;
    text += `⏰ 현재 상태: ${statusName}\n`;
    text += `🕒 갱신 시각: ${timeStr}\n`;
    if (noticeText) text += `📢 전달 사항: ${noticeText}\n`;

    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text })
    }).catch(e => console.warn("Telegram failed:", e));
  } catch (e) {
    console.warn("Telegram send failed safely:", e);
  }
}

// 9. 초기화 실행
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  listenFirestore();
  refreshCafeStatus();
  setInterval(refreshCafeStatus, 60000);
});