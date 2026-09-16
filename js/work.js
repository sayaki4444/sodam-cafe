function setNowAsStartTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('startTime').value = `${h}:${m}`;
  calculateLeaveTime();
}

function setPresetWork(h, m) {
  document.getElementById('prevHours').value = h;
  document.getElementById('prevMinutes').value = m;
  calculateLeaveTime();
}

function calculateLeaveTime() {
  const prevHours = parseInt(document.getElementById('prevHours').value) || 0;
  const prevMinutes = parseInt(document.getElementById('prevMinutes').value) || 0;
  const startTime = document.getElementById('startTime').value || "09:00";

  const totalDoneMinutes = (prevHours * 60) + prevMinutes;
  const remainMinutes = Math.max(0, (40 * 60) - totalDoneMinutes);

  const [startH, startM] = startTime.split(':').map(Number);
  const startTotalMinutes = (startH * 60) + startM;

  let lunchOffset = 0;
  if (startTotalMinutes < 12 * 60 && (startTotalMinutes + remainMinutes) > 12 * 60) {
    lunchOffset = 60;
  }

  let finalLeaveTotalMinutes = startTotalMinutes + remainMinutes + lunchOffset;

  const leaveH = Math.floor(finalLeaveTotalMinutes / 60) % 24;
  const leaveM = finalLeaveTotalMinutes % 60;
  const formatTime = `${String(leaveH).padStart(2, '0')}:${String(leaveM).padStart(2, '0')}`;

  const leaveTimeElem = document.getElementById('leaveTimeResult');
  if (leaveTimeElem) {
    leaveTimeElem.innerText = formatTime;
  }

  const now = new Date();
  const currentTotalMin = now.getHours() * 60 + now.getMinutes();
  const diffMin = finalLeaveTotalMinutes - currentTotalMin;
  const countBox = document.getElementById('remainCountdownText');

  if (countBox) {
    if (diffMin > 0) {
      const diffH = Math.floor(diffMin / 60);
      const diffM = diffMin % 60;
      countBox.innerText = `현재 시각 기준 퇴근까지 약 ${diffH}시간 ${diffM}분 남음 ✨`;
    } else {
      countBox.innerText = `🎉 목표 근무시간을 이미 달성했습니다! 즐거운 퇴근 되세요! 🚗`;
    }
  }

  const resultBox = document.getElementById('calcResultBox');
  if (resultBox) {
    resultBox.style.display = 'block';
  }
}

// 로드 시 초기 계산 1회 수행
calculateLeaveTime();