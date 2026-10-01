// Shrinks a photo in the browser so it fits in a Firestore document
// (limit 1 MB) and keeps the site inside Firebase's free plan.

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this image.')); };
        img.src = url;
    });
}

/**
 * Returns a JPEG data URL no larger than ~maxBytes.
 * @param {File} file
 * @param {{maxSide?: number, maxBytes?: number}} opts
 */
export async function compressImage(file, { maxSide = 900, maxBytes = 180_000 } = {}) {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    const img = await loadImage(file);
    let side = maxSide;
    for (let attempt = 0; attempt < 6; attempt++) {
        const scale = Math.min(1, side / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        for (const q of [0.82, 0.72, 0.62, 0.52]) {
            const data = canvas.toDataURL('image/jpeg', q);
            // base64 length * 0.75 ≈ bytes
            if (data.length * 0.75 <= maxBytes) return data;
        }
        side = Math.round(side * 0.8);
    }
    throw new Error('This image is too large. Please choose a smaller one.');
}
