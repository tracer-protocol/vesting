// Script to help with automated vesting
let parse = require("csv-parse").parse
let fs = require("fs");
const path = require('path');
const ethers = require("ethers")

// Parse: formats data correctly and outputs
const parser = parse({ delimiter: ',' }, function (err, data) {
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
                    'reciever': vestingData[5]
                }
            )
        }
    })
    console.log(formattedData)
    console.log(`Total tokens needed in vesting: ${tokenSum.toString()}`)

    
    
});

const vestingPath = path.join(__dirname, 'vesting_q2_2022.csv');
const csvFile = fs.createReadStream(vestingPath).pipe(parser);

