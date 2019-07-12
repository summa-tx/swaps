const BN = require('bn.js');

const BytesLib = artifacts.require('BytesLib');
const BTCUtils = artifacts.require('BTCUtils');
const ValidateSPV = artifacts.require('ValidateSPV');
const IntegralAuction721 = artifacts.require('IntegralAuction721');
const DummyERC721 = artifacts.require('DummyERC721');

const utils = require('./utils');
const constants = require('./constants.js');

contract('IntegralAuction721', accounts => {
  const ETHER = new BN('1000000000000000000', 10);

  let manager;
  let seller;
  let whitelistTestAccount;

  let iac;
  let erc721;
  let erc721address;

  // before(async () => {
  //     accounts = await web3.eth.getAccounts();
  //     manager = accounts[0];
  //     seller = accounts[1];
  //
  //     iac = await constructIAC();
  //     assert.ok(iac.options.address);
  //
  //     erc721 = await constructERC721();
  //     assert.ok(erc721.options.address);
  //     erc721address = erc721.options.address;
  //
  //     await iac.open(constants.GOOD.PARTIAL_TX, 17, 100, erc721address, ETHER)
  //         .send({from: seller})
  //         .then(res => {
  //             addAucRes = res;
  //             aucId = res.events.AuctionActive.returnValues[0];
  //         });
  // });

  before(async () => {
    manager = accounts[0]
    seller = accounts[1];
    whitelistTestAccount = accounts[5];
    deployed = await utils.deploySystem([
      { name: 'BytesLib', contract: BytesLib },
      { name: 'BTCUtils', contract: BTCUtils },
      { name: 'ValidateSPV', contract: ValidateSPV },
      { name: 'IntegralAuction721', contract: IntegralAuction721, args: [manager] },
      { name: 'DummyERC721', contract: DummyERC721 }
    ]);
    iac = deployed.IntegralAuction721;
    erc721 = deployed.DummyERC721
    erc721address = erc721.address
  });

  describe('#open', async () => {

    it('fails if transferFrom fails', async () => {
      await erc721.setError(1);
      try {
        await iac.open(constants.GOOD.PARTIAL_TX, 17, 100, erc721address, ETHER, {from: seller});
        assert(false);
      } catch (e) {
        assert.include(e.message, 'Dummy revert');
      }
      erc721.clearError();
    });

    it('does not burn ether', async () => {
      try {
        await iac.open(constants.GOOD.PARTIAL_TX, 17, 100, erc721address, ETHER, {from: seller, value: ETHER});
        assert(false);
      } catch (e) {
        assert.include(e.message, 'Do not burn ether here please');
      }
    });
  });

  describe('#claim', async () => {
    before(async () => {
      await iac.open(constants.GOOD.PARTIAL_TX, 17, 100, erc721address, ETHER, {from: seller});
    });

    it('fails if manager transfer fails', async () => {
      await erc721.setError(1);

      try {
        claimRes = await iac.claim(constants.GOOD.OP_RETURN_TX, constants.GOOD.PROOF, constants.GOOD.PROOF_INDEX, constants.GOOD.HEADER_CHAIN, {from: seller});
        assert(false);
      } catch (e) {
        assert.include(e.message, 'Dummy revert');
      }
      await erc721.clearError();
    });
  });
});
