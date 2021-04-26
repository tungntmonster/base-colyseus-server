import { Client } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import { BossRaceRoom } from "../../BossRaceRoom";
import BossStageData from "../../../dataobjects/LiveJSON/BossStageData";
import "../../../utils/number-augmentations";
import { DeepClone } from "../../../utils/CommonUtils";
import MatchmakingConfig from "../../../dataobjects/LiveJSON/MatchmakingConfig";

export class SelectBossRandomlyOnEnoughPlayers extends RoomModule<BossRaceRoom> {
  chosenBossIndex: number;

  attach(room: BossRaceRoom) {
    super.attach(room);

    this.chosenBossIndex = BossStageData.JSONObj.diffs.length.randomBetween(0)
      .floor();
    this.room.events.on('addplayer', this.broadcastBossToClient);
  }

  remove() {
    super.remove();
    this.room.events.off('addplayer', this.broadcastBossToClient);
  }

  broadcastBossToClient = () => {
    if (this.room.state.Players.size < this.room.maxClients) return;
    let chosenBoss = BossStageData.JSONObj.diffs[this.chosenBossIndex];
    let clonedBoss = DeepClone<typeof chosenBoss>(chosenBoss);
    const avgBFScore = this.room.metadata['AverageBFScore'] as number;
    const rankToSelect = MatchmakingConfig.JSONObj.Ranks
      .find(r => r.BattlefieldScoreRange.Min <= avgBFScore
        && r.BattlefieldScoreRange.Max >= avgBFScore);
    // clonedBoss.waves.flatMap(w => w.planes)
    //   .flatMap(p => p.bulletSpawnerDatas)
    //   .forEach(s => s.bulletDamaLevel *= rankToSelect.DamageMultiplier);
    this.room.broadcast('BossSelected', JSON.stringify(clonedBoss));
    this.room.events.off('addplayer', this.broadcastBossToClient);
  }
}