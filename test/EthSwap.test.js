/* global artifacts contract before describe it assert web3 */
const BN = require('bn.js');
const constants = require('./constants.js');

const StatelessSwapEth = artifacts.require('StatelessSwapEth');

const ETHER = new BN('1000000000000000000', 10);
const DIFF = new BN('7019199231177', 10);
const developerShare = new BN(ETHER.divn(400));
const bidderShare = new BN(ETHER.sub(developerShare));


contract('StatelessSwapEth', (accounts) => {
  const [developer, seller] = accounts;

  let iac;

  before(async () => {
    iac = await StatelessSwapEth.new(developer);
  });

  describe('stateful tests', async () => {
    describe('#open', async () => {
      it('errors if listing was not funded', async () => {
        try {
          await iac.open(
            constants.GOOD.PARTIAL_TX,
            DIFF,
            constants.ADDR0,
            ETHER,
            { from: seller, value: 0 }
          );
          assert(false);
        } catch (e) {
          assert.include(e.message, 'No asset received. Listing must be funded on initialization.');
        }
      });

      it('errors if asset is not address0', async () => {
        try {
          await iac.open(
            constants.GOOD.PARTIAL_TX,
            DIFF,
            developer,
            ETHER,
            { from: seller, value: 10 ** 18 }
          );
          assert(false);
        } catch (e) {
          assert.include(e.message, 'asset must be zero address for ether listings.');
        }
      });

      it('errors if value is not equal to message.value', async () => {
        try {
          await iac.open(
            constants.GOOD.PARTIAL_TX,
            DIFF,
            constants.ADDR0,
            ETHER,
            { from: seller, value: 10 ** 11 }
          );
          assert(false);
        } catch (e) {
          assert.include(e.message, 'value must equal msg.value');
        }
      });
    });

    describe('#claim', async () => {
      let developerStartBalance;
      let bidderStartBalance;

      before(async () => {
        await iac.open(
          constants.GOOD.PARTIAL_TX,
          DIFF,
          constants.ADDR0,
          ETHER,
          { from: seller, value: ETHER }
        );

        developerStartBalance = new BN(await web3.eth.getBalance(developer), 10);
        bidderStartBalance = new BN(await web3.eth.getBalance(constants.GOOD.BIDDER), 10);
      });

      it('returns on success', async () => {
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
        const developerBalance = new BN(await web3.eth.getBalance(developer), 10);
        assert(developerBalance.eq(developerStartBalance.add(developerShare)));
        const bidderBalance = new BN(await web3.eth.getBalance(constants.GOOD.BIDDER), 10);
        assert(bidderBalance.eq(bidderStartBalance.add(bidderShare)));
      });
    });
  });
});
