import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useDebounce from '../customHooks/useDebounce';

import '../styles/ImageList.css';

const ImageList = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState('');
    let debounceSearch = useDebounce(search, 500)

    useEffect(() => {
        const fetchImages = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/images`, {
                    params: { page, limit, search },
                    auth: {
                        username: process.env.REACT_APP_USERNAME,
                        password: process.env.REACT_APP_PASSWORD
                    }
                });
                setImages(response.data);
            } catch (error) {
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, [page, limit, debounceSearch]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1); // Reset to first page on new search
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    return (
        <div className="image-list-container">
            <h2>Images</h2>
            <input
                type="text"
                placeholder="Search images..."
                value={search}
                onChange={handleSearchChange}
                className="search-box"
            />
            <ul className="image-list">
                {images.map((image, index) => (
                    <li key={index} className="image-item">
                        <p>{image.title}</p>
                        <img src={image.image_url} alt={image.title} />
                    </li>
                ))}
            </ul>
            <div className="pagination">
                <button onClick={() => setPage(page - 1)} disabled={page === 1}>
                    Previous
                </button>
                <span>Page {page}</span>
                <button onClick={() => setPage(page + 1)} disabled={images.length < limit}>
                    Next
                </button>
            </div>
        </div>
    );
};

export default ImageList;