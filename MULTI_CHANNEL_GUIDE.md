# 📢 Multi-Channel Support Guide

## ฟีเจอร์หลายแชแนล (Multiple Channels)

ระบบ Rich Game Card ตอนนี้รองรับการส่งการ์ดไปยังหลายแชแนล Telegram พร้อมกัน!

## 🎯 วิธีการใช้งาน

### 1. ผ่าน Code (TelegramGameBot)

```javascript
const TelegramGameBot = require('./telegramBot');

const bot = new TelegramGameBot();

// วิธีที่ 1: ส่งผ่าน Array
const channelIds = ["@channel1", "@channel2", "-1001234567890"];
await bot.setBotCredentials(botToken, channelIds, playNowUrl);

// วิธีที่ 2: ส่งผ่าน String คั่นด้วย comma
await bot.setBotCredentials(botToken, "@channel1,@channel2,-1001234567890", playNowUrl);

// ส่งไปหลายแชแนลพร้อม keyboard
const result = await bot.sendGameCardWithKeyboardToAllChannels(cardPath, gameData);

// ส่งไปหลายแชแนลแบบธรรมดา
const result = await bot.sendGameCardToAllChannels(cardPath, gameData);
```

### 2. ผ่าน Command Line

```bash
# แชแนลเดียว
node send-multiple-random.js "BOT_TOKEN" "@mychannel" 3

# หลายแชแนล (คั่นด้วย comma)
node send-multiple-random.js "BOT_TOKEN" "@channel1,@channel2,-1001234567890" 5
```

### 3. ผ่าน Web UI

1. เปิด http://localhost:3000
2. ไปที่หน้า Settings
3. ใส่ Channel IDs คั่นด้วย comma เช่น: `@channel1,@channel2,-1001234567890`
4. ใช้งานผ่านหน้าเว็บตามปกติ

## 📋 รูปแบบ Channel ID ที่รองรับ

- **Username**: `@mychannel`
- **Numeric ID**: `-1001234567890`
- **Mixed**: `@channel1,-1001234567890,@channel2`

## ⚡ ฟีเจอร์พิเศษ

### Rate Limiting Protection
- หน่วงเวลา 1 วินาทีระหว่างการส่งแต่ละแชแนล
- ป้องกัน Telegram API rate limit

### Error Handling
- ถ้าแชแนลใดส่งไม่สำเร็จ จะยังคงส่งไปแชแนลอื่นต่อ
- แสดงผลลัพธ์แยกตามแชแนล

### Backward Compatibility
- ยังคงรองรับการส่งแชแนลเดียวแบบเดิม
- ไม่กระทบกับโค้ดเก่า

## 📊 ตัวอย่างผลลัพธ์

```
📊 Send summary: 2/3 channels successful
✅ Channel 1: @channel1 (Message ID: 123)
✅ Channel 2: @channel2 (Message ID: 124)
❌ Channel 3: -1001234567890 - Bot not admin in channel
```

## 🔧 Methods ที่เพิ่มมา

### TelegramGameBot Class

| Method | Description |
|--------|-------------|
| `sendGameCardToAllChannels()` | ส่งการ์ดไปหลายแชแนลแบบธรรมดา |
| `sendGameCardWithKeyboardToAllChannels()` | ส่งการ์ดไปหลายแชแนลพร้อม keyboard |

### Return Value Structure

```javascript
{
    totalChannels: 3,
    successCount: 2,
    results: [
        {
            channelId: "@channel1",
            success: true,
            messageId: 123,
            result: {...}
        },
        {
            channelId: "@channel2", 
            success: false,
            error: "Bot not admin in channel"
        }
    ]
}
```

## ⚠️ ข้อควรระวัง

1. **Bot Permissions**: Bot ต้องเป็น Admin ในทุกแชแนลที่ต้องการส่ง
2. **Rate Limits**: Telegram มีข้อจำกัดการส่งข้อความ (~30 msg/sec)
3. **Error Handling**: ตรวจสอบ `success` flag ในผลลัพธ์
4. **Memory Usage**: การส่งหลายแชแนลจะใช้หน่วยความจำมากขึ้น

## 🔧 แก้ไขปัญหา

### Bot ส่งไม่ได้บางแชแนล
1. ตรวจสอบว่า Bot เป็น Admin ในแชแนลนั้น
2. ให้สิทธิ์ "Send Messages" และ "Send Media"
3. ตรวจสอบ Channel ID ว่าถูกต้อง

### Rate Limited
1. เพิ่มเวลาหน่วงระหว่างการส่ง
2. ลดจำนวนแชแนลหรือการ์ดที่ส่งพร้อมกัน

### Memory Issues
1. ส่งทีละ batch แทนการส่งทั้งหมดพร้อมกัน
2. ใช้ `setTimeout` เพื่อให้ GC ทำงาน