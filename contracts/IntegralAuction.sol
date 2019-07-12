pragma solidity 0.4.25;

import {BytesLib} from "./bitcoin-spv/BytesLib.sol";
import {BTCUtils} from "./bitcoin-spv/BTCUtils.sol";
import {SafeMath} from "./bitcoin-spv/SafeMath.sol";
import {ValidateSPV} from "./bitcoin-spv/ValidateSPV.sol";
import {BringYourOwnWhitelist} from "./BringYourOwnWhitelist.sol";

interface IAuction {

    event AuctionActive(
        bytes32 indexed _auctionId,
        address indexed _seller,
        address indexed _asset,
        uint256 _value,
        bytes _partialTx,
        uint256 _reservePrice,
        uint256 _reqDiff
    );

    event AuctionClosed(
        bytes32 indexed _auctionId,
        address _seller,
        address indexed _bidder,
        address indexed _asset,
        uint256 _value,
        uint256 _BTCValue
    );

    function open(
        bytes _partialTx,
        uint256 _reservePrice,
        uint256 _reqDiff,
        address _asset,
        uint256 _value
    ) external payable returns (bytes32);

    function claim(
        bytes _tx,
        bytes _proof,
        uint _index,
        bytes _headers
    ) external returns (bool);

    function checkTx(
        bytes _tx
    ) external pure returns (bytes32 _txid, address _bidder, uint64 _value);

    function checkHeaders(
        bytes _headers,
        uint256 _reqDiff
    ) external pure returns (uint256 _diff, bytes32 _merkleRoot);

    function checkProof(
        bytes32 _txid,
        bytes32 _merkleRoot,
        bytes _proof,
        uint256 _index
    ) external pure returns (bool);
}


contract IntegralAuction is IAuction, BringYourOwnWhitelist {

    using BTCUtils for bytes;
    using BTCUtils for uint256;
    using BytesLib for bytes;
    using SafeMath for uint256;
    using ValidateSPV for bytes;
    using ValidateSPV for bytes32;

    enum AuctionStates { NONE, ACTIVE, CLOSED }

    struct Auction {
        AuctionStates state;
        uint256 value;                      // Asset amount or 721 ID
        uint256 reqDiff;                    // Required number of difficulty in confirmed blocks
        address asset;                      // Asset info
        address seller;                     // Seller address

        // Filled Later
        address bidder;                     // Accepted bidder address
        uint256 BTCvalue;                   // Accepted bid value (sats)
        bytes32 txid;                       // Accepted tx hash
    }

    address public manager;
    mapping(bytes32 => Auction) public auctions;

    constructor (address _manager) public {
        manager = _manager;
    }

    function ensureFunding(address _asset, uint256 _value) internal;
    function distribute(Auction storage _auction) internal;

    /// @notice                 Seller opens auction by committing ethereum
    /// @param _partialTx       Seller's partial transaction
    /// @param _reservePrice    Minimum acceptable bid (sats)
    /// @param _reqDiff         Minimum acceptable block difficulty summation
    /// @return                 true if Seller post is valid, false otherwise
    function open(
        bytes _partialTx,
        uint256 _reservePrice,
        uint256 _reqDiff,
        address _asset,
        uint256 _value
    ) external payable returns (bytes32) {

        ensureFunding(_asset, _value);

        // Auction identifier is keccak256 of Seller's parital transaction
        bytes32 _auctionId = keccak256(_partialTx.slice(7, 36));

        // Require unique auction identifier
        require(auctions[_auctionId].state == AuctionStates.NONE, "Auction exists.");

        // Add to auctions mapping
        auctions[_auctionId].state = AuctionStates.ACTIVE;
        auctions[_auctionId].value = _value;
        auctions[_auctionId].asset = _asset;
        auctions[_auctionId].seller = msg.sender;
        auctions[_auctionId].reqDiff = _reqDiff;

        // Increment Open positions
        openPositions[msg.sender] = openPositions[msg.sender].add(1);

        // Emit AuctionActive event
        emit AuctionActive(
            _auctionId,
            msg.sender,
            _asset,
            _value,
            _partialTx,
            _reservePrice,
            _reqDiff);

        return _auctionId;
    }

    /// @notice             Validate selected bid, bidder claims eth
    /// @param _tx          The raw byte tx
    /// @param _proof       The merkle proof of inclusion
    /// @param _index       Merkle proof leaf index to aid verification
    /// @param _headers     The raw bytes of all headers in order from earliest to latest
    /// @return             true if bid is successfully accepted, error otherwise
    function claim(
        bytes _tx,
        bytes _proof,
        uint _index,
        bytes _headers
    ) external returns (bool) {
        address _bidder;
        uint64 _value;

        bytes32 _auctionId = keccak256(_tx.slice(7, 36));
        Auction storage _auction = auctions[_auctionId];

        (_bidder, _value) = _makeAllChecks(_tx, _proof, _index, _headers, _auction.reqDiff);

        // Get bidder eth address from OP_RETURN payload bytes
        require(checkWhitelist(_auction.seller, _bidder), 'Bidder is not whitelisted.');

        // Require auction state to be ACTIVE
        require(_auction.state == AuctionStates.ACTIVE, 'Auction has closed or does not exist.');

        // Update auction state
        _auction.bidder = _bidder;
        _auction.state = AuctionStates.CLOSED;
        _auction.BTCvalue = _value;

        distribute(_auction);

        // Decrement Open positions
        openPositions[_auction.seller] = openPositions[_auction.seller].sub(1);

        // Emit AuctionClosed event
        emit AuctionClosed(
            _auctionId,
            _auction.seller,
            _auction.bidder,
            _auction.asset,
            _auction.value,
            _value
        );

        return true;
    }

    function _makeAllChecks(
        bytes _tx,
        bytes _proof,
        uint _index,
        bytes _headers,
        uint256 _reqDiff
    ) internal pure returns (address _bidder , uint64 _value) {
        bytes32 _txid;
        bytes32 _merkleRoot;
        uint256 _diff;
        (_txid, _bidder, _value) = _checkTx(_tx);
        (_diff, _merkleRoot) = _checkHeaders(_headers, _reqDiff);
        _checkProof(_txid, _merkleRoot, _proof, _index);
    }

    /// @notice             Validates the submitted bid transaction
    /// @dev                Uses bitcoin parsing tools. This could be made more gas efficient
    /// @param _tx          The raw byte tx
    /// @return             The txid, the bidder's ethereum address, and the value of the first output
    function _checkTx(
        bytes _tx
    ) internal pure returns (bytes32 _txid, address _bidder, uint64 _value) {
        bytes memory _nIns;
        bytes memory _ins;
        bytes memory _nOuts;
        bytes memory _outs;
        bytes memory _locktime;

        (_nIns, _ins, _nOuts, _outs, _locktime, _txid) = _tx.parseTransaction();
        require(_txid != bytes32(0));
        require(_nOuts.bytesToUint() >= 2, 'Must have at least 2 TxOuts');

        _bidder = _tx.extractOutputAtIndex(1).extractOpReturnData().toAddress(0);
        _value = _tx.extractOutputAtIndex(0).extractValue();
    }

    /// @notice             Validates submitted header chain
    /// @dev                Checks that all headers are linked, that each meets its target difficulty
    /// @param _headers     The raw byte header chain
    /// @param _reqDiff     The required total difficulty for the header chain
    /// @return             The total difficulty of the header chain, and the first header's tx tree root
    function _checkHeaders(
        bytes _headers,
        uint256 _reqDiff
    ) internal pure returns (uint256 _diff, bytes32 _merkleRoot) {
        // Require summation of submitted block headers difficulty >= reqDiff
        _diff = _headers.validateHeaderChain();
        _merkleRoot = _headers.extractMerkleRootLE().toBytes32();
        require(_diff != 1, 'Header bytes not multiple of 80.');
        require(_diff != 2, 'Header bytes not a valid chain.');
        require(_diff != 3, 'Header does not meet difficulty target.');
        require(_diff >= _reqDiff, 'Not enough difficulty in header chain.');
    }

    /// @notice             Validates submitted merkle inclusion proof
    /// @dev                Takes in the x
    /// @param _txid        The 32 byte txid
    /// @param _merkleRoot  The block header's merkle root
    /// @param _proof       The inclusion proof
    /// @param _index       The index of the txid in the leaf set
    /// @return             true if _proof and _index show that _txid is in the _merkleRoot, else false
    function _checkProof(
        bytes32 _txid,
        bytes32 _merkleRoot,
        bytes _proof,
        uint256 _index
    ) internal pure returns (bool) {
        require(_txid.prove(_merkleRoot, _proof, _index), 'Bad inclusion proof');
        return true;
    }

    /// @notice             Calculates the manager's fee
    /// @dev                Looks up the auction and calculates a 25bps fee. Do not use for erc721.
    /// @param _value       The amount of value to split between bidder and manager
    /// @return             The fee share and the bidder's share
    function _allocate(uint256 _value) internal pure returns (uint256, uint256) {
        // manager share
        uint256 _feeShare = _value.div(400);
        // Bidder share
        uint256 _bidderShare = _value.sub(_feeShare);
        return (_feeShare, _bidderShare);
    }

    function checkTx(
        bytes _tx
    ) external pure returns (bytes32 _txid, address _bidder, uint64 _value) {
        return _checkTx(_tx);
    }

    function checkHeaders(
        bytes _headers,
        uint256 _reqDiff
    ) external pure returns (uint256 _diff, bytes32 _merkleRoot) {
        return _checkHeaders(_headers, _reqDiff);
    }

    function checkProof(
        bytes32 _txid,
        bytes32 _merkleRoot,
        bytes _proof,
        uint256 _index
    ) external pure returns (bool) {
        return _checkProof(_txid, _merkleRoot, _proof, _index);
    }
}
