import * as mysql2 from "mysql2/promise";
import ProfileServerConfig from "./ProfileServerConfig.json";

class ProfileServerConnector {
  static ConnectionPool: mysql2.Pool = mysql2.createPool(ProfileServerConfig);
}

export { ProfileServerConnector };