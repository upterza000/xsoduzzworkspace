# 🔧 Render Troubleshooting Guide

## ✅ การแก้ไขที่ทำไปแล้ว

### 1. แก้ไข Port Configuration
- เปลี่ยน port จาก `3000` → `10000` (Render default)
- อัปเดทใน `server.js` และ `render.yaml`

### 2. แก้ไข Build Command
- เปลี่ยนจาก `npm install` → `npm ci` (faster & more reliable)
- สร้าง `build.sh` สำหรับติดตั้ง Puppeteer dependencies

### 3. เพิ่ม Puppeteer Configuration
สร้างไฟล์ `.npmrc`:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### 4. อัปเดท Node Version
- เปลี่ยนจาก `>=14.0.0` → `>=18.0.0`
- เพิ่ม npm version requirement

---

## 🚀 ขั้นตอนถัดไป

### ใน Render Dashboard:

1. **ไปที่ Service ของคุณ**
2. **คลิก "Manual Deploy"** → **"Deploy latest commit"**
3. **รอการ Build** (3-5 นาที)
4. **ตรวจสอบ Logs**:
   - ดู `All logs` ว่า build สำเร็จหรือไม่
   - ถ้า error ให้อ่านข้อความ error

---

## 🐛 ปัญหาที่อาจพบและวิธีแก้

### 1. Build Failed - Puppeteer Error
**ปัญหา**: ไม่สามารถติดตั้ง Chromium ได้

**วิธีแก้**:
- ใช้ `puppeteer-core` แทน `puppeteer`
- ติดตั้ง dependencies ผ่าน build.sh

**คำสั่ง**:
```bash
npm uninstall puppeteer
npm install puppeteer-core
```

### 2. Port Already in Use
**ปัญหา**: Port ถูกใช้งานแล้ว

**วิธีแก้**: ✅ แก้แล้ว - ใช้ `process.env.PORT || 10000`

### 3. Node Version Mismatch
**ปัญหา**: Node version ไม่ตรงกับที่ต้องการ

**วิธีแก้**: ✅ แก้แล้ว - อัปเดทเป็น Node 18+

### 4. npm ci Failed
**ปัญหา**: `package-lock.json` ไม่ตรงกับ `package.json`

**วิธีแก้**:
```bash
# ในเครื่องของคุณ
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

### 5. Health Check Failed
**ปัญหา**: `/api/status` ไม่ตอบกลับ

**วิธีแก้**:
- ตรวจสอบว่า server เริ่มต้นสำเร็จ
- ดู logs ว่ามี error อะไร
- ทดสอบ endpoint ผ่าน browser

---

## 📝 Alternative: ใช้ Puppeteer-Core (แนะนำ)

ถ้า Puppeteer ยังมีปัญหา ให้ใช้ `puppeteer-core` แทน:

### 1. แก้ไข package.json:
```json
{
  "dependencies": {
    "puppeteer-core": "^21.5.0"  // แทน puppeteer
  }
}
```

### 2. แก้ไข gameCardGenerator.js:
```javascript
const puppeteer = require('puppeteer-core');

// ใน launch options
const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
    ]
});
```

---

## 🔄 Manual Redeploy

ถ้าต้องการ deploy ใหม่:

1. **Render Dashboard** → เลือก Service
2. **Manual Deploy** → **Clear build cache & deploy**
3. รอ build ใหม่

---

## 📊 ตรวจสอบสถานะ

### ใน Render Dashboard:

1. **Logs Tab**: ดู build & runtime logs
2. **Events Tab**: ดูประวัติ deploy
3. **Shell Tab**: เข้าถึง terminal (Paid plan เท่านั้น)

### Test URL:
```
https://your-app-name.onrender.com/api/status
```

ควรเห็น:
```json
{
  "success": true,
  "systemStatus": true,
  "statistics": { ... }
}
```

---

## 🆘 ถ้ายังไม่ได้

### Option 1: ใช้ Docker (แนะนำสำหรับ Free Plan)

สร้าง `Dockerfile`:
```dockerfile
FROM node:18-slim

# Install Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
EXPOSE 10000

CMD ["npm", "start"]
```

### Option 2: ลด Puppeteer Dependencies

ถ้าไม่จำเป็นต้องใช้ browser rendering:
- ใช้ Canvas API แทน Puppeteer
- ใช้ Sharp สำหรับประมวลผลภาพ

---

## ✅ Checklist

- [x] แก้ไข port เป็น 10000
- [x] เพิ่ม build.sh สำหรับ Puppeteer
- [x] เพิ่ม .npmrc configuration
- [x] อัปเดท Node version
- [x] Push ขึ้น GitHub
- [ ] Manual Deploy บน Render
- [ ] ตรวจสอบ logs
- [ ] ทดสอบ /api/status endpoint
- [ ] Login และทดสอบส่งการ์ด

---

**💡 Tips**: 
- ใช้ `Live tail` ใน Render Dashboard เพื่อดู logs real-time
- ถ้า build ใช้เวลานาน อาจเป็นเพราะติดตั้ง dependencies
- Free plan จะ sleep หลัง 15 นาที - ปกติ!

**🔗 Useful Links**:
- [Render Docs](https://render.com/docs)
- [Puppeteer on Render](https://render.com/docs/puppeteer)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
