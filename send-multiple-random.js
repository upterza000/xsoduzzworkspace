const GameCardGenerator = require('./gameCardGenerator');
const TelegramGameBot = require('./telegramBot');
const fs = require('fs');
const path = require('path');

async function sendMultipleRandomCards() {
    const args = process.argv.slice(2);
    
    // ตรวจสอบว่ามีการส่งข้อมูล Bot Token และ Channel ID มาหรือไม่
    if (args.length < 2) {
        console.log('❌ ไม่พบข้อมูลการตั้งค่า Bot Token และ Channel ID');
        console.log('💡 โปรดใช้งานผ่าน Web UI แทน:');
        console.log('   1. รันคำสั่ง: npm start');
        console.log('   2. เปิดเบราว์เซอร์ไปที่: http://localhost:3000');
        console.log('   3. ตั้งค่า Bot Token และ Channel ID ในหน้า Settings');
        console.log('   4. ใช้งานผ่านหน้าเว็บ\n');
        console.log('📝 สำหรับหลายแชแนล: ใช้เครื่องหมาย , คั่น เช่น "@channel1,@channel2,-1001234567890"');
        process.exit(1);
    }
    
    const botToken = args[0];
    const channelIds = args[1]; // สามารถเป็น string แบบคั่นด้วย comma หรือแชแนลเดียว
    const cardCount = parseInt(args[2]) || 3;
    
    console.log(`🎲 ส่งการ์ดแบบสุ่ม ${cardCount} ใบ...`);
    console.log(`📢 Channel ID(s): ${channelIds}\n`);
    
    const generator = new GameCardGenerator();
    const telegramBot = new TelegramGameBot();
    
    // ตั้งค่า Bot credentials (รองรับหลายแชแนล)
    await telegramBot.setBotCredentials(botToken, channelIds);
    
    try {
        // อ่านรายชื่อเกมจาก folder logos
        const logosPath = path.join(__dirname, 'game_assets', 'logos');
        const logoFiles = fs.readdirSync(logosPath).filter(file => 
            file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
        );
        
        const availableGames = logoFiles.map(file => 
            file.replace(/\.(png|jpg|jpeg|webp)$/i, '')
        );
        
        console.log(`🎮 พบเกมทั้งหมด: ${availableGames.length} เกม\n`);
        
        const sentCards = [];
        
        for (let i = 0; i < cardCount; i++) {
            // สุ่มเกมที่ไม่ซ้ำ
            let randomGame;
            do {
                randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
            } while (sentCards.some(card => card.game === randomGame) && availableGames.length > cardCount);
            
            console.log(`📊 การ์ดที่ ${i+1}: ${randomGame}`);
            
            // สร้างข้อมูลเกม
            const gameData = generator.generateRandomGameData(randomGame);
            console.log(`   RTP: ${gameData.rtp}%`);
            console.log(`   Win Rate: ${gameData.winRate}%`);
            console.log(`   ผู้เล่นออนไลน์: ${gameData.players} คน`);
            
            // สร้างการ์ด
            const screenshot = await generator.generateCard(gameData);
            const filename = `multi_random_${i+1}_${randomGame.replace(/\s+/g, '_')}.png`;
            const filePath = await generator.saveCard(screenshot, filename);
            console.log(`   💾 บันทึกแล้ว: ${filename}`);
            
            // ส่งไปยัง Channel(s)
            console.log('   📤 กำลังส่งไปยัง Channel(s) พร้อม Keyboard...');
            
            // ตรวจสอบว่ามีหลายแชแนลหรือไม่
            let result;
            if (telegramBot.channelIds && telegramBot.channelIds.length > 1) {
                // ส่งไปหลายแชแนล
                result = await telegramBot.sendGameCardWithKeyboardToAllChannels(filePath, gameData);
                
                if (result && result.successCount > 0) {
                    console.log(`   ✅ ส่งสำเร็จ ${result.successCount}/${result.totalChannels} แชแนล`);
                    result.results.forEach((res, idx) => {
                        if (res.success) {
                            console.log(`      ✅ Channel ${idx + 1}: ${res.channelId} (Message ID: ${res.messageId})`);
                        } else {
                            console.log(`      ❌ Channel ${idx + 1}: ${res.channelId} - ${res.error}`);
                        }
                    });
                    
                    sentCards.push({
                        game: randomGame,
                        multiChannel: true,
                        totalChannels: result.totalChannels,
                        successCount: result.successCount,
                        results: result.results,
                        rtp: gameData.rtp,
                        winRate: gameData.winRate
                    });
                } else {
                    console.log('   ❌ ส่งไม่สำเร็จทุกแชแนล');
                }
            } else {
                // ส่งไปแชแนลเดียว (แบบเดิม)
                result = await telegramBot.sendGameCardWithKeyboard(filePath, gameData);
                
                if (result) {
                    console.log(`   ✅ ส่งสำเร็จ! Message ID: ${result.message_id}`);
                    sentCards.push({
                        game: randomGame,
                        messageId: result.message_id,
                        rtp: gameData.rtp,
                        winRate: gameData.winRate
                    });
                } else {
                    console.log('   ❌ ส่งไม่สำเร็จ');
                }
            }
            
            // หน่วงเวลาระหว่างการส่ง
            if (i < cardCount - 1) {
                console.log('   ⏳ รอ 3 วินาที...\n');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        console.log('\n🎉 ส่งการ์ดทั้งหมดเสร็จแล้ว!');
        console.log('📊 สรุปการ์ดที่ส่งไป:');
        
        sentCards.forEach((card, index) => {
            if (card.multiChannel) {
                console.log(`   ${index+1}. ${card.game} - RTP: ${card.rtp}%, Win: ${card.winRate}%`);
                console.log(`      📤 ส่งไป ${card.successCount}/${card.totalChannels} แชแนล`);
                card.results.forEach((res, idx) => {
                    if (res.success) {
                        console.log(`         ✅ ${res.channelId} (ID: ${res.messageId})`);
                    } else {
                        console.log(`         ❌ ${res.channelId} - ${res.error}`);
                    }
                });
            } else {
                console.log(`   ${index+1}. ${card.game} (ID: ${card.messageId}) - RTP: ${card.rtp}%, Win: ${card.winRate}%`);
            }
        });
        
        // แสดงข้อมูล channel(s)
        if (telegramBot.channelIds && telegramBot.channelIds.length > 1) {
            console.log(`\n🔗 Channels (${telegramBot.channelIds.length}): ${telegramBot.channelIds.join(', ')}`);
        } else {
            console.log(`\n🔗 Channel ID: ${telegramBot.channelId || telegramBot.channelIds[0]}`);
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
console.log('🎲 Mode: สุ่มหลายเกม (รองรับหลายแชแนล)');
console.log('💡 วิธีใช้: node send-multiple-random.js [BOT_TOKEN] [CHANNEL_ID(s)] [จำนวน]');
console.log('   แชแนลเดียว: node send-multiple-random.js "123:ABC" "@mychannel" 5');
console.log('   หลายแชแนล: node send-multiple-random.js "123:ABC" "@channel1,@channel2,-1001234567890" 5\n');

sendMultipleRandomCards();