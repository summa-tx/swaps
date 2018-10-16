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
const PARTIAL_TX = '0x010000000001011746bd867400f3494b8f44c24b83e1aa58c4f0ff25b4a61cffeffd4bc0f9ba300000000000ffffffff'
const OP_RETURN_TX = '0x010000000001011746bd867400f3494b8f44c24b83e1aa58c4f0ff25b4a61cffeffd4bc0f9ba300000000000ffffffff024897070000000000220020a4333e5612ab1a1043b25755c89b16d55184a42f81799e623e6bc39db8539c180000000000000000166a14edb1b5c2f39af0fec151732585b1049b07895211024730440220276e0ec78028582054d86614c65bc4bf85ff5710b9d3a248ca28dd311eb2fa6802202ec950dd2a8c9435ff2d400cc45d7a4854ae085f49e05cc3f503834546d410de012103732783eef3af7e04d3af444430a629b16a9261e4025f52bf4d6d026299c37c7400000000'
const HEADER_CHAIN = '0x0000002073bd2184edd9c4fc76642ea6754ee40136970efc10c4190000000000000000000296ef123ea96da5cf695f22bf7d94be87d49db1ad7ac371ac43c4da4161c8c216349c5ba11928170d38782b00000020fe70e48339d6b17fbbf1340d245338f57336e97767cc240000000000000000005af53b865c27c6e9b5e5db4c3ea8e024f8329178a79ddb39f7727ea2fe6e6825d1349c5ba1192817e2d9515900000020baaea6746f4c16ccb7cd961655b636d39b5fe1519b8f15000000000000000000c63a8848a448a43c9e4402bd893f701cd11856e14cbbe026699e8fdc445b35a8d93c9c5ba1192817b945dc6c00000020f402c0b551b944665332466753f1eebb846a64ef24c71700000000000000000033fc68e070964e908d961cd11033896fa6c9b8b76f64a2db7ea928afa7e304257d3f9c5ba11928176164145d0000ff3f63d40efa46403afd71a254b54f2b495b7b0164991c2d22000000000000000000f046dc1b71560b7d0786cfbdb25ae320bd9644c98d5c7c77bf9df05cbe96212758419c5ba1192817a2bb2caa00000020e2d4f0edd5edd80bdcb880535443747c6b22b48fb6200d0000000000000000001d3799aa3eb8d18916f46bf2cf807cb89a9b1b4c56c3f2693711bf1064d9a32435429c5ba1192817752e49ae0000002022dba41dff28b337ee3463bf1ab1acf0e57443e0f7ab1d000000000000000000c3aadcc8def003ecbd1ba514592a18baddddcd3a287ccf74f584b04c5c10044e97479c5ba1192817c341f595'
const PROOF_INDEX = 282
const PROOF = '0x48e5a1a0e616d8fd92b4ef228c424e0c816799a256c6a90892195ccfc53300d6e35a0d6de94b656694589964a252957e4673a9fb1d2f8b4a92e3f0a7bb654fddb94e5a1e6d7f7f499fd1be5dd30a73bf5584bf137da5fdd77cc21aeb95b9e35788894be019284bd4fbed6dd6118ac2cb6d26bc4be4e423f55a3a48f2874d8d02a65d9c87d07de21d4dfe7b0a9f4a23cc9a58373e9e6931fefdb5afade5df54c91104048df1ee999240617984e18b6f931e2373673d0195b8c6987d7ff7650d5ce53bcec46e13ab4f2da1146a7fc621ee672f62bc22742486392d75e55e67b09960c3386a0b49e75f1723d6ab28ac9a2028a0c72866e2111d79d4817b88e17c821937847768d92837bae3832bb8e5a4ab4434b97e00a6c10182f211f592409068d6f5652400d9a3d1cc150a7fb692e874cc42d76bdafc842f2fe0f835a7c24d2d60c109b187d64571efbaa8047be85821f8e67e0e85f2f5894bc63d00c2ed9d640296ef123ea96da5cf695f22bf7d94be87d49db1ad7ac371ac43c4da4161c8c2'

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
        aucId = await iac.methods.open(PARTIAL_TX, 17, 100)
            .call({from: seller, value: 10 ** 18, gas: gas, gasPrice: gasPrice});
        addAucRes = await iac.methods.open(PARTIAL_TX, 17, 100)
            .send({from: seller, value: 10 ** 18, gas: gas, gasPrice: gasPrice});
    });

    describe('#constructor', async () =>
        it('sets the manager address', async () =>
            assert.equal(await iac.methods.manager().call(), manager)));

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

        it.skip('emits an AuctionActive event', async () => {
            // TODO
        });

        it('increments open positions', async () => {
            let res = await iac.methods.openPositions(seller).call();
            assert.equal(res, 1);
        });

        it('errors if auction was not funded', async () => {
            await iac.methods.open(PARTIAL_TX, 17, 100)
                .send({from: seller, value: 0, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.search('No asset received. Auction must be funded on initialization.') >= 1
                    );
                });
        });

        it('errors if auction already exists', async () => {
            await iac.methods.open(PARTIAL_TX, 17, 100)
                .send({from: seller, value: 10 ** 18, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.search('Auction exists.') >= 1
                    );
                });
        });
    });

    describe('#claim', async () => {
        it.skip('returns true on success', async () => { });
        it.skip('updates auction state to CLOSED', async () => { });
        it.skip('transfers fee to manager and emits Transfer event', async () => { });
        it.skip('transfers bidder share to bidder and emits Transfer event', async () => { });
        it.skip('emits AuctionClosed event', async () => { });
        it.skip('errors if auction state is not ACTIVE', async () => { });
        it.skip('errors if total difficulty sum is too low', async () => { });
        it.skip('errors if nInputs is not two', async () => { });
        it.skip('errors if nOutputs is less than three', async () => { });
        it.skip('errors if second output is not OP_RETURN', async () => { });
        it.skip('errors if OP_RETURN payload is not 20-bytes', async () => { });
    });

    describe('#checkHeaderChain', async () => {
        it('returns the total difficulty summation on success', async () => {
            let res = await iac.methods.checkHeaderChain(HEADER_CHAIN).call();
            assert.equal(res, 49134394618239);
        });

        it('errors if the byte array length is not divisible by 80', async () => {
            await iac.methods.checkHeaderChain(HEADER_CHAIN + 'ab')
                .send({from: seller, value: 0, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.search('Header chain not a multiple of 80 bytes') >= 1
                    );
                });
        });

        it('errors if the headers are not a chain', async () => {
            let bad_chain = '0x0000002073bd2184edd9c4fc76642ea6754ee40136970efc10c4190000000000000000000296ef123ea96da5cf695f22bf7d94be87d49db1ad7ac371ac43c4da4161c8c216349c5ba11928170d38782b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
            await iac.methods.checkHeaderChain(bad_chain)
                .send({from: seller, value: 0, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.search('Header prevBlock reference incorrect') >= 1
                    );
                });
        });

        it('errors if a header has insufficient work', async () => {
            let bad_chain = '0x1000002073bd2184edd9c4fc76642ea6754ee40136970efc10c4190000000000000000000296ef123ea96da5cf695f22bf7d94be87d49db1ad7ac371ac43c4da4161c8c216349c5ba11928170d38782b00000020fe70e48339d6b17fbbf1340d245338f57336e97767cc240000000000000000005af53b865c27c6e9b5e5db4c3ea8e024f8329178a79ddb39f7727ea2fe6e6825d1349c5ba1192817e2d95159'
            await iac.methods.checkHeaderChain(bad_chain)
                .send({from: seller, value: 0, gas: gas, gasPrice: gasPrice})
                .then(() => assert(false))
                .catch(e => {
                    assert(
                        e.message.search('Header does not meet its target') >= 1
                    );
                });
        });
    });

    describe('#allocateEther', async () => {
        it('returns allocated values', async () => {
            let res = await iac.methods.allocateEther(aucId).call();
            assert.equal(res[0], 10 ** 18 / 400);
            assert.equal(res[1], 10 ** 18 - res[0]);
        });
    });
});
