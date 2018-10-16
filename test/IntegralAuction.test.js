const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const compiledBTCUtils = require('../build/BTCUtils.json');
const compiledBytes = require('../build/BytesLib.json');
const compiledIAC = require('../build/IntegralAuction.json');
const utils = require('./utils');
const linker = require('solc/linker');


// Suppress web3 MaxListenersExceededWarning
var listeners = process.listeners('warning');
listeners.forEach(listener => process.removeListener('warning', listener));

let accounts;
let manager;
let seller;
let bidder;

let gas = 5000000;
let gasPrice = 100000000000;
let partialTx = '0x01000000000101abababababababababababababababababababababababababababababababab01000000'

/* Calls Cancellable Warrant contract constructor and returns instance. */
const constructIAC = async () => {

    let linkedLibs;
    accounts = await web3.eth.getAccounts();
    manager = accounts[0];
    seller = accounts[1];
    bidder = accounts[2];

    let bytesContract = await new web3.eth.Contract(JSON.parse(compiledBytes.interface))
        .deploy({ data: compiledBytes.bytecode})
        .send({ from: manager, gas: gas, gasPrice: gasPrice});

    // Link
    linkedLibs = await linker.linkBytecode(compiledBTCUtils.bytecode,
        {'BytesLib.sol:BytesLib': bytesContract.options.address});

    let btcUtilsContract = await new web3.eth.Contract(JSON.parse(compiledBTCUtils.interface))
        .deploy({ data: linkedLibs })
        .send({ from: manager, gas: gas, gasPrice: gasPrice});

    // Link
    linkedLibs = await linker.linkBytecode(compiledIAC.bytecode,
        {'BTCUtils.sol:BTCUtils': btcUtilsContract.options.address,
            'BytesLib.sol:BytesLib': bytesContract.options.address});

    // New Integral Auction contract instance
    return await new web3.eth.Contract(JSON.parse(compiledIAC.interface))
        .deploy({ data: linkedLibs, arguments: [manager] })
        .send({ from: manager, gas: gas, gasPrice: gasPrice });
};

describe('IntegralAuction', () => {
    let iac;
    let aucId;
    let addAucRes;

    before(async () => {
        accounts = await web3.eth.getAccounts();
        manager = accounts[0];
        seller = accounts[1];
        bidder = accounts[2];

        iac = await constructIAC();
        assert.ok(iac.options.address);

        // dirty hacks
        aucId = await iac.methods.openAuction(partialTx, 17, 100)
            .call({from: accounts[1], value: 10 ** 18, gas: gas, gasPrice: gasPrice});
        addAucRes = await iac.methods.openAuction(partialTx, 17, 100)
            .send({from: accounts[1], value: 10 ** 18, gas: gas, gasPrice: gasPrice});
    });

    describe('#constructor', async () =>
        it('sets the manager address', async () =>
            assert.equal(await iac.methods.manager().call(), manager)));

    describe('#openAuction', async () => {

        it('returns the txid on success', async () =>
        {
            assert.equal(aucId, '0xf3a3f5b287088af26969112b1710edc7d1c69d41c845760161b77cd026332ca3');
        });

        it('adds a new auction to the auctions mapping', async () => {
            let res = await iac.methods.auctions(aucId).call();
            assert.equal(res[0], 1);  // state
            assert.equal(res[1], 10 ** 18);  // ethValue
        });

        it.skip('emits an AuctionActive event', async () => { });

        it('increments open positions', async () => {
            let res = await iac.methods.openPositions(seller).call();
            assert.equal(res, 1);
        });

        it('errors if auction was not funded', async () => {
            utils.expectThrow(
                iac.methods.openAuction(partialTx, 17, 100)
                .send({from: accounts[1], value: 0, gas: gas, gasPrice: gasPrice})
            );
        });

        it('errors if auction already exists', async () => {
            utils.expectThrow(
                iac.methods.openAuction(partialTx, 17, 100)
                    .send({from: accounts[1], value: 10 ** 18, gas: gas, gasPrice: gasPrice})
            );
        });
    });

    describe('#claim', async () => {
        it.skip('returns true on success', async () => { });
        it.skip('updates auction state to CLOSED', async () => { });
        it.skip('emits AuctionClosed event', async () => { });
        it.skip('errors if auction state is not ACTIVE', async () => { });
        it.skip('errors if total difficulty sum is too low', async () => { });
        it.skip('errors if nInputs is not two', async () => { });
        it.skip('errors if nOutputs is less than three', async () => { });
        it.skip('errors if second output is not OP_RETURN', async () => { });
        it.skip('errors if OP_RETURN payload is not 20-bytes', async () => { });
    });

    describe('#sumDifficulty', async () => {
        it.skip('returns the total difficulty summation on success', async () => { });
        it.skip('errors if hears byte array length is not divisible by 20', async () => { });
    });

    describe('#_distributeShares', async () => {
        it.skip('returns true on success', async () => { });
        it.skip('transfers fee to manager and emits Transfer event', async () => { });
        it.skip('transfers bidder share to bidder and emits Transfer event', async () => { });
    });

    describe('#_addrFromByts', async () => {
        it.skip('returns address on success', async () => { });
        it.skip('transfers fee to manager and emits Transfer event', async () => { });
        it.skip('transfers bidder share to bidder and emits Transfer event', async () => { });
    });
});
