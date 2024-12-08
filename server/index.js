const express = require('express');

const { Auth } = require("./middlewares/authentication")
const { LoggingMiddleware } = require("./middlewares/logging")
const { ErrorHandler } = require("./middlewares/errorHandler")
const { DbPool, InitilizeTables } = require("./db")

const { Scraping } = require("./modules/scraping")
const { GetAllImages } = require("./modules/displaying/images")
const { GetAllVideos } = require("./modules/displaying/videos")

const app = express();
app.use(express.json());


app.use(Auth);
app.use(LoggingMiddleware);

// Route to handle scraping
app.post('/scrape', Scraping(DbPool));

// Route for displaying
app.get('/images', GetAllImages(DbPool))
app.get('/videos', GetAllVideos(DbPool))

app.use(ErrorHandler);

// Create tables when the server starts
InitilizeTables().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});