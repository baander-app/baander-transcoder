import * as express from 'express';
import { handleError } from './utils';

export const testRouter = express.Router();

testRouter.get('/hls/:path', async (req, res) => {
  try {
    const videoPath = req.params.path;
    const playlistUrl = `${req.protocol}://${req.headers.host}/api/hls/playlist/${videoPath}`;
    const configUrl = `${req.protocol}://${req.headers.host}/api/hls/config/${videoPath}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HLS.js Test Player - Optimized for ABR</title>
        <style>
          body {
            margin: 0;
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            color: white;
          }
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            max-width: 1200px;
          }
          video {
            max-width: 90%;
            max-height: 70vh;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          }
          .controls {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
          }
          .info {
            margin-top: 15px;
            text-align: center;
            font-size: 14px;
            color: #ccc;
          }
          button {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          button:hover {
            background: #0056b3;
          }
          select {
            background: #333;
            color: white;
            border: 1px solid #555;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
          }
          .debug-info {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            max-width: 300px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <video id="video" controls autoplay></video>
          <div class="controls">
            <button id="autoQualityBtn">Auto Quality</button>
            <select id="qualitySelect">
              <option value="-1">Auto</option>
            </select>
            <button id="seekAheadBtn">Seek +30s</button>
            <button id="seekBackBtn">Seek -30s</button>
            <button id="toggleDebugBtn">Toggle Debug</button>
          </div>
          <div class="info">
            <div id="videoInfo">Loading video info...</div>
            <div id="currentQuality">Current Quality: Auto</div>
            <div id="bufferInfo">Buffer: 0s</div>
          </div>
        </div>
        <div id="debugInfo" class="debug-info" style="display: none;"></div>

        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
        <script>
          const video = document.getElementById('video');
          const autoQualityBtn = document.getElementById('autoQualityBtn');
          const qualitySelect = document.getElementById('qualitySelect');
          const seekAheadBtn = document.getElementById('seekAheadBtn');
          const seekBackBtn = document.getElementById('seekBackBtn');
          const toggleDebugBtn = document.getElementById('toggleDebugBtn');
          const debugInfo = document.getElementById('debugInfo');
          const videoInfo = document.getElementById('videoInfo');
          const currentQualityDiv = document.getElementById('currentQuality');
          const bufferInfoDiv = document.getElementById('bufferInfo');

          let hls;
          let videoData = null;

          // Fetch HLS configuration
          async function loadConfig() {
            try {
              const response = await fetch('${configUrl}');
              const data = await response.json();
              videoData = data.videoInfo;

              videoInfo.innerHTML = \`
                Duration: \${videoData.duration.toFixed(1)}s |
                Size: \${videoData.width}x\${videoData.height} |
                FPS: \${videoData.frameRate} |
                Segments: \${Math.ceil(videoData.duration / videoData.segmentDuration)}
              \`;

              return data.hlsConfig;
            } catch (error) {
              console.error('Failed to load HLS config:', error);
              // Fallback config
              return {
                debug: true,
                autoLevelEnabled: false,
                fragLoadingTimeOut: 15000,
              };
            }
          }

          // Initialize HLS with fetched config
          async function initHls() {
            const config = await loadConfig();

            hls = new Hls({
              ...config,
              debug: true,
              enableWorker: true,
              lowLatencyMode: config.lowLatencyMode || false,
              maxBufferLength: config.maxBufferLength || 6,
              manifestLoadingTimeOut: 20000
            });

            hls.loadSource('${playlistUrl}');
            hls.attachMedia(video);

            // Event handlers
            hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
              console.log('Manifest parsed, available quality levels:', data.levels);
              updateQualityLevels();
              video.play();
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, function(event, data) {
              const level = hls.levels[data.level];
              currentQualityDiv.textContent = \`Current Quality: \${level ? level.height + 'p' : 'Auto'}\`;
            });

            hls.on(Hls.Events.ERROR, function (event, data) {
              if (data.fatal) {
                console.error('Fatal error:', data);
                switch(data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError();
                    break;
                  default:
                    hls.destroy();
                    break;
                }
              } else {
                console.warn('Non-fatal error:', data);
              }
            });

            // Update buffer info periodically
            setInterval(updateBufferInfo, 1000);
          }

          function updateQualityLevels() {
            qualitySelect.innerHTML = '<option value="-1">Auto</option>';
            hls.levels.forEach((level, index) => {
              const option = document.createElement('option');
              option.value = index;
              option.textContent = \`\${level.height}p (\${(level.bitrate / 1000).toFixed(0)}kbps)\`;
              qualitySelect.appendChild(option);
            });
          }

          function updateBufferInfo() {
            if (video.buffered.length > 0) {
              const bufferedEnd = video.buffered.end(video.buffered.length - 1);
              const bufferedStart = video.buffered.start(0);
              const bufferDuration = bufferedEnd - bufferedStart;
              bufferInfoDiv.textContent = \`Buffer: \${bufferDuration.toFixed(1)}s\`;
            }
          }

          function logDebugInfo() {
            if (hls) {
              const info = {
                currentLevel: hls.currentLevel,
                autoLevelEnabled: hls.autoLevelEnabled,
                nextLoadLevel: hls.nextLoadLevel,
                levels: hls.levels.length,
                bufferedRanges: video.buffered.length
              };
              debugInfo.innerHTML = \`<pre>\${JSON.stringify(info, null, 2)}</pre>\`;
            }
          }

          // Control event listeners
          autoQualityBtn.addEventListener('click', () => {
            if (hls) {
              hls.currentLevel = -1; // Auto
              qualitySelect.value = -1;
            }
          });

          qualitySelect.addEventListener('change', (e) => {
            const level = parseInt(e.target.value);
            if (hls) {
              hls.currentLevel = level;
            }
          });

          seekAheadBtn.addEventListener('click', () => {
            video.currentTime = Math.min(video.currentTime + 30, video.duration);
          });

          seekBackBtn.addEventListener('click', () => {
            video.currentTime = Math.max(video.currentTime - 30, 0);
          });

          toggleDebugBtn.addEventListener('click', () => {
            const isVisible = debugInfo.style.display !== 'none';
            debugInfo.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
              logDebugInfo();
              setInterval(logDebugInfo, 2000);
            }
          });

          // Initialize
          initHls();
        </script>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    handleError(err, res);
  }
});
