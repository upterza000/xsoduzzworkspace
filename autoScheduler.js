const fs = require('fs');
const path = require('path');

class AutoScheduler {
    constructor() {
        this.intervals = new Map(); // เก็บ interval IDs
        this.nextScheduledTime = null; // เก็บเวลาที่กำหนดส่งครั้งถัดไป
        this.schedulerConfig = {
            isEnabled: false,
            intervalHours: 1,
            cardType: 'random', // 'random', 'specific'
            specificGame: null
        };
        this.loadConfig();
    }

    // โหลดการตั้งค่าจากไฟล์
    loadConfig() {
        const configPath = path.join(__dirname, 'scheduler-config.json');
        try {
            if (fs.existsSync(configPath)) {
                const data = fs.readFileSync(configPath, 'utf8');
                this.schedulerConfig = { ...this.schedulerConfig, ...JSON.parse(data) };
                console.log('📅 Auto Scheduler config loaded:', this.schedulerConfig);
            }
        } catch (error) {
            console.error('❌ Error loading scheduler config:', error);
        }
    }

    // บันทึกการตั้งค่าลงไฟล์
    saveConfig() {
        const configPath = path.join(__dirname, 'scheduler-config.json');
        try {
            fs.writeFileSync(configPath, JSON.stringify(this.schedulerConfig, null, 2));
            console.log('💾 Auto Scheduler config saved');
        } catch (error) {
            console.error('❌ Error saving scheduler config:', error);
        }
    }

    // เริ่มการส่งอัตโนมัติ
    start(richGameCardSystem, telegramBot) {
        if (!richGameCardSystem || !telegramBot) {
            console.error('❌ Missing required systems for auto scheduler');
            return false;
        }

        if (this.intervals.has('main')) {
            console.log('⚠️ Auto scheduler is already running');
            return false;
        }

        if (!this.schedulerConfig.isEnabled) {
            console.log('⚠️ Auto scheduler is disabled');
            return false;
        }

        const intervalMs = this.schedulerConfig.intervalHours * 60 * 60 * 1000; // แปลงชั่วโมงเป็น milliseconds
        
        // ตั้งเวลาครั้งแรกให้เป็นตอนนี้ + interval
        this.nextScheduledTime = new Date(Date.now() + intervalMs);
        
        console.log(`🚀 Starting auto scheduler - sending cards every ${this.schedulerConfig.intervalHours} hours`);
        console.log(`📅 Next scheduled time: ${this.nextScheduledTime.toLocaleString('th-TH')}`);
        
        const intervalId = setInterval(async () => {
            try {
                await this.sendScheduledCard(richGameCardSystem, telegramBot);
                // อัปเดตเวลาครั้งถัดไปให้เป็นเวลาแน่นอน
                this.nextScheduledTime = new Date(this.nextScheduledTime.getTime() + intervalMs);
                console.log(`📅 Next scheduled time: ${this.nextScheduledTime.toLocaleString('th-TH')}`);
            } catch (error) {
                console.error('❌ Error in scheduled card send:', error);
            }
        }, intervalMs);

        this.intervals.set('main', intervalId);
        
        // ส่งการ์ดครั้งแรกทันที (optional)
        // this.sendScheduledCard(richGameCardSystem, telegramBot);
        
        return true;
    }

    // หยุดการส่งอัตโนมัติ
    stop() {
        const intervalId = this.intervals.get('main');
        if (intervalId) {
            clearInterval(intervalId);
            this.intervals.delete('main');
            this.nextScheduledTime = null; // รีเซ็ตเวลา
            console.log('⏹️ Auto scheduler stopped');
            return true;
        }
        return false;
    }

    // ส่งการ์ดตามกำหนดเวลา
    async sendScheduledCard(richGameCardSystem, telegramBot) {
        try {
            console.log('📤 Sending scheduled card...');

            let cardData;
            
            if (this.schedulerConfig.cardType === 'specific' && this.schedulerConfig.specificGame) {
                // ส่งเกมที่กำหนด
                cardData = await richGameCardSystem.generateCard({
                    gameName: this.schedulerConfig.specificGame
                });
                console.log(`🎮 Generated specific game card: ${this.schedulerConfig.specificGame}`);
            } else {
                // ส่งเกมสุ่ม
                cardData = await richGameCardSystem.generateRandomCard();
                console.log('🎲 Generated random game card');
            }

            if (cardData && cardData.filePath) {
                // ส่งการ์ดไปยัง Telegram พร้อม Keyboard (รองรับหลายแชแนล)
                let result;
                
                // ตรวจสอบว่ามีหลายแชแนลหรือไม่
                if (telegramBot.channelIds && telegramBot.channelIds.length > 1) {
                    // ส่งไปหลายแชแนล
                    result = await telegramBot.sendGameCardWithKeyboardToAllChannels(cardData.filePath, cardData.gameData);
                    
                    if (result && result.successCount > 0) {
                        console.log('✅ Scheduled card sent successfully to multiple channels');
                        console.log(`📱 Success: ${result.successCount}/${result.totalChannels} channels`);
                        console.log(`🎮 Game: ${cardData.gameData.name}`);
                        
                        // แสดงรายละเอียดแต่ละแชแนล
                        result.results.forEach((res, idx) => {
                            if (res.success) {
                                console.log(`   ✅ ${res.channelId} (Message ID: ${res.messageId})`);
                            } else {
                                console.log(`   ❌ ${res.channelId} - ${res.error}`);
                            }
                        });
                    } else {
                        console.error('❌ Failed to send scheduled card to any channel:', result);
                    }
                } else {
                    // ส่งไปแชแนลเดียว (แบบเดิม)
                    result = await telegramBot.sendGameCardWithKeyboard(cardData.filePath, cardData.gameData);
                    
                    if (result && result.message_id) {
                        console.log('✅ Scheduled card sent successfully');
                        console.log(`📱 Message ID: ${result.message_id}`);
                        console.log(`🎮 Game: ${cardData.gameData.name}`);
                    } else {
                        console.error('❌ Failed to send scheduled card:', result);
                    }
                }
            } else {
                console.error('❌ Failed to generate card for scheduled send');
            }

        } catch (error) {
            console.error('❌ Error in sendScheduledCard:', error);
        }
    }

    // อัปเดตการตั้งค่า
    updateConfig(newConfig) {
        const wasRunning = this.isRunning();
        
        // หยุดถ้ากำลังทำงานอยู่
        if (wasRunning) {
            this.stop();
        }

        // อัปเดตการตั้งค่า
        this.schedulerConfig = { ...this.schedulerConfig, ...newConfig };
        this.saveConfig();

        console.log('⚙️ Scheduler config updated:', this.schedulerConfig);

        return {
            success: true,
            message: 'การตั้งค่าอัปเดตแล้ว',
            wasRunning,
            config: this.schedulerConfig
        };
    }

    // ตรวจสอบสถานะการทำงาน
    isRunning() {
        return this.intervals.has('main');
    }

    // ดึงการตั้งค่าปัจจุบัน
    getConfig() {
        return {
            ...this.schedulerConfig,
            isRunning: this.isRunning(),
            nextSendTime: this.nextScheduledTime ? 
                this.nextScheduledTime.toLocaleString('th-TH') : 
                null
        };
    }

    // ส่งการ์ดทันที (manual trigger)
    async sendNow(richGameCardSystem, telegramBot) {
        if (!richGameCardSystem || !telegramBot) {
            return { success: false, message: 'ระบบไม่พร้อม' };
        }

        try {
            await this.sendScheduledCard(richGameCardSystem, telegramBot);
            // ถ้า scheduler กำลังทำงานอยู่ ให้อัปเดตเวลาครั้งถัดไป
            if (this.isRunning() && this.nextScheduledTime) {
                const intervalMs = this.schedulerConfig.intervalHours * 60 * 60 * 1000;
                this.nextScheduledTime = new Date(Date.now() + intervalMs);
                console.log(`📅 Next scheduled time updated: ${this.nextScheduledTime.toLocaleString('th-TH')}`);
            }
            return { success: true, message: 'ส่งการ์ดแล้ว' };
        } catch (error) {
            console.error('❌ Error in manual send:', error);
            return { success: false, message: 'เกิดข้อผิดพลาด: ' + error.message };
        }
    }

    // รีสตาร์ท scheduler ด้วยการตั้งค่าใหม่
    restart(richGameCardSystem, telegramBot) {
        this.stop();
        if (this.schedulerConfig.isEnabled) {
            return this.start(richGameCardSystem, telegramBot);
        }
        return false;
    }
}

module.exports = AutoScheduler;