import * as mysql2 from "mysql2/promise";
import ProfileServerConfig from "./ProfileServerConfig.json";
import { NoOps } from "./CommonUtils";

class ProfileServerConnector {
  static ConnectionPool: mysql2.Pool = mysql2.createPool(ProfileServerConfig);
}

export { ProfileServerConnector };