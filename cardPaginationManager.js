const TelegramBot = require('node-telegram-bot-api');

class CardPaginationManager {
    constructor() {
        // เก็บข้อมูลการ์ดที่ส่งแล้ว และ state ของแต่ละ message
        this.cardSessions = new Map();
        
        // กำหนดเวลาหมดอายุของ session (30 นาที)
        this.sessionTimeout = 30 * 60 * 1000;
    }

    /**
     * สร้าง session ใหม่สำหรับการ์ดหลายใบ
     * @param {Array} cardsData - ข้อมูลการ์ดทั้งหมด
     * @param {number} initialIndex - หน้าเริ่มต้น (0-based)
     * @returns {string} sessionId
     */
    createSession(cardsData, initialIndex = 0) {
        const sessionId = this.generateSessionId();
        
        this.cardSessions.set(sessionId, {
            cards: cardsData,
            currentIndex: initialIndex,
            totalCards: cardsData.length,
            createdAt: Date.now(),
            messageId: null // จะถูกกำหนดหลังจากส่งข้อความ
        });

        // ตั้งเวลาให้ session หมดอายุ
        setTimeout(() => {
            this.cardSessions.delete(sessionId);
        }, this.sessionTimeout);

        return sessionId;
    }

    /**
     * ได้รับข้อมูลการ์ดในหน้าปัจจุบัน
     * @param {string} sessionId 
     * @returns {Object} ข้อมูลการ์ดและ state
     */
    getCurrentCard(sessionId) {
        const session = this.cardSessions.get(sessionId);
        if (!session) {
            return null;
        }

        const currentCard = session.cards[session.currentIndex];
        return {
            card: currentCard,
            currentPage: session.currentIndex + 1,
            totalPages: session.totalCards,
            hasNext: session.currentIndex < session.totalCards - 1,
            hasPrev: session.currentIndex > 0,
            sessionId: sessionId
        };
    }

    /**
     * เลื่อนไปหน้าถัดไป
     * @param {string} sessionId 
     * @returns {Object|null} ข้อมูลหน้าใหม่ หรือ null ถ้าไม่สามารถเลื่อนได้
     */
    nextPage(sessionId) {
        const session = this.cardSessions.get(sessionId);
        if (!session || session.currentIndex >= session.totalCards - 1) {
            return null;
        }

        session.currentIndex++;
        return this.getCurrentCard(sessionId);
    }

    /**
     * เลื่อนไปหน้าก่อนหน้า
     * @param {string} sessionId 
     * @returns {Object|null} ข้อมูลหน้าใหม่ หรือ null ถ้าไม่สามารถเลื่อนได้
     */
    prevPage(sessionId) {
        const session = this.cardSessions.get(sessionId);
        if (!session || session.currentIndex <= 0) {
            return null;
        }

        session.currentIndex--;
        return this.getCurrentCard(sessionId);
    }

    /**
     * สร้าง inline keyboard สำหรับ pagination
     * @param {string} sessionId 
     * @param {string} playNowUrl - URL สำหรับปุ่ม "เล่นเลย▶️"
     * @returns {Object} keyboard object สำหรับ Telegram
     */
    createPaginationKeyboard(sessionId, playNowUrl = 'https://t.me/UFAthai_ubot') {
        const cardData = this.getCurrentCard(sessionId);
        if (!cardData) {
            return null;
        }

        const keyboard = {
            inline_keyboard: []
        };

        // แถวที่ 1: ปุ่มเล่นเลย
        keyboard.inline_keyboard.push([
            {
                text: 'เล่นเลย▶️',
                url: playNowUrl
            }
        ]);

        // แถวที่ 2: ปุ่ม pagination (ถ้ามีการ์ดมากกว่า 1 ใบ)
        if (cardData.totalPages > 1) {
            const navButtons = [];

            // ปุ่มก่อนหน้า
            if (cardData.hasPrev) {
                navButtons.push({
                    text: '◀',
                    callback_data: `nav_${sessionId}_prev`
                });
            } else {
                // ปุ่มที่ไม่ได้ใช้งาน (สีเทา)
                navButtons.push({
                    text: '◀',
                    callback_data: `nav_${sessionId}_noop`
                });
            }

            // แสดงหน้าปัจจุบัน
            navButtons.push({
                text: `${cardData.currentPage}/${cardData.totalPages}`,
                callback_data: `nav_${sessionId}_info`
            });

            // ปุ่มถัดไป
            if (cardData.hasNext) {
                navButtons.push({
                    text: '▶',
                    callback_data: `nav_${sessionId}_next`
                });
            } else {
                // ปุ่มที่ไม่ได้ใช้งาน (สีเทา)
                navButtons.push({
                    text: '▶',
                    callback_data: `nav_${sessionId}_noop`
                });
            }

            keyboard.inline_keyboard.push(navButtons);
        }

        return keyboard;
    }

    /**
     * ประมวลผล callback query จากปุ่ม pagination
     * @param {string} callbackData - ข้อมูลจาก callback_query.data
     * @returns {Object|null} ผลลัพธ์การประมวลผล
     */
    processCallback(callbackData) {
        // รูปแบบ: nav_{sessionId}_{action}
        const parts = callbackData.split('_');
        
        if (parts.length !== 3 || parts[0] !== 'nav') {
            return null;
        }

        const sessionId = parts[1];
        const action = parts[2];

        switch (action) {
            case 'prev':
                return {
                    type: 'navigate',
                    sessionId,
                    newData: this.prevPage(sessionId)
                };

            case 'next':
                return {
                    type: 'navigate',
                    sessionId,
                    newData: this.nextPage(sessionId)
                };

            case 'info':
                return {
                    type: 'info',
                    sessionId,
                    data: this.getCurrentCard(sessionId)
                };

            case 'noop':
                return {
                    type: 'noop',
                    sessionId
                };

            default:
                return null;
        }
    }

    /**
     * บันทึก Message ID ของการ์ดที่ส่งไปแล้ว
     * @param {string} sessionId 
     * @param {number} messageId 
     */
    setMessageId(sessionId, messageId) {
        const session = this.cardSessions.get(sessionId);
        if (session) {
            session.messageId = messageId;
        }
    }

    /**
     * ลบ session
     * @param {string} sessionId 
     */
    removeSession(sessionId) {
        this.cardSessions.delete(sessionId);
    }

    /**
     * ดูจำนวน session ที่ active
     * @returns {number}
     */
    getActiveSessionsCount() {
        return this.cardSessions.size;
    }

    /**
     * สร้าง session ID แบบสุ่ม
     * @returns {string}
     */
    generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    /**
     * ล้าง session ที่หมดอายุ
     */
    cleanExpiredSessions() {
        const now = Date.now();
        const expiredSessions = [];

        for (const [sessionId, session] of this.cardSessions.entries()) {
            if (now - session.createdAt > this.sessionTimeout) {
                expiredSessions.push(sessionId);
            }
        }

        expiredSessions.forEach(sessionId => {
            this.cardSessions.delete(sessionId);
        });

        return expiredSessions.length;
    }
}

module.exports = CardPaginationManager;