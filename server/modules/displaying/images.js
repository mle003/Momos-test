const GetAllImages = (pool) => async (req, res, next) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(
            'SELECT image_url, title FROM Images WHERE title LIKE ? LIMIT ? OFFSET ?',
            [`%${search}%`, parseInt(limit), parseInt(offset)]
        );
        res.json(rows);
    } catch (error) {
        next(error);
    } finally {
        connection.release();
    }
}

module.exports = {
    GetAllImages
}