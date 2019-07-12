const BN = require('bn.js');

const BytesLib = artifacts.require('BytesLib');
const BTCUtils = artifacts.require('BTCUtils');
const ValidateSPV = artifacts.require('ValidateSPV');
const DummyAuction = artifacts.require('DummyAuction');

const utils = require('./utils');
const constants = require('./constants.js');


contract('IntegralAuction', (accounts) => {
  const ETHER = new BN('1000000000000000000', 10);

  let deployed;
  let iac;
  let manager;
  let seller;
  let whitelistTestAccount;
  let aucId;

  before(async () => {
    manager = accounts[0]
    seller = accounts[1];
    whitelistTestAccount = accounts[5];
    deployed = await utils.deploySystem([
      { name: 'BytesLib', contract: BytesLib },
      { name: 'BTCUtils', contract: BTCUtils },
      { name: 'ValidateSPV', contract: ValidateSPV },
      { name: 'DummyAuction', contract: DummyAuction, args: [manager] }
    ]);
    iac = deployed.DummyAuction;
  });

  describe('#constructor', async () => {
      it('sets the manager address', async () => {
          assert.equal(await iac.manager.call(), manager);
      });
  });


  describe('#allocate', async () => {
      it('returns allocated values', async () => {
          let res = await iac.allocate.call(ETHER);
          assert(res[0].eq(ETHER.divn(400)));
          assert(res[1].eq(ETHER.sub(res[0])));
      });
  });

  describe('#addWhitelistEntries', async () => {
    let addRes;

    it('updates whitelistExists on creation', async () => {
      let res = await iac.whitelistExists.call(whitelistTestAccount);
      assert(res === false);
      addRes = await iac.addWhitelistEntries([whitelistTestAccount], {from: whitelistTestAccount});
      res = await iac.whitelistExists.call(whitelistTestAccount);
      assert.ok(res);
    });

    it('adds entries to the whitelist and emits an added event', async () => {
      const blockNumber = await web3.eth.getBlock('latest').number

      await iac.addWhitelistEntries([constants.GOOD.BIDDER, seller, whitelistTestAccount], {from: whitelistTestAccount});

      let res = await iac.checkWhitelist.call(whitelistTestAccount, constants.GOOD.BIDDER);
      assert.ok(res);

      res = await iac.checkWhitelist.call(whitelistTestAccount, seller);
      assert.ok(res);

      res = await iac.checkWhitelist.call(whitelistTestAccount, whitelistTestAccount);
      assert.ok(res);

      const eventList = await iac.getPastEvents('AddedWhitelistEntries', { fromBlock: blockNumber, toBlock: 'latest' });
      assert.equal(eventList[0].returnValues._sender, whitelistTestAccount);
    });
  });

  describe('#removeWhitelistEntires', async () => {
    it('removes entries from the whitelist and emits events', async () => {
      const blockNumber = await web3.eth.getBlock('latest').number

      // Add entries and check they exist
      await iac.addWhitelistEntries([constants.GOOD.BIDDER, seller], {from: whitelistTestAccount});
      let res = await iac.checkWhitelist.call(whitelistTestAccount, constants.GOOD.BIDDER);
      assert.ok(res);
      res = await iac.checkWhitelist.call(whitelistTestAccount, seller);
      assert.ok(res);

      // Now remove them
      await iac.removeWhitelistEntries([constants.GOOD.BIDDER, seller], {from: whitelistTestAccount});
      res = await iac.checkWhitelist.call(whitelistTestAccount, constants.GOOD.BIDDER);
      assert(res === false);
      res = await iac.checkWhitelist.call(whitelistTestAccount, seller);
      assert(res === false);

      const eventList = await iac.getPastEvents('RemovedWhitelistEntries', { fromBlock: blockNumber, toBlock: 'latest' });
      assert.equal(eventList[0].returnValues._sender, whitelistTestAccount);
    });
  });

  describe('#checkWhitelist', async () => {
      // This function is pretty thoroughly checked in removeWhitelistEntries
      it('returns true if a whitelist has not been created', async () => {
          let res = await iac.checkWhitelist.call(accounts[7], accounts[8]);
          assert.ok(res);
      });
  });

  describe('#open', async () => {
    before(async () => {
      const blockNumber = await web3.eth.getBlock('latest').number

      await iac.open(constants.GOOD.PARTIAL_TX, 17, 100, constants.ADDR0, ETHER, {from: seller, value: 10 ** 18})

      const eventList = await iac.getPastEvents('AuctionActive', { fromBlock: blockNumber, toBlock: 'latest' });
      aucId = eventList[0].returnValues._auctionId;
    });

    it('returns the txid on success', async () => {
      assert.equal(aucId, '0x9ff0076d904f8a7125b063f44995fe0d94f05ba759c435fbeb0f0936fb876432');
    });

    it('adds a new auction to the auctions mapping', async () => {
      let res = await iac.auctions.call(aucId);
      assert.equal(res[0], 1);  // state
      assert.equal(res[1], 10 ** 18);  // ethValue
    });

    it('increments open positions', async () => {
      let res = await iac.openPositions.call(seller);
      assert.equal(res, 1);
    });

    it('errors if auction already exists', async () => {
      try {
        await iac.open(constants.GOOD.PARTIAL_TX, 17, 100, constants.ADDR0, ETHER, {from: seller, value: 10 ** 18})
        assert(false);
      } catch (e) {
        assert.include(e.message, 'Auction exists.');
      }
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
          await iac.addWhitelistEntries([seller], {from: seller});
          try {
            await iac.claim(constants.GOOD.OP_RETURN_TX, constants.GOOD.PROOF, constants.GOOD.PROOF_INDEX, constants.GOOD.HEADER_CHAIN, {from: seller});
            assert(false);
          } catch (e) {
            assert.include(e.message, 'Bidder is not whitelisted.');
          }
      });

      it('returns on success and emits AuctionClosed', async () => {
        const blockNumber = await web3.eth.getBlock('latest').number;

        await iac.addWhitelistEntries([constants.GOOD.BIDDER], {from: seller});
        await iac.claim(constants.GOOD.OP_RETURN_TX, constants.GOOD.PROOF, constants.GOOD.PROOF_INDEX, constants.GOOD.HEADER_CHAIN, {from: seller});

        const eventList = await iac.getPastEvents('AuctionClosed', { fromBlock: blockNumber, toBlock: 'latest' });
        assert.equal(eventList[0].returnValues._auctionId, aucId);
      });

      it('updates auction state to CLOSED', async () => {
          let res = await iac.auctions.call(aucId);
          assert.equal(res[0], 2);
      });

      it('errors if auction state is not ACTIVE', async () => {
        try {
          await iac.claim(constants.GOOD.OP_RETURN_TX, constants.GOOD.PROOF, constants.GOOD.PROOF_INDEX, constants.GOOD.HEADER_CHAIN, {from: seller});
          assert(false);
        } catch (e) {
          assert.include(e.message, 'Auction has closed or does not exist.');
        }
      });

      it('errors if total difficulty sum is too low', async () => {
        await iac.open(constants.WORK_TOO_LOW.PARTIAL_TX, 17, 100, constants.ADDR0, ETHER, {from: seller, value: 10 ** 18});
        try {
          await iac.claim(constants.WORK_TOO_LOW.OP_RETURN_TX, constants.WORK_TOO_LOW.PROOF, constants.WORK_TOO_LOW.PROOF_INDEX, constants.WORK_TOO_LOW.HEADER_CHAIN, {from: seller});
          assert(false);
        } catch (e) {
          assert.include(e.message, 'Not enough difficulty in header chain.');
        }
      });

      it('errors if nOutputs is less than two', async () => {
        await iac.open(constants.FEW_OUTPUTS.PARTIAL_TX, 17, 0, constants.ADDR0, ETHER, {from: seller, value: 10 ** 18});
        try {
          await iac.claim(constants.FEW_OUTPUTS.OP_RETURN_TX, constants.FEW_OUTPUTS.PROOF, constants.FEW_OUTPUTS.PROOF_INDEX, constants.FEW_OUTPUTS.HEADER_CHAIN, {from: seller})
          assert(false);
        } catch (e) {
          assert.include(e.message, 'Must have at least 2 TxOuts');
        }
      });

      it('errors if second output is not OP_RETURN', async () => {
        await iac.open(constants.OP_RETURN_WRONG.PARTIAL_TX, 17, 0, constants.ADDR0, ETHER, {from: seller, value: 10 ** 18});
        try {
          await iac.claim(constants.OP_RETURN_WRONG.OP_RETURN_TX, constants.OP_RETURN_WRONG.PROOF, constants.OP_RETURN_WRONG.PROOF_INDEX, constants.OP_RETURN_WRONG.HEADER_CHAIN, {from: seller})
          assert(false);
        } catch (e) {
          assert.include(e.message, 'Not an OP_RETURN output');
        }
      });
  });
});
