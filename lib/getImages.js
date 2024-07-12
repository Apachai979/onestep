
const fs = require('fs').promises;
const path = require('path');

async function getImages(dirPath, arrayOfFiles = []) {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
            await getImages(filePath, arrayOfFiles);
        } else {
            arrayOfFiles.push(filePath.replace(/\\/g, '/'));
        }
    }

    return arrayOfFiles;
}

module.exports = getImages;
