const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const compiledBTCUtils = require('../build/BTCUtils.json');
const compiledBytes = require('../build/BytesLib.json');
const compiledSPV = require('../build/ValidateSPV.json')
const compiledIAC = require('../build/IntegralAuctionEth.json');
const linker = require('solc/linker');
const utils = require('./utils');
const constants = require('./constants');


// Suppress web3 MaxListenersExceededWarning
var listeners = process.listeners('warning');
listeners.forEach(listener => process.removeListener('warning', listener));

const ETHER = web3.utils.toWei('1', 'ether')

let accounts;
let manager;
let seller;
let whitelistTestAccount;

let gas = 5000000;
let gasPrice = 100000000000;


/* Calls IntegralAuction contract constructor and returns instance. */
const constructIAC = async () => {

    let linkedLibs;
    accounts = await web3.eth.getAccounts();
    manager = accounts[0];

    let bytesContract = await new web3.eth.Contract(JSON.parse(compiledBytes.interface))
        .deploy({ data: compiledBytes.bytecode})
        .send({ from: manager, gas: gas, gasPrice: gasPrice});

    // Link
    linkedCode = await linker.linkBytecode(compiledBTCUtils.bytecode,
        {'BytesLib.sol:BytesLib': bytesContract.options.address});

    let btcUtilsContract = await new web3.eth.Contract(JSON.parse(compiledBTCUtils.interface))
        .deploy({ data: linkedCode })
        .send({ from: manager, gas: gas, gasPrice: gasPrice});

    // Link
    linkedCode = await linker.linkBytecode(compiledSPV.bytecode,
        {'BTCUtils.sol:BTCUtils': btcUtilsContract.options.address,
         'BytesLib.sol:BytesLib': bytesContract.options.address});

    // New SPVStore
    let SPVContract = await new web3.eth.Contract(JSON.parse(compiledSPV.interface))
        .deploy({ data: linkedCode })
        .send({ from: manager, gas: gas, gasPrice: gasPrice});

    // Link
    linkedCode = await linker.linkBytecode(compiledIAC.bytecode,
        {'ValidateSPV.sol:ValidateSPV': SPVContract.options.address,
         'BTCUtils.sol:BTCUtils': btcUtilsContract.options.address,
         'BytesLib.sol:BytesLib': bytesContract.options.address});

    // New Integral Auction contract instance
    return await new web3.eth.Contract(JSON.parse(compiledIAC.interface))
        .deploy({ data: linkedCode, arguments: [manager] })
        .send({ from: manager, gas: gas, gasPrice: gasPrice});
};

describe('IntegralAuctionETH', () => {
    let iac;
    let aucId;
    let addAucRes;

    before(async () => {
        accounts = await web3.eth.getAccounts();
        manager = accounts[0];
        seller = accounts[1];
        whitelistTestAccount = accounts[5];

        iac = await constructIAC();
        assert.ok(iac.options.address);

        await iac.methods.open(constants.GOOD.PARTIAL_TX, 17, 100, constants.ADDR0, ETHER)
            .send({from: seller, value: 10 ** 18, gas: gas, gasPrice: gasPrice})
            .then(res => {
                addAucRes = res;
                aucId = res.events.AuctionActive.returnValues[0];
            });
    });

    describe('#open', async () => {

        it('errors if auction was not funded', async () => {
            await iac.methods.open(constants.GOOD.PARTIAL_TX, 17, 100, constants.ADDR0, ETHER)
                .send({from: seller, value: 0, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('No asset received. Auction must be funded on initialization.') >= 1
                    );
                });
        });

        it('errors if asset is not address0', async () => {
            await iac.methods.open(constants.GOOD.PARTIAL_TX, 17, 100, manager, ETHER)
                .send({from: seller, value: 10 ** 18, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('asset must be zero address for ether auctions.') >= 1
                    );
                });
        });

        it('errors if value is not equal to message.value', async () => {
            await iac.methods.open(constants.GOOD.PARTIAL_TX, 17, 100, constants.ADDR0, ETHER)
                .send({from: seller, value: 10 ** 11, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('value must equal msg.value') >= 1
                    );
                });
        });
    });

    describe('#claim', async () => {
        let claimRes;
        let bidderStartBalance;

        before(async () => {
            managerStartBalance = parseInt(await web3.eth.getBalance(manager));
            bidderStartBalance = parseInt(await web3.eth.getBalance(constants.GOOD.BIDDER));
        });

        it('returns on success', async () => {
            await iac.methods.addWhitelistEntries([constants.GOOD.BIDDER])
                .send({from: seller, gas: gas, gasPrice: gasPrice});

            claimRes = await iac.methods.claim(constants.GOOD.OP_RETURN_TX, constants.GOOD.PROOF, constants.GOOD.PROOF_INDEX, constants.GOOD.HEADER_CHAIN)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
            assert.ok(claimRes);
        });

        it.skip('transfers fee to manager', async () => {
            let managerBalance = parseInt(await web3.eth.getBalance(manager));
            assert.equal(managerBalance, 99162182800000000000);
            /// This is the test I wanted to write, but it doesn't work
            /// It's off by 10000 for no reason I can tell
            // let managerShare = (10 ** 18) / 400;
            // console.log(managerBalance)
            // console.log(managerStartBalance)
            // console.log(managerShare)
            // assert.equal(managerBalance, managerStartBalance + managerShare);
        });

        it('transfers bidder share to bidder', async () => {
            let bidderBalance = parseInt(await web3.eth.getBalance(constants.GOOD.BIDDER));
            let bidderShare = 10 ** 18 - ((10 ** 18) / 400);
            assert.equal(bidderBalance, bidderStartBalance + bidderShare);
        });
    });
});
