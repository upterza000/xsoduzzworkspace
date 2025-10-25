# 🚀 คู่มือการ Deploy บอทไป Render

## 📋 ขั้นตอนการ Deploy

### 1. เตรียมโปรเจกต์

```bash
# ตรวจสอบว่าไฟล์ทั้งหมดพร้อม
git init
git add .
git commit -m "Initial commit for Render deployment"
```

### 2. Push ไป GitHub

```bash
# เชื่อมต่อกับ GitHub repository ที่คุณให้มา
git remote add origin https://github.com/upterza000/xsoduzzworkspace.git
git branch -M main
git push -u origin main
```

### 3. Deploy บน Render

#### วิธีที่ 1: ใช้ render.yaml (แนะนำ)

1. ไปที่ [Render Dashboard](https://dashboard.render.com/)
2. คลิก **"New +"** → **"Blueprint"**
3. เชื่อมต่อ GitHub repository: `upterza000/xsoduzzworkspace`
4. เลือก branch: `main`
5. Render จะอ่านไฟล์ `render.yaml` และตั้งค่าให้อัตโนมัติ
6. คลิก **"Apply"**

#### วิธีที่ 2: สร้าง Web Service ด้วยตนเอง

1. ไปที่ [Render Dashboard](https://dashboard.render.com/)
2. คลิก **"New +"** → **"Web Service"**
3. เชื่อมต่อ GitHub repository: `upterza000/xsoduzzworkspace`
4. ตั้งค่าดังนี้:
   - **Name**: `rich-game-card-bot`
   - **Environment**: `Node`
   - **Region**: `Singapore` (หรือที่ใกล้ที่สุด)
   - **Branch**: `main`
   - **Root Directory**: `Rich Game Card` (ถ้าโครงสร้างไฟล์เป็นแบบนี้)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. คลิก **"Create Web Service"**

### 4. ตั้งค่า Environment Variables (ถ้าจำเป็น)

ในหน้า Web Service → **Environment** → เพิ่มตัวแปร:

```
NODE_ENV=production
PORT=3000
```

### 5. ตรวจสอบการ Deploy

- Render จะแสดง logs ระหว่าง build และ deploy
- เมื่อ deploy สำเร็จจะแสดง **"Live"** และมี URL เช่น: `https://rich-game-card-bot.onrender.com`
- ทดสอบเข้าใช้งานที่ URL นั้น

## 🔧 การใช้งาน

### เข้าสู่ระบบ
- URL: `https://your-app-name.onrender.com`
- Username: `admin`
- Password: `aa112233*`

### ตั้งค่าบอท
1. ไปที่เมนู **Settings**
2. ใส่ **Bot Token** และ **Channel ID**
3. คลิก **Test Connection** เพื่อทดสอบ
4. เมื่อเชื่อมต่อสำเร็จแล้ว กลับไปหน้า **Dashboard** เพื่อส่งการ์ด

## ⚠️ ข้อควรระวัง

### Free Plan Limitations:
- บอทจะ sleep หลังไม่มีการใช้งาน 15 นาที
- ต้องใช้เวลา ~30 วินาทีในการ wake up ครั้งแรก
- มี bandwidth และ compute hours จำกัด

### แก้ปัญหาการ Sleep:
1. ใช้ [UptimeRobot](https://uptimerobot.com/) ping ทุกๆ 14 นาที
2. ใช้ [Cron-job.org](https://cron-job.org/) เพื่อ keep alive
3. Upgrade เป็น Paid Plan ($7/month) เพื่อไม่ให้ sleep

## 🔄 การอัปเดทโค้ด

เมื่อมีการแก้ไขโค้ด:

```bash
git add .
git commit -m "Update: คำอธิบายการแก้ไข"
git push origin main
```

Render จะ auto-deploy ใหม่โดยอัตโนมัติ

## 📦 ไฟล์ที่สำคัญสำหรับ Render

- **render.yaml**: ไฟล์ config สำหรับ Render Blueprint
- **Procfile**: บอกวิธีเริ่มต้นแอป (backup สำหรับ Heroku-style)
- **package.json**: dependencies และ scripts
- **.gitignore**: ไฟล์ที่ไม่ต้อง commit

## 🆘 การแก้ปัญหา

### Build Failed
- ตรวจสอบ logs ใน Render Dashboard
- ตรวจสอบว่า `package.json` มี dependencies ครบ
- ตรวจสอบ Node.js version (ต้อง >= 14.0.0)

### การ์ดไม่แสดง
- ตรวจสอบว่าโฟลเดอร์ `game_assets/backgrounds` และ `game_assets/logos` มีรูปภาพ
- ตรวจสอบว่ารูปภาพถูก commit ไป git แล้ว

### Telegram Bot ไม่ส่ง
- ตรวจสอบ Bot Token และ Channel ID ให้ถูกต้อง
- ตรวจสอบว่าบอทเป็น admin ของ channel
- ทดสอบด้วยปุ่ม "Test Connection"

## 📚 เอกสารเพิ่มเติม

- [Render Documentation](https://render.com/docs)
- [Render Node.js Guide](https://render.com/docs/deploy-node-express-app)
- [Render Free Plan Limits](https://render.com/docs/free)

---

**หมายเหตุ**: ไฟล์นี้สร้างขึ้นเพื่อช่วยในการ deploy Rich Game Card Bot บน Render
