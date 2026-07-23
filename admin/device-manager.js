(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  function formatDate(value) {
    if (!value) return '확인 불가';
    try { return new Date(value).toLocaleString('ko-KR'); } catch { return '확인 불가'; }
  }

  async function loadTrustedDevices() {
    const list = $('#trustedDevicesList');
    if (!list) return;
    list.innerHTML = '<p class="device-empty">등록된 휴대폰을 불러오고 있습니다.</p>';

    try {
      const response = await fetch('/api/admin/devices', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || '휴대폰 목록을 불러오지 못했습니다.');

      if (!result.storageAvailable) {
        list.innerHTML = '<p class="device-empty error">기기 저장소가 연결되어 있지 않아 목록을 표시할 수 없습니다.</p>';
        return;
      }

      if (!result.devices.length) {
        list.innerHTML = '<p class="device-empty">등록된 휴대폰이 없습니다. 아래에서 새 QR을 만들어 연결해주세요.</p>';
        return;
      }

      list.innerHTML = result.devices.map(device => `
        <article class="managed-device-card" data-device-id="${esc(device.id)}">
          <span class="managed-device-icon">📱</span>
          <div class="managed-device-info">
            <strong>${esc(device.name || '내 휴대폰')}</strong>
            <small>등록일 ${esc(formatDate(device.createdAt))}</small>
          </div>
          <button class="btn danger small revoke-device-btn" type="button" data-device-id="${esc(device.id)}" data-device-name="${esc(device.name || '내 휴대폰')}">신뢰 해제</button>
        </article>`).join('');

      list.querySelectorAll('.revoke-device-btn').forEach(button => {
        button.addEventListener('click', () => revokeDevice(button.dataset.deviceId, button.dataset.deviceName));
      });
    } catch (error) {
      list.innerHTML = `<p class="device-empty error">${esc(error.message)}</p>`;
    }
  }

  async function revokeDevice(deviceId, deviceName) {
    if (!confirm(`${deviceName}의 신뢰를 해제할까요?\n해제 후 해당 휴대폰에서는 다시 인증해야 합니다.`)) return;

    const button = document.querySelector(`.revoke-device-btn[data-device-id="${CSS.escape(deviceId)}"]`);
    if (button) {
      button.disabled = true;
      button.textContent = '해제 중…';
    }

    try {
      const response = await fetch('/api/admin/revoke-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || '신뢰 해제에 실패했습니다.');
      await loadTrustedDevices();
    } catch (error) {
      alert(error.message);
      if (button) {
        button.disabled = false;
        button.textContent = '신뢰 해제';
      }
    }
  }

  const securityButton = $('#securityBtn');
  const refreshButton = $('#refreshDevicesBtn');
  const pairingButton = $('#generateQrBtn');

  securityButton?.addEventListener('click', () => setTimeout(loadTrustedDevices, 0));
  refreshButton?.addEventListener('click', loadTrustedDevices);
  pairingButton?.addEventListener('click', () => {
    setTimeout(loadTrustedDevices, 1200);
    setTimeout(loadTrustedDevices, 5000);
  });

  window.addEventListener('focus', () => {
    const dialog = $('#securityDialog');
    if (dialog?.open) loadTrustedDevices();
  });
})();
