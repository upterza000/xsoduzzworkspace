const GameCardGenerator = require('./gameCardGenerator');
const TelegramGameBot = require('./telegramBot');

async function updateAndTestNewVersion() {
    console.log('🚀 อัปเดตและทดสอบเวอร์ชันใหม่...');
    console.log('📅 Date: September 25, 2025');
    
    const generator = new GameCardGenerator();
    const telegramBot = new TelegramGameBot();
    
    try {
        // ทดสอบการ์ดใหม่หลายใบ
        const testGames = [
            'Fortune Dragon',
            'Piggy Gold', 
            'Jewels of Prosperity',
            'Dragon Hatch',
            'Zombie Outbreak'
        ];
        
        console.log('\n🎮 สร้างการ์ดทดสอบ 5 ใบ...');
        
        const cardsData = [];
        
        for (let i = 0; i < testGames.length; i++) {
            const gameName = testGames[i];
            const fullGameData = generator.generateRandomGameData(gameName);
            
            console.log(`\n📊 การ์ดที่ ${i+1}: ${gameName}`);
            console.log(`   - RTP: ${fullGameData.rtp}%`);
            console.log(`   - อัตราการชนะ: ${fullGameData.winRate}%`);
            
            const screenshot = await generator.generateCard(fullGameData);
            const filename = `updated_v2_${i+1}_${gameName.replace(/\s+/g, '_')}.png`;
            const filePath = await generator.saveCard(screenshot, filename);
            
            cardsData.push({
                ...fullGameData,
                imagePath: filePath
            });
            
            console.log(`   ✅ สร้างแล้ว: ${filename}`);
        }
        
        console.log('\n🎯 ฟีเจอร์ใหม่ในเวอร์ชันนี้:');
        console.log('📦 ขนาดคอนเทนเนอร์: 80x80px (เล็กลง 20%)');
        console.log('🖼️ ขนาดโลโก้: 76x76px (เล็กลง 21%)');
        console.log('🔘 Padding กระชับ: 1px');
        console.log('🎨 Border-radius ใหม่: 8px (container), 6px (logo)');
        console.log('💯 อัตราการชนะ: 90-98.5% (90%+ guaranteed)');
        console.log('🎯 โลโก้จัดกลาง: Flexbox perfect center');
        console.log('✨ ดีไซน์กระชับ: ไม่บดบังเนื้อหา');
        
        console.log('\n📈 สถิติการปรับปรุง:');
        const stats = cardsData.map(card => ({
            game: card.gameName,
            rtp: card.rtp,
            winRate: card.winRate,
            multiplier: card.maxMultiplier
        }));
        
        console.table(stats);
        
        console.log('\n🤖 พร้อมส่งไปยัง Telegram Channel:');
        console.log('• รองรับการส่งหลายการ์ดพร้อมกัน');
        console.log('• มี delay 2 วินาที ป้องกัน spam');
        console.log('• Caption ครบถ้วนพร้อม emoji');
        
        // แสดงตัวอย่าง caption
        console.log('\n📝 ตัวอย่าง Caption:');
        const sampleCaption = telegramBot.generateCaption(cardsData[0]);
        console.log(sampleCaption);
        
        console.log('\n✅ อัปเดตเสร็จสมบูรณ์!');
        console.log('🎉 พร้อมใช้งานแล้ว');
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    }
    
    process.exit(0);
}

updateAndTestNewVersion();