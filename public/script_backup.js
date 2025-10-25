// API Base URL
const API_BASE = '';

// DOM Elements
const systemStatus = document.getElementById('systemStatus');
const totalCards = document.getElementById('totalCards');
const totalAssets = document.getElementById('totalAssets');
const totalBackgrounds = document.getElementById('totalBackgrounds');
const totalLogos = document.getElementById('totalLogos');
const progressModal = document.getElementById('progressModal');
const progressTitle = document.getElementById('progressTitle');
const progressMessage = document.getElementById('progressMessage');
const progressFill = document.getElementById('progressFill');
            showToast('ข้อผิดพลาด', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'error');
            showModal('settingsModal');
            return;
        }document.getElementById('totalCards');
const totalAssets = document.getElementById('totalAssets');
const totalBackgrounds = document.getElementById('totalBackgrounds');
const totalLogos = document.getElementById('totalLogos');
const recentCards = document.getElementById('recentCards');
const progressModal = document.getElementById('progressModal');
const progressTitle = document.getElementById('progressTitle');
const progressMessage = document.getElementById('progressMessage');
const progressFill = document.getElementById('progressFill');
const toastContainer = document.getElementById('toastContainer');

// State
let currentAssets = {};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    await refreshStatus();
    await loadRecentCards();
    await loadAssets();
    await loadSettings();
    await checkSettingsStatus();
}

// Check if settings are configured and show reminder if needed
async function checkSettingsStatus() {
    // เสมอให้แสดง reminder เพราะเราไม่เก็บ credentials ไว้ใน server
    const settingsReminder = document.getElementById('settingsReminder');
    if (settingsReminder) {
        settingsReminder.style.display = 'block';
    }
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });

    // Modal close events
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// API Functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// Status Functions
async function refreshStatus() {
    try {
        updateSystemStatus('loading', 'กำลังตรวจสอบ...');
        
        const data = await apiCall('/status');
        
        if (data.success) {
            updateSystemStatus('online', 'ระบบพร้อมใช้งาน');
            
            // Update statistics
            totalCards.textContent = data.statistics.generatedCards.toLocaleString('th-TH');
            totalAssets.textContent = data.statistics.gameAssets.toLocaleString('th-TH');
            totalBackgrounds.textContent = data.statistics.backgrounds.toLocaleString('th-TH');
            totalLogos.textContent = data.statistics.logos.toLocaleString('th-TH');
            
            showToast('สำเร็จ', 'ระบบทำงานปกติ', 'success');
        } else {
            updateSystemStatus('offline', 'ระบบไม่พร้อมใช้งาน');
            showToast('ข้อผิดพลาด', 'ไม่สามารถตรวจสอบสถานะระบบได้', 'error');
        }
    } catch (error) {
        updateSystemStatus('offline', 'เกิดข้อผิดพลาด');
        showToast('ข้อผิดพลาด', `ไม่สามารถเชื่อมต่อ API ได้: ${error.message}`, 'error');
    }
}

function updateSystemStatus(status, text) {
    const indicator = systemStatus.querySelector('.status-indicator');
    const statusText = systemStatus.querySelector('.status-text');
    
    // Remove all status classes
    indicator.classList.remove('online', 'offline', 'loading');
    
    // Add new status class
    indicator.classList.add(status);
    statusText.textContent = text;
}

// Card Generation Functions
async function generateSingleCard() {
    try {
        // Get bot credentials from settings
        const { botToken, channelId } = getCurrentCredentials();
        
        if (!botToken || !channelId) {
            showToast('ข้อผิดพลาด', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'error');
            showModal('settingsModal');
            return;
        }

        showProgressModal('กำลังสร้างการ์ด...', 'โปรดรอสักครู่ กำลังสร้างการ์ดเกมใหม่');
        setProgress(20);
        
        const data = await apiCall('/generate/single', {
            method: 'POST',
            body: JSON.stringify({
                botToken: botToken,
                channelId: channelId
            })
        });
        
        setProgress(80);
        
        if (data.success) {
            setProgress(100);
            showToast('สำเร็จ', 'สร้างการ์ดและส่งไปยัง Telegram เรียบร้อยแล้ว!', 'success');
            
            // Refresh data
            setTimeout(async () => {
                await refreshStatus();
                await loadRecentCards();
                hideProgressModal();
            }, 1000);
        } else {
            throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างการ์ด');
        }
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถสร้างการ์ดได้: ${error.message}`, 'error');
    }
}

async function generateMultipleCards() {
    try {
        const count = parseInt(document.getElementById('cardCount').value) || 5;
        
        // Get bot credentials from settings
        const { botToken, channelId } = await getCurrentCredentials();
        
        if (!botToken || !channelId) {
            showToast('ข้อผิดพลาด', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'error');
            showModal('settingsModal');
            return;
        }
        
        showProgressModal('กำลังสร้างการ์ดหลายใบ...', `กำลังสร้างการ์ด ${count} ใบ`);
        setProgress(10);
        
        const data = await apiCall('/generate/multiple', {
            method: 'POST',
            body: JSON.stringify({
                count: count,
                botToken: botToken,
                channelId: channelId
            })
        });
        
        setProgress(90);
        
        if (data.success) {
            setProgress(100);
            const successCount = data.data.totalGenerated;
            const totalCount = data.data.totalRequested;
            
            showToast('สำเร็จ', `สร้างการ์ดสำเร็จ ${successCount}/${totalCount} ใบ`, 
                     successCount === totalCount ? 'success' : 'warning');
            
            // Refresh data
            setTimeout(async () => {
                await refreshStatus();
                await loadRecentCards();
                hideProgressModal();
            }, 1000);
        } else {
            throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างการ์ด');
        }
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถสร้างการ์ดได้: ${error.message}`, 'error');
    }
}

async function testSystem() {
    try {
        // Get bot credentials from settings
        const { botToken, channelId } = await getCurrentCredentials();
        
        if (!botToken || !channelId) {
            showToast('ข้อผิดพลาด', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'error');
            showModal('settingsModal');
            return;
        }

        showProgressModal('กำลังทดสอบระบบ...', 'ตรวจสอบการเชื่อมต่อ Telegram และระบบต่างๆ');
        setProgress(30);
        
        const data = await apiCall('/test', {
            method: 'POST',
            body: JSON.stringify({
                botToken: botToken,
                channelId: channelId
            })
        });
        
        setProgress(80);
        
        if (data.success) {
            setProgress(100);
            showToast('สำเร็จ', 'ระบบทำงานปกติทุกส่วน', 'success');
        } else {
            throw new Error('ระบบมีปัญหา');
        }
        
        setTimeout(() => {
            hideProgressModal();
        }, 1000);
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `การทดสอบระบบล้มเหลว: ${error.message}`, 'error');
    }
}

// Cards Display Functions
async function loadRecentCards() {
    try {
        const data = await apiCall('/cards');
        
        if (data.success) {
            const recentCardsData = data.cards.slice(0, 8); // Show only 8 recent cards
            displayCards(recentCardsData, recentCards);
        } else {
            throw new Error(data.error || 'ไม่สามารถโหลดการ์ดได้');
        }
    } catch (error) {
        recentCards.innerHTML = `
            <div class="loading-card">
                <i class="fas fa-exclamation-triangle"></i>
                <p>ไม่สามารถโหลดการ์ดได้: ${error.message}</p>
            </div>
        `;
    }
}

async function loadAllCards() {
    try {
        const data = await apiCall('/cards');
        
        if (data.success) {
            const allCardsGrid = document.getElementById('allCardsGrid');
            displayCards(data.cards, allCardsGrid);
            showModal('allCardsModal');
        } else {
            throw new Error(data.error || 'ไม่สามารถโหลดการ์ดได้');
        }
    } catch (error) {
        showToast('ข้อผิดพลาด', `ไม่สามารถโหลดการ์ดได้: ${error.message}`, 'error');
    }
}

function displayCards(cards, container) {
    if (cards.length === 0) {
        container.innerHTML = `
            <div class="loading-card">
                <i class="fas fa-image"></i>
                <p>ยังไม่มีการ์ดที่สร้างขึ้น</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = cards.map(card => `
        <div class="card-item">
            <img src="${card.url}" alt="${card.filename}" loading="lazy" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzVMMTI1IDUwSDE3NVY1MEgxMjVMMTAwIDc1WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'">
            <div class="card-actions">
                <button class="card-action-btn view" onclick="viewCard('${card.url}')" title="ดูการ์ด">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="card-action-btn delete" onclick="deleteCard('${card.filename}')" title="ลบการ์ด">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="card-info">
                <div class="card-filename">${card.filename}</div>
                <div class="card-date">${formatDate(card.created)}</div>
            </div>
        </div>
    `).join('');
}

function viewCard(url) {
    window.open(url, '_blank');
}

async function deleteCard(filename) {
    if (!confirm(`คุณต้องการลบการ์ด "${filename}" หรือไม่?`)) {
        return;
    }
    
    try {
        const data = await apiCall(`/cards/${filename}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            showToast('สำเร็จ', 'ลบการ์ดเรียบร้อยแล้ว', 'success');
            await loadRecentCards();
            await refreshStatus();
        } else {
            throw new Error(data.error || 'ไม่สามารถลบการ์ดได้');
        }
    } catch (error) {
        showToast('ข้อผิดพลาด', `ไม่สามารถลบการ์ดได้: ${error.message}`, 'error');
    }
}

// Assets Functions
async function loadAssets() {
    try {
        const data = await apiCall('/assets');
        
        if (data.success) {
            currentAssets = data.assets;
            displayAssets('backgrounds', data.assets.backgrounds);
            displayAssets('logos', data.assets.logos);
        } else {
            throw new Error(data.error || 'ไม่สามารถโหลด Assets ได้');
        }
    } catch (error) {
        const backgroundsGrid = document.getElementById('backgroundsGrid');
        const logosGrid = document.getElementById('logosGrid');
        
        const errorHtml = `
            <div class="loading-card">
                <i class="fas fa-exclamation-triangle"></i>
                <p>ไม่สามารถโหลด Assets ได้: ${error.message}</p>
            </div>
        `;
        
        backgroundsGrid.innerHTML = errorHtml;
        logosGrid.innerHTML = errorHtml;
    }
}

function displayAssets(type, assets) {
    const container = document.getElementById(`${type}Grid`);
    
    if (assets.length === 0) {
        container.innerHTML = `
            <div class="loading-card">
                <i class="fas fa-folder-open"></i>
                <p>ไม่มีไฟล์ ${type === 'backgrounds' ? 'พื้นหลัง' : 'โลโก้'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = assets.map(asset => `
        <div class="asset-item" onclick="viewCard('${asset.url}')">
            <img src="${asset.url}" alt="${asset.filename}" loading="lazy" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDE1MCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik03NSA1MEw5MCAzNUgxMjVWMzVIOTBMNzUgNTBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='">
            <div class="asset-info">
                <div class="asset-filename">${asset.filename}</div>
            </div>
        </div>
    `).join('');
}

// Tab Functions
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    
    // Load settings when opening settings modal
    if (modalId === 'settingsModal') {
        loadSettings();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function showProgressModal(title, message) {
    progressTitle.textContent = title;
    progressMessage.textContent = message;
    progressFill.style.width = '0%';
    progressModal.classList.add('active');
}

function hideProgressModal() {
    progressModal.classList.remove('active');
}

function setProgress(percentage) {
    progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
}

// Toast Functions
function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <p class="toast-message">${message}</p>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Helper Functions - ใช้ฟังก์ชันใหม่ที่ใช้ sessionStorage

// Settings Functions - ใช้ฟังก์ชันใหม่จาก sessionStorage

// Save Settings Function (เก็บใน sessionStorage เพื่อความปลอดภัย)
function saveSettings(event) {
    event.preventDefault();
    
    try {
        const form = document.getElementById('settingsForm');
        const formData = new FormData(form);
        const botToken = formData.get('botToken');
        const channelId = formData.get('channelId');
        
        if (!botToken || !channelId) {
            showToast('ข้อผิดพลาด', 'กรุณากรอก Bot Token และ Channel ID', 'error');
            return;
        }
        
        // Validate Bot Token format
        const botTokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
        if (!botTokenPattern.test(botToken)) {
            showToast('ข้อผิดพลาด', 'รูปแบบ Bot Token ไม่ถูกต้อง (ตัวอย่าง: 123456789:ABC-DEF1234567890)', 'error');
            return;
        }
        
        // Validate Channel ID format
        if (!channelId.startsWith('@') && !channelId.startsWith('-100')) {
            showToast('ข้อผิดพลาด', 'รูปแบบ Channel ID ไม่ถูกต้อง (ตัวอย่าง: @channel_name หรือ -1001234567890)', 'error');
            return;
        }
        
        // บันทึกลง sessionStorage (จะหายไปเมื่อปิดเบราว์เซอร์)
        sessionStorage.setItem('botToken', botToken);
        sessionStorage.setItem('channelId', channelId);
        
        showToast('สำเร็จ', 'บันทึกการตั้งค่าเรียบร้อย! ตอนนี้สามารถใช้งานระบบได้', 'success');
        
        // อัปเดตสถานะและปิด modal
        checkSettingsStatus();
        closeModal('settingsModal');
        
        // Clear form for security
        form.reset();
        
    } catch (error) {
        showToast('ข้อผิดพลาด', `ไม่สามารถบันทึกการตั้งค่าได้: ${error.message}`, 'error');
    }
}

// Load Settings Function (โหลดจาก sessionStorage)
function loadSettings() {
    try {
        const botToken = sessionStorage.getItem('botToken');
        const channelId = sessionStorage.getItem('channelId');
        
        if (botToken) {
            document.getElementById('botToken').value = botToken;
        }
        
        if (channelId) {
            document.getElementById('channelId').value = channelId;
        }
        
    } catch (error) {
        console.warn('Could not load settings:', error);
    }
}

// Get Current Credentials Function (ปรับปรุงให้ใช้ sessionStorage)
function getCurrentCredentials() {
    return {
        botToken: sessionStorage.getItem('botToken') || document.getElementById('botToken')?.value || '',
        channelId: sessionStorage.getItem('channelId') || document.getElementById('channelId')?.value || ''
    };
}

// ลบ restartServer function เพราะไม่จำเป็นแล้ว

async function testConnection() {
    try {
        const form = document.getElementById('settingsForm');
        const formData = new FormData(form);
        const botToken = formData.get('botToken');
        const channelId = formData.get('channelId');
        
        if (!botToken || !channelId) {
            showToast('ข้อผิดพลาด', 'กรุณากรอก Bot Token และ Channel ID ก่อนทดสอบ', 'error');
            return;
        }

        showProgressModal('กำลังทดสอบการเชื่อมต่อ...', 'ตรวจสอบ Bot Token และ Channel ID');
        setProgress(50);
        
        const data = await apiCall('/test', {
            method: 'POST',
            body: JSON.stringify({
                botToken: botToken,
                channelId: channelId
            })
        });
        
        setProgress(100);
        
        if (data.success) {
            showToast('สำเร็จ', 'การเชื่อมต่อ Telegram ทำงานปกติ', 'success');
        } else {
            showToast('เตือน', 'การเชื่อมต่อมีปัญหา กรุณาตรวจสอบการตั้งค่า', 'warning');
        }
        
        setTimeout(() => {
            hideProgressModal();
        }, 1000);
        
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถทดสอบการเชื่อมต่อได้: ${error.message}`, 'error');
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.input-toggle i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        button.className = 'fas fa-eye';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Auto refresh every 30 seconds
setInterval(async () => {
    if (!document.hidden) {
        await refreshStatus();
    }
}, 30000);

// Export functions for global access
window.generateSingleCard = generateSingleCard;
window.generateMultipleCards = generateMultipleCards;
window.testSystem = testSystem;
window.refreshStatus = refreshStatus;
window.loadAllCards = loadAllCards;
window.loadAssets = loadAssets;
window.viewCard = viewCard;
window.deleteCard = deleteCard;
window.closeModal = closeModal;
window.showModal = showModal;
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.testConnection = testConnection;

// ============= NEW FUNCTIONS FOR 4 NODE.JS SCRIPTS =============

// 🎯 Send Random Single Card Function
async function sendRandomCard() {
    const credentials = getCurrentCredentials();
    if (!credentials.botToken || !credentials.channelId) {
        showToast('เตือน', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'warning');
        showModal('settingsModal');
        return;
    }
    
    try {
        showProgressModal('กำลังส่งการ์ดสุ่ม', 'กำลังสร้างและส่งการ์ดแบบสุ่ม...');
        setProgress(20);
        
        const response = await apiCall('/send/random-single', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        
        if (response.success) {
            hideProgressModal();
            showToast('สำเร็จ', 'ส่งการ์ดสุ่มแล้ว!', 'success');
            await loadRecentCards();
            await refreshStatus();
        } else {
            throw new Error(response.error || 'ไม่สามารถส่งการ์ดได้');
        }
        
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถส่งการ์ดได้: ${error.message}`, 'error');
    }
}

// 🎲 Send Multiple Random Cards Function
async function sendMultipleRandomCards() {
    const credentials = getCurrentCredentials();
    if (!credentials.botToken || !credentials.channelId) {
        showToast('เตือน', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'warning');
        showModal('settingsModal');
        return;
    }
    
    const cardCount = parseInt(document.getElementById('randomCardCount').value) || 3;
    if (cardCount < 1 || cardCount > 20) {
        showToast('ข้อผิดพลาด', 'กรุณาระบุจำนวนการ์ด 1-20 ใบ', 'error');
        return;
    }
    
    try {
        showProgressModal('กำลังส่งการ์ดสุ่มหลายใบ', `กำลังสร้างและส่งการ์ดสุ่ม ${cardCount} ใบ...`);
        setProgress(10);
        
        const response = await apiCall('/send/multiple-random', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                count: cardCount,
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        
        if (response.success) {
            hideProgressModal();
            showToast('สำเร็จ', `ส่งการ์ดสุ่ม ${cardCount} ใบเรียบร้อย!`, 'success');
            await loadRecentCards();
            await refreshStatus();
        } else {
            throw new Error(response.error || 'ไม่สามารถส่งการ์ดได้');
        }
        
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถส่งการ์ดได้: ${error.message}`, 'error');
    }
}

// 🎮 Send Specific Game Card Function
async function sendSingleSpecificCard() {
    const credentials = getCurrentCredentials();
    if (!credentials.botToken || !credentials.channelId) {
        showToast('เตือน', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'warning');
        showModal('settingsModal');
        return;
    }
    
    const gameName = document.getElementById('specificGameName').value.trim();
    
    try {
        showProgressModal('กำลังส่งการ์ดเกม', gameName ? `กำลังสร้างการ์ดเกม: ${gameName}` : 'กำลังสร้างการ์ดเกมแบบสุ่ม...');
        setProgress(20);
        
        const response = await apiCall('/send/single-specific', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameName: gameName || undefined,
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        
        if (response.success) {
            hideProgressModal();
            showToast('สำเร็จ', `ส่งการ์ดเกม${gameName ? ` ${gameName}` : ''} เรียบร้อย!`, 'success');
            await loadRecentCards();
            await refreshStatus();
            
            // Clear input
            document.getElementById('specificGameName').value = '';
        } else {
            throw new Error(response.error || 'ไม่สามารถส่งการ์ดได้');
        }
        
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถส่งการ์ดได้: ${error.message}`, 'error');
    }
}

// 📄 Send Multiple Cards with Pagination Function
async function sendMultipleWithPagination() {
    const credentials = getCurrentCredentials();
    if (!credentials.botToken || !credentials.channelId) {
        showToast('เตือน', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'warning');
        showModal('settingsModal');
        return;
    }
    
    const cardCount = parseInt(document.getElementById('paginationCardCount').value) || 3;
    if (cardCount < 1 || cardCount > 10) {
        showToast('ข้อผิดพลาด', 'กรุณาระบุจำนวนการ์ด 1-10 ใบสำหรับ Pagination', 'error');
        return;
    }
    
    try {
        showProgressModal('กำลังส่งการ์ดพร้อม Pagination', `กำลังสร้างและส่งการ์ด ${cardCount} ใบพร้อมระบบเลื่อนดู...`);
        setProgress(10);
        
        const response = await apiCall('/send/multiple-pagination', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                count: cardCount,
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        
        if (response.success) {
            hideProgressModal();
            showToast('สำเร็จ', `ส่งการ์ดพร้อม Pagination ${cardCount} ใบเรียบร้อย!`, 'success');
            await loadRecentCards();
            await refreshStatus();
        } else {
            throw new Error(response.error || 'ไม่สามารถส่งการ์ดได้');
        }
        
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถส่งการ์ดได้: ${error.message}`, 'error');
    }
}

// Export new functions for global access
window.sendRandomCard = sendRandomCard;
window.sendMultipleRandomCards = sendMultipleRandomCards;
window.sendSingleSpecificCard = sendSingleSpecificCard;
window.sendMultipleWithPagination = sendMultipleWithPagination;
window.restartServer = restartServer;
window.togglePasswordVisibility = togglePasswordVisibility;
window.checkSettingsStatus = checkSettingsStatus;