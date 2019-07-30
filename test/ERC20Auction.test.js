/* global artifacts contract before describe it assert */

const BN = require('bn.js');
const constants = require('./constants.js');

const IntegralAuction20 = artifacts.require('IntegralAuction20');
const DummyERC20 = artifacts.require('DummyERC20');

const ETHER = new BN('1000000000000000000', 10);
const DIFF = new BN('7019199231177', 10);
const developerShare = new BN(ETHER.divn(400));
const bidderShare = new BN(ETHER.sub(developerShare));

contract('IntegralAuction20', (accounts) => {
  const [developer, seller] = accounts;

  let iac;
  let erc20;
  let erc20address;

  before(async () => {
    iac = await IntegralAuction20.new(developer);
    erc20 = await DummyERC20.new();
    erc20address = erc20.address;
  });


  describe('stateful tests', async () => {
    describe('#open', async () => {
      it('fails with 0 value', async () => {
        try {
          await iac.open(constants.GOOD.PARTIAL_TX, DIFF, erc20address, 0, { from: seller });
          assert(false);
        } catch (e) {
          assert.include(e.message, '_value must be greater than 0');
        }
      });

      it('fails if transferFrom fails', async () => {
        await erc20.setError(1);
        try {
          await iac.open(constants.GOOD.PARTIAL_TX, DIFF, erc20address, ETHER, { from: seller });
          assert(false);
        } catch (e) {
          assert.include(e.message, 'transferFrom failed');
        }
        await erc20.clearError();
      });

      it('does not burn ether', async () => {
        try {
          await iac.open(
            constants.GOOD.PARTIAL_TX,
            DIFF,
            erc20address,
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
        await iac.open(constants.GOOD.PARTIAL_TX, DIFF, erc20address, ETHER, { from: seller });
      });

      it('fails if developer transfer fails', async () => {
        await erc20.setError(1);
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
          assert.include(e.message, 'Developer transfer failed.');
        }
        await erc20.clearError();
      });

      it('fails if bidder transfer fails', async () => {
        await erc20.setError(2);
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
          assert.include(e.message, 'Bidder transfer failed.');
        }
        await erc20.clearError();
      });

      it('succeeds, and transfers shares to developer and bidder', async () => {
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
        const developerBalance = new BN(await erc20.balanceOf.call(developer), 10);
        assert(developerBalance.eq(developerShare));

        const bidderBalance = new BN(await erc20.balanceOf.call(constants.GOOD.BIDDER), 10);
        assert(bidderBalance.eq(bidderShare));
      });
    });
  });
});
