import { Client } from "colyseus";
import {  RoomModule } from "../../BaseRoom";
import { CustomLobbyRoom } from "../../CustomLobbyRoom";

export class EnsureUniquePlayerID extends RoomModule<CustomLobbyRoom> {
  duplicatePlayerIDCloseCode = 4001;

  attach(room: CustomLobbyRoom) {
    super.attach(room);
    this.room.events.on('join', this.assignPlayerID);
    this.room.events.on('kickduplicates', this.kickDuplicateClients);
  }

  remove() {
    super.remove();
    this.room.events.off('join', this.assignPlayerID);
    this.room.events.off('kickduplicates', this.kickDuplicateClients);
  }

  assignPlayerID = (client: Client, options: any) => {
    let duplicates = this.room.clients.filter(c => c != client)
      .filter(c => c.userData['PlayerID'] == client.userData['PlayerID']);
    if (duplicates.length > 0) client.send('DuplicatePlayerID');
  }

  kickDuplicateClients = (client: Client) => this.room.clients
    .filter(c => c != client)
    .filter(c => c.userData['PlayerID'] == client.userData['PlayerID'])
    .forEach(c => c.leave(this.duplicatePlayerIDCloseCode));
}