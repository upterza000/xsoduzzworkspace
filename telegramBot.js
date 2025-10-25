const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const CardPaginationManager = require('./cardPaginationManager');

class TelegramGameBot {
    constructor() {
        // ไม่อ่านค่าจาก .env อีกต่อไป - รอการตั้งค่าจาก UI
        this.token = null;
        this.channelId = null; // ยังคงไว้เพื่อ backward compatibility
        this.channelIds = []; // เพิ่มสำหรับหลายแชแนล
        this.playNowUrl = 'https://t.me/UFAthai_ubot'; // ค่าเริ่มต้น
        
        this.bot = null;
        this.callbackHandlersSetup = false; // ป้องกันการ setup handlers หลายครั้ง
        
        // สร้าง pagination manager สำหรับจัดการการ์ดหลายใบ
        this.paginationManager = new CardPaginationManager();
        
        console.log('🤖 TelegramGameBot created (waiting for credentials from UI)');
    }

    initializeBot() {
        if (!this.token) {
            throw new Error('Bot Token is required. Please set credentials first.');
        }
        
        // ถ้ามี bot อยู่แล้ว ให้หยุด polling ก่อน
        if (this.bot) {
            try {
                if (this.bot.isPolling()) {
                    this.bot.stopPolling();
                }
            } catch (error) {
                // ไม่ต้องทำอะไร ถ้า polling หยุดอยู่แล้ว
            }
        }
        
        this.bot = new TelegramBot(this.token, { polling: false });
        this.callbackHandlersSetup = false; // รีเซ็ต flag
        console.log(`🤖 Bot initialized with token: ${this.token.substring(0, 10)}...`);
    }

    setBotCredentials(botToken, channelId, playNowUrl = null) {
        if (!botToken || !channelId) {
            throw new Error('Bot Token and Channel ID are required');
        }
        
        this.token = botToken;
        
        // รองรับทั้งแชแนลเดียวและหลายแชแนล
        if (Array.isArray(channelId)) {
            this.channelIds = channelId;
            this.channelId = channelId[0]; // เก็บแชแนลแรกเพื่อ backward compatibility
        } else if (typeof channelId === 'string') {
            // รองรับการส่งแชแนลแบบ string คั่นด้วย comma หรือ newline
            const channels = channelId
                .split(/[,\n]/) // แยกด้วยทั้ง comma และ newline
                .map(id => id.trim())
                .filter(id => id.length > 0);
                
            this.channelIds = channels;
            this.channelId = this.channelIds[0];
        } else {
            this.channelIds = [channelId];
            this.channelId = channelId;
        }
        
        if (playNowUrl) {
            this.playNowUrl = playNowUrl;
        }
        
        this.initializeBot();
        
        // ตั้งค่า callback handlers เพียงครั้งเดียว
        if (!this.callbackHandlersSetup) {
            this.setupCallbackHandlers();
            this.callbackHandlersSetup = true;
        }
        
        console.log(`🔧 Bot credentials updated:`);
        console.log(`   Channels (${this.channelIds.length}):`, this.channelIds);
        console.log(`🔗 Play now URL: ${this.playNowUrl}`);
    }

    isConfigured() {
        return !!(this.token && this.channelId && this.bot);
    }

    async sendGameCard(cardImagePath, gameData) {
        try {
            if (!this.bot) {
                throw new Error('Bot not initialized. Please set bot credentials first.');
            }
            
            if (!this.channelId) {
                throw new Error('Channel ID not set. Please set channel ID first.');
            }

            // อ่านไฟล์รูปภาพ
            const cardBuffer = fs.readFileSync(cardImagePath);
            
            // สร้างข้อความแนบรูป
            const caption = this.generateCaption(gameData);
            
            // ส่งรูปไปยัง channel (แชแนลเดียว - backward compatibility)
            const result = await this.bot.sendPhoto(this.channelId, cardBuffer, {
                caption: caption,
                parse_mode: 'HTML'
            });
            
            console.log(`✅ Game card sent successfully to ${this.channelId}`);
            console.log(`Message ID: ${result.message_id}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error sending game card:', error.message);
            throw error;
        }
    }

    // ฟังก์ชันใหม่: ส่งไปหลายแชแนล
    async sendGameCardToAllChannels(cardImagePath, gameData) {
        try {
            if (!this.bot) {
                throw new Error('Bot not initialized. Please set bot credentials first.');
            }
            
            if (!this.channelIds || this.channelIds.length === 0) {
                throw new Error('No channels configured. Please set channel IDs first.');
            }

            // อ่านไฟล์รูปภาพ
            const cardBuffer = fs.readFileSync(cardImagePath);
            
            // สร้างข้อความแนบรูป
            const caption = this.generateCaption(gameData);
            
            const results = [];
            
            // ส่งไปทุกแชแนล
            for (let i = 0; i < this.channelIds.length; i++) {
                const channelId = this.channelIds[i];
                
                try {
                    const result = await this.bot.sendPhoto(channelId, cardBuffer, {
                        caption: caption,
                        parse_mode: 'HTML'
                    });
                    
                    console.log(`✅ Game card sent successfully to channel ${i + 1}/${this.channelIds.length}: ${channelId}`);
                    console.log(`   Message ID: ${result.message_id}`);
                    
                    results.push({
                        channelId,
                        success: true,
                        messageId: result.message_id,
                        result
                    });
                    
                    // หน่วงเวลาระหว่างการส่งเพื่อป้องกัน rate limit
                    if (i < this.channelIds.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                } catch (channelError) {
                    console.error(`❌ Failed to send to channel ${channelId}:`, channelError.message);
                    results.push({
                        channelId,
                        success: false,
                        error: channelError.message
                    });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            console.log(`📊 Send summary: ${successCount}/${this.channelIds.length} channels successful`);
            
            return {
                totalChannels: this.channelIds.length,
                successCount,
                results
            };
            
        } catch (error) {
            console.error('❌ Error sending game card to all channels:', error.message);
            throw error;
        }
    }

    async sendGameCardWithKeyboard(cardImagePath, gameData) {
        try {
            // อ่านไฟล์รูปภาพ
            const cardBuffer = fs.readFileSync(cardImagePath);
            
            // สร้างข้อความแนบรูป
            const caption = this.generateCaption(gameData);
            
            // สร้าง Inline Keyboard แบบเดิม (สำหรับการ์ดเดียว)
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: 'เล่นเลย▶️',
                        url: this.playNowUrl
                    }
                ]]
            };
            
            // ส่งรูปไปยัง channel พร้อม keyboard
            const result = await this.bot.sendPhoto(this.channelId, cardBuffer, {
                caption: caption,
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
            
            console.log(`✅ Game card with keyboard sent successfully to ${this.channelId}`);
            console.log(`Message ID: ${result.message_id}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error sending game card with keyboard:', error.message);
            throw error;
        }
    }

    // ฟังก์ชันใหม่: ส่งไปหลายแชแนลพร้อม keyboard
    async sendGameCardWithKeyboardToAllChannels(cardImagePath, gameData) {
        try {
            if (!this.bot) {
                throw new Error('Bot not initialized. Please set bot credentials first.');
            }
            
            if (!this.channelIds || this.channelIds.length === 0) {
                throw new Error('No channels configured. Please set channel IDs first.');
            }

            // อ่านไฟล์รูปภาพ
            const cardBuffer = fs.readFileSync(cardImagePath);
            
            // สร้างข้อความแนบรูป
            const caption = this.generateCaption(gameData);
            
            // สร้าง Inline Keyboard
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: 'เล่นเลย▶️',
                        url: this.playNowUrl
                    }
                ]]
            };
            
            const results = [];
            
            // ส่งไปทุกแชแนลพร้อม keyboard
            for (let i = 0; i < this.channelIds.length; i++) {
                const channelId = this.channelIds[i];
                
                try {
                    const result = await this.bot.sendPhoto(channelId, cardBuffer, {
                        caption: caption,
                        parse_mode: 'HTML',
                        reply_markup: keyboard
                    });
                    
                    console.log(`✅ Game card with keyboard sent successfully to channel ${i + 1}/${this.channelIds.length}: ${channelId}`);
                    console.log(`   Message ID: ${result.message_id}`);
                    
                    results.push({
                        channelId,
                        success: true,
                        messageId: result.message_id,
                        result
                    });
                    
                    // หน่วงเวลาระหว่างการส่งเพื่อป้องกัน rate limit
                    if (i < this.channelIds.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                } catch (channelError) {
                    console.error(`❌ Failed to send to channel ${channelId}:`, channelError.message);
                    results.push({
                        channelId,
                        success: false,
                        error: channelError.message
                    });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            console.log(`📊 Send summary: ${successCount}/${this.channelIds.length} channels successful`);
            
            return {
                totalChannels: this.channelIds.length,
                successCount,
                results
            };
            
        } catch (error) {
            console.error('❌ Error sending game card with keyboard to all channels:', error.message);
            throw error;
        }
    }

    async sendMultipleCardsWithPagination(cardsData) {
        try {
            if (!cardsData || cardsData.length === 0) {
                throw new Error('ไม่มีข้อมูลการ์ดที่จะส่ง');
            }

            // สร้าง session สำหรับการ์ดหลายใบ
            const sessionId = this.paginationManager.createSession(cardsData);
            
            // ดึงการ์ดใบแรก
            const firstCardData = this.paginationManager.getCurrentCard(sessionId);
            if (!firstCardData) {
                throw new Error('ไม่สามารถดึงข้อมูลการ์ดได้');
            }

            // อ่านไฟล์รูปภาพการ์ดแรก
            const cardBuffer = fs.readFileSync(firstCardData.card.imagePath);
            
            // สร้างข้อความสำหรับการ์ดแรก
            const caption = this.generateCaptionWithPagination(firstCardData.card, firstCardData.currentPage, firstCardData.totalPages);
            
            // สร้าง keyboard พร้อม pagination
            const keyboard = this.paginationManager.createPaginationKeyboard(sessionId, this.playNowUrl);
            
            // ส่งการ์ดแรกพร้อม pagination buttons
            const result = await this.bot.sendPhoto(this.channelId, cardBuffer, {
                caption: caption,
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
            
            // บันทึก message ID ไว้สำหรับการอัปเดต
            this.paginationManager.setMessageId(sessionId, result.message_id);
            
            console.log(`✅ Multiple cards with pagination sent successfully to ${this.channelId}`);
            console.log(`Message ID: ${result.message_id}, Session: ${sessionId}`);
            console.log(`Total cards: ${cardsData.length}, Current: 1/${cardsData.length}`);
            
            return {
                ...result,
                sessionId: sessionId,
                totalCards: cardsData.length
            };
            
        } catch (error) {
            console.error('❌ Error sending multiple cards with pagination:', error.message);
            throw error;
        }
    }

    generateCaption(gameData) {
        return `🎮 <b>${gameData.name}</b>

🎯 <b>RTP:</b> ${gameData.rtp}%
💰 <b>อัตราชนะสูงสุด:</b> ${gameData.maxWin}
🟢 <b>ผู้เล่นออนไลน์:</b> ${gameData.players} คน
📊 <b>อัตราการชนะ:</b> ${gameData.winRate}%
🏷️ <b>ผู้ให้บริการ:</b> ${gameData.provider}

${gameData.isNew ? '🔥 <b>เกมใหม่!</b>' : ''}

#SlotGame #PG #Casino #OnlineGaming`;
    }

    generateCaptionWithPagination(gameData, currentPage, totalPages) {
        return `🎮 <b>${gameData.name}</b> [${currentPage}/${totalPages}]

🎯 <b>RTP:</b> ${gameData.rtp}%
💰 <b>อัตราชนะสูงสุด:</b> ${gameData.maxWin}
🟢 <b>ผู้เล่นออนไลน์:</b> ${gameData.players} คน
📊 <b>อัตราการชนะ:</b> ${gameData.winRate}%
🏷️ <b>ผู้ให้บริการ:</b> ${gameData.provider}

${gameData.isNew ? '🔥 <b>เกมใหม่!</b>' : ''}

👈👉 <b>ใช้ปุ่มด้านล่างเพื่อเลื่อนดูการ์ดอื่น</b>

#SlotGame #PG #Casino #OnlineGaming`;
    }

    async sendTextMessage(message) {
        try {
            if (!this.bot) {
                throw new Error('Bot not initialized. Please set bot credentials first.');
            }
            
            if (!this.channelId) {
                throw new Error('Channel ID not set. Please set channel ID first.');
            }

            const result = await this.bot.sendMessage(this.channelId, message, {
                parse_mode: 'HTML'
            });
            
            console.log(`✅ Text message sent successfully to ${this.channelId}`);
            return result;
            
        } catch (error) {
            console.error('❌ Error sending text message:', error.message);
            throw error;
        }
    }

    async sendTextMessageToAllChannels(message) {
        try {
            if (!this.bot) {
                throw new Error('Bot not initialized. Please set bot credentials first.');
            }
            
            if (!this.channelIds || this.channelIds.length === 0) {
                throw new Error('No channels configured. Please set channel IDs first.');
            }

            const results = [];
            
            // ส่งไปทุกแชแนล
            for (let i = 0; i < this.channelIds.length; i++) {
                const channelId = this.channelIds[i];
                
                try {
                    const result = await this.bot.sendMessage(channelId, message, {
                        parse_mode: 'HTML'
                    });
                    
                    console.log(`✅ Text message sent successfully to channel ${i + 1}/${this.channelIds.length}: ${channelId}`);
                    console.log(`   Message ID: ${result.message_id}`);
                    
                    results.push({
                        channelId,
                        success: true,
                        messageId: result.message_id,
                        result
                    });
                    
                    // หน่วงเวลาระหว่างการส่งเพื่อป้องกัน rate limit
                    if (i < this.channelIds.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                } catch (channelError) {
                    console.error(`❌ Failed to send text message to channel ${channelId}:`, channelError.message);
                    results.push({
                        channelId,
                        success: false,
                        error: channelError.message
                    });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            console.log(`📊 Text message summary: ${successCount}/${this.channelIds.length} channels successful`);
            
            return {
                totalChannels: this.channelIds.length,
                successCount,
                results
            };
            
        } catch (error) {
            console.error('❌ Error sending text message to all channels:', error.message);
            throw error;
        }
    }

    async testConnection() {
        try {
            if (!this.bot) {
                throw new Error('Bot not initialized. Please set bot credentials first.');
            }
            
            if (!this.channelIds || this.channelIds.length === 0) {
                throw new Error('Channel ID not set. Please set channel ID first.');
            }

            const me = await this.bot.getMe();
            console.log(`✅ Bot connected successfully: @${me.username}`);
            console.log(`🔍 Testing connection to ${this.channelIds.length} channel(s)...`);
            
            // ทดสอบส่งข้อความไปทุกแชแนล
            const results = [];
            for (let i = 0; i < this.channelIds.length; i++) {
                const channelId = this.channelIds[i];
                try {
                    const result = await this.bot.sendMessage(channelId, '🤖 Bot connected and ready to send game cards!');
                    console.log(`✅ Test message sent to channel ${i + 1}/${this.channelIds.length}: ${channelId} (Message ID: ${result.message_id})`);
                    results.push({
                        channelId,
                        success: true,
                        messageId: result.message_id
                    });
                } catch (error) {
                    console.error(`❌ Failed to send test message to ${channelId}:`, error.message);
                    results.push({
                        channelId,
                        success: false,
                        error: error.message
                    });
                }
                
                // หน่วงเวลาระหว่างการส่ง
                if (i < this.channelIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            console.log(`📊 Connection test summary: ${successCount}/${this.channelIds.length} channels accessible`);
            
            return {
                success: successCount > 0,
                totalChannels: this.channelIds.length,
                successCount,
                results
            };
            
        } catch (error) {
            console.error('❌ Bot connection test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendMultipleCards(cardsData) {
        const results = [];
        
        for (let i = 0; i < cardsData.length; i++) {
            try {
                const result = await this.sendGameCard(cardsData[i].imagePath, cardsData[i]);
                results.push({ success: true, result });
                
                // หน่วงเวลาระหว่างการส่ง เพื่อไม่ให้ spam
                if (i < cardsData.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }

    setupCallbackHandlers() {
        if (!this.bot) {
            console.log('⚠️ Bot not initialized, skipping callback handler setup');
            return;
        }

        // จัดการ callback query จากปุ่ม pagination
        this.bot.on('callback_query', async (callbackQuery) => {
            try {
                const chatId = callbackQuery.message.chat.id;
                const messageId = callbackQuery.message.message_id;
                const callbackData = callbackQuery.data;
                
                console.log(`📱 Received callback: ${callbackData}`);
                
                // ตอบกลับ callback query ทันทีเพื่อหยุด loading
                await this.bot.answerCallbackQuery(callbackQuery.id);
                
                // ประมวลผลคำขอ
                const result = this.paginationManager.processCallback(callbackData);
                
                if (!result) {
                    console.log('❌ Invalid callback data:', callbackData);
                    return;
                }

                switch (result.type) {
                    case 'navigate':
                        await this.handleNavigate(callbackQuery, result);
                        break;
                        
                    case 'info':
                        await this.handleInfo(callbackQuery, result);
                        break;
                        
                    case 'noop':
                        console.log('💤 No-op callback');
                        break;
                }
                
            } catch (error) {
                console.error('❌ Error handling callback query:', error);
                try {
                    await this.bot.answerCallbackQuery(callbackQuery.id, {
                        text: '❌ เกิดข้อผิดพลาดในระบบ'
                    });
                } catch (answerError) {
                    console.error('❌ Error answering callback query:', answerError);
                }
            }
        });
    }

    async handleNavigate(callbackQuery, result) {
        if (!result.newData) {
            console.log('❌ No navigation data available');
            return;
        }

        try {
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;
            
            // ตรวจสอบว่าไฟล์รูปภาพมีอยู่จริง
            if (!fs.existsSync(result.newData.card.imagePath)) {
                console.error('❌ Image file not found:', result.newData.card.imagePath);
                return;
            }
            
            // สร้างข้อความใหม่
            const newCaption = this.generateCaptionWithPagination(
                result.newData.card, 
                result.newData.currentPage, 
                result.newData.totalPages
            );
            
            // สร้าง keyboard ใหม่
            const newKeyboard = this.paginationManager.createPaginationKeyboard(result.sessionId, this.playNowUrl);
            
            console.log(`🔄 Navigating to page ${result.newData.currentPage}/${result.newData.totalPages}`);
            
            // ลบข้อความเก่าก่อน (ไม่ throw error หากล้มเหลว)
            try {
                await this.bot.deleteMessage(chatId, messageId);
            } catch (deleteError) {
                console.log('⚠️ Could not delete old message, continuing...');
            }
            
            // หน่วงเวลาเล็กน้อยก่อนส่งข้อความใหม่
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // ส่งข้อความใหม่พร้อมรูปภาพใหม่
            await this.bot.sendPhoto(chatId, result.newData.card.imagePath, {
                caption: newCaption,
                parse_mode: 'HTML',
                reply_markup: newKeyboard
            });
            
            console.log(`✅ Successfully navigated to page ${result.newData.currentPage}/${result.newData.totalPages}`);
            
        } catch (error) {
            console.error('❌ Error navigating page:', error);
            // ไม่ต้องตอบกลับ callback query อีกครั้งเพราะตอบไปแล้ว
        }
    }

    async handleInfo(callbackQuery, result) {
        if (!result.data) {
            console.log('❌ No info data available');
            return;
        }

        try {
            // ส่งข้อมูลเป็น alert (ไม่ต้องตอบกลับ callback query เพิ่มเติม)
            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: `📊 ${result.data.card.name}\nหน้า ${result.data.currentPage} จาก ${result.data.totalPages} การ์ด`,
                show_alert: true
            });
        } catch (error) {
            console.error('❌ Error showing info:', error);
        }
    }

    // เปิดใช้งาน polling สำหรับรับ callback queries
    startPolling() {
        if (!this.bot) {
            console.log('⚠️ Bot not initialized, cannot start polling');
            return;
        }
        
        if (!this.bot.isPolling()) {
            try {
                this.bot.startPolling();
                console.log('🔄 Started polling for callback queries');
            } catch (error) {
                console.error('❌ Error starting polling:', error.message);
                // ลองเริ่ม polling ใหม่หลังจาก 2 วินาที
                setTimeout(() => {
                    if (!this.bot.isPolling()) {
                        try {
                            this.bot.startPolling();
                            console.log('🔄 Retry: Started polling for callback queries');
                        } catch (retryError) {
                            console.error('❌ Retry failed:', retryError.message);
                        }
                    }
                }, 2000);
            }
        } else {
            console.log('⚠️ Polling already started');
        }
    }

    // หยุด polling
    stopPolling() {
        if (this.bot && this.bot.isPolling()) {
            try {
                this.bot.stopPolling();
                console.log('🛑 Stopped polling');
            } catch (error) {
                console.error('❌ Error stopping polling:', error.message);
            }
        }
    }
}

module.exports = TelegramGameBot;