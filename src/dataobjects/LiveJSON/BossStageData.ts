import path from "path";
import sourceJSON from "../../BossStageData.json";
import { LiveJSON } from "../../utils/LiveJSON";

export default LiveJSON.Make<typeof sourceJSON>(
  path.resolve(__dirname, '../../BossStageData.json'));