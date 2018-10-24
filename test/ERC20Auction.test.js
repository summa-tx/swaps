const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const compiledBTCUtils = require('../build/BTCUtils.json');
const compiledBytes = require('../build/BytesLib.json');
const compiledSPV = require('../build/ValidateSPV.json')
const compiledIAC = require('../build/IntegralAuction20.json');
const compiledERC20 = require('../build/DummyERC20.json');
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

const constructERC20 = async () => {
    return await new web3.eth.Contract(JSON.parse(compiledERC20.interface))
        .deploy({ data: compiledERC20.bytecode})
        .send({ from: manager, gas: gas, gasPrice: gasPrice });
}

describe('IntegralAuction20', () => {
    let iac;
    let erc20;
    let addAucRes;
    let erc20address;

    before(async () => {
        accounts = await web3.eth.getAccounts();
        manager = accounts[0];
        seller = accounts[1];

        iac = await constructIAC();
        assert.ok(iac.options.address);

        erc20 = await constructERC20();
        assert.ok(erc20.options.address);
        erc20address = erc20.options.address;

        await iac.methods.open(constants.GOOD.PARTIAL_TX, 17, 100, erc20address, ETHER)
            .send({from: seller, gas: gas, gasPrice: gasPrice})
            .then(res => {
                addAucRes = res;
                aucId = res.events.AuctionActive.returnValues[0];
            });
    });

    describe('#open', async () => {

        it('fails with 0 value', async () => {
            await iac.methods.open(constants.GOOD.PARTIAL_TX, 17, 100, erc20address, 0)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('_value must be greater than 0') >= 1
                    );
                });
        });

        it('fails if transferFrom fails', async () => {
            await erc20.methods.setError(1)
                .send({from: seller, gas: gas, gasPrice: gasPrice});
            await iac.methods.open(constants.GOOD.PARTIAL_TX, 17, 100, erc20address, ETHER)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('transferFrom failed') >= 1
                    );
                });
            await erc20.methods.clearError()
                .send({from: seller, gas: gas, gasPrice: gasPrice});
        });

        it('does not burn ether', async () => {
            await iac.methods.open(constants.GOOD.PARTIAL_TX, 17, 100, erc20address, ETHER)
                .send({from: seller, value: ETHER, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('Do not burn ether here please') >= 1
                    );
                });
        });
    });

    describe('#claim', async () => {
        it('fails if manager transfer fails', async () => {
            await erc20.methods.setError(1)
                .send({from: seller, gas: gas, gasPrice: gasPrice});

            claimRes = await iac.methods.claim(constants.GOOD.OP_RETURN_TX, constants.GOOD.PROOF, constants.GOOD.PROOF_INDEX, constants.GOOD.HEADER_CHAIN)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('Manager transfer failed.') >= 1
                    );
                });

            await erc20.methods.clearError()
                .send({from: seller, gas: gas, gasPrice: gasPrice});
        });
        it('fails if bidder transfer fails', async () => {
            await erc20.methods.setError(2)
                .send({from: seller, gas: gas, gasPrice: gasPrice});

            claimRes = await iac.methods.claim(constants.GOOD.OP_RETURN_TX, constants.GOOD.PROOF, constants.GOOD.PROOF_INDEX, constants.GOOD.HEADER_CHAIN)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('Bidder transfer failed.') >= 1
                    );
                });

            await erc20.methods.clearError()
                .send({from: seller, gas: gas, gasPrice: gasPrice});
        });
    });
});
