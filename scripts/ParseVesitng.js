const hre = require("hardhat");

// Script config
// The name of the vesting file to target
const vestingFilename = "vesting_q2_2022.csv"
// The target token (usually TCR)
const targetToken = "0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050"
// The vesting contract address
const vestingContractAddress = "0x57A81f7B72D2703ae7c533F3FB1CdEFa6B8f25F7"

// read in a properly formatted CSV file.
async function readCSV() {
    return new Promise((res, rej) => {
        let parse = require("csv-parse").parse
        let fs = require("fs");
        let path = require('path');

        const vestingPath = path.join(__dirname, vestingFilename);
        // Script to help with automated vesting
        // const csvFile = await fs.createReadStream(vestingPath).pipe(parser);

        const parser = parse({ delimiter: ',' }, function (err, data) {
            return data;
        });

        let fetchData = []
        fs.createReadStream(vestingPath)
            .pipe(parser)
            .on('data', (row) => {
                fetchData.push(row)
            })
            .on('end', () => {
                console.log('CSV file successfully processed');
                res(fetchData);
            })
            .on('error', (err) => {
                console.log(err)
                rej(err)
            });
    })
}

async function main() {
    console.log("Beginning Vesting Creation")
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // We get the contract to deploy
    const vesting = await hre.ethers.getContractAt("Vesting", vestingContractAddress)
    const token = await hre.ethers.getContractAt("SampleERC20", targetToken)
    // get amount of target token that is currently locked
    let vestingLockedBalance = await vesting.locked(targetToken)
    // get amount of target token in contract
    let vestingTotalBalance = await token.balanceOf(vestingContractAddress)

    // note: This will never be negative as the contract enforces this. If its negative we have issues.
    let availableTokens = vestingTotalBalance.sub(vestingLockedBalance)

    console.log(`Available tokens in contract: ${availableTokens}`)
    // const Greeter = await hre.ethers.getContractFactory("Greeter");
    // const greeter = await Greeter.deploy("Hello, Hardhat!");

    // await greeter.deployed();

    // console.log("Greeter deployed to:", greeter.address);

    // fetch data from csv
    let data = await readCSV()

    // format data correctly
    let formattedData = []
    let tokenSum = ethers.utils.parseEther("0")
    data.forEach((vestingData, index) => {
        if (index != 0) {
            // format token units correctly
            let tokenAmount = ethers.utils.parseEther(vestingData[1].toString().split(",").join(""))
            tokenSum = tokenSum.add(tokenAmount)
            // convert start date to unix timestamp
            let dateSplit = vestingData[4].split("/")
            let year = dateSplit[2]
            let month = dateSplit[1]
            let day = dateSplit[0]
            let startUnix = Math.floor(new Date(`${month}/${day}/${year}`).getTime() / 1000)
            formattedData.push(
                {
                    'token_address': vestingData[0],
                    'token_amount': tokenAmount.toString(),
                    'vesting_weeks': vestingData[2],
                    'cliff_weeks': vestingData[3],
                    'start_date': startUnix,
                    'reciever': ethers.utils.getAddress(vestingData[5].toString())
                }
            )
        }
    })

    // console.log(formattedData)
    console.log(`Total tokens needed: ${tokenSum.toString()}`)

    // calculate tokens that we need to transfer to the contract
    let tokenSurplus = availableTokens.sub(tokenSum)
    if (tokenSurplus.gt(ethers.utils.parseEther("0"))) {
        // positive surplus -> no need to transfer
        console.log("No transfer of tokens required")
    } else {
        let transferAmount = tokenSum.sub(availableTokens)
        console.log(`Transferring ${transferAmount.toString()} tokens to vesting`)
    }

    console.log("Vesting data generated")
    console.log(formattedData)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

