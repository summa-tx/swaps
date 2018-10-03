pragma solidity 0.4.26;


contract OMAuction {

    enum AuctionStates {
        NONE,
        ACTIVE,
        BIDDING,
        ACCEPTED,
        CLOSED,
        CANCELLED
    }

    event AuctionOpen(
        bytes32 indexed auctionId,
        address indexed _seller,
        bytes indexed _partialTx);

    event BidPlaced(
        bytes32 indexed _auctionId,
        address indexed _bidder,
        bool indexed _valid);

    event BidAccepted(
        bytes32 indexed _auctionId,
        bytes32 indexed _txId,
        address indexed _seller);

    event AuctionClosed(bytes32 _txId, address indexed _seller, address indexed _bidder);

    event AuctionCancelled();

    struct Auction {
        AuctionStates state;
        address seller;                     // Seller address
        uint256 ethValue;                   // Eth asset value (wei)
        bytes partialTx;                    // Seller partial tx
        mapping(address => uint256) bids;   // Bidder eth address to highest bidder value
        address bidder;                     // Accepted bidder address
        uint256 value;                      // Accepted bid value (sats)
        bytes32 txId;                       // Accepted tx hash
        uint8 n;                            // Required number of confirmed blocks
    }

    mapping(bytes32 => Auction) public auctions;
    mapping(bytes32 => address) public auctionBids; // txid => bidder address


    function isSeller(bytes32 _auctionId, address _seller) public returns (bool) {
        return (auctions[_auctionId].seller == _seller);
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
        // Require seller to supply partial tx

        auctions[_auctionId].seller = _seller;
        auctions[_auctionId].ethValue = msg.value;
        auctions[_auctionId].partialTx = _partialTx;
        auctions[_auctionId].n = _n;
        auctions[_auctionId].state = AuctionStates.ACTIVE;

        emit Auction(_auctionId, msg.sender, _partialTx);

        return true;
    }

    /// @notice             Bidder places bid
    /// @param _auctionId   Auction identifier
    /// @param _txid        Bid transaction id
    /// @return             true if bid ia valid and tx stored in SPVStore, error otherwise
    function placeBid(bytes32 _auctionId, bytes32 _txid) public returns (bool) {
        // Bidder submits their txid for this contract to look up from SPVStore (OOB init submission)
        // verify that tx was in SPVStore
        // ask tx store for the number of inputs
        // ask tx store for the number of outputs
        // ask tx store if 2nd output is an OP_RETURN output
        // ask tx store for op_return output data
        // verify output data is a valid eth address
    
        // Get value
        uint256 _value = _bidderTx.value;

        /*
        // Do not overwrite someone elses bid
        // RJR: Do we only want to accept bids greater than the current greatest bid?
        if (auctions[_auctionId].bids[_value] != 0) {
            // Map bidder eth address to submitted value
            auctions[_auctionId].bids[_value] = _bidder;
        }
        */
        return true;
    }

    /// @notice             Seller accepts bid 
    /// @param _auctionId   Auction identifier
    /// @param _txid        Bid transaction id
    /// @return             true if bid is successfully accepted, error otherwise
    function acceptBid(bytes32 _auctionId, bytes32 _txid) public returns (bool) {

        // Require auction state to be ACTIVE or BIDDING
        require(auctions[_auctionId].state == (AuctionState.ACTIVE || AuctionState.BIDDING));

        // Require msg.sender to be seller
        require(isSeller(_auctionId, msg.sender));

        // Eth address from accepted tx OP_RETURN output
        auctions[_auctionId].bidder = auctionBids[_txid];

        // Emit BidAccepted event
        emit BidAccepted(_auctionId, _txId, auctions[_auctionId].seller);

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
        msg.transfer(auctions[_auctionId].ethValue, auctions[_auctionId].bidder);

        // Update auction state to CLOSED
        auctions[_auctionId].state == AuctionsStates.CLOSED;

        // Emit AuctionClosed event
        emit AuctionClosed(
        auctions[_auctionId].txId,
        auctions[_auctionId].seller,
        auctions[_auctionId].bidder);

        return true;
    }

    function cancelAuction() public returns (bool) { return true; }

    function _validateEthAddr(address _ethAddr) internal returns (bool) { return true; }
}
