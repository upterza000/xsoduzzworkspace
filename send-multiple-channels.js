const TelegramGameBot = require('./telegramBot');
const GameAssetManager = require('./gameAssetManager');
const generateGameCard = require('./gameCardGenerator');

/**
 * ตัวอย่างการส่งการ์ดไปยังหลายแชแนล
 */
async function sendToMultipleChannels() {
    try {
        // สร้าง bot instance
        const bot = new TelegramGameBot();
        
        // ตั้งค่า bot credentials และ channel IDs หลายช่อง
        const botToken = "YOUR_BOT_TOKEN";
        const channelIds = [
            "@channel1",
            "@channel2", 
            "-1001234567890",  // Numeric channel ID
            // เพิ่มแชแนลได้ตามต้องการ
        ];
        const playNowUrl = "https://your-game-url.com";
        
        // ตั้งค่าการเชื่อมต่อ
        await bot.setBotCredentials(botToken, channelIds, playNowUrl);
        
        // โหลดข้อมูลเกม
        const assetManager = new GameAssetManager();
        const gameList = assetManager.getGameList();
        
        if (gameList.length === 0) {
            console.log('❌ No games found in assets');
            return;
        }
        
        // เลือกเกมแรก
        const selectedGame = gameList[0];
        console.log(`🎮 Selected game: ${selectedGame.name}`);
        
        // สร้างการ์ด
        console.log('🎨 Generating card...');
        const cardPath = await generateGameCard(selectedGame);
        console.log(`✅ Card generated: ${cardPath}`);
        
        // ส่งไปหลายแชแนลพร้อม keyboard
        console.log('📤 Sending to multiple channels...');
        const result = await bot.sendGameCardWithKeyboardToAllChannels(cardPath, selectedGame);
        
        console.log('\n📊 การส่งเสร็จสิ้น:');
        console.log(`   - แชแนลทั้งหมด: ${result.totalChannels}`);
        console.log(`   - ส่งสำเร็จ: ${result.successCount}`);
        console.log(`   - ส่งไม่สำเร็จ: ${result.totalChannels - result.successCount}`);
        
        // แสดงรายละเอียดแต่ละแชแนล
        result.results.forEach((res, index) => {
            if (res.success) {
                console.log(`   ✅ Channel ${index + 1}: ${res.channelId} (Message ID: ${res.messageId})`);
            } else {
                console.log(`   ❌ Channel ${index + 1}: ${res.channelId} - ${res.error}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * ตัวอย่างการส่งการ์ดไปยังหลายแชแนลแบบไม่มี keyboard
 */
async function sendToMultipleChannelsSimple() {
    try {
        const bot = new TelegramGameBot();
        
        // ตั้งค่า
        const botToken = "YOUR_BOT_TOKEN";
        const channelIds = ["@channel1", "@channel2"];
        const playNowUrl = "https://your-game-url.com";
        
        await bot.setBotCredentials(botToken, channelIds, playNowUrl);
        
        // โหลดเกม
        const assetManager = new GameAssetManager();
        const gameList = assetManager.getGameList();
        const selectedGame = gameList[0];
        
        // สร้างและส่งการ์ด
        const cardPath = await generateGameCard(selectedGame);
        const result = await bot.sendGameCardToAllChannels(cardPath, selectedGame);
        
        console.log(`📊 ส่งสำเร็จ ${result.successCount}/${result.totalChannels} แชแนล`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// วิธีการรัน
if (require.main === module) {
    console.log('🚀 Starting multi-channel bot example...');
    
    // เลือกฟังก์ชันที่ต้องการรัน
    sendToMultipleChannels();
    // หรือ sendToMultipleChannelsSimple();
}

module.exports = {
    sendToMultipleChannels,
    sendToMultipleChannelsSimple
};