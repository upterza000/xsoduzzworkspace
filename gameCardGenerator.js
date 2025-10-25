const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const GameAssetManager = require('./gameAssetManager');
const ColorExtractor = require('./colorExtractor');

class GameCardGenerator {
    constructor(options = {}) {
        this.cardWidth = options.width || 350;
        this.cardHeight = options.height || 500;
        this.outputDir = options.outputDir || './generated_cards';
        this.assetManager = new GameAssetManager();
        this.colorExtractor = new ColorExtractor();
        
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async generateCard(gameData) {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        await page.setViewport({
            width: this.cardWidth,
            height: this.cardHeight,
            deviceScaleFactor: 2
        });
        
        const html = await this.generateCardHTML(gameData);
        
        await page.setContent(html);
        
        await page.waitForTimeout(2000);
        
        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: true
        });
        
        await browser.close();
        return screenshot;
    }

    async generateCardHTML(gameData) {
        const gameAssets = this.assetManager.getGameAssets(gameData.name);
        
        // ดึงสีจากพื้นหลัง (background) แทนโลโก้
        let logoColorScheme = null;
        if (gameAssets.hasBackground) {
            console.log(`🎨 Extracting colors from background: ${gameAssets.background}`);
            logoColorScheme = await this.colorExtractor.extractColorsFromLogo(gameAssets.background);
        } else if (gameAssets.hasLogo) {
            console.log(`🎨 No background found, using logo: ${gameAssets.logo}`);
            logoColorScheme = await this.colorExtractor.extractColorsFromLogo(gameAssets.logo);
        } else {
            logoColorScheme = this.colorExtractor.getDefaultColors();
        }
        
        let logoBase64 = '';
        if (gameAssets.hasLogo) {
            try {
                const logoBuffer = fs.readFileSync(gameAssets.logo);
                const logoExt = path.extname(gameAssets.logo).slice(1);
                logoBase64 = `data:image/${logoExt};base64,${logoBuffer.toString('base64')}`;
            } catch (error) {
                console.error('❌ Error loading logo:', error.message);
            }
        }

        let backgroundBase64 = '';
        if (gameAssets.hasBackground) {
            try {
                const bgBuffer = fs.readFileSync(gameAssets.background);
                const bgExt = path.extname(gameAssets.background).slice(1);
                backgroundBase64 = `data:image/${bgExt};base64,${bgBuffer.toString('base64')}`;
            } catch (error) {
                console.error('❌ Error loading background:', error.message);
            }
        }

        // โหลดใบรับรองและโลโก้ PG จากโฟลเดอร์ decorations
        const decorationsPath = './game_assets/decorations';
        let bmmBase64 = '';
        let gaBase64 = '';
        let pgLogoBase64 = '';
        
        try {
            const bmmPath = path.join(decorationsPath, 'BMM@2x.108098f.png');
            if (fs.existsSync(bmmPath)) {
                const bmmBuffer = fs.readFileSync(bmmPath);
                bmmBase64 = `data:image/png;base64,${bmmBuffer.toString('base64')}`;
            }

            const gaPath = path.join(decorationsPath, 'GA@2x.4d0e3a2.png');
            if (fs.existsSync(gaPath)) {
                const gaBuffer = fs.readFileSync(gaPath);
                gaBase64 = `data:image/png;base64,${gaBuffer.toString('base64')}`;
            }

            const pgLogoPath = path.join(decorationsPath, 'nav_common_logo_black@2x.b4708a2.png');
            if (fs.existsSync(pgLogoPath)) {
                const pgBuffer = fs.readFileSync(pgLogoPath);
                pgLogoBase64 = `data:image/png;base64,${pgBuffer.toString('base64')}`;
            }
        } catch (error) {
            console.error('❌ Error loading certificates:', error.message);
        }

        // ธงประเทศจากโฟลเดอร์ decorations
        let thaiFlag = '';
        let ukFlag = '';
        
        try {
            const decorationsPath = path.join(__dirname, 'game_assets', 'decorations');
            
            const thaiPath = path.join(decorationsPath, 'Thai.jpg');
            if (fs.existsSync(thaiPath)) {
                const thaiBuffer = fs.readFileSync(thaiPath);
                thaiFlag = `data:image/jpeg;base64,${thaiBuffer.toString('base64')}`;
            }
            
            const ukPath = path.join(decorationsPath, 'UK.png');
            if (fs.existsSync(ukPath)) {
                const ukBuffer = fs.readFileSync(ukPath);
                ukFlag = `data:image/png;base64,${ukBuffer.toString('base64')}`;
            }
        } catch (error) {
            console.error('❌ Error loading flags:', error.message);
        }

        // ฟังก์ชันกำหนดคลาส CSS สำหรับระดับความยาก
        const getDifficultyClass = (difficulty) => {
            switch(difficulty) {
                case 'ง่าย': return 'difficulty-easy';
                case 'ปกติ': return 'difficulty-normal';
                case 'ยาก': return 'difficulty-hard';
                default: return 'difficulty-hard';
            }
        };

        return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Card</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            width: ${this.cardWidth}px;
            height: ${this.cardHeight}px;
        }
        
        .game-card {
            width: 350px;
            height: 500px;
            border-radius: 20px;
            overflow: hidden;
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.8);
            background: ${logoColorScheme.cardGradient};
        }
        
        .new-badge {
            position: absolute;
            top: 15px;
            left: 15px;
            background: #ef4444;
            color: white;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            z-index: 10;
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
        }
        
        .card-header {
            position: relative;
            height: 320px;
            overflow: hidden;
        }
        
        .background-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('${backgroundBase64}');
            background-size: cover;
            background-position: center;
            opacity: 1;
            z-index: 1;
        }
        
        .header-gradient {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 100px;
            background: ${logoColorScheme.headerGradient};
            z-index: 2;
        }
        
        .game-logo-container {
            position: absolute;
            bottom: 15px;
            left: 15px;
            z-index: 3;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 8px;
            padding: 1px;
            backdrop-filter: blur(15px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.8);
            width: 80px !important;
            height: 80px !important;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .game-logo {
            width: 76px !important;
            height: 76px !important;
            max-width: 76px !important;
            max-height: 76px !important;
            object-fit: contain;
            object-position: center;
            border-radius: 6px;
            display: block;
            background: white;
            margin: auto;
        }
        
        .card-body {
            background: ${logoColorScheme.bodyGradient};
            padding: 20px;
            height: 220px;
            position: relative;
        }
        
        .title-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .game-title {
            color: white;
            font-size: 16px;
            font-weight: bold;
            line-height: 1.1;
            max-width: 200px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .pg-logo {
            height: 32px;
            width: auto;
            opacity: 0.9;
        }
        
        .rtp-section {
            margin-bottom: 15px;
        }
        
        .rtp-bar {
            width: 100%;
            height: 12px;
            background: linear-gradient(90deg, #1f2937 0%, #374151 50%, #4b5563 100%);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 8px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
            position: relative;
        }
        
        .rtp-bar::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
            border-radius: 8px 8px 0 0;
        }
        
        .rtp-fill {
            height: 100%;
            background: linear-gradient(90deg, 
                #ef4444 0%, 
                #f97316 15%, 
                #fbbf24 30%, 
                #facc15 45%, 
                #84cc16 60%, 
                #22c55e 75%, 
                #10b981 90%, 
                #059669 100%
            );
            border-radius: 8px;
            transition: width 0.8s ease-in-out;
            position: relative;
            box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4);
        }
        
        .rtp-fill::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100%;
            background: linear-gradient(90deg, 
                rgba(255,255,255,0.3) 0%, 
                transparent 30%, 
                transparent 70%, 
                rgba(255,255,255,0.2) 100%
            );
            border-radius: 8px;
            animation: shimmer 2s infinite linear;
        }
        
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        
        .stats-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .stat-group {
            text-align: center;
        }
        
        .stat-label {
            color: #a1a1aa;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        
        .stat-value {
            color: white;
            font-size: 16px;
            font-weight: bold;
        }
        
        .rtp-value {
            color: #22c55e;
        }
        
        .maxwin-value {
            color: #fbbf24;
        }
        
        .difficulty-easy {
            color: #22c55e;
        }
        
        .difficulty-normal {
            color: #fbbf24;
        }
        
        .difficulty-hard {
            color: #f97316;
        }
        
        .bottom-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
        }
        
        .certificates {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .certificate-logo {
            height: 18px;
            width: auto;
            opacity: 0.8;
        }
        
        .certificate-text {
            color: #a1a1aa;
            font-size: 11px;
            margin-left: 4px;
        }
        
        .flags-section {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .flag-icon {
            width: 20px;
            height: 15px;
            border-radius: 2px;
        }
        
        .flag-icon img {
            width: 20px;
            height: 15px;
            border-radius: 2px;
            object-fit: cover;
        }
        
        .additional-info {
            margin-top: 10px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .green-dot {
            color: #22c55e;
            font-size: 12px;
        }
        
        .info-text {
            color: #a1a1aa;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="game-card">
        <div class="new-badge">NEW</div>
        
        <div class="card-header">
            ${backgroundBase64 ? `<div class="background-overlay"></div>` : ''}
            <div class="header-gradient"></div>
            
            <div class="game-logo-container">
                ${logoBase64 ? `<img class="game-logo" src="${logoBase64}" alt="Game Logo">` : ''}
            </div>
        </div>
        
        <div class="card-body">
            <div class="title-section">
                <h2 class="game-title">${gameData.name}</h2>
                ${pgLogoBase64 ? `<img class="pg-logo" src="${pgLogoBase64}" alt="PG Soft">` : ''}
            </div>
            
            <div class="rtp-section">
                <div class="rtp-bar">
                    <div class="rtp-fill" style="width: ${gameData.rtp || 96.50}%"></div>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat-group">
                    <div class="stat-value ${getDifficultyClass(gameData.difficulty)}">${gameData.difficulty || 'ยาก'}</div>
                    <div class="stat-label">ความยากของเกม</div>
                </div>
                <div class="stat-group">
                    <div class="stat-value rtp-value">${gameData.rtp || '96.50'}%</div>
                    <div class="stat-label">RTP</div>
                </div>
                <div class="stat-group">
                    <div class="stat-value maxwin-value">${gameData.maxWin || 'x5000'}</div>
                    <div class="stat-label">อัตราส่วนสูงสุด</div>
                </div>
            </div>
            
            <div class="bottom-section">
                <div class="certificates">
                    ${bmmBase64 ? `<img class="certificate-logo" src="${bmmBase64}" alt="BMM">` : ''}
                    <span class="certificate-text"></span>
                    ${gaBase64 ? `<img class="certificate-logo" src="${gaBase64}" alt="GA">` : ''}
                    <span class="certificate-text"></span>
                </div>
                <div class="flags-section">
                    <div class="flag-icon"><img src="${ukFlag}" alt="UK"></div>
                    <div class="flag-icon"><img src="${thaiFlag}" alt="Thai"></div>
                    <span class="certificate-text">ภาษา</span>
                </div>
            </div>
            
            <div class="additional-info">
                <span class="green-dot">●</span>
                <span class="info-text">${gameData.players} ผู้เล่นออนไลน์</span>
            </div>
        </div>
    </div>
</body>
</html>
        `;
    }

    async saveCard(screenshotBuffer, filename) {
        const filePath = path.join(this.outputDir, filename);
        fs.writeFileSync(filePath, screenshotBuffer);
        return filePath;
    }

    generateRandomGameData(gameName) {
        // สุ่ม RTP ตั้งแต่ 90% ขึ้นไป
        const minRTP = 90;
        const maxRTP = 99.5;
        const rtp = Math.round((Math.random() * (maxRTP - minRTP) + minRTP) * 100) / 100;
        
        // สุ่มผู้เล่นออนไลน์ระหว่าง 700-5,000 คน
        const minPlayers = 700;
        const maxPlayers = 5000;
        const players = Math.floor(Math.random() * (maxPlayers - minPlayers + 1)) + minPlayers;
        
        // สุ่มอัตราการชนะตั้งแต่ 90% ขึ้นไป
        const minWinRate = 90;
        const maxWinRate = 98.5;
        const winRate = Math.round((Math.random() * (maxWinRate - minWinRate) + minWinRate) * 100) / 100;
        
        const maxWinValues = ['10,000x', '15,000x', '5,000x', '20,000x', '8,000x', '12,000x'];
        const difficultyLevels = ['ง่าย', 'ปกติ', 'ยาก'];
        
        return {
            name: gameName,
            provider: 'PG Soft',
            rtp: rtp,
            players: players.toLocaleString(),
            maxWin: maxWinValues[Math.floor(Math.random() * maxWinValues.length)],
            difficulty: difficultyLevels[Math.floor(Math.random() * difficultyLevels.length)],
            winRate: winRate
        };
    }
}

module.exports = GameCardGenerator;