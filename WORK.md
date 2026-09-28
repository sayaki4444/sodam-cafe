# ☕ 소담터 카페 알리미 (Sodam Cafe) 작업 및 아키텍처 가이드

본 문서는 **Antigravity Chat 모드**와 **CLI(agy CLI)** 환경을 병행하여 작업할 때, 일관된 맥락을 유지하고 코드베이스를 안전하게 유지보수할 수 있도록 정리한 개발 명세서입니다.

---

## 1. 프로젝트 개요

- **서비스명**: 소담터 카페 알리미 & 인트라넷 편의 서비스
- **기술 스택**: 순수 HTML5 / Vanilla CSS / Vanilla JavaScript (No Build Tool PWA)
- **백엔드/인프라**: Google Firebase (Firestore Database, Firebase Authentication, Firebase Hosting)
- **특징**: 무중단 실시간 동기화, PWA 오프라인 지원, 로컬 캐시 기반 0초 즉시 렌더링 (FOUC 방지)

---

## 2. 디렉토리 및 파일 구조

```plaintext
sodam-cafe/
├── index.html            # 메인 진입점, UI 마크업, 모달 창, 0초 캐시 인라인 스크립트
├── style.css             # 전역 스타일시트 (라이트/다크 테마, 커피잔 애니메이션, 배지 스타일)
├── sw.js                 # PWA Service Worker (오프라인 캐시 및 정적 리소스 캐싱)
├── manifest.json         # 웹 앱 매니페스트 (아이콘, 앱 이름, 테마 색상)
├── firebase.json         # Firebase Hosting 및 Firestore 배포 설정
├── firestore.rules       # Firestore 보안 규칙 (인증 기반 관리자 쓰기 제한)
├── GEMINI.md             # AI 개발 에이전트 보조 지침 및 개발 원칙
├── WORK.md               # [본 문서] 시스템 아키텍처 및 CLI/Chat 공유 가이드
├── icons/                # 메뉴 이미지 및 앱 아이콘
│   └── menu/             # 아메리카노, 라떼 등 음료 대표 이미지
└── js/
    ├── cafe.js           # 카페 실시간 상태 관리, 자동 시간표, Firebase 연동, 관리자 인증
    ├── work.js           # 사내 업무 시스템 바로가기 모달 제어
    ├── restaurants.js    # 주변 식당/맛집 정보 캐러셀 및 필터
    └── diet.js           # 주간 식단표 안내 연동 모듈
```

---

## 3. 핵심 모듈 및 동작 로직 상세

### 3.1. 카페 상태 관리 및 자동 시간표 (`js/cafe.js`)

1. **자동 시간표 엔진 (`getScheduleStatus`)**
   - **평일(월~금)** 기준:
     - `~ 09:30`: **영업 마감** (`closed`) - "오전 10시 오픈 예정입니다."
     - `09:30 ~ 10:00`: **오픈 준비중** (`preparing`, 주황 배지)
     - `10:00 ~ 13:30`: **주문 가능** (`available`, 초록 펄스 배지)
     - `13:30 ~ 15:30`: **잔여 수량 적음** (`low_stock`, 노랑 펄스 배지)
     - `15:30 ~`: **영업 마감** (`closed`, 빨강 배지)
   - **주말(토/일)**: 종일 **영업 마감**

2. **수동 조작 및 당일 마감 락(`manualDate`)**
   - 관리자 모달(`⚙️`)에는 핵심 3개 버튼만 배치:
     - 🟢 **주문 가능** (`opt-available`)
     - 🧃 **잔여 수량 적음** (`opt-low_stock`)
     - 🔴 **영업 마감** (`opt-closed`)
   - 관리자가 버튼을 누르면 Firestore에 `mode`, `manualDate(YYYY-MM-DD)`, `manualTime`이 즉시 기록됩니다.
   - 관리자가 **영업 마감**을 누르면 조기 마감 처리되어 당일(`todayStr === manualDate`) 동안 마감이 고정됩니다.
   - 익일 09:30이 되면 날짜가 달라지므로(`todayStr !== manualDate`) 어제의 수동 마감이 풀리고 새로운 날의 자동 스케줄로 자연스럽게 전환됩니다.

3. **로딩 깜빡임(FOUC) 방지 0초 렌더링**
   - Firestore 비동기 수신(1~2초 지연) 동안 기본값이 깜빡이지 않도록 `localStorage`(`sodam_cached_status`)에 최근 상태/공지를 저장합니다.
   - `index.html` 본문 상단 인라인 스크립트와 `cafe.js` 시작 즉시 캐시를 읽어 화면을 0ms 만에 이전 상태로 즉각 렌더링합니다.

4. **라이브 윈도우(Live Window) 감성 비주얼 & OPEN/CLOSED 네온사인**
   - 아치형 창문 너머의 하늘과 빛이 시간대/상태에 따라 실시간 전환:
     - 🌅 **오픈 준비 (09:30~10:00)**: `scene-morning` (레몬빛 아침 햇살 빔, 네온 꺼짐)
     - ☀️ **주문 가능 (10:00~13:30)**: `scene-day` (파란 하늘, 몽글몽글 스팀, 에메랄드 **[OPEN]** 네온사인 점등)
     - 🌇 **잔여 적음 (13:30~15:30)**: `scene-sunset` (오렌지 골든아워 노을, 네온 꺼짐)
     - 🌙 **영업 마감 (15:30~)**: `scene-night` (미드나잇 밤하늘, 별빛, 로즈레드 **[CLOSED]** 네온사인 발광)
   - 라이트 모드 및 다크 모드에 완벽 대응하는 반응형 조도 시스템.

### 3.2. 관리자 인증 및 보안

- **인증 방식**: Firebase Authentication (이메일/비밀번호)
- **보안 규칙 (`firestore.rules`)**:
  - `cafe/status`: 일반 사용자는 읽기만 가능(`read: if true`), 쓰기는 관리자 로그인 계정만 허용(`request.auth != null`).
  - 클라이언트 코드에 비밀번호를 하드코딩하지 않고 Firebase Auth 세션을 통해 권한을 검증합니다.

---

## 4. Antigravity Chat ↔ CLI 협업 가이드

CLI(agy CLI)와 Antigravity Chat 모드를 교대로 사용할 때 다음 규칙을 준수합니다.

### 4.1. 변경 및 커밋 규칙

1. **외과수술적 수정 (Surgical Edits)**:
   - 전체 파일을 덮어쓰지 말고, 변경이 필요한 특정 함수/블록만 정확하게 수정합니다.
2. **사전 검증 원칙 (`test.html` 우선 반영 후 배포)**:
   - UI/비주얼 및 주요 기능 개선 사항이 있을 경우, **절대 프로덕션 파일(`index.html`)에 즉시 반영하거나 바로 배포하지 않습니다.**
   - 반드시 **[test.html](file:///c:/Users/user/Desktop/workspace/sodam-cafe/test.html)에 먼저 반영**하여 사용자가 브라우저에서 직접 시각적/기능적 검증을 할 수 있도록 합니다.
   - 사용자의 확인 및 명시적 승인이 완료된 후에 프로덕션 코드에 이식하고 Git 커밋/푸시 및 Firebase 배포를 진행합니다.
3. **캐시 방지 쿼리 파라미터**:
   - `index.html`에서 JS/CSS를 불러올 때 브라우저 및 PWA 캐시 방지를 위해 버전 파라미터를 유지/갱신합니다. (예: `js/cafe.js?v=YYYYMMDD_N`)
   - `sw.js`의 `CACHE_NAME`도 주요 배포 시 함께 올립니다.

### 4.2. 필수 실행 명령어

```powershell
# 1. 자바스크립트 문법 검사 (수정 후 필수 확인)
node -c js/cafe.js
node -c js/work.js
node -c js/restaurants.js

# 2. Git 변경점 확인 및 커밋
git status
git diff
git add .
git commit -m "feat/fix: 작업 내용 요약"
git push origin main

# 3. Firebase 배포 (호스팅 & 보안규칙)
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

---

## 5. 자주 묻는 유지보수 FAQ

- **Q. 사용자가 접속했을 때 이전 공지가 늦게 떠요.**
  - [index.html](file:///c:/Users/user/Desktop/workspace/sodam-cafe/index.html) 상태 카드 아래의 인라인 캐시 스크립트 및 [js/cafe.js](file:///c:/Users/user/Desktop/workspace/sodam-cafe/js/cafe.js)의 `STATUS_CACHE_KEY` 동기화 로직을 점검하세요.
- **Q. 수동으로 마감했는데 다음 날에도 안 열려요.**
  - Firestore의 `cafe/status` 문서의 `manualDate`가 현재 날짜(`YYYY-MM-DD`)와 다르면 자동으로 시간표로 풀립니다. 기기 로컬 시간대 설정을 확인하세요.

---

### [2026-09-28 11:36] 낮/밤(시크릿 모드) 테마 토글 인터랙션 및 원형 마스크 전환 구현
- **작업 목적:** 커피콩 ↔ 초승달 SVG 모핑 애니메이션과 View Transitions API 기반 원형 마스크 확장 화면 전환 및 시크릿 나이트 모드 테마 구현
- **수정/생성된 파일:**
  - `style.css`: 딥 에스프레소(#12100E) & 앰버 골든 테마 토큰, 토글 모핑 애니메이션 및 View Transitions 원형 마스크 CSS 추가
  - `js/cafe.js`: 클릭 좌표 기반 View Transitions API 연동, Web Audio API 스위치 사운드, fallback 서클 트랜지션 함수 구현
  - `test.html`: 커피콩 ↔ 초승달 모핑 토글 컴포넌트 마크업 반영 및 테스트 컨트롤러 연동, 캐시 방지 버전 파라미터 갱신
- **주요 변경 사항:**
  - `style.css`: `[data-theme="dark"]`에 딥 모디 에스프레소 톤(#12100E)과 앰버 네온(#FFB020) 앰비언트 변수 적용, `::view-transition-new(root)`에 0.6s `circle-expand` 애니메이션 구현
  - `js/cafe.js`: `toggleTheme(event)`에서 클릭 좌표와 화면 대각선 최대 반지름을 계산하여 CSS 변수 세팅 후 `document.startViewTransition` 실행, `playThemeSwitchSound`로 햅틱 오디오 연출
  - `test.html`: 사전 검증 원칙에 따라 프로덕션(`index.html`) 배포 전 `test.html`에 커피콩 ↔ 초승달 모핑 토글러 및 시크릿 닷 라벨 선반영
- **테스트 및 검증 방법:**
  - `node -c js/cafe.js` 문법 검사 확인
  - 브라우저에서 `test.html` 접속 후 우측 상단 토글 버튼 클릭 시 커피콩이 회전하며 빛나는 초승달로 모핑되고, 클릭 지점을 중심으로 0.6s 동안 원형 마스크가 펼쳐지며 시크릿 톤으로 전환되는지 확인
---

### [2026-09-28 11:39] 테마 토글 버튼 표시 문구 변경 (낮/시크릿 → 라이트/다크)
- **작업 목적:** 테마 토글 버튼 상태 표시 텍스트를 직관적인 '라이트 / 다크'로 변경
- **수정/생성된 파일:**
  - `js/cafe.js`: `applyTheme` 내 텍스트 매핑 및 접근성 `aria-label`을 '라이트 / 다크'로 수정
  - `test.html`: 헤더 토글 버튼의 기본 텍스트를 '라이트'로 수정
- **주요 변경 사항:**
  - `theme === "dark"`일 때 `text.textContent = "다크"`, 아닐 때 `"라이트"`로 설정
- **테스트 및 검증 방법:**
  - `node -c js/cafe.js` 문법 검사 확인
  - `test.html`에서 테마 토글 버튼 클릭 시 텍스트가 '라이트' ↔ '다크'로 정상 교체되는지 확인
---

### [2026-09-28 11:42] 낮/밤(시크릿 모드) 테마 토글 프로덕션 이식 및 배포
- **작업 목적:** 사전 검증 완료된 커피콩 ↔ 초승달 모핑 토글 컴포넌트 및 View Transitions 원형 마스크 화면 전환 기능을 프로덕션(`index.html`)에 이식하고 배포
- **수정/생성된 파일:**
  - `index.html`: 헤더 토글 버튼 마크업을 커피콩/초승달 모핑 SVG로 교체, CSS/JS 캐시 방지 파라미터 갱신(`v=20260928_1`)
  - `sw.js`: 서비스 워커 캐시 버전 갱신(`sodam-cafe-v12`)
- **주요 변경 사항:**
  - `index.html` 상단 헤더 액션에 커피콩 ↔ 초승달 모핑 SVG 및 '라이트/다크' 라벨 컴포넌트 이식 완료
  - PWA 서비스 워커 및 정적 자산 캐시 버전 갱신으로 사용자 측 자동 업데이트 유도
- **테스트 및 검증 방법:**
  - `git add .` / `git commit` / `git push origin main`
  - `firebase deploy --only hosting` 실행 결과 확인
---
