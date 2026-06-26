const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/download', (req, res) => {
    const { url, type, quality } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Determine yt-dlp arguments
    let formatArg = '';
    let ext = 'mp4';
    
    if (type === 'audio') {
        formatArg = 'bestaudio';
        ext = 'mp3';
    } else {
        // Video mode
        if (quality === 'max') {
            formatArg = 'bestvideo+bestaudio/best';
        } else {
            // Select video up to specified height and best audio
            formatArg = `bestvideo[height<=${quality}]+bestaudio/best`;
        }
    }

    // First, let's get the title and safe filename using yt-dlp --print
    const infoArgs = ['--print', '%(title)s', url];
    const infoProcess = spawn('yt-dlp', infoArgs);
    
    let title = 'video';
    infoProcess.stdout.on('data', (data) => {
        const text = data.toString().trim();
        if (text) title = text;
    });

    infoProcess.on('close', () => {
        const safeTitle = title.replace(/[^\w\s-]/gi, '_');
        const filename = `${safeTitle}.${ext}`;
        
        // Generate a unique temporary filepath
        const tmpId = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const outTemplate = path.join(require('os').tmpdir(), `vidgrab-${tmpId}.%(ext)s`);

        let args = [
            '-f', formatArg,
            '-o', outTemplate
        ];

        if (type === 'audio') {
            args.push('--extract-audio', '--audio-format', 'mp3');
        } else {
            args.push('--merge-output-format', 'mp4');
        }
        
        args.push(url);

        const downloadProcess = spawn('yt-dlp', args);
        let errorLog = '';

        downloadProcess.stderr.on('data', (data) => {
            errorLog += data.toString();
            console.error(`[yt-dlp stderr]: ${data}`);
        });

        downloadProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('yt-dlp failed with code', code);
                if (!res.headersSent) {
                    return res.status(500).json({ error: '下載失敗', details: errorLog });
                }
            } else {
                // Find the downloaded file
                const fs = require('fs');
                const glob = require('path');
                const tmpDir = require('os').tmpdir();
                
                // Read dir to find the file that starts with our tmpId
                const files = fs.readdirSync(tmpDir);
                const downloadedFile = files.find(f => f.startsWith(`vidgrab-${tmpId}.`));
                
                if (downloadedFile) {
                    const filePath = path.join(tmpDir, downloadedFile);
                    res.download(filePath, filename, (err) => {
                        // Delete the file after download finishes
                        fs.unlink(filePath, () => {});
                        if (err) {
                            console.error('Error sending file:', err);
                        }
                    });
                } else {
                    if (!res.headersSent) {
                        res.status(500).json({ error: '找不到下載的檔案' });
                    }
                }
            }
        });

        req.on('close', () => {
            console.log('Client disconnected, killing yt-dlp...');
            downloadProcess.kill('SIGINT');
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
