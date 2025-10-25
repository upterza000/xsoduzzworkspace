const fs = require('fs');
const path = require('path');

class ImageSelector {
    constructor(imageFolderPath = './images') {
        this.imageFolderPath = imageFolderPath;
        // สำหรับ game_assets ใช้ logos subfolder
        this.logoDir = path.join(imageFolderPath, 'logos');
        this.logoFiles = this.loadLogoFiles();
        // ใช้ logoFiles แทน imageFiles
        this.imageFiles = this.logoFiles;
    }

    loadImageFiles() {
        try {
            const files = fs.readdirSync(this.imageFolderPath);
            return files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
            });
        } catch (error) {
            console.error('Error loading image files:', error);
            return [];
        }
    }

    loadLogoFiles() {
        try {
            const files = fs.readdirSync(this.logoDir);
            return files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
            });
        } catch (error) {
            console.error('Error loading logo files:', error);
            return [];
        }
    }

    getRandomImage() {
        if (this.logoFiles.length === 0) {
            throw new Error('No logo files found in the game_assets/logos folder');
        }
        
        const randomIndex = Math.floor(Math.random() * this.logoFiles.length);
        const selectedFile = this.logoFiles[randomIndex];
        
        return {
            filename: selectedFile,
            fullPath: path.join(this.logoDir, selectedFile),
            name: this.extractGameName(selectedFile)
        };
    }

    extractGameName(filename) {
        // ลองสกัดชื่อเกมจากชื่อไฟล์
        let gameName = filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
        
        // ลบส่วนที่เป็น hash หรือ ID
        gameName = gameName.replace(/\.[a-f0-9]{7,8}$/i, '');
        gameName = gameName.replace(/^[0-9]+\./, '');
        gameName = gameName.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '');
        
        // แปลงเป็นชื่อที่อ่านง่าย
        gameName = gameName.replace(/([A-Z])/g, ' $1').trim();
        
        return gameName || 'Mystery Game';
    }

    getAllImages() {
        return this.logoFiles.map(file => ({
            filename: file,
            fullPath: path.join(this.logoDir, file),
            name: this.extractGameName(file)
        }));
    }

    getRandomImages(count = 1) {
        const images = [];
        for (let i = 0; i < count; i++) {
            images.push(this.getRandomImage());
        }
        return images;
    }

    // ค้นหาภาพจากชื่อเกม
    getImageByName(gameName) {
        // ค้นหาจากชื่อไฟล์ (ไม่มี extension)
        const gameFile = this.logoFiles.find(file => {
            const nameWithoutExt = path.parse(file).name;
            return nameWithoutExt.toLowerCase() === gameName.toLowerCase() ||
                   nameWithoutExt.toLowerCase().includes(gameName.toLowerCase()) ||
                   gameName.toLowerCase().includes(nameWithoutExt.toLowerCase());
        });

        if (!gameFile) {
            return null;
        }

        const logoPath = path.join(this.logoDir, gameFile);
        const name = path.parse(gameFile).name;

        return {
            filename: gameFile,
            name: name,
            fullPath: logoPath
        };
    }
}

module.exports = ImageSelector;