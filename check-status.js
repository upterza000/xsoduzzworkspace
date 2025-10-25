#!/usr/bin/env node

console.log('🔍 ตรวจสอบสถานะการส่งการ์ดไปยัง Telegram Channel\n');

const steps = [
    {
        step: 1,
        title: '🤖 ข้อมูล Bot ของคุณ',
        status: '✅ เสร็จแล้ว',
        details: [
            'Bot Name: ufa_promotion',
            'Username: @ufa_promotion_bot', 
            'ID: 8325325635',
            'Token: 8325325635:AAGimoX_3LDiJs83YpKe5ru4uf7WC7wR4YI'
        ]
    },
    {
        step: 2,
        title: '📢 ข้อมูล Channel ของคุณ',
        status: '✅ เสร็จแล้ว', 
        details: [
            'Channel Name: คลิปหลุดมาใหม่2025',
            'Username: @cliplud888',
            'Chat ID: -1002874765094',
            'Type: channel'
        ]
    },
    {
        step: 3,
        title: '🔐 เพิ่ม Bot เป็น Admin ใน Channel',
        status: '❌ ยังไม่เสร็จ - ต้องทำด้วยตัวเอง',
        details: [
            '1. เปิด Telegram → ไปที่ @cliplud888',
            '2. คลิกชื่อ Channel ด้านบน', 
            '3. คลิค "Administrators"',
            '4. คลิค "Add Administrator"',
            '5. ค้นหา: @ufa_promotion_bot',
            '6. เลือก Bot และให้สิทธิ์:'
        ],
        permissions: [
            '✅ Post Messages',
            '✅ Edit Messages',
            '✅ Delete Messages', 
            '✅ Send Media',
            '❌ Add New Admins (ไม่จำเป็น)',
            '❌ Ban Users (ไม่จำเป็น)'
        ]
    },
    {
        step: 4,
        title: '🧪 ทดสอบส่งการ์ด',
        status: '⏳ รอขั้นตอนที่ 3 เสร็จก่อน',
        details: [
            'หลังจากเพิ่ม Bot เป็น Admin แล้ว:',
            'node send-to-channel.js'
        ]
    }
];

steps.forEach(step => {
    console.log(`${step.step}. ${step.title}`);
    console.log(`   สถานะ: ${step.status}\n`);
    
    if (step.details) {
        step.details.forEach(detail => {
            console.log(`   ${detail}`);
        });
    }
    
    if (step.permissions) {
        console.log('   สิทธิ์ที่ต้องให้ Bot:');
        step.permissions.forEach(perm => {
            console.log(`     ${perm}`);
        });
    }
    
    console.log('');
});

console.log('🎯 สิ่งที่ต้องทำตอนนี้:');
console.log('   1. ไปที่ Telegram Channel @cliplud888');  
console.log('   2. เพิ่ม @ufa_promotion_bot เป็น Admin');
console.log('   3. ให้สิทธิ์ Post Messages, Edit Messages, Send Media');
console.log('   4. กลับมารัน: node send-to-channel.js');
console.log('');
console.log('📱 ลิงก์ Channel: https://t.me/cliplud888');
console.log('🤖 ลิงก์ Bot: https://t.me/ufa_promotion_bot');