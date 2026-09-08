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

  const remainH = Math.floor(remainMinutes / 60);
  const remainM = remainMinutes % 60;

  document.getElementById('remainWorkText').innerText = `오늘 필요한 순 근무시간: ${remainH}시간 ${remainM}분 (중식 1h 휴게 포함)`;
  document.getElementById('leaveTimeResult').innerText = formatTime;

  const now = new Date();
  const isFriday = now.getDay() === 5;
  const noticeBox = document.getElementById('ruleNoticeBox');
  noticeBox.innerHTML = '';

  if (isFriday) {
    if (finalLeaveTotalMinutes < 13 * 60) {
      noticeBox.innerHTML += `
        <div class="calc-alert-badge alert-success">
          🎉 <strong>금요일 가족친화의 날:</strong> 주 40시간이 충족되더라도 최소 공동근무시간(Core Time 10~13시) 종료 후인 <strong>13:00 정각 이후 칼퇴</strong> 가능합니다.
        </div>
      `;
    } else {
      noticeBox.innerHTML += `
        <div class="calc-alert-badge alert-success">
          🎉 <strong>금요일 가족친화의 날:</strong> 13시 이후 공동근무시간 단축이 적용되어 <strong>${formatTime}</strong>에 퇴근하시면 이번 주 40시간을 달성합니다!
        </div>
      `;
    }
  } else {
    if (finalLeaveTotalMinutes < 16 * 60) {
      noticeBox.innerHTML += `
        <div class="calc-alert-badge alert-warning">
          ⚠️ <strong>공동근무시간(Core Time 10~16시) 준수 안내:</strong> 계산된 시각이 16시 이전이지만, 정규 근무 인정을 위해서는 최소 <strong>16:00 이후</strong>에 퇴근하셔야 합니다. (금요일은 13:00)
        </div>
      `;
    }
  }

  if (remainMinutes < 5 * 60 && remainMinutes > 0) {
    noticeBox.innerHTML += `
      <div class="calc-alert-badge alert-info" style="margin-top:6px;">
        ℹ️ <strong>최소 근무시간 안내:</strong> 지침 제4조에 따라 1일 최소 5시간 이상 근무 규정을 준수해야 합니다.
      </div>
    `;
  }

  if (remainMinutes > 11 * 60) {
    noticeBox.innerHTML += `
      <div class="calc-alert-badge alert-warning" style="margin-top:6px;">
        ⚠️ <strong>최대 인정 한도 초과:</strong> 1일 최대 근무 인정 시간은 11시간입니다 (11시간 초과 근무는 불인정).
      </div>
    `;
  }

  const currentTotalMin = now.getHours() * 60 + now.getMinutes();
  const diffMin = finalLeaveTotalMinutes - currentTotalMin;
  const countBox = document.getElementById('remainCountdownText');

  if (diffMin > 0) {
    const diffH = Math.floor(diffMin / 60);
    const diffM = diffMin % 60;
    countBox.innerText = `현재 시각 기준 퇴근까지 약 ${diffH}시간 ${diffM}분 남음 ✨`;
  } else {
    countBox.innerText = `🎉 목표 근무시간을 이미 달성했습니다! 즐거운 퇴근 되세요! 🚗`;
  }

  document.getElementById('calcResultBox').style.display = 'block';
}

// 로드 시 초기 계산 1회 수행
calculateLeaveTime();