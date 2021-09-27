import { ethers } from "hardhat"
import { expect } from "chai"
import {
    FundManagement,
    FundManagement__factory,
    SampleERC20,
    SampleERC20__factory,
} from "../typechain"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

var stakingTokens: MockToken[]
var rewardsToken: MockToken
var farmContracts: StakingRewards[]
var contractCreator: SignerWithAddress
var accounts: SignerWithAddress[]

describe("StakingRewards", function () {
    before(async function () {})

    beforeEach(async function () {})
})
