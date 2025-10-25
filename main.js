const ImageSelector = require('./imageSelector');
const GameCardGenerator = require('./gameCardGenerator');
const TelegramGameBot = require('./telegramBot');
const path = require('path');
const fs = require('fs');

class RichGameCardSystem {
    constructor() {
        this.imageSelector = new ImageSelector('./game_assets');
        this.cardGenerator = new GameCardGenerator();
        this.telegramBot = new TelegramGameBot(); // สร้างโดยไม่มี credentials
        this.outputDir = './generated_cards';
        
        // สร้างโฟลเดอร์สำหรับเก็บการ์ดที่สร้าง
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir);
        }
        
        console.log('🎮 RichGameCardSystem created (waiting for credentials)');
    }

    async generateAndSendSingleCard() {
        try {
            console.log('🎮 Starting Rich Game Card Generator...');
            
            // ตรวจสอบว่า Telegram Bot ถูกกำหนดค่าแล้วหรือไม่
            if (!this.telegramBot.isConfigured()) {
                throw new Error('Telegram Bot not configured. Please set credentials first.');
            }
            
            // เลือกรูปแบบสุ่ม
            const selectedImage = this.imageSelector.getRandomImage();
            console.log(`📸 Selected image: ${selectedImage.filename}`);
            console.log(`🎯 Game name: ${selectedImage.name}`);
            
            // สร้างข้อมูลเกม
            const gameData = this.cardGenerator.generateRandomGameData(
                selectedImage.fullPath, 
                selectedImage.name
            );
            
            console.log('📊 Generated game data:', {
                name: gameData.name,
                rtp: gameData.rtp,
                maxWin: gameData.maxWin,
                players: gameData.players,
                isNew: gameData.isNew
            });
            
            // สร้างการ์ด
            console.log('🎨 Generating game card...');
            const screenshotBuffer = await this.cardGenerator.generateCard(gameData);
            
            // บันทึกการ์ด
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const cardFilename = path.join(this.outputDir, `game_card_${timestamp}.png`);
            await this.cardGenerator.saveCard(screenshotBuffer, cardFilename);
            
            console.log(`💾 Card saved: ${cardFilename}`);
            
            // ส่งไปยัง Telegram
            console.log('📱 Sending to Telegram channel...');
            await this.telegramBot.sendGameCard(cardFilename, gameData);
            
            console.log('✅ Process completed successfully!');
            
            return {
                success: true,
                cardPath: cardFilename,
                gameData: gameData
            };
            
        } catch (error) {
            console.error('❌ Error in generateAndSendSingleCard:', error.message);
            throw error;
        }
    }

    async generateAndSendMultipleCards(count = 5) {
        try {
            console.log(`🎮 Generating ${count} game cards...`);
            
            const results = [];
            
            for (let i = 0; i < count; i++) {
                console.log(`\n--- Card ${i + 1}/${count} ---`);
                
                try {
                    const result = await this.generateAndSendSingleCard();
                    results.push(result);
                    
                    // หน่วงเวลาระหว่างการสร้างและส่ง
                    if (i < count - 1) {
                        console.log('⏳ Waiting 3 seconds before next card...');
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                    
                } catch (error) {
                    console.error(`❌ Error generating card ${i + 1}:`, error.message);
                    results.push({
                        success: false,
                        error: error.message
                    });
                }
            }
            
            console.log(`\n📊 Summary: ${results.filter(r => r.success).length}/${count} cards sent successfully`);
            return results;
            
        } catch (error) {
            console.error('❌ Error in generateAndSendMultipleCards:', error.message);
            throw error;
        }
    }

    async testSystem() {
        try {
            console.log('🔧 Testing Rich Game Card System...');
            
            // ตรวจสอบว่า Telegram Bot ถูกกำหนดค่าแล้วหรือไม่
            if (!this.telegramBot.isConfigured()) {
                console.log('⚠️ Telegram Bot not configured yet');
                throw new Error('Telegram Bot not configured. Please set credentials first.');
            }
            
            // ทดสอบการเชื่อมต่อ Telegram
            console.log('📱 Testing Telegram connection...');
            const telegramOk = await this.telegramBot.testConnection();
            
            if (!telegramOk) {
                throw new Error('Telegram connection failed');
            }
            
            // ทดสอบการโหลดรูปภาพ
            console.log('📸 Testing image loading...');
            const images = this.imageSelector.getAllImages();
            console.log(`Found ${images.length} images`);
            
            if (images.length === 0) {
                console.log('⚠️ No images found in the game_assets folder');
                // ไม่ throw error เพื่อให้ระบบยังใช้งานได้
            } else {
                console.log('Sample images:');
                images.slice(0, 5).forEach(img => {
                    console.log(`  - ${img.filename} (${img.name})`);
                });
            }
            
            console.log('✅ System test completed successfully!');
            return true;
            
        } catch (error) {
            console.error('❌ System test failed:', error.message);
            return false;
        }
    }

    // สร้างการ์ดสุ่มโดยไม่ส่ง Telegram
    async generateRandomCard() {
        try {
            console.log('🎲 Generating random card...');
            
            // อ่านรายชื่อเกมจาก folder logos โดยตรง
            const logosPath = path.join(__dirname, 'game_assets', 'logos');
            const logoFiles = fs.readdirSync(logosPath).filter(file => 
                file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
            );
            
            // ลบ .png/.jpg/.webp ออกจากชื่อไฟล์เพื่อได้ชื่อเกม
            const availableGames = logoFiles.map(file => 
                file.replace(/\.(png|jpg|jpeg|webp)$/i, '')
            );
            
            if (availableGames.length === 0) {
                throw new Error('No game files found in game_assets/logos folder');
            }
            
            // สุ่มเกม
            const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
            console.log(`🎯 Selected game: ${randomGame}`);
            
            // สร้างข้อมูลเกม
            const gameData = this.cardGenerator.generateRandomGameData(randomGame);
            
            // สร้างการ์ด
            const screenshotBuffer = await this.cardGenerator.generateCard(gameData);
            
            // สร้างชื่อไฟล์
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const filename = `auto_card_${timestamp}_${Math.floor(Math.random() * 1000)}.png`;
            const filePath = path.join(this.outputDir, filename);
            
            // บันทึกไฟล์
            require('fs').writeFileSync(filePath, screenshotBuffer);
            
            console.log(`💾 Card saved: ${filePath}`);
            
            return {
                filePath: filePath,
                gameName: randomGame,
                gameData: gameData,
                filename: filename
            };
            
        } catch (error) {
            console.error('❌ Error generating random card:', error);
            throw error;
        }
    }

    // สร้างการ์ดจากเกมที่กำหนด
    async generateCard({ gameName }) {
        try {
            console.log(`🎮 Generating card for: ${gameName}`);
            
            // ค้นหาเกมที่ต้องการ
            const selectedImage = this.imageSelector.getImageByName(gameName);
            if (!selectedImage) {
                throw new Error(`Game "${gameName}" not found`);
            }
            
            // สร้างข้อมูลเกม
            const gameData = this.cardGenerator.generateRandomGameData(
                selectedImage.fullPath, 
                selectedImage.name
            );
            
            // สร้างการ์ด
            const screenshotBuffer = await this.cardGenerator.generateCard(gameData);
            
            // สร้างชื่อไฟล์
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const filename = `specific_card_${gameName.replace(/\s+/g, '_')}_${timestamp}.png`;
            const filePath = path.join(this.outputDir, filename);
            
            // บันทึกไฟล์
            require('fs').writeFileSync(filePath, screenshotBuffer);
            
            console.log(`💾 Card saved: ${filePath}`);
            
            return {
                filePath: filePath,
                gameName: selectedImage.name,
                gameData: gameData,
                filename: filename
            };
            
        } catch (error) {
            console.error('❌ Error generating specific card:', error);
            throw error;
        }
    }

    async scheduleAutoSend(intervalMinutes = 30) {
        console.log(`⏰ Starting auto-send every ${intervalMinutes} minutes...`);
        
        const intervalMs = intervalMinutes * 60 * 1000;
        
        setInterval(async () => {
            try {
                console.log('\n🔄 Auto-sending game card...');
                await this.generateAndSendSingleCard();
            } catch (error) {
                console.error('❌ Auto-send error:', error.message);
            }
        }, intervalMs);
        
        console.log('✅ Auto-send scheduler started');
    }
}

// Export สำหรับใช้เป็น module
module.exports = RichGameCardSystem;

// ถ้ารันไฟล์นี้โดยตรง
if (require.main === module) {
    const system = new RichGameCardSystem();
    
    // อ่าน command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'server';
    
    (async () => {
        try {
            switch (command) {
                case 'test':
                    await system.testSystem();
                    break;
                    
                case 'single':
                    console.log('❌ โปรดใช้งานผ่าน Web UI แทน:');
                    console.log('   1. รันคำสั่ง: npm start');
                    console.log('   2. เปิดเบราว์เซอร์ไปที่: http://localhost:3000');
                    console.log('   3. ตั้งค่า Bot Token และ Channel ID ในหน้า Settings');
                    console.log('   4. ใช้งานผ่านหน้าเว็บ');
                    break;
                    
                case 'multiple':
                    console.log('❌ โปรดใช้งานผ่าน Web UI แทน:');
                    console.log('   1. รันคำสั่ง: npm start');
                    console.log('   2. เปิดเบราว์เซอร์ไปที่: http://localhost:3000');
                    console.log('   3. ตั้งค่า Bot Token และ Channel ID ในหน้า Settings');
                    console.log('   4. ใช้งานผ่านหน้าเว็บ');
                    break;
                    
                case 'auto':
                    console.log('❌ Auto-send mode ไม่พร้อมใช้งาน');
                    console.log('💡 โปรดใช้งานผ่าน Web UI แทน:');
                    console.log('   1. รันคำสั่ง: npm start');
                    console.log('   2. เปิดเบราว์เซอร์ไปที่: http://localhost:3000');
                    break;
                    
                case 'server':
                    console.log('🌐 กำลังเปิด Web Server...');
                    console.log('💡 โปรดเปิดเบราว์เซอร์ไปที่: http://localhost:3000');
                    // เริ่ม Express server
                    const server = require('./server');
                    break;
                    
                default:
                    console.log(`
🎮 Rich Game Card Generator

💡 สำหรับความปลอดภัย โปรดใช้งานผ่าน Web UI:
   1. รันคำสั่ง: npm start
   2. เปิดเบราว์เซอร์ไปที่: http://localhost:3000
   3. ตั้งค่า Bot Token และ Channel ID ในหน้า Settings
   4. ใช้งานผ่านหน้าเว็บ

Available commands:
  node main.js server            - Start web server (default)
  node main.js test              - Test system (requires credentials)
                    `);
                    break;
            }
        } catch (error) {
            console.error('❌ Application error:', error.message);
            if (command === 'server') {
                console.log('🌐 Starting web server instead...');
                require('./server');
            } else {
                process.exit(1);
            }
        }
    })();
}