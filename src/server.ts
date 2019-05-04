import express, { Express } from 'express';
import http from "http";
import validUrl from "valid-url";
import { Loader } from './loader';
import { logger, debugLog } from './logging';
import { Pool } from './pool';
import { CacheHTML } from './cache';

export class Server {
    app: Express;
    server: http.Server;
    loader: Loader;
    constructor(port: number, pool: Pool, cache: CacheHTML, timeout: number) {
        this.app = express();
        this.loader = new Loader(pool, cache, timeout);
        this.setupRoutes(this.app, timeout);
        this.server = this.app.listen(
            port,
            () => logger.info("server listening on port " + port),
        );
    }
    setupRoutes(app: Express, timeout: number) {
        debugLog.server("setting up server routes");
        app.get('/', async (req, res, _) => {
            logger.info("received HTTP GET: " + req.url);
            let url: string;
            try {
                url = this.verifyURL(req.query["url"])
            } catch (e) {
                return res.status(403).send({
                    "error": String(e)
                });
            }
            const wait = req.query["wait"];
            try {
                const html = await this.loader.spitHTML(url, wait);
                return res.status(200).send({
                    "html": html
                });
            } catch (e) {
                logger.error(String(e));
                return res.status(403).send({
                    "error": String(e)
                });
            }
        });
        app.get('/healthcheck', async (req, res, next) => {
            debugLog.server("received GET /healthcheck request: " + req.url);
            const healthy = true; // TODO
            if (healthy) {
                return res.status(200);
            }
            logger.warn("unhealthy");
            return res.status(500).send("unhealthy");
        });
    }
    verifyURL(url: string | undefined): string {
        if (url === undefined || url === "") {
            throw new Error("url parameter not provided")
        } else if (validUrl.isWebUri(url) === undefined) {
            throw new Error("url parameter is not a valid URL")
        }
        return url;
    }
    close(callback?: () => void) {
        this.server.close(callback);
    }
}


