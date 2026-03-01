import QRCode from 'qrcode';
import './style.css';

// ============================================
// QRForge — Main Application
// ============================================

// --- DOM Elements ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Tabs
const tabs = $$('.tab');
const inputGroups = $$('.input-group');

// Inputs
const urlInput = $('#qr-url');
const textInput = $('#qr-text');
const wifiSsid = $('#wifi-ssid');
const wifiPass = $('#wifi-pass');
const wifiEnc = $('#wifi-enc');
const emailTo = $('#email-to');
const emailSubject = $('#email-subject');
const emailBody = $('#email-body');

// Controls
const fgColor = $('#fg-color');
const bgColor = $('#bg-color');
const fgColorVal = $('#fg-color-val');
const bgColorVal = $('#bg-color-val');
const qrSize = $('#qr-size');
const sizeVal = $('#size-val');
const errorLevel = $('#error-level');
const marginSize = $('#margin-size');

// Preview
const canvas = $('#qr-canvas');
const placeholder = $('#qr-placeholder');
const canvasWrap = $('#qr-canvas-wrap');
const charCounter = $('#char-counter');
const downloadActions = $('#download-actions');

// Download buttons
const btnDownloadPng = $('#btn-download-png');
const btnDownloadSvg = $('#btn-download-svg');
const btnCopy = $('#btn-copy');

// Bulk
const bulkInput = $('#bulk-input');
const btnBulkGenerate = $('#btn-bulk-generate');
const btnBulkDownload = $('#btn-bulk-download');
const bulkResults = $('#bulk-results');
const bulkCount = $('#bulk-count');

// History
const historyGrid = $('#history-grid');
const historyEmpty = $('#history-empty');
const btnClearHistory = $('#btn-clear-history');

// Toast
const toast = $('#toast');

// --- State ---
let currentType = 'url';
let currentData = '';
let debounceTimer = null;
const HISTORY_KEY = 'qrforge_history';
const MAX_HISTORY = 20;

// ============================================
// Tab Switching
// ============================================
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const type = tab.dataset.type;
        currentType = type;

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        inputGroups.forEach(g => g.classList.remove('active'));
        $(`#input-${type}`).classList.add('active');

        generateQR();
    });
});

// ============================================
// Get QR Data from inputs
// ============================================
function getQRData() {
    switch (currentType) {
        case 'url':
            return urlInput.value.trim();
        case 'text':
            return textInput.value.trim();
        case 'wifi': {
            const ssid = wifiSsid.value.trim();
            const pass = wifiPass.value.trim();
            const enc = wifiEnc.value;
            if (!ssid) return '';
            return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
        }
        case 'email': {
            const to = emailTo.value.trim();
            if (!to) return '';
            const sub = emailSubject.value.trim();
            const body = emailBody.value.trim();
            return `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
        }
        default:
            return '';
    }
}

// ============================================
// Generate QR Code
// ============================================
async function generateQR() {
    const data = getQRData();
    currentData = data;

    charCounter.textContent = data.length;

    if (!data) {
        canvas.style.display = 'none';
        placeholder.style.display = 'flex';
        canvasWrap.classList.remove('has-qr');
        downloadActions.style.display = 'none';
        return;
    }

    try {
        const size = parseInt(qrSize.value);
        const options = {
            width: size,
            margin: parseInt(marginSize.value),
            color: {
                dark: fgColor.value,
                light: bgColor.value,
            },
            errorCorrectionLevel: errorLevel.value,
        };

        await QRCode.toCanvas(canvas, data, options);

        canvas.style.display = 'block';
        placeholder.style.display = 'none';
        canvasWrap.classList.add('has-qr');
        downloadActions.style.display = 'flex';

        // Add to history
        addToHistory(data);
    } catch (err) {
        console.error('QR generation error:', err);
        showToast('Error generating QR code', 'error');
    }
}

// Debounced generation
function debouncedGenerate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(generateQR, 200);
}

// ============================================
// Event Listeners for Inputs
// ============================================
// Text inputs
[urlInput, textInput, wifiSsid, wifiPass, emailTo, emailSubject, emailBody].forEach(input => {
    input.addEventListener('input', debouncedGenerate);
});

// Select changes
[wifiEnc, errorLevel, marginSize].forEach(sel => {
    sel.addEventListener('change', generateQR);
});

// Color pickers
fgColor.addEventListener('input', () => {
    fgColorVal.textContent = fgColor.value;
    debouncedGenerate();
});

bgColor.addEventListener('input', () => {
    bgColorVal.textContent = bgColor.value;
    debouncedGenerate();
});

// Size slider
qrSize.addEventListener('input', () => {
    sizeVal.textContent = qrSize.value;
    debouncedGenerate();
});

// ============================================
// Download PNG
// ============================================
btnDownloadPng.addEventListener('click', () => {
    if (!currentData) return;

    const link = document.createElement('a');
    link.download = `qrforge-${sanitizeFilename(currentData)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('PNG downloaded!', 'success');
});

// ============================================
// Download SVG
// ============================================
btnDownloadSvg.addEventListener('click', async () => {
    if (!currentData) return;

    try {
        const svgString = await QRCode.toString(currentData, {
            type: 'svg',
            width: parseInt(qrSize.value),
            margin: parseInt(marginSize.value),
            color: {
                dark: fgColor.value,
                light: bgColor.value,
            },
            errorCorrectionLevel: errorLevel.value,
        });

        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `qrforge-${sanitizeFilename(currentData)}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('SVG downloaded!', 'success');
    } catch (err) {
        showToast('Error creating SVG', 'error');
    }
});

// ============================================
// Copy to Clipboard
// ============================================
btnCopy.addEventListener('click', async () => {
    if (!currentData) return;

    try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        // Fallback: copy as data URL
        try {
            await navigator.clipboard.writeText(canvas.toDataURL('image/png'));
            showToast('Image URL copied!', 'success');
        } catch (e) {
            showToast('Copy failed — try downloading instead', 'error');
        }
    }
});

// ============================================
// Bulk Generation
// ============================================
btnBulkGenerate.addEventListener('click', async () => {
    const lines = bulkInput.value.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length === 0) {
        showToast('Enter at least one URL or text', 'error');
        return;
    }

    if (lines.length > 50) {
        showToast('Maximum 50 items at a time', 'error');
        return;
    }

    bulkResults.innerHTML = '';
    bulkCount.textContent = `Generating ${lines.length} QR codes...`;

    const options = {
        width: 140,
        margin: 1,
        color: {
            dark: fgColor.value,
            light: bgColor.value,
        },
        errorCorrectionLevel: errorLevel.value,
    };

    let generated = 0;

    for (const line of lines) {
        try {
            const item = document.createElement('div');
            item.className = 'bulk-item';

            const itemCanvas = document.createElement('canvas');
            await QRCode.toCanvas(itemCanvas, line, options);

            const label = document.createElement('span');
            label.className = 'bulk-item-label';
            label.textContent = line;
            label.title = line;

            item.appendChild(itemCanvas);
            item.appendChild(label);

            // Click to download individual
            item.addEventListener('click', () => {
                const link = document.createElement('a');
                link.download = `qrforge-${sanitizeFilename(line)}.png`;
                link.href = itemCanvas.toDataURL('image/png');
                link.click();
                showToast('Downloaded!', 'success');
            });

            bulkResults.appendChild(item);
            generated++;
        } catch (err) {
            console.error(`Failed to generate QR for: ${line}`, err);
        }
    }

    bulkCount.textContent = `${generated} QR codes generated — click any to download`;
    btnBulkDownload.style.display = generated > 0 ? 'inline-flex' : 'none';
});

// Bulk download all as individual files
btnBulkDownload.addEventListener('click', () => {
    const items = bulkResults.querySelectorAll('.bulk-item canvas');
    const lines = bulkInput.value.split('\n').map(l => l.trim()).filter(Boolean);

    items.forEach((itemCanvas, i) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.download = `qrforge-${i + 1}-${sanitizeFilename(lines[i] || 'qr')}.png`;
            link.href = itemCanvas.toDataURL('image/png');
            link.click();
        }, i * 200); // stagger downloads
    });

    showToast(`Downloading ${items.length} files...`, 'success');
});

// ============================================
// History (localStorage)
// ============================================
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addToHistory(data) {
    const history = getHistory();
    // Avoid duplicates
    const existing = history.findIndex(h => h.data === data);
    if (existing !== -1) {
        history.splice(existing, 1);
    }
    history.unshift({
        data,
        type: currentType,
        date: new Date().toISOString(),
        fg: fgColor.value,
        bg: bgColor.value,
    });
    // Limit size
    if (history.length > MAX_HISTORY) {
        history.length = MAX_HISTORY;
    }
    saveHistory(history);
    renderHistory();
}

async function renderHistory() {
    const history = getHistory();

    if (history.length === 0) {
        historyEmpty.style.display = 'block';
        // Remove all history items but keep historyEmpty
        historyGrid.querySelectorAll('.history-item').forEach(el => el.remove());
        return;
    }

    historyEmpty.style.display = 'none';
    // Remove old items
    historyGrid.querySelectorAll('.history-item').forEach(el => el.remove());

    for (const item of history) {
        const el = document.createElement('div');
        el.className = 'history-item';

        const itemCanvas = document.createElement('canvas');
        try {
            await QRCode.toCanvas(itemCanvas, item.data, {
                width: 100,
                margin: 1,
                color: {
                    dark: item.fg || '#818cf8',
                    light: item.bg || '#0f0f1a',
                },
                errorCorrectionLevel: 'M',
            });
        } catch {
            continue;
        }

        const text = document.createElement('span');
        text.className = 'history-item-text';
        text.textContent = item.data;
        text.title = item.data;

        const date = document.createElement('span');
        date.className = 'history-item-date';
        date.textContent = formatDate(item.date);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'history-item-delete';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Remove';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromHistory(item.data);
        });

        el.appendChild(itemCanvas);
        el.appendChild(text);
        el.appendChild(date);
        el.appendChild(deleteBtn);

        // Click to load into generator
        el.addEventListener('click', () => {
            // Set the input
            if (item.type === 'url') {
                urlInput.value = item.data;
                switchToTab('url');
            } else if (item.type === 'text') {
                textInput.value = item.data;
                switchToTab('text');
            } else {
                urlInput.value = item.data;
                switchToTab('url');
            }
            if (item.fg) fgColor.value = item.fg;
            if (item.bg) bgColor.value = item.bg;
            fgColorVal.textContent = fgColor.value;
            bgColorVal.textContent = bgColor.value;
            generateQR();
            // Scroll to generator
            document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
            showToast('Loaded from history', 'success');
        });

        historyGrid.appendChild(el);
    }
}

function removeFromHistory(data) {
    const history = getHistory().filter(h => h.data !== data);
    saveHistory(history);
    renderHistory();
    showToast('Removed from history');
}

btnClearHistory.addEventListener('click', () => {
    if (getHistory().length === 0) return;
    saveHistory([]);
    renderHistory();
    showToast('History cleared');
});

function switchToTab(type) {
    currentType = type;
    tabs.forEach(t => {
        t.classList.toggle('active', t.dataset.type === type);
    });
    inputGroups.forEach(g => {
        g.classList.toggle('active', g.id === `input-${type}`);
    });
}

// ============================================
// Utilities
// ============================================
function sanitizeFilename(str) {
    return str
        .replace(/https?:\/\//g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 30);
}

function formatDate(iso) {
    try {
        const d = new Date(iso);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString();
    } catch {
        return '';
    }
}

function showToast(message, type = '') {
    toast.textContent = message;
    toast.className = 'toast show' + (type ? ` ${type}` : '');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.className = 'toast';
    }, 2500);
}

// ============================================
// Smooth Nav Scrolling
// ============================================
$$('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('href');
        const el = $(target);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        $$('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    });
});

// ============================================
// Initialize
// ============================================
renderHistory();

// Set default URL in input for quick demo
urlInput.value = 'https://qrforge.app';
generateQR();
