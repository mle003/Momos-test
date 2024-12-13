# Use the official Node.js image based on Alpine Linux
FROM node:18-alpine

# Install necessary dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init


# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Set PUPPETEER_EXECUTABLE_PATH to the Chromium binary path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the app using dumb-init to handle PID 1
CMD ["dumb-init", "npm", "start"]