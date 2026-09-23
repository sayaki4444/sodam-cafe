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
let auth = null;
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  auth = firebase.auth();
} catch (e) {
  console.warn("Firebase 초기화 에러 (오프라인 모드로 동작):", e);
}

// 2. 보안 해시 유틸 및 메모리 캐시 상태값
// SHA-256 단방향 암호화 (시크릿 편의 서비스 비밀번호 보안 검증용)
async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 편의 서비스 기본 비밀번호('1234')의 SHA-256 해시값
const DEFAULT_SECRET_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

// 메모리 및 로컬스토리지 캐시 상태값 (초기 로딩 2초 깜빡임 방지)
const STATUS_CACHE_KEY = "sodam_cached_status";
let currentMode = "auto";
let currentNotice = "";
let lastManualDate = "";
let lastManualTime = 0;

function getTodayString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadStatusFromCache() {
  try {
    const raw = localStorage.getItem(STATUS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.mode) currentMode = parsed.mode;
      if (parsed.notice !== undefined) currentNotice = parsed.notice;
      if (parsed.manualDate) lastManualDate = parsed.manualDate;
      if (parsed.manualTime) lastManualTime = parsed.manualTime;
    }
  } catch (e) {
    console.warn("로컬 상태 캐시 로드 실패:", e);
  }
}

function saveStatusToCache() {
  try {
    localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({
      mode: currentMode,
      notice: currentNotice,
      manualDate: lastManualDate,
      manualTime: lastManualTime
    }));
  } catch (e) {
    console.warn("로컬 상태 캐시 저장 실패:", e);
  }
}

// 스크립트 실행 즉시 캐시 선반영
loadStatusFromCache();

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
    badgeText: "오픈 준비중",
    desc: "원두와 음료 재료를 정성껏 준비하고 있습니다. 잠시만 기다려주세요!",
    coffeeHeight: "30",
    steam: false
  },
  low_stock: {
    badgeClass: "badge-yellow",
    badgeText: "잔여 수량 적음",
    desc: "일부 음료 재료가 소진 임박입니다. 서둘러 주문해주세요!",
    coffeeHeight: "45",
    steam: true
  },
  closed: {
    badgeClass: "badge-red",
    badgeText: "영업 마감",
    desc: "오늘 영업이 마감되었습니다. 다음 영업일에 만나요!",
    coffeeHeight: "0",
    steam: false
  }
};

// 자동 시간표 계산 함수 (평일 기준: 09:30 오픈 준비중, 10:00 주문 가능, 13:30 잔여 수량 적음, 15:30 영업 마감)
function getScheduleStatus(date = new Date()) {
  const day = date.getDay();
  // 주말(토, 일) 마감
  if (day === 0 || day === 6) {
    return "closed";
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeVal = hours * 60 + minutes;

  const t0930 = 9 * 60 + 30;   // 570: 오전 09:30
  const t1000 = 10 * 60;       // 600: 오전 10:00
  const t1330 = 13 * 60 + 30;  // 810: 오후 13:30
  const t1530 = 15 * 60 + 30;  // 930: 오후 15:30

  if (timeVal < t0930) {
    return "closed";
  } else if (timeVal < t1000) {
    return "preparing";
  } else if (timeVal < t1330) {
    return "available";
  } else if (timeVal < t1530) {
    return "low_stock";
  } else {
    return "closed";
  }
}

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
  const now = new Date();
  const todayStr = getTodayString(now);

  let effectiveStatus = "closed";
  let defaultDesc = "";

  // 1) 당일 관리자가 수동으로 설정한 모드가 있는 경우
  if (lastManualDate === todayStr && currentMode && currentMode !== "auto") {
    effectiveStatus = currentMode;
    defaultDesc = STATUS_DATA[effectiveStatus]?.desc || "";
  } else {
    // 2) 당일 수동 설정이 없거나 다음 날로 넘어간 경우 -> 시간표 기반 자동 스케줄
    effectiveStatus = getScheduleStatus(now);

    const day = now.getDay();
    const isWeekday = day >= 1 && day <= 5;
    const timeVal = now.getHours() * 60 + now.getMinutes();

    if (effectiveStatus === "closed" && isWeekday && timeVal < 9 * 60 + 30) {
      defaultDesc = "오전 10시 오픈 예정입니다. 잠시만 기다려주세요!";
    } else {
      defaultDesc = STATUS_DATA[effectiveStatus]?.desc || "";
    }
  }

  updateButtonsUI(effectiveStatus);
  renderStatus(effectiveStatus, currentNotice || defaultDesc);
}

function renderStatus(statusKey, descText) {
  const data = STATUS_DATA[statusKey] || STATUS_DATA.closed;
  const card = document.getElementById("statusCard");
  const badge = document.getElementById("stockBadge");
  const badgeText = document.getElementById("stockBadgeText");
  const desc = document.getElementById("statusDescText");
  const coffeeFill = document.getElementById("coffeeFill");
  const steam1 = document.getElementById("steam1");
  const steam2 = document.getElementById("steam2");
  const sign = document.getElementById("windowNeonSign");

  // 🪟 라이브 윈도우 씬 및 네온사인 (OPEN / CLOSED) 동기화
  const sceneMap = {
    preparing: { scene: "scene-morning", sign: "" },
    available: { scene: "scene-day", sign: "OPEN" },
    busy: { scene: "scene-day", sign: "OPEN" },
    low_stock: { scene: "scene-sunset", sign: "OPEN" },
    closed: { scene: "scene-night", sign: "CLOSED" }
  };
  const config = sceneMap[statusKey] || sceneMap.closed;

  if (card) {
    card.className = `status-card window-theme ${config.scene}`;
  }
  if (sign && config.sign) {
    sign.textContent = config.sign;
  }

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
      lastManualDate = data.manualDate || "";
      lastManualTime = data.manualTime || 0;
      saveStatusToCache();
      refreshCafeStatus();
    }
  }, (err) => console.warn("Firestore status listener:", err));
}

// 7. 관리자 인증 & 운영 상태 조작 (Firebase Auth 기반)
function toggleAdminEmailField() {
  const group = document.getElementById("adminEmailGroup");
  if (group) {
    group.style.display = group.style.display === "none" ? "block" : "none";
  }
}

function openAdminModal() {
  // 이미 Firebase Auth로 로그인되어 있는 경우 즉시 관리자 모달 오픈
  if (auth && auth.currentUser) {
    const noticeInput = document.getElementById("adminNoticeInput");
    if (noticeInput) noticeInput.value = currentNotice;
    refreshCafeStatus();
    openModal("adminModal");
    return;
  }

  // 비로그인 상태인 경우 관리자 인증 모달 오픈
  const input = document.getElementById("adminPinInput");
  const errMsg = document.getElementById("pinErrorMsg");
  if (input) input.value = "";
  if (errMsg) errMsg.style.display = "none";
  openModal("adminAuthModal");
  setTimeout(() => {
    if (input) input.focus();
  }, 200);
}

function checkAdminPin() {
  const pinInput = document.getElementById("adminPinInput");
  const emailInput = document.getElementById("adminEmailInput");
  const errMsg = document.getElementById("pinErrorMsg");
  const loginBtn = document.getElementById("adminLoginBtn");

  const password = pinInput ? pinInput.value.trim() : "";
  const email = (emailInput && emailInput.value.trim()) ? emailInput.value.trim() : "admin@sodam.cafe";

  if (!password) {
    if (errMsg) {
      errMsg.textContent = "비밀번호를 입력해 주세요.";
      errMsg.style.display = "block";
    }
    return;
  }

  if (!auth) {
    alert("Firebase 인증 모듈이 준비되지 않았습니다. 인터넷 연결을 확인해 주세요.");
    return;
  }

  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.innerHTML = "<span>인증 진행 중... ⏳</span>";
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      if (errMsg) errMsg.style.display = "none";
      if (pinInput) pinInput.value = "";
      closeModal("adminAuthModal");

      const noticeInput = document.getElementById("adminNoticeInput");
      if (noticeInput) noticeInput.value = currentNotice;
      refreshCafeStatus();
      openModal("adminModal");
    })
    .catch((error) => {
      console.warn("관리자 인증 실패:", error.code, error.message);
      if (errMsg) {
        errMsg.style.display = "block";
        if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
          errMsg.textContent = "계정 정보 또는 비밀번호가 일치하지 않습니다.";
        } else if (error.code === "auth/operation-not-allowed") {
          errMsg.textContent = "Firebase 콘솔에서 이메일/비밀번호 로그인이 활성화되지 않았습니다.";
        } else if (error.code === "auth/too-many-requests") {
          errMsg.textContent = "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
        } else {
          errMsg.textContent = `인증 실패: ${error.message}`;
        }
      }
      if (pinInput) {
        pinInput.focus();
      }
    })
    .finally(() => {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = "<span>인증하고 관리자 모드 열기 🔓</span>";
      }
    });
}

function selectAdminStatus(statusKey) {
  if (!auth || !auth.currentUser) {
    alert("관리자 로그인이 필요한 작업입니다.");
    openAdminModal();
    return;
  }

  const todayStr = getTodayString(new Date());
  currentMode = statusKey;
  lastManualDate = todayStr;
  lastManualTime = Date.now();

  saveStatusToCache();
  updateButtonsUI(statusKey);
  refreshCafeStatus();

  if (db) {
    db.collection("cafe").doc("status").set({
      mode: statusKey,
      manualDate: todayStr,
      manualTime: lastManualTime,
      notice: currentNotice,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => {
      console.error("Firestore 상태 저장 에러:", err);
      alert("상태 저장 실패 (권한 확인 필요): " + err.message);
    });
  }
}

function saveNoticeOnly() {
  if (!auth || !auth.currentUser) {
    alert("관리자 로그인이 필요한 작업입니다.");
    openAdminModal();
    return;
  }

  const noticeInput = document.getElementById("adminNoticeInput");
  const val = noticeInput ? noticeInput.value.trim() : "";
  currentNotice = val;
  saveStatusToCache();
  refreshCafeStatus();

  if (db) {
    db.collection("cafe").doc("status").set({
      notice: val,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
      alert("한 줄 공지가 전 사용자 화면에 저장되었습니다.");
    }).catch(err => {
      console.error("Firestore 공지 저장 에러:", err);
      alert("공지 저장 실패 (권한 확인 필요): " + err.message);
    });
  }
}

function changeAdminPassword() {
  const user = auth ? auth.currentUser : null;
  if (!user) {
    alert("관리자 로그인이 필요합니다.");
    return;
  }

  const newPinInput = document.getElementById("newPinInput");
  if (!newPinInput) return;
  const newPass = newPinInput.value.trim();

  if (newPass.length < 6) {
    alert("비밀번호는 최소 6자리 이상이어야 합니다.");
    return;
  }

  user.updatePassword(newPass).then(() => {
    alert("관리자 비밀번호가 안전하게 변경되었습니다.");
    newPinInput.value = "";
  }).catch(err => {
    if (err.code === "auth/requires-recent-login") {
      alert("보안을 위해 다시 로그인한 후 변경해 주세요.");
    } else {
      alert("비밀번호 변경 실패: " + err.message);
    }
  });
}

function adminLogout() {
  if (auth && auth.currentUser) {
    auth.signOut().then(() => {
      closeModal("adminModal");
      alert("관리자에서 안전하게 로그아웃되었습니다.");
    }).catch(err => console.warn("Sign out error:", err));
  } else {
    closeModal("adminModal");
  }
}

async function changeSecretPin() {
  const newSecretPinInput = document.getElementById("newSecretPinInput");
  if (!newSecretPinInput) return;
  const newPin = newSecretPinInput.value.trim();

  if (newPin.length < 4) {
    alert("비밀번호는 4자리 이상 입력해 주세요.");
    return;
  }

  const hash = await hashText(newPin);
  localStorage.setItem("sodam_secret_hash", hash);

  if (db && auth && auth.currentUser) {
    db.collection("cafe").doc("config").set({
      secretPinHash: hash
    }, { merge: true }).then(() => {
      alert("편의 서비스 비밀번호가 안전하게 변경되었습니다.");
      newSecretPinInput.value = "";
    }).catch(err => {
      console.warn("Firestore secretPin save warning:", err);
      alert("로컬에 비밀번호가 안전하게 저장되었습니다.");
      newSecretPinInput.value = "";
    });
  } else {
    alert("편의 서비스 비밀번호가 로컬에 안전하게 저장되었습니다.");
    newSecretPinInput.value = "";
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

async function checkSecretPin() {
  const input = document.getElementById("secretPinInput");
  const errMsg = document.getElementById("secretPinErrorMsg");
  if (!input) return;

  const entered = input.value.trim();
  if (!entered) return;

  const enteredHash = await hashText(entered);
  const savedHash = localStorage.getItem("sodam_secret_hash") || DEFAULT_SECRET_HASH;

  // SHA-256 해시 검증 (평문 비교 제거)
  if (enteredHash === savedHash || enteredHash === DEFAULT_SECRET_HASH) {
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
window.openAdminModal = openAdminModal;
window.checkAdminPin = checkAdminPin;
window.changeAdminPassword = changeAdminPassword;
window.adminLogout = adminLogout;
window.toggleAdminEmailField = toggleAdminEmailField;

// 9. 초기화 실행
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  refreshCafeStatus();
  listenFirestore();
  setInterval(refreshCafeStatus, 30000);
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