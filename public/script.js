// API Base URL
const API_BASE = '';

// Global authentication state
let isCheckingAuth = false;
let isAuthenticated = false;

// Authentication check
async function checkAuthentication() {
    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth) {
        return isAuthenticated;
    }
    
    isCheckingAuth = true;
    
    try {
        const response = await fetch('/api/check-auth', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (!result.authenticated) {
            isAuthenticated = false;
            // Only redirect if we're not already on login page
            if (!window.location.pathname.includes('/login')) {
                window.location.replace('/login');
            }
            return false;
        }
        
        isAuthenticated = true;
        return true;
    } catch (error) {
        console.error('Authentication check failed:', error);
        isAuthenticated = false;
        // Only redirect if we're not already on login page
        if (!window.location.pathname.includes('/login')) {
            window.location.replace('/login');
        }
        return false;
    } finally {
        isCheckingAuth = false;
    }
}

// Logout function
function logout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        // Set flag to prevent auth checking
        isAuthenticated = false;
        
        fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        }).then(response => response.json())
        .then(result => {
            if (result.success) {
                window.location.replace('/login');
            }
        }).catch(error => {
            console.error('Logout error:', error);
            window.location.replace('/login');
        });
    }
}

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

// API Helper Function
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE}/api${endpoint}`;
    
    // Add credentials to options
    options = {
        credentials: 'include',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const response = await fetch(url, options);
    if (!response.ok) {
        if (response.status === 401) {
            // Unauthorized - redirect to login only if not already there
            isAuthenticated = false;
            if (!window.location.pathname.includes('/login')) {
                window.location.replace('/login');
            }
            return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Progress Functions
function setProgress(percent) {
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
}

// Toast Notification Function
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="${iconMap[type] || iconMap.info}"></i>
            <div>
                <strong>${title}</strong>
                <p>${message}</p>
            </div>
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

// Settings Functions
function saveSettings(event) {
    event.preventDefault();
    
    try {
        const form = document.getElementById('settingsForm');
        const formData = new FormData(form);
        const botToken = formData.get('botToken');
        const channelIdInput = formData.get('channelId');
        
        if (!botToken || !channelIdInput) {
            showToast('ข้อผิดพลาด', 'กรุณากรอก Bot Token และ Channel ID', 'error');
            return;
        }
        
        // Validate Bot Token format
        const botTokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
        if (!botTokenPattern.test(botToken)) {
            showToast('ข้อผิดพลาด', 'รูปแบบ Bot Token ไม่ถูกต้อง (ตัวอย่าง: 123456789:ABC-DEF1234567890)', 'error');
            return;
        }
        
        // Parse and validate channel IDs
        const channels = parseChannelIds(channelIdInput);
        if (channels.length === 0) {
            showToast('ข้อผิดพลาด', 'กรุณาระบุ Channel ID อย่างน้อย 1 แชแนล', 'error');
            return;
        }
        
        // Validate each channel ID
        const invalidChannels = [];
        const validChannels = [];
        
        channels.forEach(channelId => {
            const validation = validateChannelId(channelId);
            if (validation.valid) {
                validChannels.push(channelId);
            } else {
                invalidChannels.push(channelId);
            }
        });
        
        if (invalidChannels.length > 0) {
            showToast('ข้อผิดพลาด', 
                `Channel ID ไม่ถูกต้อง: ${invalidChannels.join(', ')}\n` +
                'รูปแบบที่ถูกต้อง: @channel_name หรือ -1001234567890', 'error');
            return;
        }
        
        if (validChannels.length === 0) {
            showToast('ข้อผิดพลาด', 'ไม่พบ Channel ID ที่ถูกต้อง', 'error');
            return;
        }
        
        // Format channels for storage (comma-separated for backward compatibility)
        const formattedChannels = validChannels.join(',');
        
        // บันทึกลง sessionStorage (จะหายไปเมื่อปิดเบราว์เซอร์)
        sessionStorage.setItem('botToken', botToken);
        sessionStorage.setItem('channelId', formattedChannels);
        
        const successMessage = validChannels.length === 1 
            ? 'บันทึกการตั้งค่าเรียบร้อย! ตอนนี้สามารถใช้งานระบบได้'
            : `บันทึกการตั้งค่าเรียบร้อย! พร้อมส่งไปยัง ${validChannels.length} แชแนล`;
            
        showToast('สำเร็จ', successMessage, 'success');
        
        // อัปเดตสถานะและปิด modal
        checkSettingsStatus();
        closeModal('settingsModal');
        
        // Clear form for security (but keep channels for user convenience)
        form.querySelector('#botToken').value = '';
        
    } catch (error) {
        showToast('ข้อผิดพลาด', `ไม่สามารถบันทึกการตั้งค่าได้: ${error.message}`, 'error');
    }
}

function loadSettings() {
    try {
        const botToken = sessionStorage.getItem('botToken');
        const channelId = sessionStorage.getItem('channelId');
        
        if (botToken) {
            document.getElementById('botToken').value = botToken;
        }
        
        if (channelId) {
            document.getElementById('channelId').value = channelId;
            // Update channel preview after loading
            updateChannelPreview();
        }
        
    } catch (error) {
        console.warn('Could not load settings:', error);
    }
}

function getCurrentCredentials() {
    return {
        botToken: sessionStorage.getItem('botToken') || document.getElementById('botToken')?.value || '',
        channelId: sessionStorage.getItem('channelId') || document.getElementById('channelId')?.value || ''
    };
}

function checkSettingsStatus() {
    const credentials = getCurrentCredentials();
    const settingsReminder = document.getElementById('settingsReminder');
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    if (credentials.botToken && credentials.channelId) {
        if (settingsReminder) settingsReminder.style.display = 'none';
        if (statusIndicator) statusIndicator.style.color = '#10b981';
        
        // Show channel count in status
        const channels = parseChannelIds(credentials.channelId);
        const channelCount = channels.length;
        const statusMessage = channelCount === 1 
            ? 'พร้อมใช้งาน (1 แชแนล)'
            : `พร้อมใช้งาน (${channelCount} แชแนล)`;
            
        if (statusText) statusText.textContent = statusMessage;
    } else {
        if (settingsReminder) settingsReminder.style.display = 'block';
        if (statusIndicator) statusIndicator.style.color = '#f59e0b';
        if (statusText) statusText.textContent = 'ตั้งค่าระบบ';
    }
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    
    if (modalId === 'settingsModal') {
        loadSettings();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

function showProgressModal(title, message) {
    if (progressTitle) progressTitle.textContent = title;
    if (progressMessage) progressMessage.textContent = message;
    if (progressFill) progressFill.style.width = '0%';
    if (progressModal) progressModal.classList.add('active');
}

function hideProgressModal() {
    if (progressModal) progressModal.classList.remove('active');
}

// Card Generation Functions
async function generateSingleCard() {
    const credentials = getCurrentCredentials();
    if (!credentials.botToken || !credentials.channelId) {
        showToast('เตือน', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'warning');
        showModal('settingsModal');
        return;
    }
    
    try {
        showProgressModal('กำลังสร้างการ์ด', 'กำลังสร้างและส่งการ์ด...');
        setProgress(20);
        
        const response = await apiCall('/generate/single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        
        if (response.success) {
            hideProgressModal();
            
            // แสดงข้อมูล channel ที่ส่งสำเร็จ
            let successMessage = 'สร้างและส่งการ์ดเรียบร้อย!';
            if (response.data && response.data.channelInfo) {
                const { totalChannels, successCount } = response.data.channelInfo;
                if (totalChannels > 1) {
                    successMessage += `\nส่งสำเร็จ ${successCount}/${totalChannels} แชแนล`;
                }
            }
            
            showToast('สำเร็จ', successMessage, 'success');
            await loadRecentCards();
            await refreshStatus();
        } else {
            throw new Error(response.error || 'ไม่สามารถสร้างการ์ดได้');
        }
        
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถสร้างการ์ดได้: ${error.message}`, 'error');
    }
}

async function generateMultipleCards() {
    const credentials = getCurrentCredentials();
    if (!credentials.botToken || !credentials.channelId) {
        showToast('เตือน', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'warning');
        showModal('settingsModal');
        return;
    }
    
    const cardCount = parseInt(document.getElementById('cardCount').value) || 5;
    
    try {
        showProgressModal('กำลังสร้างการ์ด', `กำลังสร้างและส่งการ์ด ${cardCount} ใบ...`);
        setProgress(10);
        
        const response = await apiCall('/generate/multiple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                count: cardCount,
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        
        if (response.success) {
            hideProgressModal();
            
            // แสดงข้อมูล channel ที่ส่งสำเร็จ
            let successMessage = `สร้างและส่งการ์ด ${cardCount} ใบเรียบร้อย!`;
            if (response.data && response.data.channelInfo) {
                const { totalChannels, successCount } = response.data.channelInfo;
                if (totalChannels > 1) {
                    successMessage += `\nส่งสำเร็จ ${successCount}/${totalChannels} แชแนล`;
                }
            }
            
            showToast('สำเร็จ', successMessage, 'success');
            await loadRecentCards();
            await refreshStatus();
        } else {
            throw new Error(response.error || 'ไม่สามารถสร้างการ์ดได้');
        }
        
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถสร้างการ์ดได้: ${error.message}`, 'error');
    }
}

// New Functions for 4 Node.js Scripts
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        
        if (response.success) {
            hideProgressModal();
            
            // แสดงข้อมูล channel ที่ส่งสำเร็จ
            let successMessage = 'ส่งการ์ดสุ่มเรียบร้อย!';
            if (response.data && response.data.channelInfo) {
                const { totalChannels, successCount } = response.data.channelInfo;
                if (totalChannels > 1) {
                    successMessage += `\nส่งสำเร็จ ${successCount}/${totalChannels} แชแนล`;
                }
            }
            
            showToast('สำเร็จ', successMessage, 'success');
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                count: cardCount,
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        
        if (response.success) {
            hideProgressModal();
            
            // แสดงข้อมูล channel ที่ส่งสำเร็จ
            let successMessage = `ส่งการ์ดสุ่ม ${cardCount} ใบเรียบร้อย!`;
            if (response.data && response.data.channelInfo) {
                const { totalChannels, successCount } = response.data.channelInfo;
                if (totalChannels > 1) {
                    successMessage += `\nส่งสำเร็จ ${successCount}/${totalChannels} แชแนล`;
                }
            }
            
            showToast('สำเร็จ', successMessage, 'success');
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameName: gameName || undefined,
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        
        if (response.success) {
            hideProgressModal();
            
            // แสดงข้อมูล channel ที่ส่งสำเร็จ
            let successMessage = `ส่งการ์ดเกม${gameName ? ` ${gameName}` : ''} เรียบร้อย!`;
            if (response.data && response.data.channelInfo) {
                const { totalChannels, successCount } = response.data.channelInfo;
                if (totalChannels > 1) {
                    successMessage += `\nส่งสำเร็จ ${successCount}/${totalChannels} แชแนล`;
                }
            }
            
            showToast('สำเร็จ', successMessage, 'success');
            await loadRecentCards();
            await refreshStatus();
            document.getElementById('specificGameName').value = '';
        } else {
            throw new Error(response.error || 'ไม่สามารถส่งการ์ดได้');
        }
        
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถส่งการ์ดได้: ${error.message}`, 'error');
    }
}

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                count: cardCount,
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        
        if (response.success) {
            hideProgressModal();
            
            // แสดงข้อมูล channel ที่ส่งสำเร็จ
            let successMessage = `ส่งการ์ดพร้อม Pagination ${cardCount} ใบเรียบร้อย!`;
            if (response.data && response.data.channelInfo) {
                const { totalChannels, successCount } = response.data.channelInfo;
                if (totalChannels > 1) {
                    successMessage += `\nส่งสำเร็จ ${successCount}/${totalChannels} แชแนล`;
                }
            }
            
            showToast('สำเร็จ', successMessage, 'success');
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

// Other Functions
async function testSystem() {
    const credentials = getCurrentCredentials();
    if (!credentials.botToken || !credentials.channelId) {
        showToast('เตือน', 'กรุณาตั้งค่า Bot Token และ Channel ID ก่อน', 'warning');
        showModal('settingsModal');
        return;
    }
    
    try {
        showProgressModal('กำลังทดสอบระบบ', 'ตรวจสอบการเชื่อมต่อ Telegram...');
        setProgress(50);
        
        const response = await apiCall('/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                botToken: credentials.botToken,
                channelId: credentials.channelId
            })
        });
        
        setProgress(100);
        hideProgressModal();
        
        if (response.success) {
            showToast('สำเร็จ', 'ระบบทำงานปกติ!', 'success');
        } else {
            showToast('ข้อผิดพลาด', response.error || 'การทดสอบไม่สำเร็จ', 'error');
        }
        
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถทดสอบระบบได้: ${error.message}`, 'error');
    }
}

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
        
        const response = await apiCall('/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botToken, channelId })
        });
        
        setProgress(100);
        hideProgressModal();
        
        if (response.success) {
            const details = response.testDetails;
            let message = `การเชื่อมต่อสำเร็จ! ส่งได้ ${details.successCount}/${details.totalChannels} แชแนล`;
            
            if (details.results) {
                message += '\n\nรายละเอียด:';
                details.results.forEach((result, index) => {
                    if (result.success) {
                        message += `\n✅ ${result.channelId} - ส่งสำเร็จ`;
                    } else {
                        message += `\n❌ ${result.channelId} - ${result.error}`;
                    }
                });
            }
            
            showToast('สำเร็จ', message, 'success');
        } else {
            let errorMessage = response.error || 'การทดสอบการเชื่อมต่อไม่สำเร็จ';
            
            if (response.testDetails && response.testDetails.results) {
                errorMessage += '\n\nรายละเอียด:';
                response.testDetails.results.forEach((result, index) => {
                    if (result.success) {
                        errorMessage += `\n✅ ${result.channelId} - ส่งสำเร็จ`;
                    } else {
                        errorMessage += `\n❌ ${result.channelId} - ${result.error}`;
                    }
                });
            }
            
            showToast('ข้อผิดพลาด', errorMessage, 'error');
        }
        
    } catch (error) {
        hideProgressModal();
        showToast('ข้อผิดพลาด', `ไม่สามารถทดสอบการเชื่อมต่อได้: ${error.message}`, 'error');
    }
}

// Load Data Functions
async function loadRecentCards() {
    try {
        const data = await apiCall('/cards');
        if (data.success && data.cards) {
            const recentCardsContainer = document.getElementById('recentCards');
            if (!recentCardsContainer) return;
            
            if (data.cards.length === 0) {
                recentCardsContainer.innerHTML = `
                    <div class="loading-card">
                        <i class="fas fa-image"></i>
                        <p>ยังไม่มีการ์ดที่สร้าง</p>
                    </div>
                `;
                return;
            }
            
            // Show recent 6 cards
            const recentCards = data.cards.slice(0, 6);
            recentCardsContainer.innerHTML = recentCards.map(card => `
                <div class="card-item">
                    <img src="${card.url}" alt="${card.filename}" loading="lazy">
                    <div class="card-info">
                        <div class="card-filename">${card.filename}</div>
                        <div class="card-date">${new Date(card.created).toLocaleDateString('th-TH')}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.warn('Could not load recent cards:', error);
        const recentCardsContainer = document.getElementById('recentCards');
        if (recentCardsContainer) {
            recentCardsContainer.innerHTML = `
                <div class="loading-card">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>ไม่สามารถโหลดการ์ดได้</p>
                </div>
            `;
        }
    }
}

async function loadAssets() {
    try {
        const [backgrounds, logos] = await Promise.all([
            apiCall('/assets/backgrounds').catch(() => ({ success: false, assets: [] })),
            apiCall('/assets/logos').catch(() => ({ success: false, assets: [] }))
        ]);
        
        // Load backgrounds
        const backgroundsGrid = document.getElementById('backgroundsGrid');
        if (backgroundsGrid) {
            if (backgrounds.success && backgrounds.assets && backgrounds.assets.length > 0) {
                backgroundsGrid.innerHTML = backgrounds.assets.map(asset => `
                    <div class="asset-item">
                        <img src="${asset.url}" alt="${asset.filename}" loading="lazy">
                        <div class="asset-info">
                            <div class="asset-filename">${asset.filename}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                backgroundsGrid.innerHTML = `
                    <div class="loading-card">
                        <i class="fas fa-image"></i>
                        <p>ไม่พบไฟล์พื้นหลัง</p>
                    </div>
                `;
            }
        }
        
        // Load logos  
        const logosGrid = document.getElementById('logosGrid');
        if (logosGrid) {
            if (logos.success && logos.assets && logos.assets.length > 0) {
                logosGrid.innerHTML = logos.assets.map(asset => `
                    <div class="asset-item">
                        <img src="${asset.url}" alt="${asset.filename}" loading="lazy">
                        <div class="asset-info">
                            <div class="asset-filename">${asset.filename}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                logosGrid.innerHTML = `
                    <div class="loading-card">
                        <i class="fas fa-cube"></i>
                        <p>ไม่พบไฟล์โลโก้</p>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.warn('Could not load assets:', error);
    }
}

async function refreshStatus() {
    try {
        const data = await apiCall('/status');
        if (data.success && data.statistics) {
            if (totalCards) totalCards.textContent = data.statistics.generatedCards || 0;
            if (totalAssets) totalAssets.textContent = data.statistics.gameAssets || 0;
            if (totalBackgrounds) totalBackgrounds.textContent = data.statistics.backgrounds || 0;
            if (totalLogos) totalLogos.textContent = data.statistics.logos || 0;
        }
        
        // โหลดสถานะ scheduler
        await loadSchedulerStatus();
        
        checkSettingsStatus();
    } catch (error) {
        console.warn('Could not refresh status:', error);
        checkSettingsStatus();
    }
}

// Utility Functions
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

// ==================== Multi-Channel Management ====================

/**
 * Parse channel IDs from textarea input
 * Supports: comma-separated and line-separated formats
 */
function parseChannelIds(input) {
    if (!input || typeof input !== 'string') return [];
    
    // Clean input and split by both comma and newline
    const channels = input
        .split(/[,\n]/)
        .map(channel => channel.trim())
        .filter(channel => channel.length > 0);
    
    return channels;
}

/**
 * Validate channel ID format
 */
function validateChannelId(channelId) {
    // Username format: @channelname
    if (channelId.startsWith('@')) {
        return {
            valid: channelId.length > 1 && /^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(channelId),
            type: 'username',
            id: channelId
        };
    }
    
    // Numeric ID format: -1001234567890
    if (channelId.startsWith('-100')) {
        return {
            valid: /^-100\d{10}$/.test(channelId),
            type: 'numeric',
            id: channelId
        };
    }
    
    return {
        valid: false,
        type: 'unknown',
        id: channelId
    };
}

/**
 * Update channel preview
 */
function updateChannelPreview() {
    const textarea = document.getElementById('channelId');
    const preview = document.getElementById('channelPreview');
    const channelList = document.getElementById('channelList');
    
    if (!textarea || !preview || !channelList) return;
    
    const input = textarea.value;
    const channels = parseChannelIds(input);
    
    if (channels.length === 0) {
        preview.style.display = 'none';
        return;
    }
    
    preview.style.display = 'block';
    channelList.innerHTML = '';
    
    channels.forEach((channelId, index) => {
        const validation = validateChannelId(channelId);
        const item = document.createElement('div');
        item.className = `channel-item ${validation.valid ? '' : 'channel-error'}`;
        
        const icon = validation.valid ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
        const typeText = validation.type === 'username' ? 'Username' : 
                        validation.type === 'numeric' ? 'Numeric ID' : 'Invalid';
        
        item.innerHTML = `
            <i class="${icon} channel-icon"></i>
            <span class="channel-id">${channelId}</span>
            <span class="channel-type">${typeText}</span>
            <button class="remove-channel" onclick="removeChannel(${index})" title="ลบ ${channelId}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        channelList.appendChild(item);
    });
}

/**
 * Remove channel by index
 */
function removeChannel(index) {
    const textarea = document.getElementById('channelId');
    if (!textarea) return;
    
    const channels = parseChannelIds(textarea.value);
    channels.splice(index, 1);
    
    // Update textarea value
    textarea.value = channels.join('\n');
    
    // Update preview
    updateChannelPreview();
}

/**
 * Add new channel from input field
 */
function addNewChannel() {
    const newChannelInput = document.getElementById('newChannelId');
    const textarea = document.getElementById('channelId');
    
    if (!newChannelInput || !textarea) return;
    
    const newChannelId = newChannelInput.value.trim();
    if (!newChannelId) {
        showToast('ข้อผิดพลาด', 'กรุณาใส่ Channel ID', 'error');
        return;
    }
    
    // Validate new channel ID
    const validation = validateChannelId(newChannelId);
    if (!validation.valid) {
        showToast('ข้อผิดพลาด', 
            `รูปแบบ Channel ID ไม่ถูกต้อง: ${newChannelId}\n` +
            'รูปแบบที่ถูกต้อง: @channel_name หรือ -1001234567890', 'error');
        return;
    }
    
    // Get current channels
    const currentChannels = parseChannelIds(textarea.value);
    
    // Check if channel already exists
    if (currentChannels.includes(newChannelId)) {
        showToast('ข้อผิดพลาด', `Channel ID "${newChannelId}" มีอยู่แล้ว`, 'warning');
        newChannelInput.value = '';
        return;
    }
    
    // Add new channel
    currentChannels.push(newChannelId);
    textarea.value = currentChannels.join('\n');
    
    // Clear input
    newChannelInput.value = '';
    
    // Update preview
    updateChannelPreview();
    
    // Show success message
    showToast('สำเร็จ', `เพิ่ม Channel ID "${newChannelId}" เรียบร้อย`, 'success');
}

/**
 * Handle Enter key press in add channel input
 */
function handleAddChannelKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addNewChannel();
    }
}

/**
 * Format channels for API submission
 */
function formatChannelsForAPI(input) {
    const channels = parseChannelIds(input);
    const validChannels = channels.filter(channel => validateChannelId(channel).valid);
    
    // Return as comma-separated string for backward compatibility
    return validChannels.join(',');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkSettingsStatus();
    refreshStatus();
    loadRecentCards();
    loadAssets();
    
    // Initialize tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Initialize channel textarea listener
    const channelTextarea = document.getElementById('channelId');
    if (channelTextarea) {
        // Update preview on input
        channelTextarea.addEventListener('input', updateChannelPreview);
        channelTextarea.addEventListener('paste', function() {
            // Delay to allow paste content to be processed
            setTimeout(updateChannelPreview, 10);
        });
        
        // Initial preview update if there's existing content
        updateChannelPreview();
    }
});

// Tab Functions
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const activePanel = document.getElementById(tabName);
    if (activePanel) activePanel.classList.add('active');
}

// Additional utility functions
function loadAllCards() {
    // Show all cards modal
    showModal('allCardsModal');
    loadRecentCards();
}

function viewCard(url) {
    // Simple image viewer using modal
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    
    modalImage.src = url;
    modal.style.display = 'block';
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const imageModal = document.getElementById('imageModal');
    if (event.target === imageModal) {
        closeImageModal();
    }
});

function deleteCard(filename) {
    if (confirm(`คุณต้องการลบการ์ด ${filename} หรือไม่?`)) {
        // Implement delete functionality if needed
        console.log('Delete card:', filename);
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Skip auth check if we're on login page
    if (window.location.pathname.includes('/login')) {
        return;
    }
    
    // Check authentication first
    const authResult = await checkAuthentication();
    if (authResult) {
        // Load initial data only if authenticated
        await refreshStatus();
    }
});

// Auto refresh every 30 seconds
setInterval(async () => {
    if (!document.hidden && isAuthenticated && !window.location.pathname.includes('/login')) {
        await refreshStatus();
    }
}, 30000);

// Export functions for global access
window.generateSingleCard = generateSingleCard;
window.generateMultipleCards = generateMultipleCards;
window.testSystem = testSystem;
window.refreshStatus = refreshStatus;
window.closeModal = closeModal;
window.showModal = showModal;
window.saveSettings = saveSettings;
window.testConnection = testConnection;
window.sendRandomCard = sendRandomCard;
window.sendMultipleRandomCards = sendMultipleRandomCards;
window.sendSingleSpecificCard = sendSingleSpecificCard;
window.sendMultipleWithPagination = sendMultipleWithPagination;
window.togglePasswordVisibility = togglePasswordVisibility;
window.loadAllCards = loadAllCards;
window.loadAssets = loadAssets;
window.viewCard = viewCard;
window.closeImageModal = closeImageModal;
window.deleteCard = deleteCard;
window.switchTab = switchTab;
// Auto Scheduler Functions
async function loadSchedulerStatus() {
    try {
        const response = await apiCall('/scheduler/status');
        const data = response.data;
        
        // อัปเดตสถานะ
        const indicator = document.getElementById('schedulerIndicator');
        const statusText = document.getElementById('schedulerStatusText');
        const intervalSelect = document.getElementById('intervalHours');
        const cardTypeSelect = document.getElementById('cardType');
        const specificGameInput = document.getElementById('specificGame');
        const specificGameContainer = document.getElementById('specificGameContainer');
        
        if (data.isRunning) {
            indicator.className = 'status-indicator active';
            statusText.textContent = `กำลังทำงาน - ส่งทุก ${data.intervalHours} ชั่วโมง`;
            if (data.nextSendTime) {
                statusText.textContent += ` (ครั้งต่อไป: ${data.nextSendTime})`;
            }
        } else {
            indicator.className = 'status-indicator inactive';
            statusText.textContent = 'หยุดทำงาน';
        }
        
        // อัปเดตการตั้งค่า
        intervalSelect.value = data.intervalHours || 1;
        cardTypeSelect.value = data.cardType || 'random';
        specificGameInput.value = data.specificGame || '';
        
        // แสดง/ซ่อน specific game input
        if (data.cardType === 'specific') {
            specificGameContainer.style.display = 'block';
        } else {
            specificGameContainer.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading scheduler status:', error);
        const statusText = document.getElementById('schedulerStatusText');
        if (statusText) {
            statusText.textContent = 'เกิดข้อผิดพลาดในการโหลดสถานะ';
        }
    }
}

async function startScheduler() {
    try {
        // อัปเดตการตั้งค่าก่อน
        await updateSchedulerConfig();
        
        showToast('กำลังเริ่ม Auto Scheduler...', 'info');
        
        const credentials = getCurrentCredentials();
        const response = await apiCall('/scheduler/start', { 
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.success) {
            showToast('เริ่ม Auto Scheduler แล้ว!', 'success');
            await loadSchedulerStatus();
        } else {
            showToast(response.message || 'ไม่สามารถเริ่ม Auto Scheduler ได้', 'error');
        }
    } catch (error) {
        console.error('Error starting scheduler:', error);
        showToast('เกิดข้อผิดพลาดในการเริ่ม Auto Scheduler', 'error');
    }
}

async function stopScheduler() {
    try {
        showToast('กำลังหยุด Auto Scheduler...', 'info');
        
        const response = await apiCall('/scheduler/stop', { method: 'POST' });
        
        if (response.success) {
            showToast('หยุด Auto Scheduler แล้ว!', 'success');
            await loadSchedulerStatus();
        } else {
            showToast(response.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (error) {
        console.error('Error stopping scheduler:', error);
        showToast('เกิดข้อผิดพลาดในการหยุด Auto Scheduler', 'error');
    }
}

async function sendNowScheduler() {
    try {
        showToast('กำลังส่งการ์ดทันที...', 'info');
        
        const credentials = getCurrentCredentials();
        const response = await apiCall('/scheduler/send-now', { 
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.success) {
            showToast('ส่งการ์ดแล้ว!', 'success');
        } else {
            showToast(response.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (error) {
        console.error('Error sending card now:', error);
        showToast('เกิดข้อผิดพลาดในการส่งการ์ด', 'error');
    }
}

async function updateSchedulerConfig() {
    try {
        const intervalHours = document.getElementById('intervalHours').value;
        const cardType = document.getElementById('cardType').value;
        const specificGame = document.getElementById('specificGame').value;
        
        const config = {
            intervalHours: parseInt(intervalHours),
            cardType: cardType,
            specificGame: cardType === 'specific' ? specificGame : null,
            isEnabled: true
        };
        
        const response = await apiCall('/scheduler/update', {
            method: 'POST',
            body: JSON.stringify(config)
        });
        
        if (!response.success) {
            showToast(response.message || 'ไม่สามารถอัปเดตการตั้งค่าได้', 'error');
        }
        
        return response.success;
    } catch (error) {
        console.error('Error updating scheduler config:', error);
        showToast('เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า', 'error');
        return false;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Card type change handler
    const cardTypeSelect = document.getElementById('cardType');
    const specificGameContainer = document.getElementById('specificGameContainer');
    
    if (cardTypeSelect && specificGameContainer) {
        cardTypeSelect.addEventListener('change', function() {
            if (this.value === 'specific') {
                specificGameContainer.style.display = 'block';
            } else {
                specificGameContainer.style.display = 'none';
            }
        });
    }
});

window.logout = logout;
window.loadSchedulerStatus = loadSchedulerStatus;
window.startScheduler = startScheduler;
window.stopScheduler = stopScheduler;
window.sendNowScheduler = sendNowScheduler;
window.updateSchedulerConfig = updateSchedulerConfig;