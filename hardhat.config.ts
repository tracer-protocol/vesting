import { HardhatUserConfig } from "hardhat/types"
import "@nomiclabs/hardhat-waffle"
import "@typechain/hardhat"
import "hardhat-deploy"
import "hardhat-gas-reporter"
import "solidity-coverage"
import "hardhat-contract-sizer"
import { tasks } from "hardhat"
import { config as dotEnvConfig } from "dotenv"
dotEnvConfig()

const MAINNET_URL = process.env.MAINNET_URL || ""
const TESTNET_URL = process.env.TESTNET_URL || ""
const mnemonic = process.env.MNEMONIC || ""

const config: HardhatUserConfig = {
    solidity: "0.8.4",
    networks: {
        hardhat: {
            blockGasLimit: 12450000,
        },
        mainnet: {
            url: MAINNET_URL,
            gasPrice: 30000000000, //30 gwei
            accounts: { mnemonic: mnemonic },
        },
        kovan: {
            url: TESTNET_URL,
            gasPrice: 4000000000, //3 gwei
            accounts: { mnemonic: mnemonic },
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
}

export default config
