require("@nomiclabs/hardhat-waffle")
require("solidity-coverage")
require("hardhat-deploy")
require("@typechain/hardhat")

const mnemonic = ""
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: "0.8.4",
    networks: {
        hardhat: {
            blockGasLimit: 12450000,
        },
        mainnet: {
            url: "MAINNET_URL",
            gasPrice: 30000000000, //30 gwei
            accounts: { mnemonic: mnemonic },
        },
        kovan: {
            url: "KOVAN_URL",
            gasPrice: 4000000000, //3 gwei
            accounts: { mnemonic: mnemonic },
        },
    },
    namedAccounts: {
        deployer: 0,
    },
}
