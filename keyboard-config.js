const TelegramGameBot = require('./telegramBot');

// ปรับแต่ง URL ของปุ่ม "เล่นเลย▶️"
const PLAY_NOW_URL = 'https://t.me/UFAthai_ubot';  // เปลี่ยนเป็น URL ที่ต้องการ



console.log('⚙️ การตั้งค่า Inline Keyboard');
console.log(`🔗 URL ปุ่ม "เล่นเลย▶️": ${PLAY_NOW_URL}`);
console.log('');

// ฟังก์ชันทดสอบ URL
async function testKeyboard() {
    console.log('🧪 ทดสอบ Inline Keyboard...');
    
    try {
        const telegramBot = new TelegramGameBot();
        
        // ส่งข้อความทดสอบพร้อม keyboard
        const keyboard = {
            inline_keyboard: [[
                {
                    text: 'เล่นเลย▶️',
                    url: PLAY_NOW_URL
                }
            ]]
        };
        
        const result = await telegramBot.bot.sendMessage(telegramBot.channelId, 
            '🧪 <b>ทดสอบ Inline Keyboard</b>\n\nคลิกปุ่มด้านล่างเพื่อทดสอบ',
            {
                parse_mode: 'HTML',
                reply_markup: keyboard
            }
        );
        
        console.log('✅ ส่ง Keyboard ทดสอบสำเร็จ!');
        console.log(`📱 Message ID: ${result.message_id}`);
        console.log('🔗 ไปทดสอบที่: https://t.me/cliplud888');
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    }
    
    process.exit(0);
}

console.log('💡 วิธีใช้:');
console.log('1. แก้ไข PLAY_NOW_URL ด้านบนให้เป็น URL ที่ต้องการ');
console.log('2. รัน: node keyboard-config.js เพื่อทดสอบ');
console.log('3. รัน: node send-single.js เพื่อส่งการ์ดพร้อม keyboard');
console.log('');
console.log('🎯 URL ตัวอย่าง:');
console.log('• https://yourgame.com/play - เว็บเกม');
console.log('• https://t.me/yourchannel - Telegram Channel');
console.log('• https://line.me/yourgame - LINE');
console.log('• https://bit.ly/short-url - Short URL');
console.log('');

// ถ้ารันไฟล์นี้โดยตรง จะทดสอบ keyboard
if (require.main === module) {
    testKeyboard();
}