ARG NODE_VERSION=11.13.0-alpine

FROM node:${NODE_VERSION} AS builder
WORKDIR /htmlspitter
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
RUN npm t
RUN npm run build

FROM node:${NODE_VERSION}
WORKDIR /htmlspitter
EXPOSE 8000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/ \
    NODE_ENV=production
RUN addgroup -S chromium && \
    adduser -S -g chromium chromium && \
    mkdir -p /home/chromium/Downloads && \
    chown -R chromium:chromium /home/chromium && \
    chown -R chromium:chromium /htmlspitter && \
    apk add --update --progress \
    chromium harfbuzz nss freetype ttf-freefont && \
    rm -rf /var/cache/* && \
    mkdir /var/cache/apk
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=1 CMD [ "node", "./build/healthcheck.js" ]
ENTRYPOINT [ "node", "./build/main.js" ]
COPY package.json package-lock.json ./
RUN npm install --only=prod
COPY --from=builder --chown=chromium:chromium /htmlspitter/build /htmlspitter/build
USER chromium