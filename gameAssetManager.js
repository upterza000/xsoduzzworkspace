const fs = require('fs');
const path = require('path');

class GameAssetManager {
    constructor() {
        this.assetsPath = './game_assets';
        this.logoPath = path.join(this.assetsPath, 'logos');
        this.backgroundPath = path.join(this.assetsPath, 'backgrounds');
        this.decorationsPath = path.join(this.assetsPath, 'decorations');
        
        // รายการไฟล์ที่เป็นโลโก้แต่งการ์ด (ไม่ใช่เกม) - ต้องข้าม
        this.decorationFiles = [
            'BMM@2x.108098f.png',
            'BMM@2x.9e52a4e.png', 
            'GA@2x.4d0e3a2.png',
            'Thai.jpg',
            'UK.png',
            'nav_common_logo_black@2x.b4708a2.png',
            'jackpot.svg',
            'medusa.svg',
            'Pg.png'
        ];
        
        // สร้างโฟลเดอร์ถ้ายังไม่มี
        this.createDirectories();
        
        // โหลดรายการไฟล์
        this.logos = this.loadAssets(this.logoPath);
        this.backgrounds = this.loadAssets(this.backgroundPath);
    }

    createDirectories() {
        const dirs = [this.assetsPath, this.logoPath, this.backgroundPath, this.decorationsPath];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Created directory: ${dir}`);
            }
        });
    }

    loadAssets(folderPath) {
        try {
            const files = fs.readdirSync(folderPath);
            return files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                const isValidImageFile = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext);
                
                // ถ้าเป็นโฟลเดอร์ logos ให้ตรวจสอบว่าไม่ใช่ไฟล์แต่งการ์ด
                if (folderPath === this.logoPath) {
                    const isDecorationFile = this.decorationFiles.includes(file);
                    return isValidImageFile && !isDecorationFile;
                }
                
                return isValidImageFile;
            });
        } catch (error) {
            console.log(`⚠️ Could not load assets from ${folderPath}: ${error.message}`);
            return [];
        }
    }

    findAssetByGameName(gameName, assetType = 'logo') {
        const assets = assetType === 'logo' ? this.logos : this.backgrounds;
        const assetPath = assetType === 'logo' ? this.logoPath : this.backgroundPath;
        
        if (assets.length === 0) {
            return null;
        }

        // ทำความสะอาดชื่อเกมเพื่อหาไฟล์
        const cleanGameName = this.cleanGameName(gameName);
        console.log(`🔍 Looking for ${assetType} for game: "${gameName}" → cleaned: "${cleanGameName}"`);
        
        // ลองหาแบบตรงกันก่อน (exact match)
        const exactMatch = this.findExactMatch(assets, cleanGameName, assetType);
        if (exactMatch) {
            console.log(`✅ Exact match found: "${exactMatch}"`);
            return path.join(assetPath, exactMatch);
        }

        // หาไฟล์ที่ตรงกับชื่อเกมมากที่สุด
        let bestMatch = null;
        let bestScore = 0;

        for (const asset of assets) {
            const assetName = this.cleanAssetName(asset, assetType);
            const score = this.calculateMatchScore(cleanGameName, assetName);
            
            console.log(`  📄 Checking "${asset}" (cleaned: "${assetName}") → score: ${score}`);
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = asset;
            }
        }

        if (bestMatch && bestScore > 10) {
            console.log(`✅ Best match found: "${bestMatch}" (score: ${bestScore})`);
            return path.join(assetPath, bestMatch);
        } else {
            console.log(`❌ No good match found for "${gameName}"`);
            return null;
        }
    }

    cleanGameName(gameName) {
        // แยกคำจากชื่อเกมและทำความสะอาด
        return gameName
            .toLowerCase()
            .replace(/['"`]/g, '') // เอาเครื่องหมายคำพูดออก
            .replace(/[^a-z0-9\s]/g, ' ') // เปลี่ยนตัวพิเศษเป็นช่องว่าง
            .replace(/\s+/g, ' ') // รวมช่องว่างหลายช่องเป็นช่องเดียว
            .trim();
    }

    cleanAssetName(filename, assetType) {
        // ทำความสะอาดชื่อไฟล์
        let name = path.parse(filename).name.toLowerCase();
        
        // สำหรับ background ให้เอา "bg" และ "background" ออก
        if (assetType === 'background') {
            name = name.replace(/\s*(bg|background)\s*$/, '').trim();
        }
        
        return name
            .replace(/['"`]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    findExactMatch(assets, gameName, assetType) {
        const gameNameLower = gameName.toLowerCase();
        
        // ลองหาแบบตรงเป็นรูปแบบต่างๆ
        const patterns = [
            gameNameLower, // ชื่อเกมตรงๆ
            gameNameLower.replace(/\s/g, ''), // ไม่มีช่องว่าง
            gameNameLower.replace(/\s/g, '-'), // ใช้ - แทนช่องว่าง
            gameNameLower.replace(/\s/g, '_'), // ใช้ _ แทนช่องว่าง
        ];

        for (const asset of assets) {
            const cleanName = this.cleanAssetName(asset, assetType);
            
            for (const pattern of patterns) {
                if (cleanName === pattern) {
                    return asset;
                }
            }
        }
        
        return null;
    }

    calculateMatchScore(gameName, assetName) {
        const gameWords = gameName.split(' ').filter(word => word.length > 0);
        const assetWords = assetName.split(/[-_\s]/).filter(word => word.length > 0);
        
        let score = 0;
        
        // ตรวจสอบคำที่ตรงกันทั้งหมด
        for (const gameWord of gameWords) {
            for (const assetWord of assetWords) {
                if (gameWord === assetWord) {
                    score += 20; // คะแนนสูงสุดสำหรับคำที่ตรงกันทุกตัวอักษร
                } else if (gameWord.includes(assetWord) && assetWord.length > 2) {
                    score += 15; // คำที่มีส่วนประกอบเหมือนกัน
                } else if (assetWord.includes(gameWord) && gameWord.length > 2) {
                    score += 10; // คำที่อยู่ในคำที่ยาวกว่า
                } else if (this.isSimilarWord(gameWord, assetWord)) {
                    score += 5; // คำที่คล้ายกัน
                }
            }
        }
        
        return score;
    }

    // ตรวจสอบคำที่คล้ายกัน (สำหรับคำที่อาจจะสะกดผิดเล็กน้อย)
    isSimilarWord(word1, word2) {
        if (Math.abs(word1.length - word2.length) > 2) return false;
        
        let differences = 0;
        const maxLen = Math.max(word1.length, word2.length);
        
        for (let i = 0; i < maxLen; i++) {
            if (word1[i] !== word2[i]) differences++;
        }
        
        return differences <= 2; // อนุญาตให้แตกต่างได้ 2 ตัวอักษร
    }

    getGameAssets(gameName) {
        const logo = this.findAssetByGameName(gameName, 'logo');
        const background = this.findAssetByGameName(gameName, 'background');
        
        return {
            logo: logo,
            background: background,
            hasLogo: logo !== null,
            hasBackground: background !== null
        };
    }

    getAvailableAssets() {
        return {
            logos: this.logos.length,
            backgrounds: this.backgrounds.length,
            logoFiles: this.logos,
            backgroundFiles: this.backgrounds
        };
    }

    // Methods needed for Telegram bot
    getAllLogos() {
        return this.logos.map(logo => path.join(this.logoPath, logo));
    }

    getAllBackgrounds() {
        return this.backgrounds.map(bg => path.join(this.backgroundPath, bg));
    }

    // เมธอดใหม่สำหรับเข้าถึงไฟล์แต่งการ์ด
    getDecorationAssets() {
        try {
            const decorationDir = this.decorationsPath;
            if (!fs.existsSync(decorationDir)) {
                return [];
            }
            
            const files = fs.readdirSync(decorationDir);
            return files
                .filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext);
                })
                .map(file => path.join(decorationDir, file));
        } catch (error) {
            console.log(`⚠️ Could not load decoration assets: ${error.message}`);
            return [];
        }
    }

    // ดึงรายชื่อเกมจริงเท่านั้น (ไม่รวมไฟล์แต่งการ์ด)
    getGameNames() {
        return this.logos.map(logoFile => {
            return path.parse(logoFile).name; // ชื่อไฟล์โดยไม่มี extension
        });
    }

    // สร้างไฟล์ตัวอย่างในโฟลเดอร์
    createExampleStructure() {
        const exampleReadme = `# Game Assets Structure

## โครงสร้างโฟลเดอร์

game_assets/
├── logos/          # โลโก้เกม
│   ├── Alchemy Gold.png
│   ├── Medusa.png
│   ├── Dead Man's Riches.png
│   └── Fortune Tiger.png
└── backgrounds/    # พื้นหลังเกม
    ├── Alchemy Gold bg.jpg
    ├── Medusa bg.png  
    ├── Dead Man's Riches bg.webp
    └── Fortune Tiger bg.jpg

## การตั้งชื่อไฟล์

### โลโก้ (logos/)
- ใช้ชื่อเกมตรงตามที่แสดงในเกม
- ตัวอย่าง: "Medusa.png", "Fortune Tiger.png"

### พื้นหลัง (backgrounds/)  
- ใช้ชื่อเกม + " bg" + นามสกุลไฟล์
- ตัวอย่าง: "Medusa bg.png", "Fortune Tiger bg.jpg"

## รูปแบบไฟล์ที่รองรับ
- PNG (แนะนำสำหรับโลโก้)
- JPG/JPEG
- WebP
- GIF

## ขนาดแนะนำ
- โลโก้: 100x100px หรือ 200x200px
- พื้นหลัง: 400x600px (ขนาดการ์ด)

## การใช้งาน
\`\`\`javascript
const assetManager = new GameAssetManager();

// ดึงรูปจากชื่อเกม
const assets = assetManager.getGameAssets("Medusa");
console.log(assets.logo);      // path/to/Medusa.png
console.log(assets.background); // path/to/Medusa bg.png

// ดูสถิติไฟล์ที่มี
const stats = assetManager.getAvailableAssets();
console.log(\`มีโลโก้ \${stats.logos} ไฟล์, พื้นหลัง \${stats.backgrounds} ไฟล์\`);
\`\`\`
`;
        
        const readmePath = path.join(this.assetsPath, 'README.md');
        if (!fs.existsSync(readmePath)) {
            fs.writeFileSync(readmePath, exampleReadme);
            console.log(`📝 Created example structure guide: ${readmePath}`);
        }
    }

    // ทดสอบการค้นหาไฟล์
    testAssetFinding(testGames = []) {
        const defaultTests = [
            'Medusa',
            'Dead Man\'s Riches', 
            'Fortune Tiger',
            'Alchemy Gold',
            'Mahjong Ways',
            'Sweet Bonanza'
        ];

        const gamesToTest = testGames.length > 0 ? testGames : defaultTests;
        
        console.log('\n🧪 Testing asset finding...\n');
        
        for (const gameName of gamesToTest) {
            console.log(`\n--- Testing: "${gameName}" ---`);
            const assets = this.getGameAssets(gameName);
            
            console.log(`Logo: ${assets.hasLogo ? '✅' : '❌'} ${assets.logo || 'Not found'}`);
            console.log(`Background: ${assets.hasBackground ? '✅' : '❌'} ${assets.background || 'Not found'}`);
        }

        // สรุปสถิติ
        const stats = this.getAvailableAssets();
        console.log(`\n📊 Summary: ${stats.logos} logos, ${stats.backgrounds} backgrounds available`);
    }
}

module.exports = GameAssetManager;