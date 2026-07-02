import './style.css';

const reloadBtn = document.getElementById('reload-btn');
const videoFrame = document.getElementById('video-frame');

// Cross-origin safe iframe reload
const handleReload = (e) => {
    e.preventDefault();
    console.log("Reloading portal target...");
    
    // Resetting the src attribute forces the iframe to fetch a fresh copy of the target URL
    const currentUrl = videoFrame.src;
    videoFrame.src = currentUrl;
    
    // Optional physical feedback hook if the Flutter bridge is present
    if (window.flutter_inappwebview) {
        window.flutter_inappwebview.callHandler('vibrate', JSON.stringify({ intensity: 'light' }));
    }
};

// Bind to pointerdown for faster response on touch devices
reloadBtn.addEventListener('pointerdown', handleReload);