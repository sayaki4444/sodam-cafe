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
   - 관리자가 관리자 모달(`⚙️`)에서 버튼을 누르면 Firestore에 `mode`, `manualDate(YYYY-MM-DD)`, `manualTime`이 기록됩니다.
   - 관리자가 **영업 마감**을 누르면 조기 마감 처리되어 당일(`todayStr === manualDate`) 동안 마감이 고정됩니다.
   - 익일 09:30이 되면 날짜가 달라지므로(`todayStr !== manualDate`) 어제의 수동 마감이 풀리고 새로운 날의 자동 스케줄로 자연스럽게 전환됩니다.

3. **로딩 깜빡임(FOUC) 방지 0초 렌더링**
   - Firestore 비동기 수신(1~2초 지연) 동안 기본값이 깜빡이지 않도록 `localStorage`(`sodam_cached_status`)에 최근 상태/공지를 저장합니다.
   - `index.html` 본문 상단 인라인 스크립트와 `cafe.js` 시작 즉시 캐시를 읽어 화면을 0ms 만에 이전 상태로 즉각 렌더링합니다.

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
2. **캐시 방지 쿼리 파라미터**:
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
