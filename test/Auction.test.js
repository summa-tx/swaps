/* global artifacts contract before describe it assert web3 */

const BN = require('bn.js');
const constants = require('./constants.js');

const DummyAuction = artifacts.require('DummyAuction');


const ETHER = new BN('1000000000000000000', 10);
const DIFF = new BN('7019199231177', 10);

contract('IntegralAuction', (accounts) => {
  let iac;
  let developer;
  let seller;

  let aucId;

  before(async () => {
    [developer, seller] = accounts;
    iac = await DummyAuction.new(developer);
  });

  describe('#constructor', async () => {
    it('sets the developer address', async () => {
      assert.equal(await iac.developer.call(), developer);
    });
  });

  describe('stateful tests', async () => {
    describe('#open', async () => {
      it('opens a new listing and emits an event', async () => {
        const blockNumber = await web3.eth.getBlock('latest').number;

        await iac.open(
          constants.GOOD.PARTIAL_TX,
          DIFF.addn(1),
          constants.ADDR0,
          ETHER,
          { from: seller, value: 10 ** 18 }
        );

        const eventList = await iac.getPastEvents(
          'AuctionActive',
          { fromBlock: blockNumber, toBlock: 'latest' }
        );
        /* eslint-disable no-underscore-dangle */
        aucId = eventList[0].returnValues._auctionId;
        assert.equal(eventList[0].returnValues._seller, seller);
        /* eslint-enable no-underscore-dangle */
      });

      it('returns the txid on success', async () => {
        assert.equal(aucId, '0x9ff0076d904f8a7125b063f44995fe0d94f05ba759c435fbeb0f0936fb876432');
      });

      it('adds a new auction to the auctions mapping', async () => {
        const res = await iac.auctions.call(aucId);
        assert(res[0].eqn(1)); // state
        assert(res[1].eq(ETHER)); // ethValue
      });

      it('errors if auction already exists', async () => {
        try {
          await iac.open(
            constants.GOOD.PARTIAL_TX,
            100,
            constants.ADDR0,
            ETHER,
            { from: seller, value: 10 ** 18 }
          );
          assert(false);
        } catch (e) {
          assert.include(e.message, 'Auction exists.');
        }
      });
    });

    describe('#claim', async () => {
      it('errors if total difficulty sum is too low', async () => {
        try {
          await iac.claim(
            constants.GOOD.PROOF,
            constants.GOOD.PROOF_INDEX,
            constants.GOOD.VERSION,
            constants.GOOD.VIN,
            constants.GOOD.VOUT,
            constants.GOOD.LOCKTIME,
            constants.GOOD.HEADER_CHAIN.substring(0, 162),
            { from: seller }
          );
          assert(false);
        } catch (e) {
          assert.include(e.message, 'Not enough difficulty in header chain.');
        }
      });

      it('returns on success and emits AuctionClosed', async () => {
        const blockNumber = await web3.eth.getBlock('latest').number;

        await iac.claim(
          constants.GOOD.PROOF,
          constants.GOOD.PROOF_INDEX,
          constants.GOOD.VERSION,
          constants.GOOD.VIN,
          constants.GOOD.VOUT,
          constants.GOOD.LOCKTIME,
          constants.GOOD.HEADER_CHAIN,
          { from: seller }
        );

        const eventList = await iac.getPastEvents(
          'AuctionClosed',
          { fromBlock: blockNumber, toBlock: 'latest' }
        );
        /* eslint-disable-next-line no-underscore-dangle */
        assert.equal(eventList[0].returnValues._auctionId, aucId);
      });

      it('updates auction state to CLOSED', async () => {
        const res = await iac.auctions.call(aucId);
        assert(res[0].eqn(2));
      });

      it('errors if auction state is not ACTIVE', async () => {
        try {
          await iac.claim(
            constants.GOOD.PROOF,
            constants.GOOD.PROOF_INDEX,
            constants.GOOD.VERSION,
            constants.GOOD.VIN,
            constants.GOOD.VOUT,
            constants.GOOD.LOCKTIME,
            constants.GOOD.HEADER_CHAIN,
            { from: seller }
          );
          assert(false);
        } catch (e) {
          assert.include(e.message, 'Auction has closed or does not exist.');
        }
      });

      it('defauls to the seller when bidder address parsing fails', async () => {
        const blockNumber = await web3.eth.getBlock('latest').number;
        await iac.open(
          constants.FEW_OUTPUTS.PARTIAL_TX,
          0,
          constants.ADDR0,
          ETHER,
          { from: seller, value: 10 ** 18 }
        );
        await iac.claim(
          constants.FEW_OUTPUTS.PROOF,
          constants.FEW_OUTPUTS.PROOF_INDEX,
          constants.FEW_OUTPUTS.VERSION,
          constants.FEW_OUTPUTS.VIN,
          constants.FEW_OUTPUTS.VOUT,
          constants.FEW_OUTPUTS.LOCKTIME,
          constants.FEW_OUTPUTS.HEADER_CHAIN,
          { from: seller }
        );
        const eventList = await iac.getPastEvents(
          'AuctionClosed',
          { fromBlock: blockNumber, toBlock: 'latest' }
        );
        /* eslint-disable-next-line no-underscore-dangle */
        assert.equal(eventList[0].returnValues._bidder, seller);
      });
    });
  });

  describe('#allocate', async () => {
    it('returns allocated values', async () => {
      const res = await iac.allocate.call(ETHER);
      assert(res[0].eq(ETHER.divn(400)));
      assert(res[1].eq(ETHER.sub(res[0])));
    });
  });

  describe('#extractBidder', async () => {
    it('extracts the bidder from the op_return in the 2nd output', async () => {
      const res = await iac.extractBidder(constants.GOOD.VOUT);
      assert.equal(res, constants.GOOD.BIDDER);
    });

    it('returns address(0) if there is only 1 output', async () => {
      const res = await iac.extractBidder(constants.FEW_OUTPUTS.VOUT);
      assert.equal(res, constants.ADDR0);
    });
    it('returns address(0) if the 2nd output is not an opreturn', async () => {
      const res = await iac.extractBidder(constants.OP_RETURN_WRONG.VOUT);
      assert.equal(res, constants.ADDR0);
    });
  });

  describe('#makeAllChecks', async () => {
    it('returns the difficutly', async () => {
      const res = await iac.makeAllChecks(
        constants.GOOD.PROOF,
        constants.GOOD.PROOF_INDEX,
        constants.GOOD.VERSION,
        constants.GOOD.VIN,
        constants.GOOD.VOUT,
        constants.GOOD.LOCKTIME,
        constants.GOOD.HEADER_CHAIN
      );
      assert(res.eq(DIFF.muln(7)));
    });
  });

  describe('#checkTx', async () => {
    it('validates the vin', async () => {
      try {
        await iac.checkTx(
          constants.GOOD.VERSION,
          '0xFF',
          constants.GOOD.VOUT,
          constants.GOOD.LOCKTIME
        );
        assert(false);
      } catch (e) {
        assert.include(e.message, 'vin is malformed');
      }
    });

    it('validates the vin', async () => {
      try {
        await iac.checkTx(
          constants.GOOD.VERSION,
          constants.GOOD.VIN,
          '0xFF',
          constants.GOOD.LOCKTIME
        );
        assert(false);
      } catch (e) {
        assert.include(e.message, 'vout is malformed');
      }
    });

    it('returns the txid', async () => {
      const res = await iac.checkTx(
        constants.GOOD.VERSION,
        constants.GOOD.VIN,
        constants.GOOD.VOUT,
        constants.GOOD.LOCKTIME
      );
      assert.equal(res, constants.GOOD.TX_ID_LE);
    });
  });

  describe('#checkHeaders', async () => {
    it('errors if the header array length is not a multiple of 80', async () => {
      try {
        await iac.checkHeaders('0xFF');
        assert(false);
      } catch (e) {
        assert.include(e.message, 'Header bytes not multiple of 80.');
      }
    });
    it('errors if the headers are not a valid chain', async () => {
      try {
        const badChain = `${constants.GOOD.HEADER_CHAIN.substring(0, 162)}${'00'.repeat(160)}`;
        await iac.checkHeaders(badChain);
        assert(false);
      } catch (e) {
        assert.include(e.message, 'Header bytes not a valid chain.');
      }
    });
    it('errors if the headers do not meet the difficulty target', async () => {
      try {
        // Change the last byte to make its work low
        const badChain = `${constants.GOOD.HEADER_CHAIN.substring(0, 320)}${'ff'}`;
        await iac.checkHeaders(badChain);
        assert(false);
      } catch (e) {
        assert.include(e.message, 'Header does not meet its own difficulty target.');
      }
    });
    it('returns diff and merkle root', async () => {
      const res = await iac.checkHeaders(constants.GOOD.HEADER_CHAIN);
      assert(res[0].eq(DIFF.muln(7)));
      assert.equal(res[1], constants.GOOD.MERKLE_ROOT);
    });
  });

  describe('#checkProof', async () => {
    it('errors on a bad proof', async () => {
      try {
        await iac.checkProof(
          constants.GOOD.TX_ID_LE,
          constants.GOOD.MERKLE_ROOT,
          constants.GOOD.PROOF,
          3
        );
        assert(false);
      } catch (e) {
        assert.include(e.message, 'Bad inclusion proof');
      }
    });

    it('validates proofs successfully', async () => {
      const res = await iac.checkProof(
        constants.GOOD.TX_ID_LE,
        constants.GOOD.MERKLE_ROOT,
        constants.GOOD.PROOF,
        constants.GOOD.PROOF_INDEX
      );
      assert.isTrue(res);
    });
  });
});
