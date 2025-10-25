const GameCardGenerator = require('./gameCardGenerator');
const TelegramGameBot = require('./telegramBot');
const fs = require('fs');
const path = require('path');

async function sendRandomGameCard() {
    const args = process.argv.slice(2);
    
    // ตรวจสอบว่ามีการส่งข้อมูล Bot Token และ Channel ID มาหรือไม่
    if (args.length < 2) {
        console.log('❌ ไม่พบข้อมูลการตั้งค่า Bot Token และ Channel ID');
        console.log('💡 โปรดใช้งานผ่าน Web UI แทน:');
        console.log('   1. รันคำสั่ง: npm start');
        console.log('   2. เปิดเบราว์เซอร์ไปที่: http://localhost:3000');
        console.log('   3. ตั้งค่า Bot Token และ Channel ID ในหน้า Settings');
        console.log('   4. ใช้งานผ่านหน้าเว็บ\n');
        process.exit(1);
    }
    
    const botToken = args[0];
    const channelId = args[1];
    
    console.log('🎲 ส่งการ์ดแบบสุ่มเกม...');
    console.log(`📢 Channel ID: ${channelId}\n`);
    
    const generator = new GameCardGenerator();
    const telegramBot = new TelegramGameBot();
    
    // ตั้งค่า Bot credentials
    telegramBot.setBotCredentials(botToken, channelId);
    
    try {
        // อ่านรายชื่อเกมจาก folder logos
        const logosPath = path.join(__dirname, 'game_assets', 'logos');
        const logoFiles = fs.readdirSync(logosPath).filter(file => 
            file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
        );
        
        // ลบ .png/.jpg/.webp ออกจากชื่อไฟล์เพื่อได้ชื่อเกม
        const availableGames = logoFiles.map(file => 
            file.replace(/\.(png|jpg|jpeg|webp)$/i, '')
        );
        
        console.log(`🎮 พบเกมทั้งหมด: ${availableGames.length} เกม`);
        console.log('📝 เกมที่มี:', availableGames.slice(0, 5).join(', '), '...\n');
        
        // สุ่มเกม
        const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
        
        console.log(`🎯 เกมที่สุ่มได้: ${randomGame}`);
        
        // สร้างข้อมูลเกม
        const gameData = generator.generateRandomGameData(randomGame);
        console.log(`   RTP: ${gameData.rtp}%`);
        console.log(`   Win Rate: ${gameData.winRate}%`);
        console.log(`   ผู้เล่นออนไลน์: ${gameData.players} คน`);
        console.log(`   Max Win: ${gameData.maxWin}`);
        console.log(`   Provider: ${gameData.provider}`);
        
        // สร้างการ์ด
        console.log('\n🎨 กำลังสร้างการ์ด...');
        const screenshot = await generator.generateCard(gameData);
        const filename = `random_card_${randomGame.replace(/\s+/g, '_')}_${Date.now()}.png`;
        const filePath = await generator.saveCard(screenshot, filename);
        console.log(`   💾 บันทึกแล้ว: ${filename}`);
        
        // ส่งไปยัง Channel
        console.log('\n📤 กำลังส่งไปยัง Channel พร้อม Keyboard...');
        const result = await telegramBot.sendGameCardWithKeyboard(filePath, gameData);
        
        if (result) {
            console.log('✅ ส่งสำเร็จ!');
            console.log(`📱 Message ID: ${result.message_id}`);
            console.log(`🎮 เกม: ${randomGame}`);
            console.log(`🔗 Channel ID: ${telegramBot.channelId}`);
        } else {
            console.log('❌ ส่งไม่สำเร็จ');
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        
        if (error.message.includes('403')) {
            console.log('\n🔧 Bot ยังไม่เป็น Admin ใน Channel:');
            console.log('1. ไปที่ @cliplud888');
            console.log('2. เพิ่ม @UMovieHubBot เป็น Admin');
            console.log('3. ให้สิทธิ์ Post Messages, Send Media');
        }
    }
    
    process.exit(0);
}

// แสดงข้อมูล Bot และ Channel
console.log('🤖 Bot: Rich Game Card Generator');
console.log('💡 สำหรับความปลอดภัย โปรดใช้งานผ่าน Web UI:');
console.log('   1. รันคำสั่ง: npm start');
console.log('   2. เปิดเบราว์เซอร์ไปที่: http://localhost:3000');
console.log('   3. ใช้งานผ่านหน้าเว็บแทน\n');
console.log('🎲 Mode: สุ่มเกมอัตโนมัติ');
console.log('💡 วิธีใช้: node send-random-card.js [BOT_TOKEN] [CHANNEL_ID]');
console.log('   ตัวอย่าง: node send-random-card.js "123:ABC" "@mychannel"\n');

sendRandomGameCard();