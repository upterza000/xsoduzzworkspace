// สร้างไฟล์ภาพตัวอย่างในรูปแบบ SVG
// สำหรับทดสอบระบบ Logo และ Background

// SVG สำหรับโลโก้ Dead Man's Riches
const fs = require('fs');
const path = require('path');

function createSampleAssets() {
    const logoDir = './game_assets/logos';
    const bgDir = './game_assets/backgrounds';
    
    // SVG โลโก้ Dead Man
    const deadmanLogo = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" fill="#2a5a3a"/>
        <text x="50" y="55" text-anchor="middle" fill="white" font-size="12">DEAD</text>
        <text x="50" y="70" text-anchor="middle" fill="white" font-size="12">MAN</text>
    </svg>`;
    
    // SVG โลโก้ Medusa
    const medusaLogo = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" fill="#8b5a3c"/>
        <text x="50" y="58" text-anchor="middle" fill="white" font-size="14">MEDUSA</text>
    </svg>`;
    
    // SVG โลโก้ Jackpot
    const jackpotLogo = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" fill="#ffd700"/>
        <text x="50" y="55" text-anchor="middle" fill="black" font-size="10">JACKPOT</text>
        <text x="50" y="70" text-anchor="middle" fill="black" font-size="8">💰💰💰</text>
    </svg>`;
    
    // SVG พื้นหลัง Dead Man
    const deadmanBg = `<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="deadmanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#1a3a1a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#0d2d0d;stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="400" height="600" fill="url(#deadmanGrad)"/>
        <text x="200" y="300" text-anchor="middle" fill="white" font-size="20" opacity="0.3">DEAD MAN'S RICHES</text>
    </svg>`;
    
    // SVG พื้นหลัง Medusa
    const medusaBg = `<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="medusaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#3a1a3a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#2d0d2d;stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="400" height="600" fill="url(#medusaGrad)"/>
        <text x="200" y="300" text-anchor="middle" fill="white" font-size="20" opacity="0.3">MEDUSA</text>
    </svg>`;
    
    // บันทึกไฟล์
    const assets = [
        { dir: logoDir, name: 'deadman.svg', content: deadmanLogo },
        { dir: logoDir, name: 'medusa.svg', content: medusaLogo },
        { dir: logoDir, name: 'jackpot.svg', content: jackpotLogo },
        { dir: bgDir, name: 'deadman-bg.svg', content: deadmanBg },
        { dir: bgDir, name: 'medusa-bg.svg', content: medusaBg },
    ];
    
    assets.forEach(asset => {
        const filePath = path.join(asset.dir, asset.name);
        fs.writeFileSync(filePath, asset.content);
        console.log(`✅ Created: ${filePath}`);
    });
    
    console.log('\n🎨 Sample assets created successfully!');
    console.log('📁 Check game_assets/logos/ and game_assets/backgrounds/');
}

// รันฟังก์ชัน
createSampleAssets();