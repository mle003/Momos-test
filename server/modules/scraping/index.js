const puppeteer = require('puppeteer');
const axios = require('axios');
const logger = require('../../utils/logger');

const Scraping = (pool) => async (req, res, next) => {
    const { urls } = req.body;

    if (!Array.isArray(urls)) {
        logger.warn('Invalid input: Expected an array of URLs');
        return res.status(400).send('Invalid input. Expected an array of URLs.');
    }

    const results = [];
    const imageErrors = [];
    const videoErrors = [];
    const invalidUrls = [];

    try {
        const browser = await puppeteer.launch();
        await Promise.all(urls.map(async (url) => {
            const result = { url, title: '', images: [], videos: [] };
            let imageError = null;
            let videoError = null;
            let urlId;

            const connection = await pool.getConnection();

            try {
                const page = await browser.newPage();
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

                // Scrape title
                const title = await page.title();
                result.title = title;

                const [urlResult] = await connection.query(
                    'INSERT INTO URLs (url, title) VALUES (?, ?)',
                    [url, title]
                );
                urlId = urlResult.insertId;

                // Use Axios for CSR scraping
                try {
                    const response = await axios.get(url);
                    const html = response.data;
                    const images = extractImagesFromHtml(html);
                    const videos = extractVideosFromHtml(html);

                    for (const { url: imageUrl, title: imageTitle } of images) {
                        // Check if the image URL already exists in the database
                        const [existingImage] = await connection.query(
                            'SELECT id FROM Images WHERE image_url = ?',
                            [imageUrl]
                        );

                        if (existingImage.length === 0) {
                            await connection.query(
                                'INSERT INTO Images (url_id, image_url, title) VALUES (?, ?, ?)',
                                [urlId, imageUrl, imageTitle]
                            );
                            result.images.push({ url: imageUrl, title: imageTitle });
                        }
                    }

                    for (const { url: videoUrl, title: videoTitle } of videos) {
                        // Check if the video URL already exists in the database
                        const [existingVideo] = await connection.query(
                            'SELECT id FROM Videos WHERE video_url = ?',
                            [videoUrl]
                        );

                        if (existingVideo.length === 0) {
                            await connection.query(
                                'INSERT INTO Videos (url_id, video_url, title) VALUES (?, ?, ?)',
                                [urlId, videoUrl, videoTitle]
                            );
                            result.videos.push({ url: videoUrl, title: videoTitle });
                        }
                    }
                } catch (error) {
                    logger.warn(`Error scraping with Axios ${url}: ${error.message}`);
                }

                // SSR scraping
                try {
                    const images = await page.$$eval('img', imgs => imgs.map(img => ({ url: img.src, title: img.alt })).filter(img => img.url));
                    for (const { url: imageUrl, title: imageTitle } of images) {
                        // Check if the image URL already exists in the database
                        const [existingImage] = await connection.query(
                            'SELECT id FROM Images WHERE image_url = ?',
                            [imageUrl]
                        );

                        if (existingImage.length === 0) {
                            await connection.query(
                                'INSERT INTO Images (url_id, image_url, title) VALUES (?, ?, ?)',
                                [urlId, imageUrl, imageTitle]
                            );
                            result.images.push({ url: imageUrl, title: imageTitle });
                        }
                    }

                    const videos = [];

                    const iframeVideos = await extractVideoUrlsFromIFrame(page, connection, urlId);
                    videos.push(...iframeVideos);

                    const otherVideos = await extractVideoUrlsFromVideoElements(page, connection, urlId);
                    videos.push(...otherVideos);

                    const videos2 = await extractVideoUrlsFromNetwork(page, connection, urlId);
                    videos.push(...videos2);

                    for (const { url: videoUrl, title: videoTitle } of videos) {
                        // Check if the video URL already exists in the database
                        const [existingVideo] = await connection.query(
                            'SELECT id FROM Videos WHERE video_url = ?',
                            [videoUrl]
                        );

                        if (existingVideo.length === 0) {
                            await connection.query(
                                'INSERT INTO Videos (url_id, video_url, title) VALUES (?, ?, ?)',
                                [urlId, videoUrl, videoTitle]
                            );
                            result.videos.push({ url: videoUrl, title: videoTitle });
                        }
                    }

                    if (videos.length === 0) {
                        throw new Error('No videos found');
                    }
                } catch (error) {
                    videoError = error.message;
                }

                await page.close();
            } catch (error) {
                invalidUrls.push({ url, error: error.message });

                await connection.query(
                    'INSERT INTO Errors (url_id, error_type, error_message) VALUES (?, ?, ?)',
                    [urlId, 'invalid', error.message]
                );
            } finally {
                connection.release();
            }

            if (result.images.length > 0 || result.videos.length > 0) {
                results.push(result);

                await pool.query(
                    'UPDATE URLs SET is_valid = TRUE WHERE id = ?',
                    [urlId]
                );
            }

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

const extractVideoUrlsFromIFrame = async (page, connection, urlId) => {
    const frameHandles = await page.$$('iframe');
    const videoUrls = [];

    for (const frameHandle of frameHandles) {
        const frame = await frameHandle.contentFrame();
        if (frame) {
            try {
                await frame.waitForSelector('video, [data-video-url]', { timeout: 10000 });
                const videos = await frame.$$eval('video source', vids => vids.map(vid => ({ url: vid.src, title: vid.title })));
                for (const { url: videoUrl, title: videoTitle } of videos) {
                    // Check if the video URL already exists in the database
                    const [existingVideo] = await connection.query(
                        'SELECT id FROM Videos WHERE video_url = ?',
                        [videoUrl]
                    );

                    if (existingVideo.length === 0) {
                        await connection.query(
                            'INSERT INTO Videos (url_id, video_url, title) VALUES (?, ?, ?)',
                            [urlId, videoUrl, videoTitle]
                        );
                        videoUrls.push({ url: videoUrl, title: videoTitle });
                    }
                }

                const embeddedVideoUrls = await frame.$$eval('[data-video-url]', elements => elements.map(el => ({ url: el.getAttribute('data-video-url'), title: el.title })));
                for (const { url: videoUrl, title: videoTitle } of embeddedVideoUrls) {
                    // Check if the video URL already exists in the database
                    const [existingVideo] = await connection.query(
                        'SELECT id FROM Videos WHERE video_url = ?',
                        [videoUrl]
                    );

                    if (existingVideo.length === 0) {
                        await connection.query(
                            'INSERT INTO Videos (url_id, video_url, title) VALUES (?, ?, ?)',
                            [urlId, videoUrl, videoTitle]
                        );
                        videoUrls.push({ url: videoUrl, title: videoTitle });
                    }
                }
            } catch (error) {
                logger.warn(`No video elements found in iframe: ${error.message}`);
            }
        }
    }

    return videoUrls;
};

const extractVideoUrlsFromVideoElements = async (page, connection, urlId) => {
    const videoUrls = [];

    await page.waitForSelector('video, [data-video-url]', { timeout: 10000 });

    const videoSrcs = await page.$$eval('video source', sources => sources.map(source => ({ url: source.src, title: source.title })));
    for (const { url: videoUrl, title: videoTitle } of videoSrcs) {
        // Check if the video URL already exists in the database
        const [existingVideo] = await connection.query(
            'SELECT id FROM Videos WHERE video_url = ?',
            [videoUrl]
        );

        if (existingVideo.length === 0) {
            await connection.query(
                'INSERT INTO Videos (url_id, video_url, title) VALUES (?, ?, ?)',
                [urlId, videoUrl, videoTitle]
            );
            videoUrls.push({ url: videoUrl, title: videoTitle });
        }
    }

    const embeddedVideoUrls = await page.$$eval('[data-video-url]', elements => elements.map(el => ({ url: el.getAttribute('data-video-url'), title: el.title })));
    for (const { url: videoUrl, title: videoTitle } of embeddedVideoUrls) {
        // Check if the video URL already exists in the database
        const [existingVideo] = await connection.query(
            'SELECT id FROM Videos WHERE video_url = ?',
            [videoUrl]
        );

        if (existingVideo.length === 0) {
            await connection.query(
                'INSERT INTO Videos (url_id, video_url, title) VALUES (?, ?, ?)',
                [urlId, videoUrl, videoTitle]
            );
            videoUrls.push({ url: videoUrl, title: videoTitle });
        }
    }

    return videoUrls.filter(video => video.url);
};

const extractVideoUrlsFromNetwork = async (page, connection, urlId) => {
    const videoUrls = new Set();

    page.on('response', async response => {
        const url = response.url();
        const contentType = response.headers()['content-type'];

        if (contentType && contentType.startsWith('video/')) {
            // Check if the video URL already exists in the database
            const [existingVideo] = await connection.query(
                'SELECT id FROM Videos WHERE video_url = ?',
                [url]
            );

            if (existingVideo.length === 0) {
                await connection.query(
                    'INSERT INTO Videos (url_id, video_url, title) VALUES (?, ?, ?)',
                    [urlId, url, '']
                );
                videoUrls.add({ url, title: '' });
            }
        }
    });

    await new Promise(resolve => setTimeout(resolve, 10000));

    return [...videoUrls];
};

module.exports = {
    Scraping
};