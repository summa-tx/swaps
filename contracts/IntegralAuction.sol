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
        address seller;                     // Seller address
        string sellerBtcAddr;               // Seller BTC address
        uint256 ethValue;                   // Eth asset value (wei)
        bytes input;                        // Seller input
        uint256 reservePrice;               // Minimum acceptable bid (sats)
        address bidder;                     // Accepted bidder address
        uint256 value;                      // Accepted bid value (sats)
        bytes32 txid;                       // Accepted tx hash
        uint256 diffSum;                            // Required number of confirmed blocks
    }

    address public manager;
    SPVStore public spvStore;  // Deployed contract address of SPVStore.sol
    mapping(bytes32 => Auction) public auctions;

    constructor (address _manager) public { manager = _manager; }

    function spvStoreAddress(address _spvStoreAddr) public { spvStore = SPVStore(_spvStoreAddr); }

    /// @notice
    /// @param _auctionId   Auction identifier
    /// @param _seller      Address to check
    /// @return             true if address is seller, false otherwise
    function isSeller(bytes32 _auctionId, address _seller) public view returns (bool) {
        return (auctions[_auctionId].seller == _seller);
    }

    /// @notice
    /// @param _auctionId   Auction identifier
    /// @param _bidder      Address to check
    /// @return             true if address is selected Bidder, false otherwise
    function isBidder(bytes32 _auctionId, address _bidder) public view returns (bool) {
        return (auctions[_auctionId].bidder == _bidder);
    }

    /// @notice                 Seller opens auction by committing ethereum
    /// @param _partialTx       Seller's partial transaction
    /// @param _seller          Seller's ethereum address
    /// @param _reservePrice    Minimum acceptable bid (sats)
    /// @param _diffSum         Minimum acceptable block difficulty summation
    /// @return                 true if Seller post is valid, false otherwise
    function openAuction(
        address _seller,
        bytes _partialTx,
        uint256 _reservePrice,
        uint256 _diffSum
    ) public payable returns (bool) {

        // Require Seller to fund tx
        require(msg.value > 0, "No asset received. Auction must be funded on initialize.");

        // Auction identifier is sha256 of Seller's parital transaction
        bytes32 _auctionId = _partialTx.hash256();

        // Require unique auction identifier
        require(auctions[_auctionId].state == AuctionStates.NONE);

        // Add to auctions mapping
        auctions[_auctionId].seller = _seller;
        auctions[_auctionId].diffSum = _diffSum;
        auctions[_auctionId].input = _partialTx;
        auctions[_auctionId].ethValue = msg.value;
        auctions[_auctionId].reservePrice = _reservePrice;
        auctions[_auctionId].state = AuctionStates.ACTIVE;

        // Emit AuctionActive event
        emit AuctionActive(_auctionId, _seller, _partialTx, _reservePrice);

        return true;
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

        // Require summation of submitted block headers difficulty >= diffSum
        uint256 _diffSum = sumDifficulty(_headers);
        require(_diffSum >= auction.diffSum);

        bytes memory _header = _headers.slice(0, 80);

        // Submit to SPVStore, get _txid back on success
        bytes32 _txid = spvStore.validateTransaction(_tx, _proof, _index, _header);

        // Require two inputs
        require(_tx.extractNumInputs() == 2);

        // Require at least three outputs
        require(_tx.extractNumOutputs() >= 3);

        // Require second output to be of OP_RETURN (3) type
        require(uint(spvStore.getTxOutOutputType(_txid, 1)) == 3);

        uint256 _value = spvStore.getTxOutValue(_txid, 1);
        bytes memory _payload = spvStore.getTxOutPayload(_txid, 1);

        // Require payload is 20 bytes
        require(_payload.length == 20);

        // Get bidder eth address from OP_RETURN payload bytes
        auction.bidder = _addrFromBytes(_payload);

        // Distribute fee and bidder shares
        _distributeShares(_auctionId);

        // Update auction state to CLOSED
        auction.state == AuctionStates.CLOSED;

        // Emit AuctionClosed event
        emit AuctionClosed(
            _auctionId,
            auction.bidder,
            auction.seller,
            _value
        );

        return true;
    }

    function sumDifficulty(bytes _headers) public pure returns (uint256) {

        // Require each header in list to be divisible by 80
        require(_headers.length % 80 == 0);

        // Initialize difficulty summation variable
        uint256 _diffSum = 0;
        uint256 _start = 0;

        // For each header, sum its difficulty
        for (uint256 i = 0; i < _headers.length / 80; i++) {

            // ith header start index
            _start = i + i * 80;

            // ith header
            bytes memory _iHeader = _headers.slice(_start, 80);

            // ith header target
            uint256 _iTarget = _iHeader.extractTarget();

            // Add ith header difficulty to difficulty sum
            _diffSum += _iTarget.calculateDifficulty();
        }
        return _diffSum;
    }

    function _distributeShares(bytes32 _auctionId) internal returns (bool) {
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
