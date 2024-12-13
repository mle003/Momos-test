FROM node:18-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY . .

EXPOSE 3000

CMD ["dumb-init", "npm", "start"]