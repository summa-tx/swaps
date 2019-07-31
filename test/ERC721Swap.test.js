/* global artifacts contract before describe it assert */
const BN = require('bn.js');
const constants = require('./constants.js');

const StatelessSwap721 = artifacts.require('StatelessSwap721');
const DummyERC721 = artifacts.require('DummyERC721');

const ETHER = new BN('1000000000000000000', 10);
const DIFF = new BN('7019199231177', 10);

contract('StatelessSwap721', (accounts) => {
  const [developer, seller] = accounts;

  let iac;
  let erc721;
  let erc721address;

  before(async () => {
    iac = await StatelessSwap721.new(developer);
    erc721 = await DummyERC721.new();
    erc721address = erc721.address;
  });

  describe('stateful tests', async () => {
    describe('#open', async () => {
      it('fails if transferFrom fails', async () => {
        await erc721.setError(1);
        try {
          await iac.open(
            constants.GOOD.PARTIAL_TX,
            DIFF,
            erc721address,
            ETHER,
            { from: seller }
          );
          assert(false);
        } catch (e) {
          assert.include(e.message, 'Dummy revert');
        }
        erc721.clearError();
      });

      it('does not burn ether', async () => {
        try {
          await iac.open(
            constants.GOOD.PARTIAL_TX,
            DIFF,
            erc721address,
            ETHER,
            { from: seller, value: ETHER }
          );
          assert(false);
        } catch (e) {
          assert.include(e.message, 'Do not burn ether here please');
        }
      });
    });

    describe('#claim', async () => {
      before(async () => {
        await iac.open(
          constants.GOOD.PARTIAL_TX,
          DIFF,
          erc721address,
          ETHER,
          { from: seller }
        );
      });

      it('fails if bidder transfer fails', async () => {
        await erc721.setError(1);

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
          assert.include(e.message, 'Dummy revert');
        }
        await erc721.clearError();
      });

      it('works', async () => {
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
      });
    });
  });
});
