/* global artifacts contract before describe it assert web3 */
const BN = require('bn.js');

const BytesLib = artifacts.require('BytesLib');
const BTCUtils = artifacts.require('BTCUtils');
const ValidateSPV = artifacts.require('ValidateSPV');
const IntegralAuctionEth = artifacts.require('IntegralAuctionEth');

const utils = require('./utils');
const constants = require('./constants.js');

contract('IntegralAuctionEth', (accounts) => {
  const ETHER = new BN('1000000000000000000', 10);

  let manager;
  let seller;

  let iac;


  before(async () => {
    [manager, seller] = accounts;

    const deployed = await utils.deploySystem([
      { name: 'BytesLib', contract: BytesLib },
      { name: 'BTCUtils', contract: BTCUtils },
      { name: 'ValidateSPV', contract: ValidateSPV },
      { name: 'IntegralAuctionEth', contract: IntegralAuctionEth, args: [manager] },
    ]);
    iac = deployed.IntegralAuctionEth;
  });

  describe('#open', async () => {
    it('errors if auction was not funded', async () => {
      try {
        await iac.open(
          constants.GOOD.PARTIAL_TX,
          17,
          100,
          constants.ADDR0,
          ETHER,
          { from: seller, value: 0 }
        );
      } catch (e) {
        assert.include(e.message, 'No asset received. Auction must be funded on initialization.');
      }
    });

    it('errors if asset is not address0', async () => {
      try {
        await iac.open(
          constants.GOOD.PARTIAL_TX,
          17,
          100,
          manager,
          ETHER,
          { from: seller, value: 10 ** 18 }
        );
      } catch (e) {
        assert.include(e.message, 'asset must be zero address for ether auctions.');
      }
    });

    it('errors if value is not equal to message.value', async () => {
      try {
        await iac.open(
          constants.GOOD.PARTIAL_TX,
          17,
          100,
          constants.ADDR0,
          ETHER,
          { from: seller, value: 10 ** 11 }
        );
      } catch (e) {
        assert.include(e.message, 'value must equal msg.value');
      }
    });
  });

  describe('#claim', async () => {
    let bidderStartBalance;
    let managerStartBalance;

    before(async () => {
      await iac.open(
        constants.GOOD.PARTIAL_TX,
        17,
        100,
        constants.ADDR0,
        ETHER,
        { from: seller, value: 10 ** 18 }
      );
      managerStartBalance = new BN(await web3.eth.getBalance(manager), 10);
      bidderStartBalance = new BN(await web3.eth.getBalance(constants.GOOD.BIDDER), 10);
    });

    it('returns on success', async () => {
      await iac.addWhitelistEntries([constants.GOOD.BIDDER], { from: seller });
      await iac.claim(
        constants.GOOD.OP_RETURN_TX,
        constants.GOOD.PROOF,
        constants.GOOD.PROOF_INDEX,
        constants.GOOD.HEADER_CHAIN,
        { from: seller }
      );
    });

    it('transfers fee to manager', async () => {
      const managerBalance = new BN(await web3.eth.getBalance(manager), 10);
      const managerShare = new BN(ETHER.divn(400));
      assert(managerBalance.eq(managerStartBalance.add(managerShare)));
    });

    it('transfers bidder share to bidder', async () => {
      const bidderBalance = new BN(await web3.eth.getBalance(constants.GOOD.BIDDER), 10);
      const bidderShare = ETHER.sub(ETHER.divn(400));
      assert(bidderBalance.eq(bidderStartBalance.add(bidderShare)));
    });
  });
});
