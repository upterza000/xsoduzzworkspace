const GameCardGenerator = require('./gameCardGenerator');
const TelegramGameBot = require('./telegramBot');
const fs = require('fs');
const path = require('path');

async function sendMultipleCardsWithPagination() {
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
    const cardCount = parseInt(args[2]) || 3;
    
    console.log(`🎲 ส่งการ์ดพร้อม Pagination ${cardCount} ใบ...`);
    console.log(`📢 Channel ID: ${channelId}`);
    console.log(`🔗 URL ปุ่ม: https://t.me/UFAthai_ubot\n`);
    
    const generator = new GameCardGenerator();
    const telegramBot = new TelegramGameBot();
    
    // ตั้งค่า Bot credentials
    telegramBot.setBotCredentials(botToken, channelId);
    
    try {
        // เปิดใช้งาน polling เพื่อรับ callback จากปุ่ม
        telegramBot.startPolling();
        
        // อ่านรายชื่อเกมจาก folder logos
        const logosPath = path.join(__dirname, 'game_assets', 'logos');
        const logoFiles = fs.readdirSync(logosPath).filter(file => 
            file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
        );
        
        const availableGames = logoFiles.map(file => 
            file.replace(/\.(png|jpg|jpeg|webp)$/i, '')
        );
        
        console.log(`🎮 พบเกมทั้งหมด: ${availableGames.length} เกม\n`);
        
        const cardsData = [];
        
        // สร้างการ์ดทั้งหมดก่อน
        console.log('🎨 กำลังสร้างการ์ดทั้งหมด...');
        for (let i = 0; i < cardCount; i++) {
            // สุ่มเกมที่ไม่ซ้ำ
            let randomGame;
            do {
                randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
            } while (cardsData.some(card => card.name === randomGame) && availableGames.length > cardCount);
            
            console.log(`   📊 การ์ดที่ ${i+1}: ${randomGame}`);
            
            // สร้างข้อมูลเกม
            const gameData = generator.generateRandomGameData(randomGame);
            console.log(`      RTP: ${gameData.rtp}%, Win Rate: ${gameData.winRate}%`);
            
            // สร้างการ์ด
            const screenshot = await generator.generateCard(gameData);
            const filename = `pagination_${i+1}_${randomGame.replace(/\s+/g, '_')}_${Date.now()}.png`;
            const filePath = await generator.saveCard(screenshot, filename);
            console.log(`      💾 บันทึกแล้ว: ${filename}`);
            
            // เพิ่มข้อมูลลงในอาร์เรย์
            cardsData.push({
                ...gameData,
                imagePath: filePath
            });
        }
        
        console.log('\n📤 กำลังส่งไปยัง Channel พร้อม Pagination...');
        
        // ส่งการ์ดทั้งหมดพร้อม pagination
        const result = await telegramBot.sendMultipleCardsWithPagination(cardsData);
        
        if (result) {
            console.log('✅ ส่งสำเร็จพร้อม Pagination!');
            console.log(`📱 Message ID: ${result.message_id}`);
            console.log(`🔑 Session ID: ${result.sessionId}`);
            console.log(`📊 จำนวนการ์ด: ${result.totalCards} ใบ`);
            console.log(`⌨️ Keyboard: ปุ่ม "เล่นเลย▶️" + ปุ่ม pagination ◀ 1/${result.totalCards} ▶`);
            console.log(`🔗 Channel ID: ${telegramBot.channelId}`);
            
            console.log('\n🎯 วิธีใช้งาน:');
            console.log('• คลิกปุ่ม ◀ ▶ เพื่อเลื่อนดูการ์ดอื่น');
            console.log('• คลิกหมายเลขหน้า (1/3) เพื่อดูข้อมูลการ์ด');
            console.log('• คลิก "เล่นเลย▶️" เพื่อไปยังเกม');
            console.log('\n💡 Bot จะคอยฟังคำสั่งจากปุ่มต่อไป...');
            console.log('   กด Ctrl+C เพื่อหยุดการทำงาน');
        } else {
            console.log('❌ ส่งไม่สำเร็จ');
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        
        if (error.message.includes('403')) {
            console.log('\n🔧 Bot ยังไม่เป็น Admin ใน Channel:');
            console.log('1. ไปที่ Channel');
            console.log('2. เพิ่ม Bot เป็น Admin');
            console.log('3. ให้สิทธิ์ Post Messages, Edit Messages, Send Media');
        }
    }
}

console.log('🤖 Bot: Rich Game Card Generator');
console.log('� สำหรับความปลอดภัย โปรดใช้งานผ่าน Web UI:');
console.log('   1. รันคำสั่ง: npm start');
console.log('   2. เปิดเบราว์เซอร์ไปที่: http://localhost:3000');
console.log('   3. ใช้งานผ่านหน้าเว็บแทน\n');
console.log('⌨️ Mode: การ์ดหลายใบพร้อม Pagination');
console.log('💡 วิธีใช้: node send-multiple-with-pagination.js [BOT_TOKEN] [CHANNEL_ID] [จำนวน]');
console.log('   ตัวอย่าง: node send-multiple-with-pagination.js "123:ABC" "@mychannel" 5\n');

// จัดการการปิดโปรแกรม
process.on('SIGINT', () => {
    console.log('\n🛑 กำลังหยุดการทำงาน...');
    process.exit(0);
});

sendMultipleCardsWithPagination();