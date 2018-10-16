pragma solidity 0.4.25;

import "./SPVStore.sol";
import {BytesLib} from "./BytesLib.sol";
import {BTCUtils} from "./BTCUtils.sol";
import {SafeMath} from "./SafeMath.sol";
import {BringYourOwnWhitelist} from "./BringYourOwnWhitelist.sol";


contract IntegralAuction is BringYourOwnWhitelist{

    using BTCUtils for bytes;
    using BTCUtils for uint256;
    using BytesLib for bytes;
    using SafeMath for uint256;

    enum AuctionStates { NONE, ACTIVE, CLOSED }

    event AuctionActive(
        bytes32 indexed auctionId,
        address indexed _seller,
        bytes _partialTx,
        uint256 _reservePrice
    );

    event AuctionClosed(
        bytes32 indexed _acutionId,
        address indexed _bidder,
        address _seller,
        uint256 _value
    );

    struct Auction {
        AuctionStates state;
        uint256 ethValue;                   // Eth asset value (wei)
        address seller;                     // Seller address
        bytes partialTx;                    // Seller BTC address
        uint256 reservePrice;               // Minimum acceptable bid (sats)
        uint256 reqDiff;                    // Required number of difficulty in confirmed blocks
        // Filled Later
        address bidder;                     // Accepted bidder address
        uint256 value;                      // Accepted bid value (sats)
        bytes32 txid;                       // Accepted tx hash
    }

    address public manager;
    SPVStore public spvStore;  // Deployed contract address of SPVStore.sol
    mapping(bytes32 => Auction) public auctions;

    constructor (address _manager) public {
        manager = _manager;
    }

    function spvStoreAddress(address _spvStoreAddr) public {
        spvStore = SPVStore(_spvStoreAddr);
    }

    /// @notice
    /// @param _auctionId   Auction identifier
    /// @param _seller      Address to check
    /// @return             true if address is seller, false otherwise
    function isSeller(bytes32 _auctionId, address _seller) public view returns (bool) {
        return (auctions[_auctionId].seller == _seller);
    }

    /// @notice                 Seller opens auction by committing ethereum
    /// @param _partialTx       Seller's partial transaction
    /// @param _seller          Seller's ethereum address
    /// @param _reservePrice    Minimum acceptable bid (sats)
    /// @param _reqDiff         Minimum acceptable block difficulty summation
    /// @return                 true if Seller post is valid, false otherwise
    function openAuction(
        address _seller,
        bytes _partialTx,
        uint256 _reservePrice,
        uint256 _reqDiff
    ) public payable returns (bytes32) {

        // Require Seller to fund tx
        require(msg.value > 0, "No asset received. Auction must be funded on initialization.");

        // Auction identifier is sha256 of Seller's parital transaction
        bytes32 _auctionId = _partialTx.hash256();

        // Require unique auction identifier
        require(auctions[_auctionId].state == AuctionStates.NONE, "Auction exists.");

        // Add to auctions mapping
        auctions[_auctionId].seller = _seller;
        auctions[_auctionId].reqDiff = _reqDiff;
        auctions[_auctionId].partialTx = _partialTx;
        auctions[_auctionId].ethValue = msg.value;
        auctions[_auctionId].reservePrice = _reservePrice;
        auctions[_auctionId].state = AuctionStates.ACTIVE;

        // Emit AuctionActive event
        emit AuctionActive(_auctionId, _seller, _partialTx, _reservePrice);

        return _auctionId;
    }

    /// @notice             Validated selected bid, bidder claims eth
    /// @param _auctionId   Auction identifier
    /// @param _tx          The raw byte tx
    /// @param _index       Merkel root index
    /// @param _headers     The raw bytes of all headers in order from earliest to latest
    /// @return             true if bid is successfully accepted, error otherwise
    function claim(bytes32 _auctionId, bytes _tx, bytes _proof, uint _index, bytes _headers) public returns (bool) {
        Auction storage auction = auctions[_auctionId];

        // Require auction state to be ACTIVE
        require(auction.state == AuctionStates.ACTIVE);

        // Require summation of submitted block headers difficulty >= reqDiff
        require(sumDifficulty(_headers) >= auction.reqDiff);

        // Require at least two inputs and at least three outputs
        require(_tx.extractNumInputs() >= 2);
        require(_tx.extractNumOutputs() >= 3);

        // Submit to SPVStore, get _txid back on success
        bytes memory _header = _headers.slice(0, 80);
        bytes32 _txid = spvStore.validateTransaction(_tx, _proof, _index, _header);
        require(uint(spvStore.getTxOutOutputType(_txid, 1)) == 3);

        // Update auction state to CLOSED
        auction.state = AuctionStates.CLOSED;

        // Get bidder eth address from OP_RETURN payload bytes
        bytes memory _payload = spvStore.getTxOutPayload(_txid, 1);
        auction.bidder = _addrFromBytes(_payload);

        // Distribute fee and bidder shares
        _distributeEther(_auctionId);

        // Emit AuctionClosed event
        emit AuctionClosed(
            _auctionId,
            auction.bidder,
            auction.seller,
            spvStore.getTxOutValue(_txid, 1)
        );

        return true;
    }

    function sumDifficulty(bytes _headers) public pure returns (uint256) {

        // Require each header in list to be divisible by 80
        require(_headers.length % 80 == 0);

        // Initialize difficulty summation variable
        uint256 _reqDiff = 0;
        uint256 _start = 0;

        // For each header, sum its difficulty
        for (uint256 i = 0; i < _headers.length / 80; i++) {

            // ith header start index
            _start = i * 80;

            // ith header
            bytes memory _iHeader = _headers.slice(_start, 80);

            // ith header target
            uint256 _iTarget = _iHeader.extractTarget();

            // Add ith header difficulty to difficulty sum
            _reqDiff += _iTarget.calculateDifficulty();
        }
        return _reqDiff;
    }

    function _distributeEther(bytes32 _auctionId) internal returns (bool) {
        Auction storage auction = auctions[_auctionId];

        // Fee share
        uint256 _feeShare = auction.ethValue / 400;

        // Bidder share
        uint256 _bidderShare = auction.ethValue - _feeShare;

        // Transfer fee
        address(manager).transfer(_feeShare);

        // Transfer eth to selected bidder
        address(auction.bidder).transfer(_bidderShare);

        return true;
    }

    function _addrFromBytes(bytes _bytes) internal pure returns (address _addr) {
        // Require 20 bytes in length
        require(_bytes.length == 20);

        assembly {
            _addr := mload(add(_bytes,20))
        }
    }
}
