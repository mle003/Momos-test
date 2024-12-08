const express = require('express');
const cors = require('cors')

const Logger = require('./utils/logger');
const { Auth } = require("./middlewares/authentication")
const { LoggingMiddleware } = require("./middlewares/logging")
const { ErrorHandler } = require("./middlewares/errorHandler")
const { DbPool, InitilizeTables } = require("./db")
const { Scraping } = require("./modules/scraping")
const { GetAllImages } = require("./modules/displaying/images")
const { GetAllVideos } = require("./modules/displaying/videos")

const app = express();
app.use(express.json());

app.use(cors())

app.use(Auth);
app.use(LoggingMiddleware);

// Route to handle scraping
app.post('/scrape', Scraping(DbPool));

// Route for displaying
app.get('/images', GetAllImages(DbPool))
app.get('/videos', GetAllVideos(DbPool))

app.use(ErrorHandler);

InitilizeTables().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        Logger.info(`Server is running on port ${PORT}`);
    });
});