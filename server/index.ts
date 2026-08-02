import { MultiplayerServer } from "./MultiplayerServer";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const server = new MultiplayerServer();

void server.listen(Number.isInteger(port) ? port : 8787).then((listeningPort) => {
  console.log(`The Last Lesson multiplayer host listening on ws://127.0.0.1:${listeningPort}`);
});

const shutdown = () => {
  void server.close().finally(() => process.exit(0));
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
