# Rich Game Card Generator 🎮 v2.0

ระบบสร้างการ์ดเกมอัตโนมัติและส่งไปยัง Telegram Channel พร้อม Web Dashboard สำหรับจัดการ

**🆕 อัปเดตล่าสุด (October 25, 2025):**
- 🌐 Web Dashboard สำหรับจัดการแบบ Real-time
- 🔐 ระบบ Login เพื่อความปลอดภัย
- ⏰ Auto Scheduler ส่งการ์ดอัตโนมัติ
- 📱 รองรับหลาย Telegram Channels
- ☁️ พร้อม Deploy บน Render (Free)

## ✨ คุณสมบัติ

### 🎨 ระบบสร้างการ์ด
- สร้างการ์ดเกมที่สวยงามแบบอัตโนมัติ
- สุ่มรูปภาพจาก game_assets/logos
- สร้างข้อมูลเกมแบบสุ่ม (RTP, อัตราชนะ, จำนวนผู้เล่น)
- อัตราการชนะรับประกัน 90-98.5%
- โลโก้กระชับและชัดเจนด้วย Flexbox

### 🌐 Web Dashboard
- 🔐 ระบบ Login ปลอดภัย
- 📊 Dashboard แสดงสถิติ Real-time
- 🎮 สร้างและส่งการ์ดผ่านเว็บ
- 📋 จัดการการ์ดทั้งหมด (ดู/ลบ)
- ⚙️ ตั้งค่า Bot Token และ Channel ID
- ⏰ Auto Scheduler ส่งอัตโนมัติ

### 📱 Telegram Integration
- ส่งการ์ดไปยัง Telegram Channel
- รองรับหลาย Channels พร้อมกัน
- ระบบ Inline Keyboard สำหรับโต้ตอบ
- Pagination สำหรับการ์ดหลายใบ

### ☁️ Cloud Ready
- พร้อม Deploy บน Render (Free Plan)
- Auto-deploy จาก GitHub
- Health Check Endpoint
- Environment Variables Support

## 🛠️ การติดตั้ง

### วิธีที่ 1: ใช้งานผ่าน Web Dashboard (แนะนำ) 🌐

1. **ติดตั้ง Dependencies**
```bash
npm install
```

2. **เริ่มต้น Web Server**
```bash
npm start
```

3. **เปิดเบราว์เซอร์**
```
http://localhost:3000
```

4. **Login**
- Username: `admin`
- Password: `aa112233*`

5. **ตั้งค่า Bot**
- ไปที่เมนู Settings
- ใส่ Bot Token และ Channel ID
- Test Connection
- เริ่มใช้งานได้เลย!

### วิธีที่ 2: Deploy บน Render (Free) ☁️

1. **Push โค้ดไป GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/upterza000/xsoduzzworkspace.git
git push -u origin main
```

2. **Deploy บน Render**
- ไปที่ https://dashboard.render.com/
- คลิก "New +" → "Web Service"
- เชื่อมต่อ GitHub repo
- กด "Create Web Service"
- รอ 3-5 นาที

3. **เปิดใช้งาน**
- เปิด URL ที่ Render สร้างให้
- Login และเริ่มใช้งาน

📚 **อ่านเพิ่มเติม**: [QUICK_START.md](QUICK_START.md) และ [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)

## 🚀 การใช้งาน

### ผ่าน Web Dashboard (แนะนำ)

1. เริ่มต้น server: `npm start`
2. เปิดเบราว์เซอร์: `http://localhost:3000`
3. Login: `admin` / `aa112233*`
4. ตั้งค่า Bot Token และ Channel ID
5. เริ่มสร้างและส่งการ์ด!

### ผ่าน Command Line

#### ทดสอบระบบ
```bash
npm run test
```

#### ส่งการ์ดเดียว
```bash
npm run send-single
```

#### ส่งหลายการ์ดแบบสุ่ม
```bash
npm run send-multiple-random
```

#### เปิด Web Server
```bash
npm start
# หรือ
npm run server
```

## 📁 โครงสร้างไฟล์

```
Rich Game Card/
├── public/                 # Web Dashboard files
│   ├── index.html         # Main dashboard
│   ├── login.html         # Login page
│   ├── script.js          # Frontend JavaScript
│   └── styles.css         # Styles
├── game_assets/           # Game assets folder
│   ├── backgrounds/       # Background images
│   ├── logos/             # Game logos
│   └── decorations/       # Decoration elements
├── generated_cards/       # Generated cards (auto-created)
├── server.js              # Express web server ⭐
├── main.js                # Core system
├── gameCardGenerator.js   # Card generation system
├── telegramBot.js         # Telegram bot integration
├── autoScheduler.js       # Auto-send scheduler
├── package.json           # Dependencies
├── render.yaml            # Render deployment config ⭐
├── Procfile               # Process file for deployment ⭐
├── .gitignore             # Git ignore rules ⭐
├── QUICK_START.md         # Quick start guide 📚
├── RENDER_DEPLOYMENT.md   # Deployment guide 📚
└── README.md              # This file
```

## 📋 คำสั่งที่มีให้ใช้

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm start` | เริ่มต้น Web Server (แนะนำ) |
| `npm run server` | เริ่มต้น Web Server |
| `npm run test` | ทดสอบการเชื่อมต่อและระบบ |
| `npm run send-single` | สร้างและส่งการ์ดเดียว |
| `npm run send-random` | สร้างและส่งการ์ดแบบสุ่ม |
| `npm run send-multiple-random` | ส่งหลายการ์ดแบบสุ่ม |

## 🌐 Web Dashboard Features

### 📊 Dashboard
- แสดงสถิติ Real-time
- รายการการ์ดที่สร้างล่าสุด
- สถานะระบบ

### 🎮 Send Cards
- Send Random Single Card
- Send Multiple Random Cards
- Send Specific Game Card
- Send Multiple Cards with Pagination

### ⏰ Auto Scheduler
- ตั้งเวลาส่งอัตโนมัติ
- เลือกประเภทการ์ด (Random/Specific)
- กำหนดช่วงเวลาส่ง (ชั่วโมง)
- Start/Stop/Send Now

### ⚙️ Settings
- ตั้งค่า Bot Token
- ตั้งค่า Channel ID (รองรับหลาย channels)
- Test Connection
- ระบบเข้ารหัสข้อมูล

### 📋 Cards Gallery
- ดูการ์ดทั้งหมดที่สร้าง
- ลบการ์ดที่ไม่ต้องการ
- ดาวน์โหลดการ์ด

## 🎯 ตัวอย่างการใช้งาน

### เริ่มต้นใช้งานครั้งแรก

1. **ติดตั้งและเริ่มต้น**
```bash
npm install
npm start
```

2. **เปิดเบราว์เซอร์**
```
http://localhost:3000
```

3. **Login**
- Username: `admin`
- Password: `aa112233*`

4. **ตั้งค่า Bot**
- ไปที่ Settings
- ใส่ Bot Token จาก @BotFather
- ใส่ Channel ID (เช่น @mychannel หรือ -1001234567890)
- สำหรับหลาย channels: `-1001234567890, -1009876543210`
- คลิก Test Connection

5. **เริ่มสร้างการ์ด**
- กลับไปที่ Dashboard
- เลือก Send Cards
- เลือกประเภทการ์ดที่ต้องการส่ง

### Deploy บน Render

```bash
# Push ไป GitHub
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/upterza000/xsoduzzworkspace.git
git push -u origin main

# จากนั้นไปที่ Render Dashboard และสร้าง Web Service
```

📚 **คู่มือละเอียด**: [QUICK_START.md](QUICK_START.md)

## 📝 การปรับแต่ง

### แก้ไขการออกแบบการ์ด
แก้ไขในไฟล์ `gameCardGenerator.js`:
- ขนาดการ์ด: `cardWidth`, `cardHeight`
- สีพื้นหลัง: `backgroundGradient`
- ฟอนต์และขนาดตัวอักษร

### แก้ไขข้อมูลเกม
แก้ไขในฟังก์ชัน `generateRandomGameData()`:
- ค่า RTP
- อัตราชนะสูงสุด
- จำนวนผู้เล่น

### แก้ไขข้อความ Telegram
แก้ไขในฟังก์ชัน `generateCaption()` ในไฟล์ `telegramBot.js`

## 🔧 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **ไม่สามารถเข้า Web Dashboard ได้**
   ```bash
   # ตรวจสอบว่า port 3000 ว่างหรือไม่
   # Windows
   netstat -ano | findstr :3000
   
   # หรือเปลี่ยน port
   set PORT=3001 && npm start
   ```

2. **Bot ส่งข้อความไม่ได้**
   - ตรวจสอบ BOT_TOKEN ใน Settings
   - ตรวจสอบว่า Bot เป็น Admin ใน Channel
   - ตรวจสอบ CHANNEL_ID (ต้องมี @ หรือ - นำหน้า)
   - ใช้ Test Connection เพื่อตรวจสอบ

3. **ไม่พบรูปภาพเกม**
   - วางรูปโลโก้ใน `game_assets/logos/`
   - รองรับไฟล์: .jpg, .png, .webp
   - ตั้งชื่อไฟล์เป็นชื่อเกม (เช่น Dragon_Tiger.png)

4. **Render Free Plan Sleep**
   - บอทจะ sleep หลัง 15 นาทีไม่ใช้งาน
   - ใช้ UptimeRobot ping ทุก 14 นาที
   - หรือ upgrade เป็น Paid Plan

5. **การ์ดไม่สวย/เสีย**
   - ตรวจสอบขนาดรูปโลโก้ (แนะนำ 200x200px)
   - ตรวจสอบว่ารูป backgrounds มีคุณภาพดี
   - ลองสร้างการ์ดใหม่

## 🔐 ความปลอดภัย

- **ไม่เก็บ credentials ในไฟล์**: Bot Token และ Channel ID จัดเก็บใน sessionStorage ของเบราว์เซอร์เท่านั้น
- **Login ปลอดภัย**: ระบบ session-based authentication
- **HTTPS บน Render**: Deploy บน Render จะได้ HTTPS ฟรี
- **แนะนำ**: เปลี่ยนรหัสผ่าน admin ในไฟล์ `server.js` หลังติดตั้ง

```javascript
// ใน server.js บรรทัด 20
const AUTH_CONFIG = {
    username: 'admin',
    password: 'รหัสผ่านใหม่ของคุณ'  // เปลี่ยนตรงนี้
};
```

## 📊 ตัวอย่างผลลัพธ์

การ์ดที่สร้างจะมี:
- 🎮 รูปภาพโลโก้เกมจาก game_assets/logos
- 📛 ชื่อเกมที่แยกจากชื่อไฟล์
- 💯 ข้อมูล RTP แบบสุ่ม (94-98%)
- 📊 แถบแสดงเปอร์เซ็นต์แบบ gradient
- 👥 จำนวนผู้เล่นออนไลน์
- 🎯 อัตราการชนะสูงสุด (90-98.5%)
- 🏆 เหรียญทองและธงประเทศ
- ⏰ เวลาที่สร้างการ์ด

### ตัวอย่างข้อความใน Telegram:
```
🎮 Dragon Tiger

💎 RTP: 96.50% 🔥
🎯 Win Rate: 95.2%
💰 Max Win: 5,000x
👥 Players Online: 1,247

🎲 เล่นเลย! โอกาสชนะสูง!
```

## 📚 เอกสารเพิ่มเติม

- 📖 [QUICK_START.md](QUICK_START.md) - คู่มือเริ่มต้นรวดเร็ว
- 🚀 [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) - คู่มือ Deploy บน Render แบบละเอียด
- 📝 [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) - สรุปไฟล์ Deployment
- 📋 [MULTI_CHANNEL_GUIDE.md](MULTI_CHANNEL_GUIDE.md) - วิธีส่งไปหลาย Channels

## 🆕 Changelog

### v2.0.0 (October 25, 2025)
- ✨ เพิ่ม Web Dashboard สำหรับจัดการ
- 🔐 เพิ่มระบบ Login
- ⏰ เพิ่ม Auto Scheduler
- 📱 รองรับหลาย Telegram Channels
- ☁️ พร้อม Deploy บน Render
- 🎨 ปรับปรุง UI/UX
- 🔧 ปรับปรุงความเสถียร

### v1.0.0 (September 25, 2025)
- 🎉 เวอร์ชันแรก
- 🎮 สร้างการ์ดเกมอัตโนมัติ
- 📱 ส่งไปยัง Telegram Channel

## 🤝 การสนับสนุน

หากมีปัญหาหรือต้องการความช่วยเหลือ:
1. ตรวจสอบข้อผิดพลาดใน console
2. อ่านเอกสารใน [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)
3. ใช้ Test Connection เพื่อตรวจสอบการเชื่อมต่อ
4. ตรวจสอบ logs ใน Render Dashboard (ถ้า deploy แล้ว)

## 🎯 Roadmap

- [ ] รองรับ Multiple Languages
- [ ] เพิ่ม Templates การ์ดเพิ่มเติม
- [ ] ระบบ Analytics
- [ ] Mobile App
- [ ] AI-powered Card Design

## 📜 License

MIT License - ใช้งานได้อย่างอิสระ

---

**Made with ❤️ for Game Card Automation**

⭐ หากคุณชอบโปรเจกต์นี้ อย่าลืม Star ใน GitHub!