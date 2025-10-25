# 🚀 Quick Start Guide - Deploy to Render

## ⚡ ขั้นตอนรวดเร็ว (5 นาที)

### 1️⃣ เตรียม Git Repository

เปิด Terminal (PowerShell) และรันคำสั่งต่อไปนี้:

```powershell
# ไปที่โฟลเดอร์โปรเจกต์
cd "c:\Users\user\Desktop\PG Game Card (FULL)แบบตั้งเวลาได้\Rich Game Card"

# เริ่มต้น Git (ถ้ายังไม่ได้ทำ)
git init

# เพิ่มไฟล์ทั้งหมด
git add .

# Commit
git commit -m "Ready for Render deployment"

# เชื่อมต่อกับ GitHub
git remote add origin https://github.com/upterza000/xsoduzzworkspace.git

# Push
git branch -M main
git push -u origin main
```

### 2️⃣ Deploy บน Render

1. **เข้าสู่ Render**: ไปที่ https://dashboard.render.com/
2. **สร้าง Web Service**:
   - คลิก **"New +"** → **"Web Service"**
   - เชื่อมต่อ GitHub repository: `upterza000/xsoduzzworkspace`
   - เลือก branch: **main**
   - กด **"Connect"**

3. **ตั้งค่า**:
   ```
   Name: rich-game-card-bot
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free
   ```

4. **คลิก "Create Web Service"**

### 3️⃣ รอการ Deploy

- ใช้เวลาประมาณ 3-5 นาที
- ดู logs ระหว่างการ build
- เมื่อเสร็จจะแสดงสถานะ **"Live"**
- จะได้ URL เช่น: `https://rich-game-card-bot.onrender.com`

### 4️⃣ เริ่มใช้งาน

1. เปิดเบราว์เซอร์ไปที่ URL ที่ได้
2. Login:
   - Username: `admin`
   - Password: `aa112233*`
3. ไปที่ **Settings** → ใส่ Bot Token และ Channel ID
4. คลิก **Test Connection**
5. เริ่มส่งการ์ดได้เลย! 🎉

---

## ⚠️ ข้อควรระวัง Free Plan

- บอทจะ **sleep** หลังไม่ได้ใช้งาน 15 นาที
- ต้องใช้เวลา ~30 วินาที ในการ wake up
- แนะนำใช้ [UptimeRobot](https://uptimerobot.com/) เพื่อ keep alive

---

## 🆘 มีปัญหา?

### ❌ Git push ไม่ได้
```powershell
# ลองคำสั่งนี้
git push -f origin main
```

### ❌ Build failed บน Render
- ตรวจสอบ logs ใน Render Dashboard
- ตรวจสอบว่าไฟล์ `package.json` มี dependencies ครบ

### ❌ บอทไม่ส่งข้อความ
- ตรวจสอบ Bot Token และ Channel ID
- ตรวจสอบว่าบอทเป็น admin ของ channel

---

**เสร็จแล้ว!** บอทของคุณพร้อมใช้งานบน Render 🎮
