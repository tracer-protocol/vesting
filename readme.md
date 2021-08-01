# Tracer Vesting
Repo containing vesting contracts for the Tracer DAO.

In order to start a vesting schedule for a user, the contract must first contain the asset that the DAO wishes to vest to that user.

The current contracts support
- multiple vesting schedules per use
- multi asset support
- linear vesting
- custom start, cliff and end dates
- multiVesting
- cancellable vesting schedules

## Setup
`yarn install`

## Testing
`yarn test`

## Deployment
First, edit the hardhat config to add
- a mnemonic for deployment
- URL endpoints for the networks you wish to deploy on

Next, to run the deployment, run
`yarn hardhat deploy --network <NETWORK> --tags Vesting`

If you wish to verify the source code on Etherscan, use the command
`yarn hardhat etherscan-verify --network <NETWORK> --api-key <API_KEY> --license "None" --force-license`

The use of `--license "None` and the `--force-license` flags are due to Etherscan not supporting the license GPL-3.0-only.