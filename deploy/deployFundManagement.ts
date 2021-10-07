import { getNamedAccounts, ethers } from "hardhat"
import { FundManagement, FundManagement__factory } from "../typechain"

async function main() {
    const factory = await ethers.getContractFactory("FundManagement")
    const { deployer } = await getNamedAccounts()
    console.log("Using deployer: " + deployer, "\n")

    let contract = await factory.deploy()
    await contract.deployed()
    console.log("Fund Management contract address: " + contract.address)
    console.log("Deploy Transaction Hash: : " + contract.deployTransaction.hash)

    let newOwner = "0xA84918F3280d488EB3369Cb713Ec53cE386b6cBa"
    let fundContract = new ethers.Contract(
        contract.address,
        FundManagement__factory.abi
    ).connect(deployer) as FundManagement

    let ownershipTransaction = await fundContract.transferOwnership(newOwner)
    ownershipTransaction.wait()

    console.log("Ownership transfer hash: " + ownershipTransaction.hash)
    console.log("New owner: " + newOwner, "\n")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
