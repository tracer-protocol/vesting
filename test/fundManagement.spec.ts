import { ethers } from "hardhat"
import { expect } from "chai"
import {
    FundManagement,
    FundManagement__factory,
    SampleERC20,
    SampleERC20__factory,
} from "../typechain"
import { ethToWei, weiToEth, skipTwoDays } from "./utilities"
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

        const fundMangementFactory = (await ethers.getContractFactory(
            "FundManagement",
            contractCreator
        )) as FundManagement__factory
        const sampleERC20Factory = (await ethers.getContractFactory(
            "SampleERC20",
            contractCreator
        )) as SampleERC20__factory

        fundManagerContract = await fundMangementFactory.deploy()
        await fundManagerContract.deployed()

        token = await sampleERC20Factory.deploy(ethToWei(10000))
        await token.deployed()
    })

    it('Fund Manager withdraw funds after 2 days of requesting it', async function () {
        let depositTokens = await token.transfer(fundManagerContract.address, ethToWei(10000))
        depositTokens.wait()

        let createFund = await fundManagerContract.createFund(fundManager.address, ethToWei(10000), token.address)
        createFund.wait()

        let requestFunds = await fundManagerContract.connect(fundManager).requestFunds(0, ethToWei(10000))
        requestFunds.wait()

        skipTwoDays()

        let claimFunds = await fundManagerContract.connect(fundManager).claim(0)
        requestFunds.wait()

        let balance = await token.balanceOf(fundManager.address)
        expect(weiToEth(balance)).to.equal(10000)
    });

    it('Manager cannot withdraw funds without waiting 2 days', async function () {
    });

    it('The request window can be increased to 4 days', async function () {
    });

    it('Works with multiple funds on different assets', async function () {
    });

    it('Works with multiple funds with multiple managers', async function () {
    });

    it('Owner can add to a fund', async function () {
    });

    it('Withdraw unlocked assets cannot withdraw locked assets', async function () {
    });

    it('Cannot withdraw more than what is allocated to you by owner', async function () {
    });

    it('Cannot claim funds multiple times unless requesting again', async function () {
    });

    it('Cannot claim more funds than requested amount', async function () {
    });

    it('Owner cannot create fund without having enough tokens', async function () {
    });

    it('Owner can clawback funds', async function () {
    });

    it('Owner can clawback funds even if the withdraw window is passed as long as the manager hasnt withdrawn', async function () {
    });

    it('Owner can clawback and withdraw all funds from multiple managers', async function () {
    });
})
