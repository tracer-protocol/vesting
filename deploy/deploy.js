module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, execute } = deployments
    const { deployer } = await getNamedAccounts()

    const TRACER_DAO = "0xA84918F3280d488EB3369Cb713Ec53cE386b6cBa"
    
    // deploy the vesting contract
    await deploy("Vesting", {
        from: deployer,
        gasLimit: 4000000,
        logs: true
    })

    // transfer ownership to the DAO
    await execute(
        "Vesting",
        { from: deployer, logs: true },
        "transferOwnership",
        TRACER_DAO
    )
}
