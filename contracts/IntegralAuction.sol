pragma solidity 0.4.25;

import "./SPVStore.sol";
import {BytesLib} from "./BytesLib.sol";
import {BTCUtils} from "./BTCUtils.sol";
import {SafeMath} from "./SafeMath.sol";
import {BringYourOwnWhitelist} from "./BringYourOwnWhitelist.sol";


contract IntegralAuction is BringYourOwnWhitelist {

    using BTCUtils for bytes;
    using BTCUtils for uint256;
    using BytesLib for bytes;
    using SafeMath for uint256;

    enum AuctionStates { NONE, ACTIVE, CLOSED }

    event AuctionActive(
        bytes32 indexed _auctionId,
        address indexed _seller,
        bytes _partialTx,
        uint256 _reservePrice,
        uint256 _reqDiff
    );

    event AuctionClosed(
        bytes32 indexed _auctionId,
        address indexed _bidder,
        address _seller,
        uint256 _value
    );

    struct Auction {
        AuctionStates state;
        uint256 ethValue;                   // Eth asset value (wei)
        address seller;                     // Seller address
        uint256 reqDiff;                    // Required number of difficulty in confirmed blocks

        // Filled Later
        address bidder;                     // Accepted bidder address
        uint256 value;                      // Accepted bid value (sats)
        bytes32 txid;                       // Accepted tx hash
    }

    address public manager;
    SPVStore public spvStore;  // Deployed contract address of SPVStore.sol
    mapping(bytes32 => Auction) public auctions;

    constructor (address _manager, address _spvStoreAddr) public {
        manager = _manager;
        spvStore = SPVStore(_spvStoreAddr);
    }

    /// @notice                 Seller opens auction by committing ethereum
    /// @param _partialTx       Seller's partial transaction
    /// @param _reservePrice    Minimum acceptable bid (sats)
    /// @param _reqDiff         Minimum acceptable block difficulty summation
    /// @return                 true if Seller post is valid, false otherwise
    function open(
        bytes _partialTx,
        uint256 _reservePrice,
        uint256 _reqDiff
    ) public payable returns (bytes32) {

        // Require Seller to fund tx
        require(msg.value > 0, "No asset received. Auction must be funded on initialization.");

        // Auction identifier is sha256 of Seller's parital transaction
        bytes32 _auctionId = keccak256(_partialTx.slice(7, 36));

        // Require unique auction identifier
        require(auctions[_auctionId].state == AuctionStates.NONE, "Auction exists.");

        // Add to auctions mapping
        auctions[_auctionId].state = AuctionStates.ACTIVE;
        auctions[_auctionId].ethValue = msg.value;
        auctions[_auctionId].seller = msg.sender;
        auctions[_auctionId].reqDiff = _reqDiff;

        // Increment Open positions
        openPositions[msg.sender] = openPositions[msg.sender].add(1);

        // Emit AuctionActive event
        emit AuctionActive(_auctionId, msg.sender, _partialTx, _reservePrice, _reqDiff);

        return _auctionId;
    }

    /// @notice             Validated selected bid, bidder claims eth
    /// @param _tx          The raw byte tx
    /// @param _index       Merkel root index
    /// @param _headers     The raw bytes of all headers in order from earliest to latest
    /// @return             true if bid is successfully accepted, error otherwise
    function claim(bytes _tx, bytes _proof, uint _index, bytes _headers) public returns (bool) {
        bytes32 _auctionId = keccak256(_tx.slice(7, 36));
        Auction storage auction = auctions[_auctionId];

        // Require auction state to be ACTIVE
        require(auction.state == AuctionStates.ACTIVE, 'Auction has closed or does not exist.');

        // Require summation of submitted block headers difficulty >= reqDiff
        require(checkHeaderChain(_headers) >= auction.reqDiff, 'Not enough difficulty in header chain.');

        // Require at least two outputs
        require(_tx.extractNumOutputs() >= 2, 'Must have at least 2 TxOuts');

        // Submit to SPVStore, get _txid back on success
        bytes memory _header = _headers.slice(0, 80);
        bytes32 _txid = spvStore.validateTransaction(_tx, _proof, _index, _header);

        require(uint(spvStore.getTxOutOutputType(_txid, 1)) == 3, 'TxOut at index 1 must be an OP_RETURN');

        // Update auction state to CLOSED
        auction.state = AuctionStates.CLOSED;

        // Get bidder eth address from OP_RETURN payload bytes
        bytes memory _payload = spvStore.getTxOutPayload(_txid, 1);
        auction.bidder = _payload.toAddress(0);
        require(checkWhitelist(auction.seller, auction.bidder), 'Bidder is not whitelisted.');

        // Decrement Open positions
        address _seller = auction.seller;
        openPositions[auction.seller] = openPositions[auction.seller].sub(1);

        // Distribute fee and bidder shares
        uint256 _feeShare;
        uint256 _bidderShare;
        (_feeShare, _bidderShare) = allocateEther(_auctionId);

        // Transfer fee
        address(manager).transfer(_feeShare);

        // Transfer eth to selected bidder
        address(auction.bidder).transfer(_bidderShare);


        // Emit AuctionClosed event
        emit AuctionClosed(
            _auctionId,
            auction.bidder,
            auction.seller,
            spvStore.getTxOutValue(_txid, 1)
        );

        return true;
    }

    function checkHeaderChain(bytes _headers) public pure returns (uint256) {

        // Require each header in list to be divisible by 80
        require(_headers.length % 80 == 0, 'Header chain not a multiple of 80 bytes.');

        // Initialize difficulty summation variable
        uint256 _reqDiff = 0;
        uint256 _start = 0;

        bytes32 _digest;

        // For each header, sum its difficulty
        for (uint256 i = 0; i < _headers.length / 80; i++) {

            // ith header start index
            _start = i * 80;

            // ith header
            bytes memory _iHeader = _headers.slice(_start, 80);

            // After the first header, check that headers are in a chain
            if (i != 0) {
                require(_digest == _iHeader.extractPrevBlockLE().toBytes32(), 'Header prevBlock reference incorrect.');
            }

            // ith header target
            uint256 _iTarget = _iHeader.extractTarget();

            // Require that the header has sufficient work
            _digest = _iHeader.hash256();
            require(abi.encodePacked(_digest).reverseEndianness().bytesToUint() <= _iTarget, 'Header does not meet its target.');

            // Add ith header difficulty to difficulty sum
            _reqDiff += _iTarget.calculateDifficulty();
        }
        return _reqDiff;
    }

    function allocateEther(bytes32 _auctionId) public view returns (uint256, uint256) {
        Auction storage auction = auctions[_auctionId];

        // Fee share
        uint256 _feeShare = auction.ethValue.div(400);

        // Bidder share
        uint256 _bidderShare = auction.ethValue.sub(_feeShare);

        return (_feeShare, _bidderShare);
    }
}
