const DIET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CVuFbqhIMhYG4HMjJA7LO6lNiEsN9n9mbzKfcHNeql8/gviz/tq?tqx=out:json&gid=211458690';

let dietWeeklyData = {
  '월': {
    '한식': { main: '캠핑모듬구이 🍖', rice: '현미밥*잡곡밥 🍚', soup: '땡초어묵국 🥣', side1: '양배추*상추*쌈장', side2: '콩나물무침', dessert: '방울토마토 🍅', cal: '810 kcal' },
    '일품': { main: '파채오리엔탈만두무침 🥟', rice: '참치김치덮밥 🍛', soup: '땡초어묵국 🥣', side1: '콩나물무침', side2: '단무지/김치', dessert: '야쿠르트 🍦', cal: '840 kcal' }
  },
  '화': {
    '한식': { main: '치킨까스유린기 🍗', rice: '계란볶음밥 🍚', soup: '미니짬뽕(면) 🥣', side1: '매콤짜장소스', side2: '짜사이무침', dessert: '매실차 🍵', cal: '860 kcal' }
  },
  '수': {
    '한식': { main: '바싹너비아니구이 🥩', rice: '현미밥*잡곡밥 🍚', soup: '비엔나김치찌개 🥣', side1: '매콤감자조림', side2: '고사리마늘볶음', dessert: '감귤주스 🍊', cal: '830 kcal' },
    '일품': { main: '양념감자튀김 🍟', rice: '불고기치즈오븐라이스 🍛', soup: '비엔나김치찌개 🥣', side1: '고사리마늘볶음', side2: '단무지/김치', dessert: '감귤주스 🍊', cal: '880 kcal' }
  },
  '목': {
    '한식': { main: '불닭볶음탕 🍲', rice: '현미밥*잡곡밥 🍚', soup: '배추된장국 🥣', side1: '온두부*볶음김치', side2: '크래미오이무침', dessert: '바나나 🍌', cal: '820 kcal' }
  },
  '금': {
    '한식': { main: '해물완자전구이 🍳', rice: '현미밥*잡곡밥 🍚', soup: '뚝배기육개장 🥣', side1: '청포묵무침', side2: '팽이버섯겨자무침', dessert: '요구르트 🍦', cal: '820 kcal' }
  }
};

let selectedDietDay = '월';
let selectedDietType = '한식';

async function loadDietFromGoogleSheet(isManual = false) {
  const statusEl = document.getElementById('sheetSyncStatus');
  if (statusEl) statusEl.innerText = '🔄 구글 시트에서 최신 식단 불러오는 중...';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(DIET_SHEET_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    const text = await res.text();

    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const json = JSON.parse(jsonStr);
    const rows = json.table.rows;

    if (rows && rows.length > 0) {
      const parsed = {};
      rows.forEach(r => {
        const vals = r.c.map(cell => cell ? (cell.f || cell.v || '') : '');
        const dayName = String(vals[2] || '').trim();
        const typeName = String(vals[3] || '한식').trim();
        const menuRaw = String(vals[4] || '').trim();
        const dessertRaw = String(vals[5] || '').trim();

        if (!['월', '화', '수', '목', '금'].includes(dayName)) return;
        if (!parsed[dayName]) parsed[dayName] = {};

        const menuParts = menuRaw.split(',').map(s => s.trim()).filter(Boolean);
        let rice = '기장밥 🍚';
        let soup = '맑은장국 🥣';
        let main = '스페셜 메인 🍲';
        let side1 = '계란찜';
        let side2 = '김치';

        menuParts.forEach(item => {
          if (item.includes('밥') || item.includes('라이스')) rice = item;
          else if (item.includes('국') || item.includes('찌개') || item.includes('짬뽕') || item.includes('탕') || item.includes('육개장')) soup = item;
          else if (item.includes('구이') || item.includes('볶음') || item.includes('까스') || item.includes('전') || item.includes('탕수육') || item.includes('만두무침')) {
            if (main === '스페셜 메인 🍲') main = item;
            else if (side1 === '계란찜') side1 = item;
            else side2 = item;
          } else {
            if (side1 === '계란찜') side1 = item;
            else side2 = item;
          }
        });

        parsed[dayName][typeName] = {
          main: main,
          rice: rice,
          soup: soup,
          side1: side1,
          side2: side2,
          dessert: dessertRaw || '건강 후식 🍵',
          date: vals[1] || ''
        };
      });

      if (Object.keys(parsed).length > 0) {
        dietWeeklyData = parsed;
        if (statusEl) statusEl.innerText = '● 구글 스프레드시트 실시간 연동됨';
        if (isManual) alert('✅ 최신 구내식당 식단이 구글 시트에서 성공적으로 갱신되었습니다!');
      }
    }
  } catch (err) {
    console.warn('Google Sheet diet load failed, using fallback:', err);
    if (statusEl) statusEl.innerText = '● 기본 식단표 (오프라인 모드)';
    if (isManual) alert('⚠️ 구글 시트 연결 실패로 기본 식단이 표시됩니다.');
  }

  renderDietUI();
}

function selectDietDay(day, btn) {
  selectedDietDay = day;
  document.querySelectorAll('.diet-day-tabs .day-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    document.querySelectorAll('.diet-day-tabs .day-tab-btn').forEach(b => {
      if (b.innerText.trim().startsWith(day)) b.classList.add('active');
    });
  }

  const dayData = dietWeeklyData[day] || {};
  const types = Object.keys(dayData);
  const typeTabs = document.getElementById('dietTypeTabs');

  if (types.length > 1) {
    typeTabs.style.display = 'flex';
    selectedDietType = types.includes('한식') ? '한식' : types[0];
  } else {
    typeTabs.style.display = 'none';
    selectedDietType = types[0] || '한식';
  }

  updateDietTypeBtnUI();
  renderDietUI();
}

function selectDietType(type) {
  selectedDietType = type;
  updateDietTypeBtnUI();
  renderDietUI();
}

function updateDietTypeBtnUI() {
  const btnHansik = document.getElementById('btnTypeHansik');
  const btnIlpum = document.getElementById('btnTypeIlpum');
  if (btnHansik && btnIlpum) {
    if (selectedDietType === '한식') {
      btnHansik.classList.add('active');
      btnIlpum.classList.remove('active');
    } else {
      btnHansik.classList.remove('active');
      btnIlpum.classList.add('active');
    }
  }
}

function renderDietUI() {
  const dayData = dietWeeklyData[selectedDietDay];
  if (!dayData) return;
  const menu = dayData[selectedDietType] || Object.values(dayData)[0];
  if (!menu) return;

  document.getElementById('mainDish').innerText = menu.main;
  document.getElementById('riceDish').innerText = menu.rice;
  document.getElementById('soupDish').innerText = menu.soup;
  document.getElementById('side1').innerText = menu.side1;
  document.getElementById('side2').innerText = menu.side2;
  document.getElementById('dessert').innerText = menu.dessert;

  const desc = document.getElementById('dietMenuDescText');
  if (desc) desc.innerText = `🍱 ${selectedDietDay}요일 [${selectedDietType}] 식단 (11:30 ~ 13:00)`;
}

// 오늘 날짜 및 요일 초기화
const today = new Date();
const days = ['일', '월', '화', '수', '목', '금', '토'];
const currentDayName = days[today.getDay()];
const dietDateEl = document.getElementById('dietDateText');
if (dietDateEl) {
  dietDateEl.innerText = `📅 ${today.getMonth() + 1}월 ${today.getDate()}일 (${currentDayName}) 중식 11:30 ~ 13:00`;
}

const activeDay = ['월', '화', '수', '목', '금'].includes(currentDayName) ? currentDayName : '월';

loadDietFromGoogleSheet().then(() => {
  selectDietDay(activeDay);
});