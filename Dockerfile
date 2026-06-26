FROM node:20-bullseye-slim

# Install Python 3, pip, and FFmpeg
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg wget && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp using pip
RUN pip3 install --no-cache-dir yt-dlp

# Set working directory
WORKDIR /app

# Copy server package.json and install Node dependencies
COPY server/package.json ./server/
RUN cd server && npm install

# Copy all files
COPY server/ ./server/
COPY public/ ./public/

# Expose port
EXPOSE 3000

# Start server
WORKDIR /app/server
CMD ["node", "index.js"]
