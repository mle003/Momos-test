import React from 'react';
import ImageList from './components/ImageList';
import VideoList from './components/VideoList';
import "./styles/index.css"

const App = () => {
    return (
        <div>
            <h1>Web Scraping Frontend</h1>
            <ImageList />
            <VideoList />
        </div>
    );
}

export default App

