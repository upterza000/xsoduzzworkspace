# 🚀 Render Deployment - Manual Setup Guide

## ⚠️ สำคัญ: ใช้ Manual Setup แทน render.yaml

เนื่องจาก Render มีปัญหากับ render.yaml ของโปรเจกต์นี้ เราจะตั้งค่าผ่าน Dashboard โดยตรง

---

## 📋 ขั้นตอนการ Deploy (Manual Setup)

### 1️⃣ ไปที่ Render Dashboard
เปิด: **https://dashboard.render.com/**

### 2️⃣ สร้าง Web Service ใหม่
1. คลิก **"New +"**
2. เลือก **"Web Service"**
3. คลิก **"Connect a repository"** หรือเลือก repository ที่มีอยู่

### 3️⃣ เลือก Repository
- เลือก: **`upterza000/xsoduzzworkspace`**
- คลิก **"Connect"**

### 4️⃣ ตั้งค่า Web Service

กรอกข้อมูลตามนี้:

**Basic Settings:**
```
Name: rich-game-card-bot
Region: Singapore (หรือที่ใกล้ที่สุด)
Branch: main
Root Directory: (ว่างไว้)
Runtime: Node
```

**Build & Deploy:**
```
Build Command: npm install
Start Command: npm start
```

**Plan:**
```
Instance Type: Free
```

### 5️⃣ เพิ่ม Environment Variables

คลิก **"Advanced"** → **"Add Environment Variable"**

เพิ่มตัวแปรเหล่านี้:

```
NODE_ENV = production
PORT = 10000
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = true
PUPPETEER_EXECUTABLE_PATH = /usr/bin/chromium-browser
```

### 6️⃣ สร้าง Web Service
- ตรวจสอบข้อมูลทั้งหมด
- คลิก **"Create Web Service"**
- รอ 3-5 นาที

---

## 🔍 ตรวจสอบการ Deploy

### ดู Logs:
1. คลิกที่ Service ของคุณ
2. ไปที่แท็บ **"Logs"**
3. เลือก **"Live tail"**

### เมื่อ Deploy สำเร็จจะเห็น:
```
npm install
...
npm start
🚀 Rich Game Card API Server is running!
📊 Dashboard: http://localhost:10000
```

### สถานะจะเป็น:
- 🟢 **Live** (พร้อมใช้งาน)

---

## ✅ ทดสอบการทำงาน

### 1. เปิด URL ของคุณ
```
https://rich-game-card-bot.onrender.com
```

### 2. ทดสอบ API Status
```
https://rich-game-card-bot.onrender.com/api/status
```

ควรได้ response:
```json
{
  "success": true,
  "systemStatus": true,
  "statistics": {
    "generatedCards": 0,
    "gameAssets": 150
  }
}
```

### 3. Login และใช้งาน
- Username: `admin`
- Password: `aa112233*`

---

## 🐛 แก้ปัญหาที่พบบ่อย

### ❌ Build Failed - "requirements.txt not found"
**สาเหตุ**: Render พยายามใช้ Python build

**วิธีแก้**:
1. ตรวจสอบว่า **Runtime = Node** (ไม่ใช่ Python)
2. ลบไฟล์ `requirements.txt` ถ้ามี
3. ใช้ **Build Command: npm install**

### ❌ Port Error
**สาเหตุ**: ใช้ port ผิด

**วิธีแก้**: ตรวจสอบว่ามี Environment Variable:
```
PORT = 10000
```

### ❌ Puppeteer Error
**สาเหตุ**: ไม่มี Chromium

**วิธีแก้**: เพิ่ม Environment Variables:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = true
PUPPETEER_EXECUTABLE_PATH = /usr/bin/chromium-browser
```

**หรือ** ใช้ Dockerfile (ดูด้านล่าง)

### ❌ Health Check Failed
**สาเหตุ**: `/api/status` ไม่ตอบกลับ

**วิธีแก้**:
1. ดู logs ว่ามี error
2. ตรวจสอบว่า server เริ่มต้นสำเร็จ
3. ลอง disable health check ชั่วคราว

---

## 🐳 Alternative: ใช้ Docker (แนะนำ)

ถ้ายังมีปัญหากับ Puppeteer ให้สร้าง `Dockerfile`:

```dockerfile
FROM node:18-slim

# Install Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expose port
EXPOSE 10000

# Start application
CMD ["npm", "start"]
```

**จากนั้นใน Render Dashboard:**
- **Runtime**: Docker
- **Dockerfile Path**: ./Dockerfile
- ไม่ต้องใส่ Build/Start Command

---

## 📊 สรุป Settings สำหรับ Render

```yaml
# ไม่ใช้ render.yaml - ตั้งค่าใน Dashboard แทน

Name: rich-game-card-bot
Region: Singapore
Branch: main
Runtime: Node (หรือ Docker ถ้าใช้ Dockerfile)

Build Command: npm install
Start Command: npm start

Environment Variables:
  NODE_ENV=production
  PORT=10000
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

Plan: Free
```

---

## 🔄 Redeploy

เมื่อมีการ push ใหม่ไป GitHub:
- Render จะ **auto-deploy** โดยอัตโนมัติ
- หรือคลิก **"Manual Deploy"** → **"Deploy latest commit"**

---

## ⚠️ หมายเหตุสำคัญ

1. **Free Plan Sleep**: บอทจะ sleep หลัง 15 นาทีไม่ใช้งาน
2. **Cold Start**: ใช้เวลา ~30 วินาที ในการ wake up
3. **Build Time**: ครั้งแรกใช้เวลา 3-5 นาที
4. **Logs**: ตรวจสอบ logs เสมอเมื่อมีปัญหา

---

## ✅ Checklist

- [ ] สร้าง Web Service ใน Render
- [ ] ตั้งค่า Runtime = Node
- [ ] ใส่ Build Command = `npm install`
- [ ] ใส่ Start Command = `npm start`
- [ ] เพิ่ม Environment Variables ทั้งหมด
- [ ] คลิก Create Web Service
- [ ] รอ build (3-5 นาที)
- [ ] ตรวจสอบ logs
- [ ] ทดสอบ URL
- [ ] Login และทดสอบระบบ

---

**🎉 เมื่อทำตามขั้นตอนนี้แล้ว บอทของคุณจะพร้อมใช้งานบน Render!**

**📝 Tips**: 
- อย่าใช้ render.yaml สำหรับโปรเจกต์นี้
- ตั้งค่าผ่าน Dashboard โดยตรง
- ถ้ามีปัญหา Puppeteer ให้ใช้ Docker

**🔗 URL ตัวอย่าง**: `https://rich-game-card-bot.onrender.com`
