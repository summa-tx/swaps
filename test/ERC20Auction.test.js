/* global artifacts contract before describe it assert */

const BN = require('bn.js');

const BytesLib = artifacts.require('BytesLib');
const BTCUtils = artifacts.require('BTCUtils');
const ValidateSPV = artifacts.require('ValidateSPV');
const IntegralAuction20 = artifacts.require('IntegralAuction20');
const DummyERC20 = artifacts.require('DummyERC20');

const utils = require('./utils');
const constants = require('./constants.js');

contract('IntegralAuction20', (accounts) => {
  const ETHER = new BN('1000000000000000000', 10);

  let manager;
  let seller;

  let iac;
  let erc20;
  let erc20address;

  before(async () => {
    [manager, seller] = accounts;

    const deployed = await utils.deploySystem([
      { name: 'BytesLib', contract: BytesLib },
      { name: 'BTCUtils', contract: BTCUtils },
      { name: 'ValidateSPV', contract: ValidateSPV },
      { name: 'IntegralAuction20', contract: IntegralAuction20, args: [manager] },
      { name: 'DummyERC20', contract: DummyERC20 },
    ]);
    iac = deployed.IntegralAuction20;
    erc20 = deployed.DummyERC20;
    erc20address = erc20.address;
  });


  describe('#open', async () => {
    it('fails with 0 value', async () => {
      try {
        await iac.open(constants.GOOD.PARTIAL_TX, 17, 100, erc20address, 0, { from: seller });
        assert(false);
      } catch (e) {
        assert.include(e.message, '_value must be greater than 0');
      }
    });

    it('fails if transferFrom fails', async () => {
      await erc20.setError(1);
      try {
        await iac.open(constants.GOOD.PARTIAL_TX, 17, 100, erc20address, ETHER, { from: seller });
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
          17,
          100,
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
      await iac.open(constants.GOOD.PARTIAL_TX, 17, 100, erc20address, ETHER, { from: seller });
    });

    it('fails if manager transfer fails', async () => {
      await erc20.setError(1);
      try {
        await iac.claim(
          constants.GOOD.OP_RETURN_TX,
          constants.GOOD.PROOF,
          constants.GOOD.PROOF_INDEX,
          constants.GOOD.HEADER_CHAIN,
          { from: seller }
        );
        assert(false);
      } catch (e) {
        assert.include(e.message, 'Manager transfer failed.');
      }
      await erc20.clearError();
    });

    it('fails if bidder transfer fails', async () => {
      await erc20.setError(2);
      try {
        await iac.claim(
          constants.GOOD.OP_RETURN_TX,
          constants.GOOD.PROOF,
          constants.GOOD.PROOF_INDEX,
          constants.GOOD.HEADER_CHAIN,
          { from: seller }
        );
        assert(false);
      } catch (e) {
        assert.include(e.message, 'Bidder transfer failed.');
      }
      await erc20.clearError();
    });
  });
});
