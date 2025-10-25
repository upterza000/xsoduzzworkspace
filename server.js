const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const RichGameCardSystem = require('./main');
const TelegramGameBot = require('./telegramBot');
const AutoScheduler = require('./autoScheduler');

const app = express();
const port = process.env.PORT || 3000;

// Session configuration
app.use(session({
    secret: 'rich-game-card-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.use(cors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Authentication credentials
const AUTH_CONFIG = {
    username: 'admin',
    password: 'aa112233*'
};

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    } else {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
}

// Static files - login page accessible without auth
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Protected static files
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.html') && !path.endsWith('login.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));
app.use('/generated_cards', express.static(path.join(__dirname, 'generated_cards')));
app.use('/game_assets', express.static(path.join(__dirname, 'game_assets')));

// สร้าง global TelegramBot instance ที่ใช้ร่วมกันเพื่อป้องกัน polling conflicts
let globalTelegramBot = null;
let globalRichGameCardSystem = null;
let autoScheduler = null;

// สร้าง AutoScheduler instance
autoScheduler = new AutoScheduler();

// Helper function สำหรับส่งการ์ดแบบ Smart (เลือกฟังก์ชันที่เหมาะสม)
async function sendGameCardSmart(telegramBot, filePath, gameData) {
    // ตรวจสอบว่ามีหลายแชแนลหรือไม่
    if (telegramBot.channelIds && telegramBot.channelIds.length > 1) {
        // ส่งไปหลายแชแนล
        console.log(`📤 Sending to ${telegramBot.channelIds.length} channels: ${telegramBot.channelIds.join(', ')}`);
        return await telegramBot.sendGameCardWithKeyboardToAllChannels(filePath, gameData);
    } else {
        // ส่งไปแชแนลเดียว
        console.log(`📤 Sending to single channel: ${telegramBot.channelId}`);
        return await telegramBot.sendGameCardWithKeyboard(filePath, gameData);
    }
}

// Helper function สำหรับส่งข้อความแบบ Smart
async function sendTextMessageSmart(telegramBot, message) {
    if (telegramBot.channelIds && telegramBot.channelIds.length > 1) {
        return await telegramBot.sendTextMessageToAllChannels(message);
    } else {
        return await telegramBot.sendTextMessage(message);
    }
}

function getOrCreateTelegramBot(botToken, channelId) {
    if (!globalTelegramBot) {
        globalTelegramBot = new TelegramGameBot();
    }
    
    // อัปเดต credentials ถ้าต่างจากเดิม
    if (globalTelegramBot.token !== botToken || globalTelegramBot.channelId !== channelId) {
        // หยุด polling เก่าก่อน (ถ้ามี)
        if (globalTelegramBot.bot && globalTelegramBot.bot.isPolling()) {
            globalTelegramBot.stopPolling();
        }
        
        globalTelegramBot.setBotCredentials(botToken, channelId);
    }
    
    return globalTelegramBot;
}

// Helper function to get current credentials from session storage simulation
function getCurrentCredentials(req) {
    // ในกรณีนี้เราจำเป็นต้องดึงจาก sessionStorage ใน client-side
    // แต่เนื่องจากเป็น server-side เราจะใช้วิธีอื่น
    // สำหรับตอนนี้จะให้ client ส่ง credentials มาใน request body แทน
    return {
        botToken: req.body.botToken || req.session.botToken,
        channelId: req.body.channelId || req.session.channelId
    };
}

// API Endpoints

// 🔐 Authentication APIs
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' 
        });
    }
    
    if (username === AUTH_CONFIG.username && password === AUTH_CONFIG.password) {
        req.session.authenticated = true;
        req.session.username = username;
        req.session.loginTime = new Date().toISOString();
        
        res.json({ 
            success: true, 
            message: 'เข้าสู่ระบบสำเร็จ',
            user: { username }
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' 
        });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'เกิดข้อผิดพลาดในการออกจากระบบ' 
            });
        }
        res.json({ 
            success: true, 
            message: 'ออกจากระบบสำเร็จ' 
        });
    });
});

app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({ 
            authenticated: true, 
            user: { username: req.session.username },
            loginTime: req.session.loginTime
        });
    } else {
        res.json({ authenticated: false });
    }
});

// 🏠 Home route - serve dashboard UI (protected)
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 📊 System Status API (public endpoint for health check)
app.get('/api/status', async (req, res) => {
    try {
        // ไม่ทดสอบการเชื่อมต่อ Telegram เพราะยังไม่มี credentials จาก UI
        // เพียงแสดงสถิติเท่านั้น
        const generatedCards = fs.readdirSync('./generated_cards').filter(f => f.endsWith('.png'));
        
        let gameAssets = { backgrounds: 0, logos: 0 };
        try {
            if (fs.existsSync('./game_assets/backgrounds')) {
                gameAssets.backgrounds = fs.readdirSync('./game_assets/backgrounds').length;
            }
            if (fs.existsSync('./game_assets/logos')) {
                gameAssets.logos = fs.readdirSync('./game_assets/logos').length;
            }
        } catch (error) {
            console.log('⚠️ Cannot read game assets directories:', error.message);
        }
        
        res.json({
            success: true,
            systemStatus: true, // ระบบพร้อมใช้งาน (รอ credentials จาก UI)
            statistics: {
                generatedCards: generatedCards.length,
                gameAssets: gameAssets.backgrounds + gameAssets.logos,
                backgrounds: gameAssets.backgrounds,
                logos: gameAssets.logos
            },
            recentCards: generatedCards.slice(-10).map(filename => ({
                filename,
                url: `/generated_cards/${filename}`,
                timestamp: filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1]
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🎮 Generate Single Card API
app.post('/api/generate/single', async (req, res) => {
    try {
        console.log('📡 API: Generating single card...');
        
        const { botToken, channelId } = req.body;
        
        if (!botToken || !channelId) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุ Bot Token และ Channel ID'
            });
        }
        
        // Create temporary game card system with provided credentials
        const tempGameCardSystem = new RichGameCardSystem();
        tempGameCardSystem.telegramBot.setBotCredentials(botToken, channelId);
        
        const result = await tempGameCardSystem.generateAndSendSingleCard();
        
        res.json({
            success: true,
            message: 'Card generated and sent successfully!',
            data: {
                cardPath: result.cardPath,
                cardUrl: `/generated_cards/${path.basename(result.cardPath)}`,
                gameData: result.gameData
            }
        });
    } catch (error) {
        console.error('❌ API Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🎯 Generate Multiple Cards API
app.post('/api/generate/multiple', async (req, res) => {
    try {
        const { count = 5, botToken, channelId } = req.body;
        console.log(`📡 API: Generating ${count} cards...`);
        
        if (!botToken || !channelId) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุ Bot Token และ Channel ID'
            });
        }
        
        // Create temporary game card system with provided credentials
        const tempGameCardSystem = new RichGameCardSystem();
        tempGameCardSystem.telegramBot.setBotCredentials(botToken, channelId);
        
        const results = await tempGameCardSystem.generateAndSendMultipleCards(count);
        const successCount = results.filter(r => r.success).length;
        
        res.json({
            success: true,
            message: `Generated ${successCount}/${count} cards successfully!`,
            data: {
                totalRequested: count,
                totalGenerated: successCount,
                results: results.map(result => result.success ? {
                    cardPath: result.cardPath,
                    cardUrl: `/generated_cards/${path.basename(result.cardPath)}`,
                    gameData: result.gameData
                } : {
                    error: result.error
                })
            }
        });
    } catch (error) {
        console.error('❌ API Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 📋 Get Generated Cards List API
app.get('/api/cards', requireAuth, (req, res) => {
    try {
        const cardsDir = './generated_cards';
        const cards = fs.readdirSync(cardsDir)
            .filter(file => file.endsWith('.png'))
            .map(filename => {
                const stats = fs.statSync(path.join(cardsDir, filename));
                return {
                    filename,
                    url: `/generated_cards/${filename}`,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => b.created - a.created); // Sort by newest first

        res.json({
            success: true,
            count: cards.length,
            cards
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🗑️ Delete Card API
app.delete('/api/cards/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join('./generated_cards', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Card not found'
            });
        }
        
        fs.unlinkSync(filePath);
        
        res.json({
            success: true,
            message: 'Card deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

//  Game Assets APIs
app.get('/api/assets', (req, res) => {
    try {
        const backgroundsDir = './game_assets/backgrounds';
        const logosDir = './game_assets/logos';
        
        const backgrounds = fs.existsSync(backgroundsDir) ? 
            fs.readdirSync(backgroundsDir)
                .filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i))
                .map(filename => ({
                    filename,
                    url: `/game_assets/backgrounds/${filename}`,
                    type: 'background'
                })) : [];
            
        const logos = fs.existsSync(logosDir) ?
            fs.readdirSync(logosDir)
                .filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i))
                .map(filename => ({
                    filename,
                    url: `/game_assets/logos/${filename}`,
                    type: 'logo'
                })) : [];
        
        res.json({
            success: true,
            assets: {
                backgrounds,
                logos,
                total: backgrounds.length + logos.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🖼️ Get Backgrounds API
app.get('/api/assets/backgrounds', (req, res) => {
    try {
        const backgroundsDir = './game_assets/backgrounds';
        const backgrounds = fs.existsSync(backgroundsDir) ? 
            fs.readdirSync(backgroundsDir)
                .filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i))
                .map(filename => ({
                    filename,
                    url: `/game_assets/backgrounds/${filename}`,
                    type: 'background'
                })) : [];
        
        res.json({
            success: true,
            assets: backgrounds,
            count: backgrounds.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🎮 Get Logos API  
app.get('/api/assets/logos', (req, res) => {
    try {
        const logosDir = './game_assets/logos';
        const logos = fs.existsSync(logosDir) ?
            fs.readdirSync(logosDir)
                .filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i))
                .map(filename => ({
                    filename,
                    url: `/game_assets/logos/${filename}`,
                    type: 'logo'
                })) : [];
        
        res.json({
            success: true,
            assets: logos,
            count: logos.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ⚙️ Configuration API
app.get('/api/config', (req, res) => {
    try {
        // Read package.json for version info
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        
        res.json({
            success: true,
            config: {
                version: packageJson.version,
                name: packageJson.name,
                description: packageJson.description,
                author: packageJson.author,
                scripts: Object.keys(packageJson.scripts),
                dependencies: Object.keys(packageJson.dependencies || {}),
                features: packageJson.keywords || []
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🔧 Get Settings API
app.get('/api/settings', (req, res) => {
    try {
        // สำหรับระบบใหม่ เราไม่เก็บ credentials ใน server
        // แจ้งให้ user ใส่ข้อมูลใหม่ทุกครั้ง
        res.json({
            success: true,
            settings: {
                botToken: '',
                channelId: '',
                hasToken: false,
                hasChannel: false,
                message: 'กรุณาใส่ Bot Token และ Channel ID ใหม่ทุกครั้งที่ใช้งาน'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🔧 Update Settings API (ไม่บันทึกลงไฟล์ เพื่อความปลอดภัย)
app.put('/api/settings', (req, res) => {
    try {
        const { botToken, channelId } = req.body;
        
        if (!botToken || !channelId) {
            return res.status(400).json({
                success: false,
                error: 'Bot Token และ Channel ID จำเป็นต้องระบุ'
            });
        }
        
        // Validate bot token format (basic validation)
        if (!botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
            return res.status(400).json({
                success: false,
                error: 'รูปแบบ Bot Token ไม่ถูกต้อง (ต้องเป็น: 123456789:ABC-DEF1234567890)'
            });
        }
        
        // Validate channel ID format
        if (!channelId.match(/^@[\w\d_]+$/) && !channelId.match(/^-?\d+$/)) {
            return res.status(400).json({
                success: false,
                error: 'รูปแบบ Channel ID ไม่ถูกต้อง (ต้องเป็น: @channel_name หรือ -1001234567890)'
            });
        }
        
        res.json({
            success: true,
            message: 'รูปแบบข้อมูลถูกต้อง (ไม่บันทึกลงไฟล์เพื่อความปลอดภัย)',
            settings: {
                botToken: `${botToken.substring(0, 10)}...`,
                channelId: channelId,
                hasToken: true,
                hasChannel: true
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🎯 Send Random Single Card API
app.post('/api/send/random-single', async (req, res) => {
    try {
        console.log('📡 API: Sending random single card...');
        
        const { botToken, channelId } = req.body;
        
        if (!botToken || !channelId) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุ Bot Token และ Channel ID'
            });
        }
        
        // Simulate send-random-card.js functionality
        const GameCardGenerator = require('./gameCardGenerator');
        const fs = require('fs');
        const path = require('path');
        
        const generator = new GameCardGenerator();
        const telegramBot = getOrCreateTelegramBot(botToken, channelId);
        
        // Get available games from logos folder
        const logosPath = path.join(__dirname, 'game_assets', 'logos');
        const logoFiles = fs.readdirSync(logosPath).filter(file => 
            file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
        );
        
        const availableGames = logoFiles.map(file => 
            file.replace(/\.(png|jpg|jpeg|webp)$/i, '')
        );
        
        // Random game selection
        const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
        
        // Generate game data
        const gameData = generator.generateRandomGameData(randomGame);
        
        // Generate card
        const screenshot = await generator.generateCard(gameData);
        const filename = `random_card_${randomGame.replace(/\s+/g, '_')}_${Date.now()}.png`;
        const filePath = await generator.saveCard(screenshot, filename);
        
        // Send to Telegram (รองรับหลายแชแนล)
        const result = await sendGameCardSmart(telegramBot, filePath, gameData);
        
        res.json({
            success: true,
            message: 'Random card sent successfully!',
            data: {
                cardPath: filePath,
                cardUrl: `/generated_cards/${filename}`,
                gameData: gameData,
                telegramResult: result,
                channelInfo: telegramBot.channelIds ? {
                    totalChannels: telegramBot.channelIds.length,
                    channels: telegramBot.channelIds,
                    successCount: result.successCount || (result.message_id ? 1 : 0)
                } : {
                    totalChannels: 1,
                    channels: [telegramBot.channelId],
                    successCount: result.message_id ? 1 : 0
                }
            }
        });
        
    } catch (error) {
        console.error('❌ API Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🎲 Send Multiple Random Cards API
app.post('/api/send/multiple-random', async (req, res) => {
    try {
        const { count = 3, botToken, channelId } = req.body;
        console.log(`📡 API: Sending ${count} random cards...`);
        
        if (!botToken || !channelId) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุ Bot Token และ Channel ID'
            });
        }
        
        // Simulate send-multiple-random.js functionality
        const GameCardGenerator = require('./gameCardGenerator');
        const fs = require('fs');
        const path = require('path');
        
        const generator = new GameCardGenerator();
        const telegramBot = getOrCreateTelegramBot(botToken, channelId);
        
        // Get available games
        const logosPath = path.join(__dirname, 'game_assets', 'logos');
        const logoFiles = fs.readdirSync(logosPath).filter(file => 
            file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
        );
        
        const availableGames = logoFiles.map(file => 
            file.replace(/\.(png|jpg|jpeg|webp)$/i, '')
        );
        
        const sentCards = [];
        
        for (let i = 0; i < count; i++) {
            // Random game selection (no duplicates)
            let randomGame;
            do {
                randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
            } while (sentCards.some(card => card.game === randomGame) && availableGames.length > count);
            
            // Generate game data
            const gameData = generator.generateRandomGameData(randomGame);
            
            // Generate card
            const screenshot = await generator.generateCard(gameData);
            const filename = `multi_random_${i+1}_${randomGame.replace(/\s+/g, '_')}.png`;
            const filePath = await generator.saveCard(screenshot, filename);
            
            // Send to Telegram (รองรับหลายแชแนล)
            const result = await sendGameCardSmart(telegramBot, filePath, gameData);
            
            sentCards.push({
                game: randomGame,
                telegramResult: result,
                cardPath: filePath,
                cardUrl: `/generated_cards/${filename}`,
                gameData: gameData,
                channelInfo: telegramBot.channelIds ? {
                    totalChannels: telegramBot.channelIds.length,
                    channels: telegramBot.channelIds,
                    successCount: result.successCount || (result.message_id ? 1 : 0)
                } : {
                    totalChannels: 1,
                    channels: [telegramBot.channelId],
                    successCount: result.message_id ? 1 : 0
                }
            });
            
            // Wait between sends
            if (i < count - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        res.json({
            success: true,
            message: `${count} random cards sent successfully!`,
            data: {
                totalCards: sentCards.length,
                cards: sentCards
            }
        });
        
    } catch (error) {
        console.error('❌ API Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 🎮 Send Specific Game Card API
app.post('/api/send/single-specific', async (req, res) => {
    try {
        const { gameName, botToken, channelId } = req.body;
        console.log(`📡 API: Sending specific game card: ${gameName || 'random'}`);
        
        if (!botToken || !channelId) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุ Bot Token และ Channel ID'
            });
        }
        
        // Simulate send-single.js functionality
        const GameCardGenerator = require('./gameCardGenerator');
        const fs = require('fs');
        const path = require('path');
        
        const generator = new GameCardGenerator();
        const telegramBot = getOrCreateTelegramBot(botToken, channelId);
        
        let selectedGame = gameName;
        
        // If no game specified, random selection
        if (!selectedGame) {
            const logosPath = path.join(__dirname, 'game_assets', 'logos');
            const logoFiles = fs.readdirSync(logosPath).filter(file => 
                file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
            );
            
            const availableGames = logoFiles.map(file => 
                file.replace(/\.(png|jpg|jpeg|webp)$/i, '')
            );
            
            selectedGame = availableGames[Math.floor(Math.random() * availableGames.length)];
        }
        
        // Generate game data
        const gameData = generator.generateRandomGameData(selectedGame);
        
        // Generate card
        const screenshot = await generator.generateCard(gameData);
        const filename = `single_card_${selectedGame.replace(/\s+/g, '_')}_${Date.now()}.png`;
        const filePath = await generator.saveCard(screenshot, filename);
        
        // Send to Telegram with keyboard (รองรับหลายแชแนล)
        const result = await sendGameCardSmart(telegramBot, filePath, gameData);
        
        res.json({
            success: true,
            message: 'Specific game card sent successfully!',
            data: {
                cardPath: filePath,
                cardUrl: `/generated_cards/${filename}`,
                gameData: gameData,
                telegramResult: result,
                channelInfo: telegramBot.channelIds ? {
                    totalChannels: telegramBot.channelIds.length,
                    channels: telegramBot.channelIds,
                    successCount: result.successCount || (result.message_id ? 1 : 0)
                } : {
                    totalChannels: 1,
                    channels: [telegramBot.channelId],
                    successCount: result.message_id ? 1 : 0
                }
            }
        });
        
    } catch (error) {
        console.error('❌ API Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 📄 Send Multiple Cards with Pagination API
app.post('/api/send/multiple-pagination', async (req, res) => {
    try {
        const { count = 3, botToken, channelId } = req.body;
        console.log(`📡 API: Sending ${count} cards with pagination...`);
        
        if (!botToken || !channelId) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุ Bot Token และ Channel ID'
            });
        }
        
        // Simulate send-multiple-with-pagination.js functionality
        const GameCardGenerator = require('./gameCardGenerator');
        const fs = require('fs');
        const path = require('path');
        
        const generator = new GameCardGenerator();
        const telegramBot = getOrCreateTelegramBot(botToken, channelId);
        
        // Enable polling for callback handling
        telegramBot.startPolling();
        
        // Get available games
        const logosPath = path.join(__dirname, 'game_assets', 'logos');
        const logoFiles = fs.readdirSync(logosPath).filter(file => 
            file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')
        );
        
        const availableGames = logoFiles.map(file => 
            file.replace(/\.(png|jpg|jpeg|webp)$/i, '')
        );
        
        const cardsData = [];
        
        // Generate all cards first
        for (let i = 0; i < count; i++) {
            // Random game selection (no duplicates)
            let randomGame;
            do {
                randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
            } while (cardsData.some(card => card.name === randomGame) && availableGames.length > count);
            
            // Generate game data
            const gameData = generator.generateRandomGameData(randomGame);
            
            // Generate card
            const screenshot = await generator.generateCard(gameData);
            const filename = `pagination_${i+1}_${randomGame.replace(/\s+/g, '_')}_${Date.now()}.png`;
            const filePath = await generator.saveCard(screenshot, filename);
            
            // Add to cards data
            cardsData.push({
                ...gameData,
                imagePath: filePath,
                cardUrl: `/generated_cards/${filename}`
            });
        }
        
        // Send all cards with pagination
        const result = await telegramBot.sendMultipleCardsWithPagination(cardsData);
        
        res.json({
            success: true,
            message: 'Cards with pagination sent successfully!',
            data: {
                totalCards: cardsData.length,
                cards: cardsData,
                messageId: result ? result.message_id : null,
                sessionId: result ? result.sessionId : null
            }
        });
        
    } catch (error) {
        console.error('❌ API Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

//  Test System API
app.post('/api/test', async (req, res) => {
    try {
        const { botToken, channelId } = req.body;
        
        if (!botToken || !channelId) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุ Bot Token และ Channel ID สำหรับการทดสอบ'
            });
        }
        
        // Create temporary telegram bot with provided credentials
        const tempBot = new TelegramGameBot();
        tempBot.setBotCredentials(botToken, channelId);
        
        const testResult = await tempBot.testConnection();
        
        if (testResult.success) {
            res.json({
                success: true,
                message: `การเชื่อมต่อสำเร็จ! ส่งได้ ${testResult.successCount}/${testResult.totalChannels} แชแนล`,
                testDetails: testResult,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                success: false,
                error: testResult.error || 'การทดสอบการเชื่อมต่อไม่สำเร็จ',
                testDetails: testResult,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
});

// 🕒 Auto Scheduler APIs
app.get('/api/scheduler/status', requireAuth, (req, res) => {
    try {
        const status = autoScheduler.getConfig();
        res.json({ success: true, data: status });
    } catch (error) {
        console.error('❌ Error getting scheduler status:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

app.post('/api/scheduler/start', requireAuth, (req, res) => {
    try {
        const credentials = getCurrentCredentials(req);
        if (!credentials.botToken || !credentials.channelId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ต้องตั้งค่า Bot Token และ Channel ID ก่อน' 
            });
        }

        // สร้าง RichGameCardSystem ถ้ายังไม่มี
        if (!globalRichGameCardSystem) {
            globalRichGameCardSystem = new RichGameCardSystem();
        }

        const bot = getOrCreateTelegramBot(credentials.botToken, credentials.channelId);
        
        // ตรวจสอบว่ามีหลายแชแนลหรือไม่ และส่งให้ autoScheduler
        const channelIds = credentials.channelId.includes(',') ? 
            credentials.channelId.split(',').map(id => id.trim()) : 
            [credentials.channelId];
            
        console.log(`🚀 Starting Auto Scheduler for ${channelIds.length} channel(s):`, channelIds);
        
        const started = autoScheduler.start(globalRichGameCardSystem, bot);

        if (started) {
            res.json({ 
                success: true, 
                message: `เริ่ม Auto Scheduler แล้ว (${channelIds.length} แชแนล)`,
                channels: channelIds
            });
        } else {
            res.status(400).json({ success: false, message: 'ไม่สามารถเริ่ม Auto Scheduler ได้' });
        }
    } catch (error) {
        console.error('❌ Error starting scheduler:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    }
});

app.post('/api/scheduler/stop', requireAuth, (req, res) => {
    try {
        const stopped = autoScheduler.stop();
        if (stopped) {
            res.json({ success: true, message: 'หยุด Auto Scheduler แล้ว' });
        } else {
            res.json({ success: false, message: 'Auto Scheduler ไม่ได้ทำงานอยู่' });
        }
    } catch (error) {
        console.error('❌ Error stopping scheduler:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    }
});

app.post('/api/scheduler/update', requireAuth, (req, res) => {
    try {
        const { intervalHours, cardType, specificGame, isEnabled } = req.body;
        
        const updateData = {};
        if (intervalHours !== undefined) updateData.intervalHours = parseInt(intervalHours);
        if (cardType !== undefined) updateData.cardType = cardType;
        if (specificGame !== undefined) updateData.specificGame = specificGame;
        if (isEnabled !== undefined) updateData.isEnabled = Boolean(isEnabled);

        const result = autoScheduler.updateConfig(updateData);
        
        // รีสตาร์ท scheduler ถ้ากำลังทำงานอยู่และมีการเปลี่ยนแปลง
        if (result.wasRunning && updateData.isEnabled) {
            const credentials = getCurrentCredentials(req);
            if (credentials.botToken && credentials.channelId) {
                if (!globalRichGameCardSystem) {
                    globalRichGameCardSystem = new RichGameCardSystem();
                }
                const bot = getOrCreateTelegramBot(credentials.botToken, credentials.channelId);
                autoScheduler.start(globalRichGameCardSystem, bot);
            }
        }

        res.json({ success: true, message: result.message, data: result.config });
    } catch (error) {
        console.error('❌ Error updating scheduler:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    }
});

app.post('/api/scheduler/send-now', requireAuth, (req, res) => {
    try {
        const credentials = getCurrentCredentials(req);
        if (!credentials.botToken || !credentials.channelId) {
            return res.status(400).json({ 
                success: false, 
                message: 'ต้องตั้งค่า Bot Token และ Channel ID ก่อน' 
            });
        }

        if (!globalRichGameCardSystem) {
            globalRichGameCardSystem = new RichGameCardSystem();
        }

        const bot = getOrCreateTelegramBot(credentials.botToken, credentials.channelId);
        
        // ตรวจสอบจำนวนแชแนล
        const channelIds = credentials.channelId.includes(',') ? 
            credentials.channelId.split(',').map(id => id.trim()) : 
            [credentials.channelId];
            
        console.log(`📤 Sending card now to ${channelIds.length} channel(s):`, channelIds);
        
        // ส่งการ์ดทันที
        autoScheduler.sendNow(globalRichGameCardSystem, bot)
            .then(result => {
                if (result.success && channelIds.length > 1) {
                    result.message = `ส่งการ์ดสำเร็จไปยัง ${channelIds.length} แชแนล`;
                    result.channels = channelIds;
                }
                res.json(result);
            })
            .catch(error => {
                console.error('❌ Error in send now:', error);
                res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
            });

    } catch (error) {
        console.error('❌ Error in send now endpoint:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(port, () => {
    console.log(`
🚀 Rich Game Card API Server is running!
📊 Dashboard: http://localhost:${port}
🌐 API Base URL: http://localhost:${port}/api
🎮 System: ${process.platform}
⚡ Node.js: ${process.version}
    `);
});

module.exports = app;