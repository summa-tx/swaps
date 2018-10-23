const path = require('path')
const solc = require('solc')
const fs = require('fs-extra')

// Path to compiled json contracts
const buildPath = path.resolve(__dirname, 'build')
fs.removeSync(buildPath)
fs.ensureDirSync(buildPath)

// Paths to solidity contracts
const SPVStorePath = path.resolve(__dirname, 'bitcoin-spv/contracts', 'SPVStore.sol')
const BTCUtilsPath = path.resolve(__dirname, 'bitcoin-spv/contracts', 'BTCUtils.sol')
const ValidateSPVPath = path.resolve(__dirname, 'bitcoin-spv/contracts', 'ValidateSPV.sol')
const BytesPath = path.resolve(__dirname, 'bitcoin-spv/contracts', 'BytesLib.sol')
const SafeMathPath = path.resolve(__dirname, 'bitcoin-spv/contracts', 'SafeMath.sol')
const WhitelistPath = path.resolve(__dirname, 'contracts', 'BringYourOwnWhitelist.sol')
const IntegralAuctionPath = path.resolve(__dirname, 'contracts', 'IntegralAuction.sol')
const Auction20Path = path.resolve(__dirname, 'contracts', 'IntegralAuction20.sol')
const Auction721Path = path.resolve(__dirname, 'contracts', 'IntegralAuction721.sol')
const AuctionETHPath = path.resolve(__dirname, 'contracts', 'IntegralAuctionETH.sol')
const IERC20Path = path.resolve(__dirname, 'contracts', 'IERC20.sol')
const IERC721Path = path.resolve(__dirname, 'contracts', 'IERC721.sol')
const AuctionDummyPath = path.resolve(__dirname, 'contracts', 'AuctionDummy.sol')

let input = {
    'SPVStore.sol': fs.readFileSync(SPVStorePath, 'utf8'),
    'BTCUtils.sol': fs.readFileSync(BTCUtilsPath, 'utf8'),
    'ValidateSPV.sol': fs.readFileSync(ValidateSPVPath, 'utf8'),
    'BytesLib.sol': fs.readFileSync(BytesPath, 'utf8'),
    'SafeMath.sol': fs.readFileSync(SafeMathPath, 'utf8'),
    'BringYourOwnWhitelist.sol': fs.readFileSync(WhitelistPath, 'utf8'),
    'IntegralAuction.sol': fs.readFileSync(IntegralAuctionPath, 'utf8'),
    'IntegralAuction20.sol': fs.readFileSync(Auction20Path, 'utf8'),
    'IntegralAuction721.sol': fs.readFileSync(Auction721Path, 'utf8'),
    'IntegralAuctionETH.sol': fs.readFileSync(AuctionETHPath, 'utf8'),
    'IERC20.sol': fs.readFileSync(IERC20Path, 'utf8'),
    'IERC721.sol': fs.readFileSync(IERC721Path, 'utf8'),
    'AuctionDummy.sol': fs.readFileSync(AuctionDummyPath, 'utf8'),
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
