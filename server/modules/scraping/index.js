const puppeteer = require('puppeteer');
const axios = require('axios');
const Logger = require('../../utils/logger');

const httpsProtocol = "https:/"

const Scraping = (pool) => async (req, res, next) => {
    const { urls } = req.body;

    if (!Array.isArray(urls)) {
        Logger.warn('Invalid input: Expected an array of URLs');
        return res.status(400).send('Invalid input. Expected an array of URLs.');
    }

    const results = [];
    const imageErrors = [];
    const videoErrors = [];
    const invalidUrls = [];
    const allImages = [];
    const allVideos = [];

    try {
        const browser = await puppeteer.launch();
        await Promise.all(urls.map(async (url) => {
            const result = { url, title: '', images: [], videos: [] };
            let imageError = null;
            let videoError = null;
            let urlId;

            const connection = await pool.getConnection();

            const [urlResult] = await connection.query(
                'INSERT INTO URLs (url, is_valid) VALUES (?, ?)',
                [url, true]
            );
            urlId = urlResult.insertId;

            try {
                const page = await browser.newPage();
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

                const title = await page.title();
                result.title = title;

                await pool.query(
                    'UPDATE URLs SET title = ? WHERE id = ?',
                    [title, urlId]
                );

                // Use Axios for CSR scraping
                try {
                    const response = await axios.get(url);
                    const html = response.data;
                    const images = extractImagesFromHtml(html);
                    const videos = extractVideosFromHtml(html);

                    for (const { url: imageUrl, title: imageTitle } of images) {
                        allImages.push({ urlId, imageUrl, imageTitle });
                    }

                    for (const { url: videoUrl, title: videoTitle } of videos) {
                        allVideos.push({ urlId, videoUrl, videoTitle });
                    }
                } catch (error) {
                    Logger.warn(`Error scraping with Axios ${url}: ${error.message}`);
                }

                // SSR scraping
                try {
                    const images = await page.$$eval('img', imgs => imgs.map(img => ({ url: img.src, title: img.alt })).filter(img => img.url));
                    for (const { url: imageUrl, title: imageTitle } of images) {
                        allImages.push({ urlId, imageUrl, imageTitle });
                    }

                    const iframeVideos = await extractVideoUrlsFromIFrame(page);
                    allVideos.push(...iframeVideos.map(video => ({ ...video, urlId })));

                    const otherVideos = await extractVideoUrlsFromVideoElements(page);
                    allVideos.push(...otherVideos.map(video => ({ ...video, urlId })));

                    const videos2 = await extractVideoUrlsFromNetwork(page);
                    allVideos.push(...videos2.map(video => ({ ...video, urlId })));

                    if (allVideos.length === 0) {
                        throw new Error('No videos found');
                    }
                } catch (error) {
                    videoError = error.message;
                }

                await page.close();
            } catch (error) {
                invalidUrls.push({ url, error: error.message });

                await pool.query(
                    'UPDATE URLs SET is_valid = FALSE WHERE id = ?',
                    [urlId]
                );

                await connection.query(
                    'INSERT INTO Errors (url_id, error_type, error_message) VALUES (?, ?, ?)',
                    [urlId, 'invalid', error.message]
                );
                connection.release();
                return null
            } finally {
                connection.release();
            }
            
            result.images = allImages
            result.videos = allVideos

            results.push(result);

            if (imageError) {
                imageErrors.push({ url, error: imageError });

                await pool.query(
                    'INSERT INTO Errors (url_id, error_type, error_message) VALUES (?, ?, ?)',
                    [urlId, 'image', imageError]
                );
            }

            if (videoError) {
                videoErrors.push({ url, error: videoError });

                await pool.query(
                    'INSERT INTO Errors (url_id, error_type, error_message) VALUES (?, ?, ?)',
                    [urlId, 'video', videoError]
                );
            }
        }));

        for (const { urlId, imageUrl, imageTitle } of allImages) {
            if(!imageUrl) {
                continue
            }
            let updateUrl = imageUrl
            if(!updateUrl.startsWith(httpsProtocol) && !updateUrl.startsWith("/")) {
                Logger.warn(`${updateUrl} is invalid`)
            }
            if (!updateUrl.startsWith(httpsProtocol)) {
                updateUrl = httpsProtocol + updateUrl
            }
            const connection = await pool.getConnection();
            const [existingImage] = await connection.query(
                'SELECT id FROM Images WHERE image_url = ? LIMIT 1',
                [updateUrl]
            );

            let title = imageTitle && imageTitle.length > 0 ? imageTitle : "This image has no title"

            if (existingImage.length === 0) {
                await connection.query(
                    'INSERT INTO Images (url_id, image_url, title) VALUES (?, ?, ?)',
                    [urlId, updateUrl, title]
                );
            }
            connection.release();
        }

        for (const { urlId, url, videoTitle } of allVideos) {
            if (!url) {
                continue
            }
            let updateUrl = url
            if(!updateUrl.startsWith(httpsProtocol) && !updateUrl.startsWith("/")) {
                Logger.warn(`${updateUrl} is invalid`)
            }
            if (!updateUrl.startsWith(httpsProtocol)) {
                updateUrl = httpsProtocol + updateUrl
            }
            const connection = await pool.getConnection();
            const [existingVideo] = await connection.query(
                'SELECT id FROM Videos WHERE video_url = ? LIMIT 1',
                [updateUrl]
            );

            let title = videoTitle && videoTitle.length > 0 ? videoTitle : "This video has no title"

            if (existingVideo.length === 0) {
                await connection.query(
                    'INSERT INTO Videos (url_id, video_url, title) VALUES (?, ?, ?)',
                    [urlId, updateUrl, title]
                );
            }
            connection.release();
        }

        await browser.close();
        res.json({ results, imageErrors, videoErrors, invalidUrls });
    } catch (error) {
        next(error);
    }
};

const extractImagesFromHtml = (html) => {
    const regex = /<img[^>]+src="([^">]+)"[^>]*alt="([^">]*)"/g;
    const images = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        images.push({ url: match[1], title: match[2] });
    }
    return images;
};

const extractVideosFromHtml = (html) => {
    const regex = /<video[^>]+src="([^">]+)"[^>]*title="([^">]*)"/g;
    const videos = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        videos.push({ url: match[1], title: match[2] });
    }
    return videos;
};

const extractVideoUrlsFromIFrame = async (page) => {
    const frameHandles = await page.$$('iframe');
    const videoUrls = [];

    for (const frameHandle of frameHandles) {
        const frame = await frameHandle.contentFrame();
        if (frame) {
            try {
                const videos = await frame.$$eval('video source', vids => vids.map(vid => ({ url: vid.src, title: vid.title })));
                videoUrls.push(...videos);

                const embeddedVideoUrls = await frame.$$eval('[data-video-url]', elements => elements.map(el => ({ url: el.getAttribute('data-video-url'), title: el.title })));
                videoUrls.push(...embeddedVideoUrls);
            } catch (error) {
                Logger.warn(`No video elements found in iframe: ${error.message}`);
            }
        }
    }

    return videoUrls;
};

const extractVideoUrlsFromVideoElements = async (page) => {
    const videoUrls = [];

    const videoSrcs = await page.$$eval('video source', sources => sources.map(source => ({ url: source.src, title: source.title })));
    videoUrls.push(...videoSrcs);

    const embeddedVideoUrls = await page.$$eval('[data-video-url]', elements => elements.map(el => ({ url: el.getAttribute('data-video-url'), title: el.title })));
    videoUrls.push(...embeddedVideoUrls);

    return videoUrls.filter(video => video.url);
};

const extractVideoUrlsFromNetwork = async (page) => {
    const videoUrls = new Set();

    page.on('response', async response => {
        const url = response.url();
        const contentType = response.headers()['content-type'];

        if (contentType && contentType.startsWith('video/')) {
            videoUrls.add({ url, title: '' });
        }
    });

    return [...videoUrls];
};

module.exports = {
    Scraping
};