pragma solidity 0.4.25;

import "./SPVStore.sol";
import {BytesLib} from "./BytesLib.sol";
import {BTCUtils} from "./BTCUtils.sol";
import {SafeMath} from "./SafeMath.sol";


contract IntegralAuction {

    using BTCUtils for bytes;
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
        bytes32 indexed _acutionsId,
        bytes32 indexed _txid,
        address indexed _bidder,
        address _seller
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
        uint8 diffSum;                            // Required number of confirmed blocks
    }

    address public manager;
    mapping(bytes32 => Auction) public auctions;
    SPVStore public spvStore;                      // Deployed contract address of SPVStore.sol

    constructor (address _manager) public { manager = _manager; }

    function spvStoreAddress(address _spvStoreAddr) public { spvStore = SPVStore(_spvStoreAddr); }

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
    /// @return             true if address is selected Bidder, false otherwise
    function isBidder(bytes32 _auctionId, address _bidder) public returns (bool) {
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

        // Require input is 36 bytes
        require(_partialTx.length == 36, "Incorrect input length. Outpoint must be 36-bytes.");

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

        // Require auction state to be ACTIVE or BIDDING
        require(auctions[_auctionId].state == AuctionStates.ACTIVE);

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
            _diffSum += _iTarget.blockDifficultyFromTarget();
        }

        // Require summation of submitted block headers difficulty >= diffSum 
        require(_diffSum >= auctions[_auctionId].diffSum);

        bytes memory _header = _headers.slice(0, 80);

        // Submit to SPVStore, get _txid back on success
        bytes32 _txid = spvStore.validateTransaction(_tx, _proof, _index, _header);

        // Require two inputs
        require(spvStore.extractNumInputs(_tx) == 2);

        // Require at least three outputs
        require(spvStore.extractNumOutputs(_tx) >= 3);

        // Require second output is an OP_RETURN
        uint8 outputType = spvStore.getOutput(_txid, _index);

        // Require OP_RETURN output contains a valid eth address
        // auctions[_auctionId].bidder = OP_RETURN output

        // After transaction is validated, store in auctions mapping
        auctions[_auctionId].txid = _txid;
        /*
        // Eth address from accepted tx OP_RETURN output
        auctions[_auctionId].bidder = auctionBids[_txid];

        // summa share
        uint256 _summaShare = auctions[_auctionId].ethValue / 400;

        // Bidder share
        uint256 _bidderShare = auctions[_auctionId].ethValue - _summaShare;

        // Send eth to selected bidder TODO: subtract summa share
        address(auctions[_auctionId].bidder).transfer(_bidderShare);

        // // Get final value from tx
        // auctions[_auctionId].value = _value;
         */

        // Update auction state to CLOSED
        auctions[_auctionId].state == AuctionStates.CLOSED;

        // Emit BidAccepted event
        emit AuctionClosed(
            _auctionId,
            auctions[_auctionId].txid,
            auctions[_auctionId].bidder,
            auctions[_auctionId].seller,
            auctions[_auctionId].value
        );

        return true;
    }

    function _validateEthAddr(address _ethAddr) internal returns (bool) { return true; }
}
