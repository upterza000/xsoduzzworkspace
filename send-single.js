const GameCardGenerator = require('./gameCardGenerator');
const TelegramGameBot = require('./telegramBot');
const fs = require('fs');
const path = require('path');

async function sendSingleCardWithKeyboard() {
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
    let gameName = args[2];
    
    console.log('🎮 ส่งการ์ดเดี่ยวพร้อม Inline Keyboard...');
    console.log(`📢 Channel ID: ${channelId}`);
    console.log(`🔗 URL ปุ่ม: https://t.me/UFAthai_ubot\n`);
    
    const generator = new GameCardGenerator();
    const telegramBot = new TelegramGameBot();
    
    // ตั้งค่า Bot credentials
    telegramBot.setBotCredentials(botToken, channelId);
    
    try {
        // ถ้าไม่ได้ระบุเกม ให้สุ่มเกม
        if (!gameName) {
            const logosPath = path.join(__dirname, 'game_assets', 'logos');
            const logoFiles = fs.readdirSync(logosPath).filter(file => 
                file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
            );
            
            const availableGames = logoFiles.map(file => 
                file.replace(/\.(png|jpg|jpeg|webp)$/i, '')
            );
            
            gameName = availableGames[Math.floor(Math.random() * availableGames.length)];
            console.log(`🎲 สุ่มเกมได้: ${gameName}`);
        } else {
            console.log(`🎯 เกมที่เลือก: ${gameName}`);
        }
        
        // สร้างข้อมูลเกม
        const gameData = generator.generateRandomGameData(gameName);
        console.log(`   RTP: ${gameData.rtp}%`);
        console.log(`   Win Rate: ${gameData.winRate}%`);
        console.log(`   ผู้เล่นออนไลน์: ${gameData.players} คน`);
        console.log(`   Max Win: ${gameData.maxWin}`);
        
        // สร้างการ์ด
        console.log('\n🎨 กำลังสร้างการ์ด...');
        const screenshot = await generator.generateCard(gameData);
        const filename = `single_card_${gameName.replace(/\s+/g, '_')}_${Date.now()}.png`;
        const filePath = await generator.saveCard(screenshot, filename);
        console.log(`   💾 บันทึกแล้ว: ${filename}`);
        
        // ส่งไปยัง Channel พร้อม Inline Keyboard
        console.log('\n📤 กำลังส่งไปยัง Channel พร้อม Keyboard...');
        const result = await telegramBot.sendGameCardWithKeyboard(filePath, gameData);
        
        if (result) {
            console.log('✅ ส่งสำเร็จพร้อม Keyboard!');
            console.log(`📱 Message ID: ${result.message_id}`);
            console.log(`🎮 เกม: ${gameName}`);
            console.log(`⌨️ Keyboard: ปุ่ม "เล่นเลย▶️" → ${telegramBot.playNowUrl}`);
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

console.log('🤖 Bot: Rich Game Card Generator');
console.log('💡 สำหรับความปลอดภัย โปรดใช้งานผ่าน Web UI:');
console.log('   1. รันคำสั่ง: npm start');
console.log('   2. เปิดเบราว์เซอร์ไปที่: http://localhost:3000');
console.log('   3. ใช้งานผ่านหน้าเว็บแทน\n');
console.log('⌨️ Mode: ส่งการ์ดพร้อม Inline Keyboard');
console.log('💡 วิธีใช้:');
console.log('   node send-single.js [BOT_TOKEN] [CHANNEL_ID] "Fortune Dragon"  # เลือกเกมเอง');
console.log('   node send-single.js [BOT_TOKEN] [CHANNEL_ID]                   # สุ่มเกม');
console.log('   ตัวอย่าง: node send-single.js "123:ABC" "@mychannel" "Fortune Dragon"\n');

sendSingleCardWithKeyboard();