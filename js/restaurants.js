const KIOST_LAT = 35.0747;
const KIOST_LNG = 129.0827;

const restaurants = [
  { name: "소담 한식뷔페", category: "한식/찌개", rating: "⭐ 4.85", lat: 35.0755, lng: 129.0832, menu: "정갈한 한식 뷔페, 제육볶음, 가마솥된장찌개, 신선 쌈채소" },
  { name: "영도김가네밀면", category: "한식/찌개", rating: "⭐ 4.53", lat: 35.0738, lng: 129.0760, menu: "시원한 물밀면, 비빔밀면, 수제손만두" },
  { name: "칠암만장 피아크점", category: "한식/찌개", rating: "⭐ 4.60", lat: 35.0880, lng: 129.0715, menu: "숯불 민물장어구이, 전복 해물 솥밥, 가지 솥밥" },
  { name: "바보낙지 피아크점", category: "한식/찌개", rating: "⭐ 4.45", lat: 35.0880, lng: 129.0715, menu: "매콤 낙지볶음 정식, 낙지전골, 낙지호롱이" },
  { name: "왔다식당", category: "한식/찌개", rating: "⭐ 4.62", lat: 35.0920, lng: 129.0680, menu: "한우 스지된장전골, 스지김치전골, 스지수육" },
  { name: "자매보리밥", category: "한식/찌개", rating: "⭐ 4.48", lat: 35.0860, lng: 129.0600, menu: "푸짐한 나물 보리밥 정식, 구수한 된장찌개, 생선구이" },
  { name: "재기돼지국밥", category: "한식/찌개", rating: "⭐ 4.51", lat: 35.0935, lng: 129.0435, menu: "맑은 토렴식 돼지국밥, 수육백반, 순대" },
  { name: "제주복국 영도점", category: "한식/찌개", rating: "⭐ 4.42", lat: 35.0720, lng: 129.0710, menu: "시원한 은복지리, 밀복탕, 복불고기 정식" },
  { name: "동화루 중화요리", category: "중식", rating: "⭐ 4.55", lat: 35.0768, lng: 129.0815, menu: "해물짬뽕, 불향 간짜장, 바삭 찹쌀탕수육" },
  { name: "크리스탈 제이드 피아크점", category: "중식", rating: "⭐ 4.52", lat: 35.0880, lng: 129.0715, menu: "소롱포 딤섬, 상해식 탕수육, 정통 딴딴면" },
  { name: "태종대 짬뽕", category: "중식", rating: "⭐ 4.43", lat: 35.0535, lng: 129.0810, menu: "낙지한마리 태종대짬뽕, 해물짜장면, 탕수육" },
  { name: "화복반점", category: "중식", rating: "⭐ 4.50", lat: 35.0910, lng: 129.0670, menu: "진한 차돌짬뽕, 가성비 미니탕수육 세트, 중화비빔밥" },
  { name: "송화루", category: "중식", rating: "⭐ 4.46", lat: 35.0780, lng: 129.0720, menu: "특제 송화면, 옛날식 탕수육, 볶음밥" },
  { name: "차이홍", category: "중식", rating: "⭐ 4.40", lat: 35.0760, lng: 129.0740, menu: "해물쟁반짜장, 얼큰 불짬뽕, 바삭 깐풍기" },
  { name: "스시도담", category: "일식/돈까스", rating: "⭐ 4.74", lat: 35.0741, lng: 129.0845, menu: "모듬초밥세트, 생등심 히레카츠, 냉모밀" },
  { name: "뉴욕스시", category: "일식/돈까스", rating: "⭐ 4.58", lat: 35.0725, lng: 129.0840, menu: "오션뷰 모둠초밥 세트, 특선스시, 후토마키" },
  { name: "톤섬", category: "일식/돈까스", rating: "⭐ 4.65", lat: 35.0920, lng: 129.0520, menu: "프리미엄 숙성 특로스카츠, 히레카츠, 치즈카츠" },
  { name: "스시보노", category: "일식/돈까스", rating: "⭐ 4.52", lat: 35.0940, lng: 129.0450, menu: "가성비 커플 초밥세트, 연어초밥, 나가사키짬뽕" },
  { name: "은화수식당 영도남항점", category: "일식/돈까스", rating: "⭐ 4.45", lat: 35.0930, lng: 129.0440, menu: "경양식 매콤돈까스, 하와이돈까스, 수제카레" },
  { name: "가든토로 피아크점", category: "양식/피자", rating: "⭐ 4.56", lat: 35.0880, lng: 129.0715, menu: "와규 비프 스테이크, 트러플 크림 파스타, 마르게리따 화덕피자" },
  { name: "그라치에 (Grazie)", category: "양식/피자", rating: "⭐ 4.72", lat: 35.0910, lng: 129.0620, menu: "감자 뇨끼, 통오징어 먹물 리조또, 채끝 스테이크" },
  { name: "목장원", category: "양식/피자", rating: "⭐ 4.65", lat: 35.0680, lng: 129.0550, menu: "오션뷰 화덕피자, 해산물 파스타, 한우 숯불구이" },
  { name: "에센스 (Essence)", category: "양식/피자", rating: "⭐ 4.60", lat: 35.0905, lng: 129.0640, menu: "감성 브런치, 수제 비프버거, 쉬림프 오일 파스타" },
  { name: "그린샐러드랩", category: "분식/치킨", rating: "⭐ 4.92", lat: 35.0735, lng: 129.0820, menu: "우삼겹 웜보울, 생연어 아보카도 샐러드, 착즙주스" },
  { name: "우리동네 분식", category: "분식/치킨", rating: "⭐ 4.65", lat: 35.0760, lng: 129.0805, menu: "쌀떡볶이, 모둠수제튀김, 찰순대, 김밥" },
  { name: "와글와글", category: "분식/치킨", rating: "⭐ 4.71", lat: 35.0730, lng: 129.0610, menu: "전설의 라밥(라면+볶음밥), 순두부찌개, 치즈라볶이" },
  { name: "오늘도우리닭", category: "분식/치킨", rating: "⭐ 4.68", lat: 35.0580, lng: 129.0780, menu: "매콤크림치킨, 마늘간장치킨, 국물떡볶이" },
  { name: "백설대학", category: "분식/치킨", rating: "⭐ 4.62", lat: 35.0915, lng: 129.0630, menu: "생활의달인 쫄우동, 참기름 유부김밥, 떡볶이" },
  { name: "도날드", category: "분식/치킨", rating: "⭐ 4.55", lat: 35.0925, lng: 129.0490, menu: "30년 전통 즉석떡볶이, 뻥크림 아이스크림" },
  { name: "림스치킨 영도점", category: "분식/치킨", rating: "⭐ 4.42", lat: 35.0935, lng: 129.0445, menu: "바삭한 오리지널 후라이드, 마늘통닭" },
  { name: "돈하리 영도본점", category: "고기/구이", rating: "⭐ 4.78", lat: 35.0718, lng: 129.0815, menu: "꽃삼겹살, 돼지갈비 후라이드, 묵은지김치찌개" },
  { name: "소굴", category: "고기/구이", rating: "⭐ 4.62", lat: 35.0715, lng: 129.0840, menu: "한우 소곱창전골, 소곱창 모둠구이, 날치알 볶음밥" },
  { name: "어리목도새기촌", category: "고기/구이", rating: "⭐ 4.57", lat: 35.0750, lng: 129.0730, menu: "제주 생흑돼지 오겹살, 목살구이, 멜젓찌개" },
  { name: "몽작", category: "고기/구이", rating: "⭐ 4.68", lat: 35.0890, lng: 129.0560, menu: "도심 속 프라이빗 글램핑 숯불 바베큐, 이베리코 목살" },
  { name: "맛나감자탕 영도점", category: "고기/구이", rating: "⭐ 4.48", lat: 35.0890, lng: 129.0610, menu: "목뼈 감자탕, 매콤 뼈찜, 낙지비빔밥" },
  { name: "하리회식당", category: "회/해산물", rating: "⭐ 4.65", lat: 35.0720, lng: 129.0855, menu: "자연산 활어 물회, 제철 모듬생선회, 서더리 매운탕" },
  { name: "바다향기 뚝배기", category: "회/해산물", rating: "⭐ 4.70", lat: 35.0782, lng: 129.0790, menu: "얼큰 전복해물뚝배기, 제주 갈치조림, 생선구이 정식" },
  { name: "태종대 욜로조개구이", category: "회/해산물", rating: "⭐ 4.75", lat: 35.0540, lng: 129.0820, menu: "치즈 가리비 조개구이 세트, 해물라면, 볶음밥" },
  { name: "태종대 사랑방 조개구이", category: "회/해산물", rating: "⭐ 4.68", lat: 35.0545, lng: 129.0815, menu: "푸짐한 모둠 조개구이, 해물 칼국수" },
  { name: "청해수산", category: "회/해산물", rating: "⭐ 4.54", lat: 35.0925, lng: 129.0510, menu: "가성비 두툼한 모듬회, 활어초밥, 뼈매운탕" },
  { name: "피아크 (P.ARK) 카페&베이커리", category: "카페/디저트", rating: "⭐ 4.58", lat: 35.0880, lng: 129.0715, menu: "부산 최대 오션뷰 복합문화 베이커리 & 스페셜티 커피" },
  { name: "카페 385 (CAFE 385)", category: "카페/디저트", rating: "⭐ 4.63", lat: 35.0870, lng: 129.0730, menu: "오션뷰 대형 베이커리 카페, 영도 연탄빵, 크루아상" },
  { name: "모모스커피 로스터리 & 커피바", category: "카페/디저트", rating: "⭐ 4.78", lat: 35.0945, lng: 129.0460, menu: "월드 바리스타 챔피언 스페셜티 드립 커피" },
  { name: "신기숲", category: "카페/디저트", rating: "⭐ 4.54", lat: 35.0895, lng: 129.0590, menu: "대나무숲 힐링 오션뷰 카페, 핸드드립, 수제 팬케이크" },
  { name: "라발스 스카이카페", category: "카페/디저트", rating: "⭐ 4.50", lat: 35.0950, lng: 129.0440, menu: "파노라마 부산항 뷰, 프리미엄 디저트 & 커피" }
];

function calcDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatDistance(meters) {
  if (meters < 1000) {
    const walkMin = Math.max(1, Math.round(meters / 70));
    return `도보 ${walkMin}분 (${meters}m)`;
  } else {
    const km = (meters / 1000).toFixed(1);
    const carMin = Math.max(2, Math.round(meters / 400));
    return `차량 ${carMin}분 (${km}km)`;
  }
}

function renderRestaurants(category = '전체') {
  const container = document.getElementById('restaurantList');
  if (!container) return;
  container.innerHTML = '';

  const list = restaurants
    .map(r => {
      const dist = calcDistanceMeters(KIOST_LAT, KIOST_LNG, r.lat, r.lng);
      return { ...r, distMeters: dist, distText: formatDistance(dist) };
    })
    .filter(r => r.distMeters <= 3500);

  list.sort((a, b) => a.distMeters - b.distMeters);
  const filtered = category === '전체' ? list : list.filter(r => r.category === category);

  filtered.forEach(r => {
    const mapQuery = encodeURIComponent(r.name);
    container.innerHTML += `
      <div class="res-card">
        <div class="res-info">
          <div class="res-header">
            <span class="res-name">${r.name}</span>
            <span class="res-tag">${r.category}</span>
          </div>
          <div class="res-detail">${r.menu}</div>
          <div class="res-meta">
            <span class="res-dist">📍 ${r.distText}</span>
            <span class="res-rating">${r.rating}</span>
          </div>
        </div>
        <a href="https://m.map.naver.com/search2/search.naver?query=${mapQuery}" target="_blank" rel="noopener noreferrer" class="res-map-btn" title="네이버 지도 보기" aria-label="${r.name} 네이버 지도 보기">
          🗺️
        </a>
      </div>
    `;
  });
}

function filterCategory(cat, btn) {
  document.querySelectorAll('.filter-pills .pill-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRestaurants(cat);
}

// 로드 시 초기 렌더링
renderRestaurants();