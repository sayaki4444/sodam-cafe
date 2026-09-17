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
const DEFAULT_SECRET_PIN = "1234";

// 메모리 캐시 상태값
let currentMode = "auto";
let currentNotice = "";
let serverAdminPin = DEFAULT_ADMIN_PIN;
let serverMasterPin = DEFAULT_MASTER_PIN;
let serverSecretPin = localStorage.getItem("sodam_secret_pin") || DEFAULT_SECRET_PIN;

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

  // 관리자, 마스터 및 편의 서비스 비밀번호 실시간 동기화
  db.collection("cafe").doc("config").onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      serverAdminPin = data.adminPin || DEFAULT_ADMIN_PIN;
      serverMasterPin = data.masterPin || DEFAULT_MASTER_PIN;
      if (data.secretPin) {
        serverSecretPin = data.secretPin;
        localStorage.setItem("sodam_secret_pin", data.secretPin);
      }
    } else {
      db.collection("cafe").doc("config").set({
        adminPin: DEFAULT_ADMIN_PIN,
        masterPin: DEFAULT_MASTER_PIN,
        secretPin: DEFAULT_SECRET_PIN
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

function changeSecretPin() {
  const newSecretPinInput = document.getElementById("newSecretPinInput");
  if (!newSecretPinInput) return;
  const newPin = newSecretPinInput.value.trim();

  if (newPin.length < 4) {
    alert("비밀번호는 4자리 이상 입력해 주세요.");
    return;
  }

  serverSecretPin = newPin;
  localStorage.setItem("sodam_secret_pin", newPin);

  if (db) {
    db.collection("cafe").doc("config").set({
      secretPin: newPin
    }, { merge: true }).then(() => {
      alert("편의 서비스 비밀번호가 성공적으로 변경되었습니다.");
      newSecretPinInput.value = "";
    }).catch(err => {
      console.warn("Firestore secretPin save error:", err);
      alert("로컬에 비밀번호가 저장되었습니다.");
      newSecretPinInput.value = "";
    });
  } else {
    alert("편의 서비스 비밀번호가 로컬에 성공적으로 저장되었습니다.");
    newSecretPinInput.value = "";
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

    let text = `[카페 알리미] ☕\n\n`;
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

// 8-1. 시크릿 편의 서비스 이스터에그 제어 로직
function handleSecretTrigger(event) {
  if (event) event.stopPropagation();
  const isUnlocked = sessionStorage.getItem("sodam_secret_unlocked") === "true";
  const section = document.getElementById("convenienceSection");

  if (isUnlocked && section) {
    if (section.style.display === "none") {
      unlockConvenienceService();
    } else {
      section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  } else {
    openSecretPinModal();
  }
}

function openSecretPinModal() {
  const input = document.getElementById("secretPinInput");
  const errMsg = document.getElementById("secretPinErrorMsg");
  if (input) input.value = "";
  if (errMsg) errMsg.style.display = "none";
  openModal("secretPinModal");
  setTimeout(() => {
    if (input) input.focus();
  }, 250);
}

function checkSecretPin() {
  const input = document.getElementById("secretPinInput");
  const errMsg = document.getElementById("secretPinErrorMsg");
  if (!input) return;

  const entered = input.value.trim();
  // 설정된 비밀번호, 기본 비밀번호(1234), 또는 서버 관리자/마스터 PIN으로 유연하게 인증 지원
  if (
    entered === serverSecretPin ||
    entered === DEFAULT_SECRET_PIN ||
    entered === serverAdminPin ||
    entered === DEFAULT_ADMIN_PIN ||
    entered === serverMasterPin ||
    entered === DEFAULT_MASTER_PIN
  ) {
    if (errMsg) errMsg.style.display = "none";
    input.value = "";
    closeModal("secretPinModal");
    unlockConvenienceService();
  } else {
    if (errMsg) {
      errMsg.style.display = "block";
      errMsg.textContent = "비밀번호가 일치하지 않습니다.";
    }
    input.value = "";
    input.focus();
  }
}

function unlockConvenienceService() {
  sessionStorage.setItem("sodam_secret_unlocked", "true");
  const section = document.getElementById("convenienceSection");
  if (section) {
    section.style.display = "block";
    section.classList.remove("secret-revealed");
    void section.offsetWidth; // 리플로우 트리거
    section.classList.add("secret-revealed");
    setTimeout(() => {
      section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
  }
}

function lockConvenienceService() {
  sessionStorage.removeItem("sodam_secret_unlocked");
  const section = document.getElementById("convenienceSection");
  if (section) {
    section.style.display = "none";
  }
  const btn = document.getElementById("secretTriggerBtn");
  if (btn) {
    btn.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// 8-2. 소담터 카페 메뉴 캐러셀 및 무한 루프(Infinite Seamless Loop) 제어
let originalMenuCards = [];
let singleSetWidth = 0;

function setupMenuCards() {
  const carousel = document.getElementById("menuCarousel");
  if (!carousel) return;
  if (originalMenuCards.length === 0) {
    originalMenuCards = Array.from(carousel.querySelectorAll(".menu-card")).map(card => card.cloneNode(true));
  }
}

function scrollMenuCarousel(direction) {
  pauseAutoScrollTemporarily(3500);
  const carousel = document.getElementById("menuCarousel");
  if (!carousel) return;
  const cardWidth = 160;
  carousel.scrollBy({ left: direction * cardWidth * 1.5, behavior: "smooth" });
}

function calculateSingleSetWidth() {
  const carousel = document.getElementById("menuCarousel");
  if (!carousel) return 0;
  const cards = carousel.querySelectorAll(".menu-card");
  if (cards.length === 0) return 0;

  const count = cards.length / 3;
  if (count <= 0) return 0;

  const firstCard = cards[0];
  const cardWidth = (firstCard ? firstCard.getBoundingClientRect().width : 148) || 148;
  const gap = 12; // style.css의 gap: 12px

  singleSetWidth = (cardWidth + gap) * count;
  return singleSetWidth;
}

function filterMenuCategory(category, tabBtn, isUserClick = false) {
  if (isUserClick) {
    pauseAutoScrollTemporarily(3500);
  }
  const tabs = document.querySelectorAll(".cat-tab-btn");
  tabs.forEach(btn => btn.classList.remove("active"));
  if (tabBtn) tabBtn.classList.add("active");

  const carousel = document.getElementById("menuCarousel");
  if (!carousel) return;

  setupMenuCards();

  // 해당 카테고리에 맞는 원본 카드 필터링
  const matchingCards = originalMenuCards.filter(card => {
    return category === "all" || card.dataset.category === category;
  });

  // 캐러셀 내용 비우고 무한 루프를 위해 복제 세트 구성 (총 3세트: 끊김 없는 양방향 루프)
  carousel.innerHTML = "";

  for (let setIdx = 0; setIdx < 3; setIdx++) {
    matchingCards.forEach((cardTpl, cardIdx) => {
      const card = cardTpl.cloneNode(true);
      card.style.display = "flex";
      card.dataset.setIndex = setIdx;
      card.dataset.itemIndex = cardIdx;

      // 첫 번째 세트에만 초기 스태거 애니메이션 적용
      if (setIdx === 0) {
        card.style.setProperty("--stagger-delay", `${cardIdx * 0.045}s`);
        card.classList.add("card-fade-enter");
        card.addEventListener("animationend", () => {
          card.classList.remove("card-fade-enter");
        }, { once: true });
      }

      carousel.appendChild(card);
    });
  }

  // 위치 및 너비 초기화
  requestAnimationFrame(() => {
    calculateSingleSetWidth();
    carousel.scrollLeft = 0;
    scrollAccumulator = 0;
    updateMenuDots(matchingCards.length);

    // 사용자 탭 클릭이 아닌 초기화나 복귀 시에는 즉시 자동 롤링 활성화
    if (!isUserClick && !isUserInteracting) {
      startAutoScroll();
    }
  });
}

function updateMenuDots(uniqueCount) {
  const dotsContainer = document.getElementById("menuDots");
  if (!dotsContainer) return;

  dotsContainer.innerHTML = "";
  if (!uniqueCount || uniqueCount <= 1) return;

  for (let idx = 0; idx < uniqueCount; idx++) {
    const dot = document.createElement("span");
    dot.className = "menu-dot" + (idx === 0 ? " active" : "");
    dot.onclick = () => {
      pauseAutoScrollTemporarily(3500);
      const carousel = document.getElementById("menuCarousel");
      if (!carousel) return;
      const targetCard = carousel.querySelector(`.menu-card[data-set-index="0"][data-item-index="${idx}"]`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    };
    dotsContainer.appendChild(dot);
  }
}

function syncActiveDot() {
  const carousel = document.getElementById("menuCarousel");
  const dotsContainer = document.getElementById("menuDots");
  if (!carousel || !dotsContainer) return;

  const dots = dotsContainer.querySelectorAll(".menu-dot");
  if (dots.length === 0 || singleSetWidth <= 0) return;

  const normalizedScroll = ((carousel.scrollLeft % singleSetWidth) + singleSetWidth) % singleSetWidth;
  const cardWidth = singleSetWidth / dots.length;
  const activeIndex = Math.min(dots.length - 1, Math.max(0, Math.floor((normalizedScroll + cardWidth * 0.4) / cardWidth)));

  dots.forEach((dot, idx) => {
    dot.classList.toggle("active", idx === activeIndex);
  });
}

// 8-3. 메뉴 캐러셀 마우스/터치 전 부드러운 자동 스크롤 엔진 (모바일 서브픽셀 절삭 방지 누적기 탑재)
let autoScrollRafId = null;
let isUserInteracting = false;
let resumeTimer = null;
let scrollAccumulator = 0; // 모바일 브라우저(iOS Safari/Android)의 정수형 scrollLeft 버그 방지용 누적기
const AUTO_SCROLL_SPEED = 0.8; // 모바일/PC 모두 확연히 느껴지는 부드러운 스크롤 속도 (~48px/초)

function startAutoScroll() {
  stopAutoScroll();
  const carousel = document.getElementById("menuCarousel");
  if (!carousel) return;

  scrollAccumulator = carousel.scrollLeft;
  carousel.classList.remove("is-snapping");

  function step() {
    if (isUserInteracting) return;

    if (singleSetWidth <= 10) {
      calculateSingleSetWidth();
    }

    scrollAccumulator += AUTO_SCROLL_SPEED;

    // 한 바퀴(singleSetWidth)를 돌면 위치를 정확히 0으로 보정 (시각적 점프 0)
    if (singleSetWidth > 0 && scrollAccumulator >= singleSetWidth) {
      scrollAccumulator -= singleSetWidth;
    }

    // 모바일 브라우저가 소수점 scrollLeft를 무시하더라도 정수 픽셀로 강제 반영
    carousel.scrollLeft = Math.round(scrollAccumulator);

    autoScrollRafId = requestAnimationFrame(step);
  }

  autoScrollRafId = requestAnimationFrame(step);
}

function stopAutoScroll() {
  if (autoScrollRafId) {
    cancelAnimationFrame(autoScrollRafId);
    autoScrollRafId = null;
  }
}

function pauseAutoScrollTemporarily(delay = 3500) {
  isUserInteracting = true;
  stopAutoScroll();

  const carousel = document.getElementById("menuCarousel");
  if (carousel) {
    carousel.classList.add("is-snapping");
  }

  if (resumeTimer) {
    clearTimeout(resumeTimer);
  }

  resumeTimer = setTimeout(() => {
    isUserInteracting = false;
    const c = document.getElementById("menuCarousel");
    if (c) {
      scrollAccumulator = c.scrollLeft;
    }
    startAutoScroll();
  }, delay);
}

function initMenuCarousel() {
  const carousel = document.getElementById("menuCarousel");
  if (!carousel) return;

  setupMenuCards();
  filterMenuCategory("all", document.querySelector(".cat-tab-btn.active"), false);

  carousel.addEventListener("scroll", () => {
    if (isUserInteracting) {
      scrollAccumulator = carousel.scrollLeft;
    }

    if (singleSetWidth > 0) {
      // 수동 스크롤 시에도 양방향 무한 루프 유지
      if (carousel.scrollLeft >= singleSetWidth * 2) {
        carousel.scrollLeft -= singleSetWidth;
        scrollAccumulator = carousel.scrollLeft;
      } else if (carousel.scrollLeft <= 0) {
        carousel.scrollLeft += singleSetWidth;
        scrollAccumulator = carousel.scrollLeft;
      }
    }
    window.requestAnimationFrame(syncActiveDot);
  }, { passive: true });

  // 모바일 터치 이벤트 바인딩 (수동 터치 중엔 즉시 멈추고 뗐을 때 3초 후 재개)
  carousel.addEventListener("touchstart", () => {
    isUserInteracting = true;
    stopAutoScroll();
    scrollAccumulator = carousel.scrollLeft;
    carousel.classList.add("is-snapping");
  }, { passive: true });

  carousel.addEventListener("touchend", () => {
    pauseAutoScrollTemporarily(3000);
  }, { passive: true });

  carousel.addEventListener("touchcancel", () => {
    pauseAutoScrollTemporarily(2500);
  }, { passive: true });

  // 마우스 호버 및 드래그 바인딩 (PC 환경)
  carousel.addEventListener("mouseenter", () => {
    isUserInteracting = true;
    stopAutoScroll();
  });

  carousel.addEventListener("mouseleave", () => {
    isUserInteracting = false;
    pauseAutoScrollTemporarily(1800);
  });

  carousel.addEventListener("wheel", () => {
    pauseAutoScrollTemporarily(3000);
  }, { passive: true });

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  carousel.addEventListener("mousedown", (e) => {
    isUserInteracting = true;
    stopAutoScroll();
    isDown = true;
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
    scrollAccumulator = carousel.scrollLeft;
  });

  carousel.addEventListener("mouseup", () => {
    isDown = false;
    pauseAutoScrollTemporarily(3000);
  });

  carousel.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 1.5;
    carousel.scrollLeft = scrollLeft - walk;
    scrollAccumulator = carousel.scrollLeft;
  });

  // 초기 로드 후 350ms 뒤 바로 자동 롤링 가동
  setTimeout(() => {
    calculateSingleSetWidth();
    if (!isUserInteracting) {
      startAutoScroll();
    }
  }, 350);

  // 뷰포트 벗어남 감지 (모바일 화면 밖일 때만 배터리 절약)
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!isUserInteracting) {
            startAutoScroll();
          }
        } else {
          stopAutoScroll();
        }
      });
    }, { threshold: 0, rootMargin: "200px 0px" });
    observer.observe(carousel);
  }

  // 브라우저 탭 비활성화 시 자동 일시정지
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoScroll();
    } else if (!isUserInteracting) {
      startAutoScroll();
    }
  });
}

// 전역 window 바인딩 보장
window.handleSecretTrigger = handleSecretTrigger;
window.openSecretPinModal = openSecretPinModal;
window.checkSecretPin = checkSecretPin;
window.changeSecretPin = changeSecretPin;
window.unlockConvenienceService = unlockConvenienceService;
window.lockConvenienceService = lockConvenienceService;
window.scrollMenuCarousel = scrollMenuCarousel;
window.filterMenuCategory = filterMenuCategory;

// 9. 초기화 실행
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  listenFirestore();
  refreshCafeStatus();
  setInterval(refreshCafeStatus, 60000);
  initMenuCarousel();

  // 시크릿 트리거 버튼 이벤트 리스너 이중 바인딩
  const btn = document.getElementById("secretTriggerBtn");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      handleSecretTrigger(e);
    });
  }
});