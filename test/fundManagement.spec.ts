import { ethers } from "hardhat"
import { expect } from "chai"
import {
    FundManagement,
    FundManagement__factory,
    SampleERC20,
    SampleERC20__factory,
} from "../typechain"
import { ethToWei, weiToEth, skipTwoDays, skipTime } from "./utilities"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

var token: SampleERC20
var fundManagerContract: FundManagement
var contractCreator: SignerWithAddress
var fundManager: SignerWithAddress
var accounts: SignerWithAddress[]

describe("Fund Management", function () {
    before(async function () {})

    beforeEach(async function () {
        accounts = await ethers.getSigners()
        contractCreator = accounts[0]
        fundManager = accounts[1]

        fundManagerContract = await deployFundManagementContract()
        await fundManagerContract.deployed()

        token = await deployToken()
        await token.deployed()
    })

    it('Fund Manager withdraw funds after 2 days of requesting it', async function () {
        await transferTokensToContract(token)

        await createFund(10000, fundManager.address, token)

        await managerRequestFunds(fundManager, 10000)
        await skipTwoDays()
        await claimFunds(fundManager)

        let balance = await token.balanceOf(fundManager.address)
        expect(weiToEth(balance)).to.equal(10000)
    });

    it('Manager cannot withdraw funds without waiting 2 days', async function () {
        await transferTokensToContract(token)

        await createFund(10000, fundManager.address, token)

        await managerRequestFunds(fundManager, 10000)

        let claimFunds = fundManagerContract.connect(fundManager).claim(0)
        await expect(claimFunds).to.be.revertedWith('Your funds are not withdrawable yet')

        let balance = await token.balanceOf(fundManager.address)
        expect(weiToEth(balance)).to.equal(0)
    });

    it('The request window can be increased to 4 days', async function () {
        await transferTokensToContract(token)

        await createFund(10000, fundManager.address, token)

        let changeWindow = await fundManagerContract.connect(contractCreator).setRequestWindow(4 * 24 * 60 * 60);
        changeWindow.wait()

        await managerRequestFunds(fundManager, 10000)

        await skipTwoDays()

        let tryClaim = fundManagerContract.connect(fundManager).claim(0)
        await expect(tryClaim).to.be.revertedWith('Your funds are not withdrawable yet')

        await skipTwoDays()

        await claimFunds(fundManager)

        let balance = await token.balanceOf(fundManager.address)
        expect(weiToEth(balance)).to.equal(10000)
    });

    it('Changing request window does not affect existing requests', async function () {
        await transferTokensToContract(token)

        await createFund(10000, fundManager.address, token)

        await managerRequestFunds(fundManager, 10000)

        let changeWindow = await fundManagerContract.connect(contractCreator).setRequestWindow(24 * 60 * 60);
        changeWindow.wait()
        
        skipTime(24 * 60 * 60)

        let claimFunds = fundManagerContract.connect(fundManager).claim(0)
        await expect(claimFunds).to.be.revertedWith('Your funds are not withdrawable yet')

        let balance = await token.balanceOf(fundManager.address)
        expect(weiToEth(balance)).to.equal(0)
    });

    it('Works with multiple managers on different assets', async function () {
        let anotherToken = await deployToken()
        await anotherToken.deployed()

        await transferTokensToContract(token)
        await transferTokensToContract(anotherToken)

        await createFund(10000, fundManager.address, token)
        await createFund(10000, accounts[2].address, anotherToken)

        await managerRequestFunds(fundManager, 10000)
        await managerRequestFunds(accounts[2], 10000)

        await skipTwoDays()

        await claimFunds(fundManager)
        await claimFunds(accounts[2])

        let balance = await token.balanceOf(fundManager.address)
        expect(weiToEth(balance)).to.equal(10000)
        balance = await anotherToken.balanceOf(accounts[2].address)
        expect(weiToEth(balance)).to.equal(10000)
    });

    it('Owner can add to a fund', async function () {
        await transferTokensToContract(token)

        await createFund(5000, fundManager.address, token)

        await managerRequestFunds(fundManager, 5000)
        await skipTwoDays()
        await claimFunds(fundManager)

        let addToFund = await fundManagerContract.addToFund(fundManager.address, ethToWei(5000), 0)
        addToFund.wait()

        await managerRequestFunds(fundManager, 5000)
        await skipTwoDays()
        await claimFunds(fundManager)

        let balance = await token.balanceOf(fundManager.address)
        expect(weiToEth(balance)).to.equal(10000)
    });

    it('Withdraw unlocked assets cannot withdraw locked assets', async function () {
        await transferTokensToContract(token)

        await createFund(5000, fundManager.address, token)

        let withdraw = fundManagerContract.withdrawUnlockedAssets(ethToWei(10000), token.address)
        await expect(withdraw).to.be.revertedWith('Not enough unlocked tokens to withdraw')
    });

    it('Cannot withdraw more than what is allocated to you by owner', async function () {
        await transferTokensToContract(token)

        await createFund(10000, fundManager.address, token)

        let requestFunds = fundManagerContract.connect(fundManager).requestFunds(0, ethToWei(20000))
        await expect(requestFunds).to.be.revertedWith('Requested amount plus withdrawable amount greater than total allocated funds')
    });

    it('Cannot claim funds multiple times unless requesting again', async function () {
        await transferTokensToContract(token)

        await createFund(10000, fundManager.address, token)

        await managerRequestFunds(fundManager, 5000)
        await skipTwoDays()
        await claimFunds(fundManager)

        let claimAgain = fundManagerContract.connect(fundManager).claim(0)
        await expect(claimAgain).to.be.revertedWith('No withdrawable funds')
    });

    it('Owner cannot create fund without having enough tokens', async function () {
        await transferTokensToContract(token)
        let createFund = fundManagerContract.createFund(fundManager.address, ethToWei(20000), token.address)
        await expect(createFund).to.be.revertedWith('Not enough tokens')
    });

    it('Owner can clawback funds', async function () {
        await transferTokensToContract(token)

        await createFund(10000, fundManager.address, token)

        await managerRequestFunds(fundManager, 10000)

        await clawback(fundManager)

        // Check unlocked balance is 10k

        await skipTwoDays()
        let claimFunds = fundManagerContract.connect(fundManager).claim(0)
        await expect(claimFunds).to.be.revertedWith('No withdrawable funds')
    });

    it('Owner can clawback funds even if the withdraw window is passed as long as the manager hasnt withdrawn', async function () {
        await transferTokensToContract(token)

        await createFund(10000, fundManager.address, token)

        await managerRequestFunds(fundManager, 10000)

        await skipTwoDays()

        await clawback(fundManager)

        // Check unlocked balance is 10k

        await skipTwoDays()

        let claimFunds = fundManagerContract.connect(fundManager).claim(0)
        await expect(claimFunds).to.be.revertedWith('No withdrawable funds')
    });

    it('Owner can clawback and withdraw all funds from multiple managers', async function () {
        await transferTokensToContract(token)

        await createFund(5000, fundManager.address, token)
        await createFund(5000, accounts[2].address, token)

        await managerRequestFunds(fundManager, 5000)
        await managerRequestFunds(accounts[2], 5000)

        await clawback(fundManager)
        await clawback(accounts[2])

        let claimFunds = fundManagerContract.connect(fundManager).claim(0)
        await expect(claimFunds).to.be.revertedWith('No withdrawable funds')

        let claimFundsAgain = fundManagerContract.connect(accounts[2]).claim(0)
        await expect(claimFundsAgain).to.be.revertedWith('No withdrawable funds')
    });
})

async function transferTokensToContract(asset: SampleERC20) {
    let depositTokens = await asset.transfer(fundManagerContract.address, ethToWei(10000))
    depositTokens.wait()
}

async function createFund(amount: number, manager: string, asset: SampleERC20) {
    let createFund = await fundManagerContract.createFund(manager, ethToWei(amount), asset.address)
    createFund.wait()
}

async function managerRequestFunds(manager: SignerWithAddress, amount: number) {
    let requestFunds = await fundManagerContract.connect(manager).requestFunds(0, ethToWei(amount))
    requestFunds.wait()
}

async function claimFunds(manager: SignerWithAddress) {
    let claimFunds = await fundManagerContract.connect(manager).claim(0)
    claimFunds.wait()
}

async function clawback(manager: SignerWithAddress) {
    let clawback = await fundManagerContract.connect(contractCreator).clawbackFunds(manager.address, 0)
    clawback.wait()
}

async function deployToken(): Promise<SampleERC20> {
    const sampleERC20Factory = (await ethers.getContractFactory(
        "SampleERC20",
        contractCreator
    )) as SampleERC20__factory

    return await sampleERC20Factory.deploy(ethToWei(10000))
}

async function deployFundManagementContract(): Promise<FundManagement> {
    const fundMangementFactory = (await ethers.getContractFactory(
        "FundManagement",
        contractCreator
    )) as FundManagement__factory

    return await fundMangementFactory.deploy()
}