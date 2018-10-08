const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const compiledBTCUtils = require('../build/BTCUtils.json');
const compiledBytes = require('../build/BytesLib.json');
const utils = require('./utils');
const linker = require('solc/linker');



describe('IntegralAuction', () => {

    describe('#constructor', async () => {
        it.skip('returns true on success', async () => { });
        it.skip('sets the manager address', async () => { });
    });

    describe('#isSeller', async () => {
        it.skip('returns true if address is seller', async () => { });
        it.skip('returns false if address is not seller', async () => { });
    });

    describe('#isBidder', async () => {
        it.skip('returns true if address is bidder', async () => { });
        it.skip('returns false if address is not bidder', async () => { });
    });

    describe('#openAuction', async () => {
        it.skip('returns true on success', async () => { });
        it.skip('adds a new auction to the auctions mapping', async () => { });
        it.skip('emits an AuctionActive event', async () => { });
        it.skip('errors if auction was not funded', async () => { });
        it.skip('errors if auction already exists', async () => { });
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
