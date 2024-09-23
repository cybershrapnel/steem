// steem bot written in node. uploads images directly to the chain instead of to the ipfs image cache and then links the post itself back to this github repo running live as a github page that extracts and shows the image which steemit should already do but there scripting messes up base64 images addresses ny appending the steemit address to the data.

const fs = require('fs');
const sharp = require('sharp'); // For resizing images
const steem = require('steem'); // Steem library for posting
const path = require('path');

// Steemit account details
const username = 'nanocheeze'; // Your Steemit username
const postingKey = 'steemkey'; // Replace with your private posting key

// Post details
const title = 'Image on STEEM\'s Chain from the MEQUAVIS';
const tags = ['photography', 'steemit', 'ai', 'eve', 'nanocheeze']; // Tags for your post
const permlink = 'random-image-mequavis-' + Math.random().toString(36).substr(2, 9); // Unique random permlink
const mainTag = 'photography'; // Main category/tag

// Folder where images are stored
const IMAGE_FOLDER = process.cwd(); // Current working directory where images are located
const REPOSTED_FOLDER = path.join(IMAGE_FOLDER, 'reposted'); // Folder where reposted images will be moved
const MAX_SIZE = 45000; // 60 KB max size for base64 encoding

// Ensure reposted folder exists
if (!fs.existsSync(REPOSTED_FOLDER)) {
    fs.mkdirSync(REPOSTED_FOLDER);
}

// Function to get a random image from the folder
function getRandomImage() {
    const images = fs.readdirSync(IMAGE_FOLDER).filter(img => /\.(png|jpg|jpeg)$/i.test(img));
    return images.length ? path.join(IMAGE_FOLDER, images[Math.floor(Math.random() * images.length)]) : null;
}

// Function to resize the image and convert to base64, targeting a size under 60000 bytes
async function processImage(imagePath) {
    let width = 800; // Start with a large width
    let imageBuffer = await sharp(imagePath)
        .resize({ width }) // Resize the image
        .jpeg({ quality: 80 }) // Convert to JPEG
        .toBuffer();

    // Loop until the image is smaller than the maximum size
    while (imageBuffer.length > MAX_SIZE && width > 50) { // Don't resize too small (e.g., below 50px width)
        width = Math.floor(width * 0.96); // Reduce width by 10%
        imageBuffer = await sharp(imagePath)
            .resize({ width }) // Resize again
            .jpeg({ quality: 70 }) // Convert to JPEG
            .toBuffer();

        console.log(`Trying width: ${width}, size: ${imageBuffer.length} bytes`);
    }

    console.log(`Final image size: ${imageBuffer.length} bytes`);
    return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
}

// Function to move the image to the reposted folder
function moveImageToReposted(imagePath) {
    const repostedImagePath = path.join(REPOSTED_FOLDER, path.basename(imagePath));
    fs.renameSync(imagePath, repostedImagePath);
    console.log(`Moved ${imagePath} to reposted folder.`);
}

// Function to post on Steemit
async function postOnSteemit() {
    const imageFile = getRandomImage();
    if (!imageFile) {
        console.log('No image found to post.');
        return;
    }

    // Process the image and get it as base64
    const base64Image = await processImage(imageFile);

    // Create the full Steemit URL
    const steemitUrl = `https://steemit.com/${mainTag}/@${username}/${permlink}`;

    // Create the body content with the plain text link first, followed by the image
    const body = `
Click the link below to decode the base64 image stored on Steem's blockchain:

https://cybershrapnel.github.io/steem/#${steemitUrl}

    <img src="${base64Image}" alt="Eve Image"/>
    `;

    // Post the content on Steemit
    steem.broadcast.comment(
        postingKey,
        '', // Parent author (empty for a new post)
        mainTag, // Main tag/category
        username, // Your Steemit username
        permlink, // Unique permlink
        title, // Title of the post
        body, // Body content (with base64 image using <img src>)
        { tags: tags, app: 'steem-js' }, // Metadata
        (err, result) => {
            if (err) {
                console.error('Error posting:', err);
            } else {
                console.log('Post successful:', result);
                moveImageToReposted(imageFile); // Move image after successful post
            }
        }
    );
}

// Run the script every 5.5 minutes (330,000 milliseconds)
setInterval(() => {
    postOnSteemit();
}, 330000);

// Initial run when the script starts
postOnSteemit();
