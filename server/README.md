# Web Scraping Server

This project is a web scraping server built with Node.js, Express, Puppeteer, and MySQL. It supports scraping both server-side rendered and client-side rendered websites to extract titles, images, and videos. The scraped data is stored in a MySQL database, and the server provides APIs to retrieve the data with pagination and filtering.

## Features

- Scrape titles, images, and videos from URLs
- Support for both server-side rendered and client-side rendered websites
- Store scraped data in a MySQL database
- APIs to retrieve images and videos with pagination and filtering
- Basic authentication for APIs

## Prerequisites

- Node.js and npm
- MySQL server

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/web-scraping-server.git
   cd web-scraping-server

2. Install dependencies:

    ```npm install

3. Create a .env file in the root directory and add the following environment variables:

    ``` PORT=3000
        DB_HOST=localhost
        DB_USER=your_mysql_user
        DB_PASSWORD=your_mysql_password
        DB_NAME=scraping_db
        DB_CONNECTION_LIMIT=10

## Running Server

    ``` npm start
        npm run dev // for test env