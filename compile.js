const path = require('path')
const solc = require('solc')
const fs = require('fs-extra')

// Path to compiled json contracts
const buildPath = path.resolve(__dirname, 'build')
fs.removeSync(buildPath)
fs.ensureDirSync(buildPath)

// Paths to solidity contracts
const SPVStorePath = path.resolve(__dirname, '../bitcoin-spv/contracts', 'SPVStore.sol')
const OMAuctionPath = path.resolve(__dirname, 'contracts', 'OMAuction.sol')

let input = {
    'SPVStore.sol': fs.readFileSync(SPVStorePath, 'utf8'),
    'OMAuction.sol': fs.readFileSync(OMAuctionPath, 'utf8')
}

const output = solc.compile({sources: input}, 1);

// log errors
if (output.errors) {
    console.log(output.errors);
}

// Save compiled contracts to json files
for (let contract in output.contracts) {
    contract_name = contract.split(':');
    fs.outputJsonSync(
        path.resolve(buildPath, contract_name[1] + '.json'),
        output.contracts[contract]
    )
}
