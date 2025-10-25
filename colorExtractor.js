const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ColorExtractor {
    constructor() {
        this.colorCache = new Map(); // Cache สำหรับเก็บสีที่เคยดึงแล้ว
    }

    async extractColorsFromLogo(imagePath) {
        // ตรวจสอบ cache ก่อน
        if (this.colorCache.has(imagePath)) {
            return this.colorCache.get(imagePath);
        }

        try {
            if (!fs.existsSync(imagePath)) {
                return this.getDefaultColors();
            }

            // ตรวจสอบว่าเป็นไฟล์พื้นหลังหรือโลโก้
            const isBackground = imagePath.includes('background') || imagePath.includes('bg');
            
            // ใช้ sharp เพื่อ resize และอ่านข้อมูลสี
            const resizeOptions = isBackground 
                ? { width: 200, height: 200 } // พื้นหลังใช้ขนาดใหญ่กว่า
                : { width: 100, height: 100 }; // โลโก้ใช้ขนาดเล็กกว่า

            const { data, info } = await sharp(imagePath)
                .resize(resizeOptions.width, resizeOptions.height)
                .raw()
                .toBuffer({ resolveWithObject: true });

            // วิเคราะห์สีเด่น
            const colors = isBackground 
                ? this.analyzeBackgroundColors(data, info)
                : this.analyzeColors(data, info);
            
            // สร้าง gradient สำหรับการ์ด
            const gradient = this.createGradient(colors);
            
            const result = {
                colors,
                gradient,
                cardGradient: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 30%, ${colors.secondary} 70%, ${colors.lightMuted} 100%)`,
                bodyGradient: `linear-gradient(180deg, ${colors.accent} 0%, ${colors.muted} 50%, ${colors.primary} 100%)`,
                headerGradient: `linear-gradient(to top, ${this.hexToRgba(colors.accent, 0.9)}, transparent)`
            };

            // เก็บใน cache
            this.colorCache.set(imagePath, result);
            
            console.log(`🎨 Colors extracted from ${path.basename(imagePath)}:`, colors);
            return result;

        } catch (error) {
            console.error('❌ Error extracting colors:', error.message);
            return this.getDefaultColors();
        }
    }

    analyzeBackgroundColors(data, info) {
        const { width, height, channels } = info;
        const colorCounts = new Map();
        
        // สำหรับพื้นหลัง ให้สุ่มตัวอย่าง pixel เพื่อความเร็ว
        const sampleStep = 3;
        
        for (let i = 0; i < data.length; i += channels * sampleStep) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // ข้าม pixel ที่โปร่งใส
            if (channels === 4 && data[i + 3] < 100) continue;
            
            // คำนวณ HSV values
            const max = Math.max(r, g, b) / 255;
            const min = Math.min(r, g, b) / 255;
            const diff = max - min;
            const brightness = max;
            const saturation = max === 0 ? 0 : diff / max;
            
            // หาสีที่มีความสดใส (saturation) และความสว่างที่เหมาะสม
            if (saturation > 0.15 && brightness > 0.2 && brightness < 0.9) {
                // จัดกลุ่มสีใกล้เคียงกัน
                const groupedR = Math.floor(r / 15) * 15;
                const groupedG = Math.floor(g / 15) * 15;
                const groupedB = Math.floor(b / 15) * 15;
                
                const color = `rgb(${groupedR}, ${groupedG}, ${groupedB})`;
                
                // ให้น้ำหนักสูงกับสีที่มี saturation มาก
                const weight = Math.pow(saturation * 100, 2) + brightness * 50;
                colorCounts.set(color, (colorCounts.get(color) || 0) + weight);
            }
        }
        
        // เรียงลำดับสีตามน้ำหนัก
        const sortedColors = Array.from(colorCounts.entries())
            .sort(([,a], [,b]) => b - a)
            .map(([color]) => color);
        
        console.log(`🔍 Found ${sortedColors.length} candidate colors:`, sortedColors.slice(0, 5));
        
        // ถ้าไม่พบสีที่เหมาะสม ให้ใช้ธีมสุ่ม
        if (sortedColors.length === 0) {
            console.log('⚠️ No vibrant colors found, using random theme');
            return this.getColorsByGameTheme();
        }
        
        // เลือกสีหลักและปรับให้เข้มขึ้น
        const baseColor = sortedColors[0];
        console.log(`🎨 Selected base color: ${baseColor}`);
        
        const primary = this.enhanceColor(baseColor, 1.5); // เพิ่มความเข้ม
        const secondary = this.adjustBrightness(primary, 1.3);
        const accent = this.adjustBrightness(primary, 0.7);
        const muted = this.adjustSaturation(primary, 0.6);
        const lightMuted = this.adjustBrightness(primary, 1.6);
        const darkMuted = this.adjustBrightness(primary, 0.4);
        
        return {
            primary,
            secondary,
            accent,
            muted,
            lightMuted,
            darkMuted
        };
    }

    // ฟังก์ชันเพิ่มความเข้มของสี
    enhanceColor(color, factor) {
        const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!rgb) return color;
        
        let r = parseInt(rgb[1]);
        let g = parseInt(rgb[2]);
        let b = parseInt(rgb[3]);
        
        // เพิ่มความเข้มโดยลดสีที่น้อยที่สุดและเพิ่มสีที่มากที่สุด
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        
        if (max > min) {
            r = r === max ? Math.min(255, r * factor) : r * 0.8;
            g = g === max ? Math.min(255, g * factor) : g * 0.8;
            b = b === max ? Math.min(255, b * factor) : b * 0.8;
        }
        
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    analyzeColors(data, info) {
        const { width, height, channels } = info;
        const colorCounts = new Map();
        
        // นับสีแต่ละสี โดยข้ามสีขาว/ดำ/เทาที่เป็นพื้นหลัง
        for (let i = 0; i < data.length; i += channels) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // ข้าม pixel ที่โปร่งใส (ถ้ามี alpha channel)
            if (channels === 4 && data[i + 3] < 128) continue;
            
            // ข้ามสีขาว, ดำ, เทา (พื้นหลัง)
            const brightness = (r + g + b) / 3;
            const saturation = Math.abs(Math.max(r, g, b) - Math.min(r, g, b));
            
            // ข้ามสีที่ไม่มีสีสัน (เทา) หรือสีขาว/ดำ
            if (saturation < 30 || brightness > 240 || brightness < 30) continue;
            
            // จัดกลุ่มสีคล้ายๆ กัน
            const groupedR = Math.floor(r / 16) * 16;
            const groupedG = Math.floor(g / 16) * 16;
            const groupedB = Math.floor(b / 16) * 16;
            
            const color = `rgb(${groupedR}, ${groupedG}, ${groupedB})`;
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        }
        
        // เรียงลำดับสีตามความถี่
        const sortedColors = Array.from(colorCounts.entries())
            .sort(([,a], [,b]) => b - a)
            .map(([color]) => color);
        
        // ถ้าไม่พบสีที่มีสีสัน ให้ใช้สีตามชื่อเกม
        if (sortedColors.length === 0) {
            return this.getColorsByGameTheme();
        }
        
        // เลือกสีหลัก
        const primary = sortedColors[0] || 'rgb(124, 58, 237)';
        const secondary = this.adjustBrightness(primary, 1.3);
        const accent = this.adjustBrightness(primary, 0.7);
        const muted = this.adjustSaturation(primary, 0.7);
        const lightMuted = this.adjustBrightness(primary, 1.6);
        const darkMuted = this.adjustBrightness(primary, 0.4);
        
        return {
            primary,
            secondary,
            accent,
            muted,
            lightMuted,
            darkMuted
        };
    }

    // สีเด็ดเมื่อไม่สามารถดึงสีจากโลโก้ได้
    getColorsByGameTheme() {
        const themes = [
            { // ธีมแดง-ทอง (Dragon, Fire)
                primary: 'rgb(220, 38, 38)',
                secondary: 'rgb(251, 191, 36)',
                accent: 'rgb(153, 27, 27)',
                muted: 'rgb(185, 28, 28)',
                lightMuted: 'rgb(254, 202, 202)',
                darkMuted: 'rgb(69, 10, 10)'
            },
            { // ธีมฟ้า-เงิน (Ice, Water)
                primary: 'rgb(59, 130, 246)',
                secondary: 'rgb(147, 197, 253)',
                accent: 'rgb(29, 78, 216)',
                muted: 'rgb(37, 99, 235)',
                lightMuted: 'rgb(219, 234, 254)',
                darkMuted: 'rgb(15, 23, 42)'
            },
            { // ธีมเขียว-ทอง (Nature, Forest)
                primary: 'rgb(34, 197, 94)',
                secondary: 'rgb(163, 230, 53)',
                accent: 'rgb(21, 128, 61)',
                muted: 'rgb(22, 163, 74)',
                lightMuted: 'rgb(187, 247, 208)',
                darkMuted: 'rgb(20, 83, 45)'
            },
            { // ธีมม่วง-ชมพู (Magic, Mystery)
                primary: 'rgb(147, 51, 234)',
                secondary: 'rgb(236, 72, 153)',
                accent: 'rgb(109, 40, 217)',
                muted: 'rgb(124, 58, 237)',
                lightMuted: 'rgb(243, 232, 255)',
                darkMuted: 'rgb(59, 7, 100)'
            }
        ];
        
        // เลือกธีมแบบสุ่ม
        return themes[Math.floor(Math.random() * themes.length)];
    }

    adjustBrightness(color, factor) {
        const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!rgb) return color;
        
        const r = Math.min(255, Math.max(0, Math.round(parseInt(rgb[1]) * factor)));
        const g = Math.min(255, Math.max(0, Math.round(parseInt(rgb[2]) * factor)));
        const b = Math.min(255, Math.max(0, Math.round(parseInt(rgb[3]) * factor)));
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    adjustSaturation(color, factor) {
        const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!rgb) return color;
        
        const r = parseInt(rgb[1]);
        const g = parseInt(rgb[2]);
        const b = parseInt(rgb[3]);
        
        // แปลงเป็น HSL
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const diff = max - min;
        const add = max + min;
        const l = add * 0.5;
        
        let s = 0;
        if (diff !== 0) {
            s = l < 0.5 ? diff / add : diff / (2 - add);
        }
        
        // ปรับ saturation
        s = Math.min(1, Math.max(0, s * factor));
        
        // แปลงกลับเป็น RGB (simplified)
        const newR = Math.round(r * (1 - s) + 128 * s);
        const newG = Math.round(g * (1 - s) + 128 * s);
        const newB = Math.round(b * (1 - s) + 128 * s);
        
        return `rgb(${newR}, ${newG}, ${newB})`;
    }

    getRgbFromSwatch(swatch) {
        if (!swatch) return null;
        const rgb = swatch.getRgb();
        return `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;
    }

    createGradient(colors) {
        return {
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary}, ${colors.secondary})`,
            rtpBar: `linear-gradient(90deg, ${colors.accent}, ${colors.primary}, ${colors.secondary})`,
            text: this.getContrastColor(colors.primary)
        };
    }

    // แปลง hex เป็น rgba
    hexToRgba(hex, alpha = 1) {
        if (hex.startsWith('rgb')) {
            return hex.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
        }
        return hex;
    }

    // คำนวณสีตัวอักษรที่เหมาะสม (ขาว/ดำ)
    getContrastColor(backgroundColor) {
        // ถ้าเป็น rgb format
        const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            
            // คำนวณ luminance
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance > 0.5 ? '#000000' : '#ffffff';
        }
        
        return '#ffffff'; // default เป็นขาว
    }

    getDefaultColors() {
        return {
            colors: {
                primary: '#7c3aed',
                secondary: '#a855f7',
                accent: '#4c1d95',
                muted: '#6d28d9',
                lightMuted: '#ec4899',
                darkMuted: '#1f2937'
            },
            gradient: {
                background: 'linear-gradient(135deg, #4c1d95, #7c3aed, #a855f7)',
                rtpBar: 'linear-gradient(90deg, #4c1d95, #7c3aed, #a855f7)',
                text: '#ffffff'
            },
            cardGradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 30%, #a855f7 70%, #ec4899 100%)',
            bodyGradient: 'linear-gradient(180deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%)',
            headerGradient: 'linear-gradient(to top, rgba(76, 29, 149, 0.9), transparent)'
        };
    }

    // ทดสอบการดึงสีจากไฟล์
    async testColorExtraction(logoFiles = []) {
        console.log('🧪 Testing color extraction...\n');
        
        for (const logoFile of logoFiles) {
            const colors = await this.extractColorsFromLogo(logoFile);
            console.log(`\n📁 File: ${path.basename(logoFile)}`);
            console.log('🎨 Colors:', colors.colors);
            console.log('🌈 Card Gradient:', colors.cardGradient);
        }
    }
}

module.exports = ColorExtractor;