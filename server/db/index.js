const mysql = require('mysql2/promise');
require('dotenv').config();

const Logger = require("../utils/logger")

const DbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    queueLimit: 0
});

const InitilizeTables = async () => {
    const connection = await DbPool.getConnection();
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS URLs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_valid BOOLEAN DEFAULT FALSE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Images (
                id INT AUTO_INCREMENT PRIMARY KEY,
                url_id INT,
                image_url TEXT NOT NULL,
                title TEXT,
                FOREIGN KEY (url_id) REFERENCES URLs(id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Videos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                url_id INT,
                video_url TEXT NOT NULL,
                title TEXT,
                FOREIGN KEY (url_id) REFERENCES URLs(id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Errors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                url_id INT,
                error_type TEXT NOT NULL,
                error_message TEXT NOT NULL,
                FOREIGN KEY (url_id) REFERENCES URLs(id)
            )
        `);
    } catch (error) {
        Logger.error('Error creating tables:', error);
    } finally {
        connection.release();
    }
};


module.exports = {
    DbPool,
    InitilizeTables
};