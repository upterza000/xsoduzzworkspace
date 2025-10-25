const TelegramBot = require('node-telegram-bot-api');
const GameAssetManager = require('./gameAssetManager');
const GameCardGenerator = require('./gameCardGenerator');
const path = require('path');
const fs = require('fs');

class TelegramBotCommands {
    constructor(botToken) {
        if (!botToken) {
            throw new Error('Bot Token is required. Please provide it as a parameter.');
        }
        
        this.token = botToken;
        this.bot = new TelegramBot(this.token, { polling: true });
        this.assetManager = new GameAssetManager();
        this.cardGenerator = new GameCardGenerator();
        this.outputDir = './generated_cards';
        
        // สร้างโฟลเดอร์สำหรับเก็บการ์ด
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir);
        }
        
        this.setupCommands();
        this.setupCallbacks();
    }

    setupCommands() {
        // คำสั่ง /start
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const welcomeMessage = `
🎮 <b>ยินดีต้อนรับสู่ Rich Game Card Generator!</b>

คำสั่งที่ใช้ได้:
🎯 /card - สร้างการ์ดเกม 1 ใบ
🎲 /cards [จำนวน] - สร้างหลายการ์ด (เช่น /cards 5)
📊 /stats - ดูสถิติรูปภาพ
💡 /help - ดูคำสั่งทั้งหมด

👇 <b>หรือใช้ปุ่มด่วน:</b>
            `;
            
            const options = {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🎯 สร้างการ์ด 1 ใบ', callback_data: 'card_single' },
                            { text: '🎲 สร้าง 3 ใบ', callback_data: 'cards_3' }
                        ],
                        [
                            { text: '🎲 สร้าง 5 ใบ', callback_data: 'cards_5' },
                            { text: '🎲 สร้าง 10 ใบ', callback_data: 'cards_10' }
                        ],
                        [
                            { text: '📊 ดูสถิติ', callback_data: 'stats' },
                            { text: '💡 ช่วยเหลือ', callback_data: 'help' }
                        ]
                    ]
                }
            };
            
            this.bot.sendMessage(chatId, welcomeMessage, options);
        });

        // คำสั่ง /card - สร้างการ์ดเดียว
        this.bot.onText(/\/card/, async (msg) => {
            const chatId = msg.chat.id;
            await this.sendLoadingMessage(chatId);
            await this.generateAndSendCard(chatId, 1);
        });

        // คำสั่ง /cards - สร้างหลายการ์ด
        this.bot.onText(/\/cards (\d+)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const count = parseInt(match[1]) || 1;
            
            if (count > 20) {
                this.bot.sendMessage(chatId, '❌ สร้างได้สูงสุด 20 การ์ดต่อครั้ง');
                return;
            }
            
            await this.sendLoadingMessage(chatId);
            await this.generateAndSendCard(chatId, count);
        });

        // คำสั่ง /cards ไม่มีจำนวน
        this.bot.onText(/^\/cards$/, async (msg) => {
            const chatId = msg.chat.id;
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '1 ใบ', callback_data: 'cards_1' },
                            { text: '3 ใบ', callback_data: 'cards_3' },
                            { text: '5 ใบ', callback_data: 'cards_5' }
                        ],
                        [
                            { text: '10 ใบ', callback_data: 'cards_10' },
                            { text: '15 ใบ', callback_data: 'cards_15' },
                            { text: '20 ใบ', callback_data: 'cards_20' }
                        ]
                    ]
                }
            };
            
            this.bot.sendMessage(chatId, '🎲 เลือกจำนวนการ์ดที่ต้องการสร้าง:', options);
        });

        // คำสั่ง /stats
        this.bot.onText(/\/stats/, (msg) => {
            const chatId = msg.chat.id;
            const logos = this.assetManager.getAllLogos();
            const backgrounds = this.assetManager.getAllBackgrounds();
            const totalAssets = logos.length + backgrounds.length;
            
            const statsMessage = `
📊 <b>สถิติ Game Assets</b>

🎨 จำนวน Assets ทั้งหมด: <b>${totalAssets}</b> ไฟล์
📁 ที่อยู่ Assets: <code>./game_assets</code>

<b>รายละเอียด:</b>
🔖 Logos: ${logos.length} ไฟล์
🖼️ Backgrounds: ${backgrounds.length} ไฟล์

<b>ตัวอย่าง Logos:</b>
${logos.slice(0, 5).map(logo => `• ${logo.replace('./game_assets/logos/', '')}`).join('\n')}
${logos.length > 5 ? '• ...' : ''}

<b>ตัวอย่าง Backgrounds:</b>
${backgrounds.slice(0, 3).map(bg => `• ${bg.replace('./game_assets/backgrounds/', '')}`).join('\n')}
${backgrounds.length > 3 ? '• ...' : ''}
            `;
            
            this.bot.sendMessage(chatId, statsMessage, { parse_mode: 'HTML' });
        });

        // คำสั่ง /help
        this.bot.onText(/\/help/, (msg) => {
            const chatId = msg.chat.id;
            const helpMessage = `
💡 <b>คำสั่งทั้งหมด</b>

🎮 <b>การสร้างการ์ด:</b>
• <code>/card</code> - สร้างการ์ดเกม 1 ใบ
• <code>/cards</code> - เลือกจำนวนการ์ด
• <code>/cards 5</code> - สร้าง 5 การ์ด (1-20 ใบ)

📊 <b>ข้อมูล:</b>
• <code>/stats</code> - ดูสถิติรูปภาพ
• <code>/help</code> - แสดงคำสั่งนี้

🔧 <b>วิธีใช้งาน:</b>
1. พิมพ์คำสั่งหรือใช้ปุ่ม
2. รอระบบสร้างการ์ด
3. การ์ดจะถูกส่งมาที่นี่

⚡ <b>เคล็ดลับ:</b>
• ใช้ปุ่มด่วนแทนการพิมพ์
• สร้างได้สูงสุด 20 การ์ดต่อครั้ง
• การ์ดแต่ละใบจะมีข้อมูลแบบสุ่ม
            `;
            
            this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
        });
    }

    setupCallbacks() {
        // จัดการปุ่ม inline keyboard
        this.bot.on('callback_query', async (callbackQuery) => {
            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data;
            
            // ตอบกลับเพื่อหยุด loading
            this.bot.answerCallbackQuery(callbackQuery.id);
            
            if (data === 'card_single') {
                await this.sendLoadingMessage(chatId);
                await this.generateAndSendCard(chatId, 1);
                
            } else if (data.startsWith('cards_')) {
                const count = parseInt(data.split('_')[1]);
                await this.sendLoadingMessage(chatId);
                await this.generateAndSendCard(chatId, count);
                
            } else if (data === 'stats') {
                this.bot.sendMessage(chatId, '/stats');
                
            } else if (data === 'help') {
                this.bot.sendMessage(chatId, '/help');
            }
        });
    }

    async sendLoadingMessage(chatId) {
        const loadingMessages = [
            '🎨 กำลังสร้างการ์ด...',
            '🎮 กำลังสุ่มเกม...',
            '✨ กำลังประมวลผล...',
            '🎯 กำลังเตรียมการ์ด...'
        ];
        
        const message = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
        return this.bot.sendMessage(chatId, message);
    }

    async generateAndSendCard(chatId, count = 1) {
        try {
            for (let i = 0; i < count; i++) {
                // สุ่มเกมจาก Asset Manager
                const allLogos = this.assetManager.getAllLogos();
                const randomLogo = allLogos[Math.floor(Math.random() * allLogos.length)];
                
                // ดึงชื่อเกมจากไฟล์ logo
                const gameName = path.basename(randomLogo, path.extname(randomLogo));
                
                // สร้างข้อมูลเกม
                const gameData = this.cardGenerator.generateRandomGameData(gameName);
                
                // สร้างการ์ด
                const screenshotBuffer = await this.cardGenerator.generateCard(gameData);
                
                // บันทึกการ์ด
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const cardFilename = `bot_card_${timestamp}_${i+1}.png`;
                const savedPath = await this.cardGenerator.saveCard(screenshotBuffer, cardFilename);
                
                console.log(`✅ Card saved: ${savedPath}`);
                
                // สร้างข้อความแนบรูป
                const caption = this.generateCaption(gameData, i + 1, count);
                
                // ส่งการ์ด (ใช้ไฟล์ที่บันทึกแล้วแทน buffer)
                await this.bot.sendPhoto(chatId, savedPath, {
                    caption: caption,
                    parse_mode: 'HTML'
                });
                
                // หน่วงเวลาระหว่างการส่ง
                if (i < count - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // ส่งข้อความสรุป
            if (count > 1) {
                const summaryMessage = `✅ <b>สร้างการ์ดเสร็จสิ้น!</b>\n\n📊 สร้างทั้งหมด: ${count} การ์ด\n🎯 ใช้เวลา: ${Math.ceil(count * 2)} วินาที`;
                this.bot.sendMessage(chatId, summaryMessage, { parse_mode: 'HTML' });
            }
            
        } catch (error) {
            console.error('Error generating card:', error);
            this.bot.sendMessage(chatId, `❌ เกิดข้อผิดพลาด: ${error.message}`);
        }
    }

    generateCaption(gameData, currentCard = 1, totalCards = 1) {
        const cardNumber = totalCards > 1 ? `[${currentCard}/${totalCards}] ` : '';
        
        return `${cardNumber}🎮 <b>${gameData.name}</b>

🎯 <b>RTP:</b> ${gameData.rtp}%
💰 <b>อัตราชนะสูงสุด:</b> ${gameData.maxWin}
🟢 <b>ผู้เล่นออนไลน์:</b> ${gameData.players} คน
📊 <b>อัตราการชนะ:</b> ${gameData.winRate}%
🏷️ <b>ผู้ให้บริการ:</b> ${gameData.provider}

${gameData.isNew ? '🔥 <b>เกมใหม่!</b>' : ''}

#SlotGame #PG #Casino #OnlineGaming`;
    }

    start() {
        console.log('🤖 Telegram Bot started successfully!');
        console.log('📱 Bot is ready to receive commands...');
        console.log('💡 Available commands: /start, /card, /cards, /stats, /help');
        
        // จัดการ error
        this.bot.on('error', (error) => {
            console.error('❌ Bot error:', error);
        });
        
        // จัดการ polling error
        this.bot.on('polling_error', (error) => {
            console.error('❌ Polling error:', error);
        });
    }

    stop() {
        this.bot.stopPolling();
        console.log('🛑 Bot stopped');
    }
}

module.exports = TelegramBotCommands;

// ถ้ารันไฟล์นี้โดยตรง
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('❌ ไม่พบ Bot Token');
        console.log('💡 โปรดใช้งานผ่าน Web UI แทน:');
        console.log('   1. รันคำสั่ง: npm start');
        console.log('   2. เปิดเบราว์เซอร์ไปที่: http://localhost:3000');
        console.log('   3. ตั้งค่า Bot Token และ Channel ID ในหน้า Settings');
        console.log('   4. ใช้งานผ่านหน้าเว็บ');
        console.log('\n🤖 หรือใช้คำสั่ง: node telegramBotCommands.js [BOT_TOKEN]');
        console.log('   ตัวอย่าง: node telegramBotCommands.js "123456:ABC-DEF"');
        process.exit(1);
    }
    
    const botToken = args[0];
    
    try {
        const bot = new TelegramBotCommands(botToken);
        bot.start();
        
        // จัดการการปิดโปรแกรม
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down bot...');
            bot.stop();
            process.exit(0);
        });
    } catch (error) {
        console.error('❌ Error starting bot:', error.message);
        console.log('\n💡 โปรดตรวจสอบ Bot Token และใช้งานผ่าน Web UI แทน');
        process.exit(1);
    }
}