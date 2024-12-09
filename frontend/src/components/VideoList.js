import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useDebounce from '../customHooks/useDebounce';

import '../styles/VideoList.css';

const VideoList = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState('');
    let debounceSearch = useDebounce(search, 700)

    useEffect(() => {
        const fetchVideos = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/videos`, {
                    params: { page, limit, search },
                    auth: {
                        username: process.env.REACT_APP_USERNAME,
                        password: process.env.REACT_APP_PASSWORD
                    }
                });
                setVideos(response.data);
            } catch (error) {
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, [page, limit, debounceSearch]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    return (
        <div className="video-list-container">
            <h2>Videos</h2>
            <input
                type="text"
                placeholder="Search videos..."
                value={search}
                onChange={handleSearchChange}
                className="search-box"
            />
            <ul className="video-list">
                {videos.map((video, index) => (
                    <li key={index} className="video-item">
                        <p>{video.title}</p>
                        <video controls>
                            <source src={video.video_url} type="video/mp4" />
                        </video>
                    </li>
                ))}
            </ul>
            <div className="pagination">
                <button onClick={() => setPage(page - 1)} disabled={page === 1}>
                    Previous
                </button>
                <span>Page {page}</span>
                <button onClick={() => setPage(page + 1)} disabled={videos.length < limit}>
                    Next
                </button>
            </div>
        </div>
    );
};

export default VideoList;