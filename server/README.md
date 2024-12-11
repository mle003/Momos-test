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

1. Install dependencies:

    ```bash
    npm install
    ```

2. Create a .env file in the root directory and add the following environment variables:

    ``` 
    PORT=3000
    DB_HOST=localhost
    DB_USER=your_mysql_user
    DB_PASSWORD=your_mysql_password
    DB_NAME=scraping_db
    DB_CONNECTION_LIMIT=10

## Running Server

1. Build and start the Docker containers:

    ```bash
    DOCKER_BUILDKIT=1 docker-compose up --build
    ```

2. Running on local environment:

    ```bash
    npm run dev
    ```

3. Send api request to hos `http://localhost:3000` to see the server running.