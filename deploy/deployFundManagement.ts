import { getNamedAccounts, ethers } from "hardhat"

async function main() {
    const factory = await ethers.getContractFactory("FundManagement")
    const { deployer } = await getNamedAccounts()
    console.log("Using deployer: " + deployer, "\n")

    let contract = await factory.deploy()
    await contract.deployed()
    console.log("Fund Management contract address: " + contract.address)
    console.log("Deploy Transaction Hash: : " + contract.deployTransaction.hash)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
