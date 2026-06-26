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
        // Now stream the actual download
        const safeTitle = title.replace(/[^\w\s-]/gi, '_');
        const filename = `${safeTitle}.${ext}`;

        // Set headers for download
        res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        
        let args = [
            '-f', formatArg,
            '-o', '-' // Output to stdout
        ];

        if (type === 'audio') {
            args.push('--extract-audio', '--audio-format', 'mp3');
        } else {
            args.push('--merge-output-format', 'mp4');
        }
        
        args.push(url);

        const downloadProcess = spawn('yt-dlp', args);

        downloadProcess.stdout.pipe(res);

        let errorLog = '';
        downloadProcess.stderr.on('data', (data) => {
            errorLog += data.toString();
            console.error(`[yt-dlp stderr]: ${data}`);
        });

        downloadProcess.on('close', (code) => {
            if (code !== 0 && !res.headersSent) {
                console.error('yt-dlp failed with code', code);
                res.status(500).json({ error: '下載失敗', details: errorLog });
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
