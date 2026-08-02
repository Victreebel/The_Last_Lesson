import { MultiplayerServer } from "./MultiplayerServer";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const server = new MultiplayerServer({
  maxRooms: parsePositiveInteger(process.env.MAX_ROOMS, 64),
  maxClientsPerRoom: parsePositiveInteger(process.env.MAX_CLIENTS_PER_ROOM, 4),
  maxPayloadBytes: parsePositiveInteger(process.env.MAX_PAYLOAD_BYTES, 16_384)
});

void server.listen(Number.isInteger(port) ? port : 8787).then((listeningPort) => {
  console.log(`The Last Lesson multiplayer host listening on ws://127.0.0.1:${listeningPort}`);
});

const shutdown = () => {
  void server.close().finally(() => process.exit(0));
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
