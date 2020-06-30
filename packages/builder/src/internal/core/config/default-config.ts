import { BuilderConfig, HttpNetworkConfig } from "../../../types";

const DEFAULT_NETWORK_CONFIG: HttpNetworkConfig = {
  // accounts: [],
  chainName: "devnet",
  url: "localhost:8080"
};

const defaultConfig: BuilderConfig = {
  networks: {
    default: DEFAULT_NETWORK_CONFIG,
  },
  //analytics: {
  //  enabled: true,
  //},
  mocha: {
    timeout: 20000,
  },
};

export default defaultConfig;