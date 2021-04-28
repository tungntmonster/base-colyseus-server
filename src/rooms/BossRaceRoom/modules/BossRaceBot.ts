import { Client, Delayed } from "colyseus";
import { RoomModule } from "../../BaseRoom";
import BotGenerationConfig
  from "../../../dataobjects/LiveJSON/BotGenerationConfig";
import MatchmakingConfig from "../../../dataobjects/LiveJSON/MatchmakingConfig";
import { generateRandomString }
  from "../../../utils/CommonUtils";
import "../../../utils/number-augmentations";
import { last,
  zip,
  padLeft,
  padRight,
  shuffleKnuth,
  randomElement,
  weightedRandomBy,
  weightedRandomIdxBy
} from '../../../utils/ArrayUtils'
import { BossRaceMatchMaking }
  from "../../CustomLobbyRoom/modules"
import "../../../utils/string-augmentation";
import BossStageData from "../../../dataobjects/LiveJSON/BossStageData";
import { SelectBossRandomlyOnEnoughPlayers }
  from "./SelectBossRandomlyOnEnoughPlayers";
import * as BossRaceHistory from "../../../dataobjects/BossRaceHistory";
import { BossRaceRoom } from "../../BossRaceRoom";
import { bossRaceRoomLogger } from "../BossRaceRoom";

export class BossRaceBot extends RoomModule<BossRaceRoom> {
  static allowedSessionIdCharacters = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`
    + `abcdefghijklmnopqrstuvwxyz`
    + `0123456789`;
  static generatedSessionIdLength = 9;
  sessionId: string;
  creationWaitTask: Delayed = null
  scoreGenerationTask: Delayed = null;
  fractionalScore = 0;
  botPlanes: number[] = [];
  rankToMatch: typeof MatchmakingConfig.JSONObj.Ranks[0];

  attach(room: BossRaceRoom) {
    super.attach(room);
    this.room.events.once('join', this.waitToMatchBot);
  }

  remove() {
    super.remove();
    this.creationWaitTask?.clear();
    this.scoreGenerationTask?.clear();
    this.room.events.off('join', this.waitToMatchBot);
    this.room.events.off('botstart', this.startGenerateScore);
    this.room.events.off('broadcast', this.bounceAdditionalInfo);
  }

  waitToMatchBot = () => {
    if (this.room.clientMappings.size == this.room.maxClients) return;
    this.creationWaitTask = this.room.clock.setTimeout(() => {
      if (this.room.clientMappings.size == this.room.maxClients) return;
      if (this.room.locked && !this.room.forcedBotMatch) {
        bossRaceRoomLogger.info(`${this.room.roomId}: room locked without enough players, leaving with code 4002`);
        this.room.clients.forEach(c => c.leave(4002));
        return;
      }
      do {
        this.sessionId = generateRandomString(
          BossRaceBot.allowedSessionIdCharacters,
          BossRaceBot.generatedSessionIdLength);
      }
      while (this.room.clients.map(c => c.sessionId).includes(this.sessionId));
      this.room.events.on('botstart', this.startGenerateScore);
      this.room.events.on('broadcast', this.bounceAdditionalInfo);
      this.room.events.once('endmatch',
        () => this.scoreGenerationTask?.clear());
      this.room.events.on('phase', state => {
        if (state == 'start') this.scoreGenerationTask?.resume();
        if (state == 'end') this.scoreGenerationTask?.pause();
      });
      let scoreToMatch = this.room.metadata['AverageBFScore'] as number;
      this.rankToMatch = MatchmakingConfig.JSONObj.Ranks
        .find(r => r.BattlefieldScoreRange.Min <= scoreToMatch
          && r.BattlefieldScoreRange.Max >= scoreToMatch);
      if (this.rankToMatch == null)
        this.rankToMatch = last(MatchmakingConfig.JSONObj.Ranks);
      const scoreRange = BossRaceMatchMaking
        .getMatchmadeScore(this.room.metadata['AverageBFScore'] as number);
      if (this.rankToMatch.Number > MatchmakingConfig.JSONObj.Ranks[0].Number) {
        let rankBelowScoreRange = MatchmakingConfig.JSONObj.Ranks
          .find(r => r.Number == this.rankToMatch.Number - 1)
          .BattlefieldScoreRange;
        scoreRange[0] += 0.5 * rankBelowScoreRange.Min
          .difference(rankBelowScoreRange.Max);
      }
      if (this.rankToMatch.Number < last(MatchmakingConfig.JSONObj.Ranks).Number) {
        let rankAboveScoreRange = MatchmakingConfig.JSONObj.Ranks
          .find(r => r.Number == this.rankToMatch.Number + 1)
          .BattlefieldScoreRange;
        scoreRange[1] -= 0.5 * rankAboveScoreRange.Min
          .difference(rankAboveScoreRange.Max);
      }
      this.room.addPlayerState(this.sessionId,
        {
          PlayerName: BotGenerationConfig.JSONObj.DisplayNames[Math.random()
            .multiply(BotGenerationConfig.JSONObj.DisplayNames.length)
            .floor()],
          StartingLives: [...this.room.state.Players][0][1].LivesRemaining,
          BattlefieldScore: scoreRange[0].randomBetween(scoreRange[1]).floor(),
          PlayerID: ''
        });
      this.room.events.emit('playerready', this.sessionId);
    },
      MatchmakingConfig.JSONObj.MatchingTimeoutRange[0]
        .randomBetween(MatchmakingConfig.JSONObj.MatchingTimeoutRange[1])
      * 1000);
  }

  bounceAdditionalInfo = (messageType: string, message: any, source: Client) => {
    if (messageType != 'PlayerAdditionalInfo') return;
    this.room.events.off('broadcast', this.bounceAdditionalInfo);
    const additionalInfo = (message as string).parseAsObject();
    let slotCount = "";
    if (additionalInfo['PlaneSlot'] != null)
      slotCount = additionalInfo['PlaneSlot'] as string;
    else slotCount = additionalInfo['Planes'] as string;
    const playerPlaneSlots = slotCount.split('|')
      .map(p => p.trim())
      .filter(p => p != '-1' && p != '');
    weightedRandomBy(BotGenerationConfig.JSONObj
      .PlaneNumberPowerLevels[playerPlaneSlots.length - 1]
      .PlaneProbabilities, t => t.Weight).Slots
      .forEach((s: { randomElement: () => number; }) => {
        let pi = -1;
        do { pi = s.randomElement(); }
        while (this.botPlanes.filter(bp => bp == pi).length > 0)
        this.botPlanes.push(pi);
      });
    source.send('PlayerAdditionalInfo',
      JSON.stringify({
        StarRank: additionalInfo['StarRank'],
        SessionId: this.sessionId,
        Planes: padRight(shuffleKnuth(this.botPlanes).map(p => p.toString()), 4, '-1')
          .join('|')
          .concat('|'),
        Type: 'Bot'
      }));
  }

  startGenerateScore = () => this.generateScore().catch(e => bossRaceRoomLogger.error(e));

  async generateScore() {
    const targetHistory = BossRaceHistory.Matches
      .get(<number>this.room.clients[0].userData['id']);
    const targetQualifiedRecentResults = targetHistory.filter(r => r.score
      >= BotGenerationConfig.JSONObj.MinimumScoreToCalculate)
      .slice(0, BotGenerationConfig.JSONObj.RivalAverageScoreMatchCount);
    let targetScore = 0;
    if (targetQualifiedRecentResults.length == 0)
      targetScore = BotGenerationConfig.JSONObj.DefaultTargetScore;
    else {
      const winCount = targetQualifiedRecentResults
        .filter(r => r.result == 'win').length;
      const loseCount = targetQualifiedRecentResults
        .filter(r => r.result == 'lose').length;
      targetScore = targetQualifiedRecentResults
        .reduce((p, c) => p + c.score, 0)
        .multiply(1 / targetQualifiedRecentResults.length)
        .multiply(winCount.plus(-loseCount).multiply(0.01).plus(1));
    }
    // Score scaling
    let startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const matchesToday = targetHistory.filter(r => r.createdAt > startOfToday);
    let scoreScalingRange = [0, 0];
    if (matchesToday.length <= 4
      && matchesToday.filter(r => r.result == 'win').length < 2) {
      scoreScalingRange = BotGenerationConfig.JSONObj.ScoreScalingLevels[1];
    } else if (matchesToday.slice(0, 2).every(r => r.result == 'lose')) {
      scoreScalingRange = BotGenerationConfig.JSONObj.ScoreScalingLevels[0];
    } else if (targetHistory.length <= 10
      && targetHistory.filter(r => r.result == 'win').length < 7) {
      scoreScalingRange = BotGenerationConfig.JSONObj.ScoreScalingLevels[0];
    }
    targetScore = targetScore.multiply(1 + scoreScalingRange[0])
      .randomBetween(targetScore.multiply(1 + scoreScalingRange[1]));
    targetScore = Math.max(this.rankToMatch.FloorScore, targetScore);
    targetScore = targetScore.clamp(0, Number.POSITIVE_INFINITY);
    bossRaceRoomLogger.info(`${this.room.roomId}: bot targetScore: ${targetScore}`);

    const ownState = () => this.room.state.Players.get(this.sessionId);
    const selectBossModule = <SelectBossRandomlyOnEnoughPlayers>
      this.room.modules.get('SelectBoss');
    const chosenDiff = BossStageData.JSONObj
      .diffs[selectBossModule.chosenBossIndex];

    const deathProbabilites = BotGenerationConfig.JSONObj
      .PlaneNumberPowerLevels[this.botPlanes.length - 1]
      .DeathProbabilites;
    const chosenDeathPhaseIdx = weightedRandomIdxBy(deathProbabilites, e => e);
    const sumSurvivablePhaseSeconds = chosenDiff.PhaseTimes
      .slice(0, chosenDeathPhaseIdx)
      .reduce((a,b)=> a + b, 0);

    const totalFightMilliseconds = 1000 * sumSurvivablePhaseSeconds
      .plus(BotGenerationConfig.JSONObj
        .PhaseMinimumAliveTime[chosenDeathPhaseIdx])
      .randomBetween(sumSurvivablePhaseSeconds
        + chosenDiff.PhaseTimes[chosenDeathPhaseIdx]);
    const patchRate = 200;
    const tps = 1_000 / patchRate; // tps = ticks per second
    const totalFightTicks = (totalFightMilliseconds / patchRate).floor();
    let spikeCheckpoints = totalFightTicks.plus(-5 * tps)
      .randomWithinFloored(
        (totalFightMilliseconds / 45_000).ceil().randomBetween(2).floor(),
        45 * tps,
        [(0).randomBetween(25 * tps).floor()]
      );
    const scoreGapCount = (4).randomBetween(6).floor();
    const totalGapTicks = spikeCheckpoints.length.multiply(5 * tps);
    let scoreGapDurationSet = new Set<number>();
    while (scoreGapDurationSet.size < scoreGapCount - 1)
      scoreGapDurationSet.add(Math.random().multiply(totalGapTicks).floor());
    let scoreGapDurations = [...scoreGapDurationSet.values(), totalGapTicks]
      .sort((l, r) => l - r);
    scoreGapDurations = shuffleKnuth(zip<number, number, number>(scoreGapDurations,
        [0, ...scoreGapDurations],
        (l, r) => l - r));
    const unreservedTicks = spikeCheckpoints.length.plus(scoreGapCount - 1)
      .multiply(5 * tps)
      .multiply(-1)
      .plus(totalFightTicks);
    let totalReservedTicks = 0;
    const scoreGapStarts = scoreGapDurations.map((d, i, a) => {
      let max = a.slice(i, a.length).reduce((a, b) => a + b)
        .plus(5 * tps * (scoreGapCount - 1 - i))
        .multiply(-1)
        .plus(unreservedTicks);
      let gapStart = totalReservedTicks.randomBetween(max).floor();
      totalReservedTicks = gapStart + d + (5 * tps);
      return gapStart;
    });
    const livesToLose = ownState().LivesRemaining - 1;
    let deathCheckpoints = totalFightTicks
      .randomWithinFloored(livesToLose, 5 * tps)
      .concat([totalFightTicks]);
    const averageScorePerTick = targetScore / totalFightTicks;
    let elapsedTicks = 0;
    let elapsedGapTicks = 0;
    let spikeTicksLeft = 0;
    let gapTicksLeft = 0;
    const doTick = () => {
      let scoreTickMultiplier = 1;
      if (elapsedTicks >= spikeCheckpoints[0]) {
        spikeCheckpoints.shift();
        spikeTicksLeft = (5 * tps);
      } else --spikeTicksLeft;
      if (elapsedGapTicks >= scoreGapStarts[0]) {
        scoreGapStarts.shift();
        scoreGapDurations.shift();
        gapTicksLeft = scoreGapDurations[0] + 1;
      } else if (spikeTicksLeft <= 0) --gapTicksLeft;

      if (spikeTicksLeft <= 0) ++elapsedGapTicks;
      if (spikeTicksLeft > 0) scoreTickMultiplier = 3;
      else if (gapTicksLeft > 0) scoreTickMultiplier = 0;
      else scoreTickMultiplier = 1;
      let addedScore = averageScorePerTick * scoreTickMultiplier;
      this.fractionalScore += addedScore;
      if (addedScore > 0) this.room.events.emit('score',
        this.sessionId,
        this.fractionalScore.floor());

      ++elapsedTicks;
      if (deathCheckpoints.length > 0 && elapsedTicks >= deathCheckpoints[0]) {
        deathCheckpoints.shift();
        this.room.events.emit('lives',
          this.sessionId,
          ownState().LivesRemaining - 1);
      }
      if (ownState().LivesRemaining == 0 || elapsedTicks >= totalFightTicks)
        this.scoreGenerationTask?.clear();
    };
    doTick();
    this.scoreGenerationTask = this.room.clock.setInterval(doTick, patchRate);
  }
}