const { expect } = require("chai")
const { BigNumber } = require("ethers")
const { ethers, network } = require("hardhat")

// helper to forward time
const forwardTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine", [])
}

describe("Unit Test: Vesting", function () {
    let vesting
    let accounts
    let token

    beforeEach(async () => {
        const Vesting = await ethers.getContractFactory("Vesting")
        const SampleToken = await ethers.getContractFactory("SampleERC20")
        vesting = await Vesting.deploy()
        token = await SampleToken.deploy(ethers.utils.parseEther("10000"))
        await vesting.deployed()
        await token.deployed()
        accounts = await ethers.getSigners()
    })

    context("Vest", async () => {
        context("when not called by the owner", async () => {
            it("reverts", async () => {
                await expect(
                    vesting.connect(accounts[1]).vest(
                        accounts[0].address,
                        ethers.utils.parseEther("1"),
                        token.address,
                        true,
                        10,
                        5,
                        0
                    )
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })

        context("when cliff >= vesting", async () => {
            it("reverts", async () => {
                await expect(
                    vesting.vest(
                        accounts[0].address,
                        ethers.utils.parseEther("1"),
                        token.address,
                        true,
                        10,
                        5,
                        0
                    )
                ).to.be.revertedWith("Vesting: invalid vesting params")
            })
        })

        context("when amount = 0", async () => {
            it("reverts", async () => {
                await expect(
                    vesting.vest(
                        accounts[0].address,
                        ethers.utils.parseEther("0"),
                        token.address,
                        true,
                        5,
                        10,
                        0
                    )
                ).to.be.revertedWith("Vesting: invalid vesting params")
            })
        })

        context("when vesting weeks = 0", async () => {
            it("reverts", async () => {
                await expect(
                    vesting.vest(
                        accounts[0].address,
                        ethers.utils.parseEther("1"),
                        token.address,
                        true,
                        0,
                        0,
                        0
                    )
                ).to.be.revertedWith("Vesting: invalid vesting params")
            })
        })

        context("when not enough tokens are held in the contract", async () => {
            it("reverts", async () => {
                await expect(
                    vesting.vest(
                        accounts[0].address,
                        ethers.utils.parseEther("1"),
                        token.address,
                        true,
                        5,
                        10,
                        0
                    )
                ).to.be.revertedWith("Vesting: Not enough tokens")
            })
        })

        context("when enough tokens are held", async () => {
            beforeEach(async () => {
                await token.transfer(
                    vesting.address,
                    ethers.utils.parseEther("10")
                )
                await vesting.vest(
                    accounts[0].address,
                    ethers.utils.parseEther("1"),
                    token.address,
                    true,
                    5,
                    10,
                    0
                )
            })

            it("creates a vesting schedule", async () => {
                let userVesting = await vesting.schedules(
                    accounts[0].address,
                    0
                )
                // total, claimed, asset, start, cliff, end, isFixed
                expect(userVesting.totalAmount).to.equal(
                    ethers.utils.parseEther("1")
                )
                expect(userVesting.claimedAmount).to.equal(
                    ethers.utils.parseEther("0")
                )
                expect(userVesting.startTime).to.equal(0)
                expect(userVesting.cliffTime).to.equal(5 * 7 * 24 * 60 * 60) // 5 days in seconds
                expect(userVesting.endTime).to.equal(10 * 7 * 24 * 60 * 60) // 10 days in seconds
            })

            it("increments the users number of schedules", async () => {
                let userSchedules = await vesting.numberOfSchedules(
                    accounts[0].address
                )
                expect(userSchedules).to.equal(1)
            })

            it("allows a user to have multiple schedules", async () => {
                await vesting.vest(
                    accounts[0].address,
                    ethers.utils.parseEther("5"),
                    token.address,
                    true,
                    5,
                    10,
                    0
                )

                let schedule1 = await vesting.schedules(accounts[0].address, 0)
                expect(schedule1.totalAmount).to.equal(
                    ethers.utils.parseEther("1")
                )
                let schedule2 = await vesting.schedules(accounts[0].address, 1)
                expect(schedule2.totalAmount).to.equal(
                    ethers.utils.parseEther("5")
                )
            })
        })
    })

    context("Multi Vest", async () => {
        context("when amounts and to arrays differ in length", async () => {
            it("reverts", async () => {
                await expect(
                    vesting.multiVest(
                        [accounts[0].address],
                        [
                            ethers.utils.parseEther("1"),
                            ethers.utils.parseEther("1"),
                        ],
                        token.address,
                        true,
                        10,
                        5,
                        0
                    )
                ).to.be.revertedWith("Vesting: Array lengths differ")
            })
        })

        context("when amounts and to have the correct length", async () => {
            beforeEach(async () => {
                // deposit enough tokens
                await token.transfer(
                    vesting.address,
                    ethers.utils.parseEther("10")
                )
            })

            it("sets up multiple schedules", async () => {
                await vesting.multiVest(
                    [accounts[1].address, accounts[2].address],
                    [
                        ethers.utils.parseEther("2"),
                        ethers.utils.parseEther("2"),
                    ],
                    token.address,
                    true,
                    1,
                    5,
                    0
                )

                // verify schedules
                let userSchedule1 = await vesting.schedules(
                    accounts[1].address,
                    0
                )
                let userSchedule2 = await vesting.schedules(
                    accounts[2].address,
                    0
                )
                expect(userSchedule1.totalAmount).to.equal(
                    ethers.utils.parseEther("2")
                )
                expect(userSchedule2.totalAmount).to.equal(
                    ethers.utils.parseEther("2")
                )
            })
        })
    })

    context("Claim", async () => {
        beforeEach(async () => {
            // create vesting for account 0
            let now = Math.floor(new Date().getTime() / 1000)
            await token.transfer(vesting.address, ethers.utils.parseEther("10"))
            await vesting.vest(
                accounts[1].address,
                ethers.utils.parseEther("1"),
                token.address,
                true,
                5,
                10,
                now
            )
        })

        context("when the cliff time has not been reached", async () => {
            it("reverts", async () => {
                await expect(
                    vesting.connect(accounts[1]).claim(0)
                ).to.be.revertedWith("Vesting: cliff not reached")
            })
        })

        context("when sender is not vester", async () => {
            it("reverts", async () => {
                await expect(
                    vesting.connect(accounts[2]).claim(0)
                ).to.be.revertedWith("Vesting: not claimable")
            })
        })

        context("when claimable", async () => {
            it("changes balances appropriately", async () => {
                // fast forward 5 days
                await forwardTime(7 * 7 * 24 * 60 * 60)
                // get balance and locked before and after second attempted claim
                let balanceBefore = await token.balanceOf(accounts[1].address)
                let lockedBefore = await vesting.locked(token.address)
                let contractBalanceBefore = await token.balanceOf(
                    vesting.address
                )
                await vesting.connect(accounts[1]).claim(0)
                let balanceAfter = await token.balanceOf(accounts[1].address)
                let lockedAfter = await vesting.locked(token.address)
                let contractBalanceAfter = await token.balanceOf(
                    vesting.address
                )
                // user balance increased
                expect(balanceBefore).to.be.lt(balanceAfter)
                // locked decreased
                expect(lockedBefore).to.be.gt(lockedAfter)
                // contract balance decreased
                expect(contractBalanceBefore).to.be.gt(contractBalanceAfter)
                expect(
                    contractBalanceBefore.sub(contractBalanceAfter)
                ).to.equal(lockedBefore.sub(lockedAfter))
            })
        })

        context("when all tokens have been claimed", async () => {
            it("does not send more", async () => {
                // fast forward 11 days
                await forwardTime(11 * 7 * 24 * 60 * 60)
                // claim once first
                await vesting.connect(accounts[1]).claim(0)
                // fast forward a day
                await forwardTime(1 * 7 * 24 * 60 * 60)

                // get balance and locked before and after second attempted claim
                let balanceBefore = await token.balanceOf(accounts[1].address)
                let lockedBefore = await vesting.locked[token.address]
                await vesting.connect(accounts[1]).claim(0)
                let balanceAfter = await token.balanceOf(accounts[1].address)
                let lockedAfter = await vesting.locked[token.address]
                expect(balanceBefore).to.equal(balanceAfter)
                expect(lockedBefore).to.equal(lockedAfter)
            })
        })

        context("when the user claims after the vesting expires", async () => {
            it("sends the maximum amount", async () => {
                // fast forward 20 days
                await forwardTime(20 * 7 * 24 * 60 * 60)
                let balanceBefore = await token.balanceOf(accounts[1].address)
                // claim
                await vesting.connect(accounts[1]).claim(0)
                let balanceAfter = await token.balanceOf(accounts[1].address)

                // balance should increase by 1
                expect(balanceAfter).to.equal(
                    balanceBefore.add(ethers.utils.parseEther("1"))
                )
            })
        })
    })

    context("Rug", async () => {
        beforeEach(async () => {
            // create a vesting NFT for account 0
            let now = Math.floor(new Date().getTime() / 1000)
            await token.transfer(vesting.address, ethers.utils.parseEther("10"))
            await vesting.vest(
                accounts[1].address,
                ethers.utils.parseEther("1"),
                token.address,
                true,
                5,
                10,
                now
            )
            await vesting.vest(
                accounts[2].address,
                ethers.utils.parseEther("1"),
                token.address,
                false,
                5,
                10,
                now
            )
        })

        context("when not called by the owner", async () => {
            it("reverts", async () => {
                await expect(
                    vesting.connect(accounts[1]).rug(accounts[1].address, 0)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })

        context("when called by the owner", async () => {
            context("if the schedule is fixed", async () => {
                it("reverts", async () => {
                    await expect(
                        vesting.connect(accounts[0]).rug(accounts[1].address, 0)
                    ).to.be.revertedWith("Vesting: Account is fixed")
                })
            })

            context("if the schedule is not fixed", async () => {
                it("sends remaining tokens back to the owner", async () => {
                    // create a non fixed vesting for account 2
                    let now = Math.floor(new Date().getTime() / 1000)
                    await vesting.vest(
                        accounts[2].address,
                        ethers.utils.parseEther("1"),
                        token.address,
                        false,
                        5,
                        10,
                        now
                    )

                    // measure balances before and after
                    let ownerBalanceBefore = await token.balanceOf(
                        accounts[0].address
                    )
                    // this is now token id 1
                    await vesting
                        .connect(accounts[0])
                        .rug(accounts[2].address, 0)
                    let ownerBalanceAfter = await token.balanceOf(
                        accounts[0].address
                    )
                    expect(ownerBalanceAfter).to.equal(
                        ownerBalanceBefore.add(ethers.utils.parseEther("1"))
                    )
                })
            })

            context("if all tokens have been claimed", async () => {
                it("reverts", async () => {
                    // claim all tokens from user
                    await forwardTime(7 * 7 * 24 * 60 * 60)
                    await vesting.connect(accounts[2]).claim(0)
                    await expect(
                        vesting.rug(accounts[2].address, 0)
                    ).to.be.revertedWith("Vesting: no outstanding tokens")
                })
            })
        })
    })

    context("Withdraw", async () => {
        context("when the contract balance is too low", async () => {
            it("reverts", async () => {
                let now = Math.floor(new Date().getTime() / 1000)
                await token.transfer(
                    vesting.address,
                    ethers.utils.parseEther("10")
                )
                await vesting.vest(
                    accounts[1].address,
                    ethers.utils.parseEther("8"),
                    token.address,
                    true,
                    5,
                    10,
                    now
                )

                // withdraw more than possible (locked = 8, total = 10, withdraw = 3)
                await expect(
                    vesting.withdraw(
                        ethers.utils.parseEther("3"),
                        token.address
                    )
                ).to.be.revertedWith("Vesting: Can't withdraw")
            })
        })

        context("when excess tokens are held", async () => {
            it("withdraws to the owner", async () => {
                let now = Math.floor(new Date().getTime() / 1000)
                await token.transfer(
                    vesting.address,
                    ethers.utils.parseEther("10")
                )
                await vesting.vest(
                    accounts[1].address,
                    ethers.utils.parseEther("5"),
                    token.address,
                    true,
                    5,
                    10,
                    now
                )

                let ownerBalanceBefore = await token.balanceOf(
                    accounts[0].address
                )
                // withdraw all excess tokens
                await vesting.withdraw(
                    ethers.utils.parseEther("5"),
                    token.address
                )
                let ownerBalanceAfter = await token.balanceOf(
                    accounts[0].address
                )
                expect(ownerBalanceAfter).to.equal(
                    ownerBalanceBefore.add(ethers.utils.parseEther("5"))
                )
            })
        })
    })

    context("Calc distribution", async () => {
        context("when called before the start time", async () => {
            it("returns 0", async () => {
                let now = Math.floor(new Date().getTime() / 1000)
                let startTime = now + 1 * 24 * 60 * 60 // starts in a day
                let endTime = now + 10 * 24 * 60 * 60 // ends in 10 days
                let result = await vesting.calcDistribution(
                    ethers.utils.parseEther("1"),
                    now,
                    startTime,
                    endTime
                )
                expect(result).to.equal(0)
            })
        })

        context("when called between the start and end time", async () => {
            it("returns linearly", async () => {
                let now = Math.floor(new Date().getTime() / 1000)
                let startTime = now - 5 * 24 * 60 * 60 // started 5 days ago
                let endTime = now + 5 * 24 * 60 * 60 // ends in 5 days
                let result = await vesting.calcDistribution(
                    ethers.utils.parseEther("1"),
                    now,
                    startTime,
                    endTime
                )
                expect(result).to.equal(ethers.utils.parseEther("0.5"))
            })
        })

        context("when called after the end time", async () => {
            it("continues to return linearly", async () => {
                let now = Math.floor(new Date().getTime() / 1000)
                let startTime = now - 10 * 24 * 60 * 60 // started 10 days ago
                let endTime = now - 5 * 24 * 60 * 60 // ended 5 days ago
                let result = await vesting.calcDistribution(
                    ethers.utils.parseEther("1"),
                    now,
                    startTime,
                    endTime
                )
                expect(result).to.equal(ethers.utils.parseEther("2"))
            })
        })
    })
})
