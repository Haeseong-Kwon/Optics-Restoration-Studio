export interface Tile {
    x: number;
    y: number;
    width: number;
    height: number;
    canvas: HTMLCanvasElement;
}

/**
 * Split an image into tiles to avoid memory issues during processing.
 */
export async function tileImage(file: File, tileSize: number = 1024, overlap: number = 64): Promise<Tile[]> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const { width, height } = img;
            const tiles: Tile[] = [];

            for (let y = 0; y < height; y += tileSize - overlap) {
                for (let x = 0; x < width; x += tileSize - overlap) {
                    const tileWidth = Math.min(tileSize, width - x);
                    const tileHeight = Math.min(tileSize, height - y);

                    const canvas = document.createElement('canvas');
                    canvas.width = tileWidth;
                    canvas.height = tileHeight;
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                        ctx.drawImage(img, x, y, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
                        tiles.push({ x, y, width: tileWidth, height: tileHeight, canvas });
                    }
                }
            }
            resolve(tiles);
        };
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Utility to check if an image needs tiling.
 */
export function needsTiling(file: File, limit: number = 4096 * 4096): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve((img.width * img.height) > limit);
        };
        img.src = URL.createObjectURL(file);
    });
}
