import { BigNumber } from "ethers"
import { ethers } from "hardhat"

export const weiToEth = (bigNumber: BigNumber): number => {
    return Number(ethers.utils.formatEther(bigNumber))
}

export const ethToWei = (amount: number): BigNumber => {
    return ethers.utils.parseEther(amount.toString())
}

export const skipTwoDays = async (): Promise<void> => {
    await skipTime(2* 24 * 60 * 60)
}

export const skipTime = async (seconds: number): Promise<void> => {
    await ethers.provider.send('evm_increaseTime', [seconds]);
    await ethers.provider.send('evm_mine', [])
}
