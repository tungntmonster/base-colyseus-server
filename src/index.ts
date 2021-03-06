import { createServer } from "http";
import cors from "cors";
import express, {Request, Response} from "express";
import path from "path";
import pidusage from "pidusage";
import { Server } from 'colyseus'
import serveIndex from 'serve-index';
import { BossRaceRoom, CustomLobbyRoom } from "./rooms";
import { log } from "./utils/log";
import { createConnection } from "typeorm";

const logger = log("index")

const port = Number(process.env.PORT || 25577);
const endpoint = "localhost";

const app = express();

app.use(cors());
app.use(express.json());



// Create HTTP & WebSocket servers
const gameServer = new Server({
  // engine: WebSocket.Server,
  server: createServer(app),
});

app.get("/hello", (req, res) => {
  res.json({hello: "world!"});
});


app.get("/ping-server", (req: Request, res: Response) => {
  res.status(200).json({ processId: process.pid });
});

app.use('/', serveIndex(path.join(__dirname, "../src/static"), {'icons': true}));

app.use('/', express.static(path.join(__dirname, "../src/static")));

createConnection()
  .then(async () => { })
  .catch((error) => logger.error(error));

gameServer.define("Lobby", CustomLobbyRoom);
gameServer.define("BossRace", BossRaceRoom);


gameServer.onShutdown(() => {
  console.info("CUSTOM SHUTDOWN ROUTINE: STARTED");
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      logger.info("CUSTOM SHUTDOWN ROUTINE: FINISHED");
      resolve();
    }, 1000);
  })
});

process.on('unhandledRejection', r => logger.info('unhandledRejection...', r));

gameServer.listen(port)
  .then(() => logger.info(`Listening on ws://${endpoint}:${port}`))
  .catch((err) => process.exit(1));



  