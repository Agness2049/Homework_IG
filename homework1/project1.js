// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.

function composite(bgImg, fgImg, fgOpac, fgPos) {
    // Iterate over every pixel of the background image
    for (let y = 0; y < bgImg.height; y++) {
        for (let x = 0; x < bgImg.width; x++) {
            // Determine the corresponding location within the foreground image.
            const fgX = x - fgPos.x;
            const fgY = y - fgPos.y;

            // Verify whether the foreground pixel falls within the permissible limits.
            if (fgX >= 0 && fgX < fgImg.width && fgY >= 0 && fgY < fgImg.height) {
                // Get RGBA values for background and foreground pixels
                const bgIndex = (y * bgImg.width + x) * 4;
                const fgIndex = (fgY * fgImg.width + fgX) * 4;
                const bgR = bgImg.data[bgIndex + 0];
                const bgG = bgImg.data[bgIndex + 1];
                const bgB = bgImg.data[bgIndex + 2];
                const bgA = bgImg.data[bgIndex + 3];
                const fgR = fgImg.data[fgIndex + 0];
                const fgG = fgImg.data[fgIndex + 1];
                const fgB = fgImg.data[fgIndex + 2];
                const fgA = fgImg.data[fgIndex + 3];

                // Apply the alpha blending 
                const newA = fgA * fgOpac / 255; // Normalize alpha
                const invA = 1 - newA;
                const newR = (fgR * newA) + (bgR * invA);
                const newG = (fgG * newA) + (bgG * invA);
                const newB = (fgB * newA) + (bgB * invA);

                // Set new RGBA values in the background image data
                bgImg.data[bgIndex + 0] = newR;
                bgImg.data[bgIndex + 1] = newG;
                bgImg.data[bgIndex + 2] = newB;
                bgImg.data[bgIndex + 3] = bgA; // Use background alpha
            }
        }
    }
}

