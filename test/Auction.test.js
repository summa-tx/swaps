const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const compiledBTCUtils = require('../build/BTCUtils.json');
const compiledBytes = require('../build/BytesLib.json');
const compiledSPV = require('../build/ValidateSPV.json')
const compiledIAC = require('../build/AuctionDummy.json');
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

describe('IntegralAuction', () => {
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

    describe('#constructor', async () => {
        it('sets the manager address', async () => {
            assert.equal(await iac.methods.manager().call(), manager);
        });
    });


    describe('#allocate', async () => {
        it('returns allocated values', async () => {
            let res = await iac.methods.allocate(aucId).call();
            assert.equal(res[0], 10 ** 18 / 400);
            assert.equal(res[1], 10 ** 18 - res[0]);
        });
    });

    describe('#addWhitelistEntries', async () => {

        let addRes;

        it('updates whitelistExists on creation', async () => {
            let res = await iac.methods.whitelistExists(whitelistTestAccount).call();
            assert(res === false);
            addRes = await iac.methods.addWhitelistEntries([whitelistTestAccount])
                .send({from: whitelistTestAccount, gas: gas, gasPrice: gasPrice});
            res = await iac.methods.whitelistExists(whitelistTestAccount).call();
            assert.ok(res);
        });

        it('adds entries to the whitelist', async () => {
            await iac.methods.addWhitelistEntries([constants.GOOD.BIDDER, seller, whitelistTestAccount])
                .send({from: whitelistTestAccount, gas: gas, gasPrice: gasPrice});
            let res = await iac.methods.checkWhitelist(whitelistTestAccount, constants.GOOD.BIDDER).call();
            assert.ok(res);
            res = await iac.methods.checkWhitelist(whitelistTestAccount, seller).call();
            assert.ok(res);
            res = await iac.methods.checkWhitelist(whitelistTestAccount, whitelistTestAccount).call();
            assert.ok(res);
        });

        it('emits an added event', async () => {
            assert.ok(addRes.events.AddedWhitelistEntries);
        });
    });

    describe('#removeWhitelistEntires', async () => {

        let removeRes;

        it('removes entries from the whitelist', async () => {
            // Add entries and check they exist
            await iac.methods.addWhitelistEntries([constants.GOOD.BIDDER, seller])
                .send({from: whitelistTestAccount, gas: gas, gasPrice: gasPrice});
            let res = await iac.methods.checkWhitelist(whitelistTestAccount, constants.GOOD.BIDDER).call();
            assert.ok(res);
            res = await iac.methods.checkWhitelist(whitelistTestAccount, seller).call();
            assert.ok(res);

            // Now remove them
            removeRes = await iac.methods.removeWhitelistEntries([constants.GOOD.BIDDER, seller])
                .send({from: whitelistTestAccount, gas: gas, gasPrice: gasPrice});
            res = await iac.methods.checkWhitelist(whitelistTestAccount, constants.GOOD.BIDDER).call();
            assert(res === false);
            res = await iac.methods.checkWhitelist(whitelistTestAccount, seller).call();
            assert(res === false);
        });

        it('emits a removed event', async () => {
            assert.ok(removeRes.events.RemovedWhitelistEntries);
        });
    });

    describe('#checkWhitelist', async () => {
        // This function is pretty thoroughly checked in removeWhitelistEntries
        it('returns true if a whitelist has not been created', async () => {
            let res = await iac.methods.checkWhitelist(accounts[7], accounts[8]).call();
            assert.ok(res);
        });
    });

    describe('#open', async () => {

        it('returns the txid on success', async () =>
        {
            assert.equal(aucId, '0x9ff0076d904f8a7125b063f44995fe0d94f05ba759c435fbeb0f0936fb876432');
        });

        it('adds a new auction to the auctions mapping', async () => {
            let res = await iac.methods.auctions(aucId).call();
            assert.equal(res[0], 1);  // state
            assert.equal(res[1], 10 ** 18);  // ethValue
        });

        it('emits an AuctionActive event', async () => {
            assert.ok(addAucRes.events.AuctionActive);
        });

        it('increments open positions', async () => {
            let res = await iac.methods.openPositions(seller).call();
            assert.equal(res, 1);
        });

        it('errors if auction already exists', async () => {
            await iac.methods.open(constants.GOOD.PARTIAL_TX, 17, 100, constants.ADDR0, ETHER)
                .send({from: seller, value: 10 ** 18, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('Auction exists.') >= 1
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

        it('errors if a whitelist exists and the bidder is not whitelisted', async () => {
            await iac.methods.addWhitelistEntries([seller])
                .send({from: seller, gas: gas, gasPrice: gasPrice});

            await iac.methods.claim(constants.GOOD.OP_RETURN_TX, constants.GOOD.PROOF, constants.GOOD.PROOF_INDEX, constants.GOOD.HEADER_CHAIN)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('Bidder is not whitelisted.') >= 1
                    );
                });
        });

        it('returns on success', async () => {
            await iac.methods.addWhitelistEntries([constants.GOOD.BIDDER])
                .send({from: seller, gas: gas, gasPrice: gasPrice});

            claimRes = await iac.methods.claim(constants.GOOD.OP_RETURN_TX, constants.GOOD.PROOF, constants.GOOD.PROOF_INDEX, constants.GOOD.HEADER_CHAIN)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
            assert.ok(claimRes);
        });

        it('updates auction state to CLOSED', async () => {
            let res = await iac.methods.auctions(aucId).call();
            assert.equal(res[0], 2);
        });

        it('emits AuctionClosed event', async () => {
            assert.ok(claimRes.events.AuctionClosed);
        });

        it('errors if auction state is not ACTIVE', async () => {
            await iac.methods.claim(constants.GOOD.OP_RETURN_TX, constants.GOOD.PROOF, constants.GOOD.PROOF_INDEX, constants.GOOD.HEADER_CHAIN)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.indexOf('Auction has closed or does not exist.') >= 1
                    );
                });
        });

        it('errors if total difficulty sum is too low', async () => {
            await iac.methods.open(constants.WORK_TOO_LOW.PARTIAL_TX, 17, 100, constants.ADDR0, ETHER)
                .send({from: seller, value: 10 ** 18, gas: gas, gasPrice: gasPrice});

            await iac.methods.claim(constants.WORK_TOO_LOW.OP_RETURN_TX, constants.WORK_TOO_LOW.PROOF, constants.WORK_TOO_LOW.PROOF_INDEX, constants.WORK_TOO_LOW.HEADER_CHAIN)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
                .then(() => {assert(false)})
                .catch(e => {
                    assert(
                        e.message.indexOf('Not enough difficulty in header chain.') >= 1
                    );
                });
        });

        it('errors if nOutputs is less than two', async () => {
            await iac.methods.open(constants.FEW_OUTPUTS.PARTIAL_TX, 17, 0, constants.ADDR0, ETHER)
                .send({from: seller, value: 10 ** 18, gas: gas, gasPrice: gasPrice});

            await iac.methods.claim(constants.FEW_OUTPUTS.OP_RETURN_TX, constants.FEW_OUTPUTS.PROOF, constants.FEW_OUTPUTS.PROOF_INDEX, constants.FEW_OUTPUTS.HEADER_CHAIN)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
                .then(() => {assert(false)})
                .catch(e => {
                    assert(
                        e.message.indexOf('Must have at least 2 TxOuts') >= 1
                    );
                });
        });
        it('errors if second output is not OP_RETURN', async () => {
            await iac.methods.open(constants.OP_RETURN_WRONG.PARTIAL_TX, 17, 0, constants.ADDR0, ETHER)
                .send({from: seller, value: 10 ** 18, gas: gas, gasPrice: gasPrice});

            await iac.methods.claim(constants.OP_RETURN_WRONG.OP_RETURN_TX, constants.OP_RETURN_WRONG.PROOF, constants.OP_RETURN_WRONG.PROOF_INDEX, constants.OP_RETURN_WRONG.HEADER_CHAIN)
                .send({from: seller, gas: gas, gasPrice: gasPrice})
                .then(() => {
                    assert(false)
                })
                .catch(e => {
                    assert(
                        e.message.indexOf('Not an OP_RETURN output') >= 1
                    );
                });
        });
    });
});
