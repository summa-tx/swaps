pragma solidity 0.4.25;

import {SPVStore} from "../bitcoin-spv/contracts/SPVStore.sol";


contract OMAuction {

    enum AuctionStates {
        NONE,
        ACTIVE,
        BIDDING,
        ACCEPTED,
        CLOSED,
        CANCELLED
    }

    event AuctionActive(
        bytes32 indexed auctionId,
        address indexed _seller,
        bytes indexed _partialTx);

    event BidValidated(
        bytes32 indexed _auctionId,
        bytes32 indexed _txid,
        address indexed _bidder,
        address _seller);

    event AuctionClosed(
        bytes32 indexed _acutionsId,
        bytes32 indexed _txid,
        address indexed _bidder,
        address _seller);

    event AuctionCancelled(bytes32 _auctionId, address _seller);

    struct Auction {
        AuctionStates state;
        address seller;                     // Seller address
        uint256 ethValue;                   // Eth asset value (wei)
        bytes partialTx;                    // Seller partial tx
        address bidder;                     // Accepted bidder address
        uint256 value;                      // Accepted bid value (sats)
        bytes32 txid;                       // Accepted tx hash
        uint8 n;                            // Required number of confirmed blocks
    }

    mapping(bytes32 => Auction) public auctions;
    mapping(bytes32 => address) public auctionBids; // txid => bidder address

    SPVStore public spvStore;                      // Deployed contract address of SPVStore.sol

    function spvStoreAddress(address _spvStoreAddr) public {
        spvStore = SPVStore(_spvStoreAddr);
    }

    /// @notice 
    /// @param _auctionId   Auction identifier
    /// @param _seller      Address to check
    /// @return             true if address is seller, false otherwise
    function isSeller(bytes32 _auctionId, address _seller) public returns (bool) {
        return (auctions[_auctionId].seller == _seller);
    }

    /// @notice 
    /// @param _auctionId   Auction identifier
    /// @param _bidder      Address to check
    /// @return             true if address is selected bidder, false otherwise
    function isBidder(bytes32 _auctionId, address _bidder) public returns (bool) {
        return (auctions[_auctionId].bidder == _bidder);
    }

    /// @notice             Seller opens auction by committing eth
    /// @param _partialTx   Seller's partial transaction 
    /// @param _seller      Seller's eth address
    /// @param _n           Required number of confirmed blocks
    /// @return             true if seller post is valid, false otherwise
    function openAuction(
        bytes _partialTx,
        address _seller,
        uint8 _n
    ) public payable returns (bool) {

        // Require seller to fund tx
        require(msg.value > 0);

        // RJR: Require seller to supply partial tx

        // Generate _auctionId
        bytes32 _auctionId = abi.encodePacked(msg.sender, _partialTx);

        // Add to auctions mapping
        auctions[_auctionId].seller = _seller;
        auctions[_auctionId].ethValue = msg.value;
        auctions[_auctionId].partialTx = _partialTx;
        auctions[_auctionId].state = AuctionStates.ACTIVE;
        auctions[_auctionId].n = _n;

        // Emit AuctionActive event
        emit AuctionActive(_auctionId, msg.sender, _partialTx);

        return true;
    }

    /// @notice             Seller accepts bid, submits to SPVStore, validates tx format
    /// @param _auctionId   Auction identifier
    /// @param _tx          The raw byte tx
    /// @param _index       Merkel root index
    /// @param _header      The raw byte header
    /// @return             true if bid is successfully accepted, error otherwise
    function validateBidTransaction(
        bytes32 _auctionId,
        bytes _tx,
        bytes _proof,
        uint _index,
        bytes _header
    ) public returns (bool) {

        // Require auction state to be ACTIVE or BIDDING
        require(
            auctions[_auctionId].state == AuctionStates.ACTIVE ||
            auctions[_auctionId].state == AuctionStates.BIDDING);

        // Require number of block confirmations submitted is >= n

        // Submit to SPVStore, get _txid back on success
        _txid = spvStore.validateTransaction(_tx, _proof, _index, _header);

        // Require two inputs
        require(spvStore.extractNumInputs(_tx) == 2);

        // Require at least three outputs
        require(spvStore.extractNumOutputs(_tx) >= 3);

        // Require second output is an OP_RETURN
        // Require OP_RETURN output contains a valid eth address
        // auctions[_auctionId].bidder = OP_RETURN output
       
        // After transaction is validated, store in auctions mapping
        auctions[_auctionId].txid = spvStore.validateTransaction(_tx, _proof, _index, _header);

        // Eth address from accepted tx OP_RETURN output
        auctions[_auctionId].bidder = auctionBids[_txid];

        // Update auction state to ACCEPTED
        auctions[_auctionId].state == AuctionStates.ACCEPTED;

        // Emit BidAccepted event
        emit BidValidated(
            _auctionId,
            auctions[_auctionId].txid,
            auctions[_auctionId].bidder,
            auctions[_auctionId].seller);

        return true;
    }

    /// @notice             Selected bidder claims seller eth
    /// @param _auctionId   Auction identifier
    /// @return             true if selected bidder claims eth, error otherwise
    function claimEth(bytes32 _auctionId) public returns (bool) {

        // Verify auction state is ACCEPTED
        require(auctions[_auctionId].state == AuctionStates.ACCEPTED);
        
        // Verify msg.sender is selected bidder
        require(auctions[_auctionId].bidder == msg.sender);

        // Send eth to selected bidder
        msg.sender.transfer(auctions[_auctionId].ethValue);

        // Update auction state to CLOSED
        auctions[_auctionId].state == AuctionStates.CLOSED;

        // Emit AuctionClosed event
        emit AuctionClosed(
        _auctionId,
        auctions[_auctionId].txid,
        auctions[_auctionId].bidder,
        auctions[_auctionId].seller);

        return true;
    }

    /// @notice             Seller cancels auction
    /// @param _auctionId   Auction identifier
    /// @param _cancelAddr  Address to release funds
    /// @return             true if auction is canceled, error otherwise
    function cancelAuction(bytes32 _auctionId, address _cancelAddr) public returns (bool) {

        require(isSeller(_auctionId, msg.sender));

        require(
            auctions[_auctionId].state != AuctionStates.ACCEPTED ||
            auctions[_auctionId].state != AuctionStates.CLOSED ||
            auctions[_auctionId].state != AuctionStates.CANCELLED);

        // Set AuctionState to CLOSED
        auctions[_auctionId].state = AuctionStates.CLOSED;

        // Return eth to seller
        address(_cancelAddr).transfer(auctions[_auctionId].ethValue);

        // Emit AuctionCancelled event
        emit AuctionCancelled(_auctionId, msg.sender);

        return true;
    }

    function _validateEthAddr(address _ethAddr) internal returns (bool) { return true; }
}
