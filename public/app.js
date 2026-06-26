/**
 * VidGrab - Frontend Logic (Self-Hosted Backend)
 */

(function () {
    'use strict';

    // --- DOM Elements ---
    const urlInput = document.getElementById('urlInput');
    const formatSelect = document.getElementById('formatSelect');
    const qualityGroup = document.getElementById('qualityGroup');
    const qualitySelect = document.getElementById('qualitySelect');
    const downloadBtn = document.getElementById('downloadBtn');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const downloadOverlay = document.getElementById('downloadOverlay');
    const downloadStatus = document.getElementById('downloadStatus');

    // --- Initialization ---
    function init() {
        downloadBtn.addEventListener('click', handleDownload);
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleDownload();
        });

        // Hide quality select if audio is chosen
        formatSelect.addEventListener('change', () => {
            if (formatSelect.value === 'audio') {
                qualityGroup.style.opacity = '0.5';
                qualitySelect.disabled = true;
            } else {
                qualityGroup.style.opacity = '1';
                qualitySelect.disabled = false;
            }
        });

        // Auto-paste
        urlInput.addEventListener('focus', async () => {
            if (urlInput.value === '' && navigator.clipboard && navigator.clipboard.readText) {
                try {
                    const text = await navigator.clipboard.readText();
                    if (isValidUrl(text)) {
                        urlInput.value = text;
                    }
                } catch {}
            }
        });
    }

    // --- URL Validation ---
    function isValidUrl(str) {
        try {
            const url = new URL(str);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    // --- Core Download Logic ---
    function handleDownload() {
        const url = urlInput.value.trim();

        if (!url) {
            showError('請輸入影片網址');
            return;
        }

        if (!isValidUrl(url)) {
            showError('請輸入有效的網址（需包含 http:// 或 https://）');
            return;
        }

        hideError();
        showOverlay('正在伺服器端處理與下載...');

        const type = formatSelect.value === 'audio' ? 'audio' : 'video';
        const quality = qualitySelect.value;

        // Build the download URL
        const downloadApiUrl = `/api/download?url=${encodeURIComponent(url)}&type=${encodeURIComponent(type)}&quality=${encodeURIComponent(quality)}`;

        // Trigger download natively
        const a = document.createElement('a');
        a.href = downloadApiUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Hide overlay after a delay (since browser native download has no JS callback)
        updateOverlayStatus('下載即將開始，請查看瀏覽器下載進度！');
        setTimeout(() => {
            hideOverlay();
        }, 5000);
    }

    // --- UI Helpers ---
    function showError(msg) {
        errorText.textContent = msg;
        errorMessage.style.display = 'flex';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function showOverlay(msg) {
        downloadStatus.textContent = msg;
        downloadOverlay.style.display = 'flex';
        downloadBtn.disabled = true;
    }

    function updateOverlayStatus(msg) {
        downloadStatus.textContent = msg;
    }

    function hideOverlay() {
        downloadOverlay.style.display = 'none';
        downloadBtn.disabled = false;
    }

    // --- Run ---
    init();
})();
