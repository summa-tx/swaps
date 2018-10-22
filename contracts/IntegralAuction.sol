pragma solidity 0.4.25;

import {BytesLib} from "./BytesLib.sol";
import {BTCUtils} from "./BTCUtils.sol";
import {SafeMath} from "./SafeMath.sol";
import {BringYourOwnWhitelist} from "./BringYourOwnWhitelist.sol";
import {ValidateSPV} from "./ValidateSPV.sol";


contract IntegralAuction is BringYourOwnWhitelist {

    using BTCUtils for bytes;
    using BTCUtils for uint256;
    using BytesLib for bytes;
    using SafeMath for uint256;
    using ValidateSPV for bytes;
    using ValidateSPV for bytes32;

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
    mapping(bytes32 => Auction) public auctions;

    constructor (address _manager) public {
        manager = _manager;
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
    function claim(
        bytes _tx,
        bytes _proof,
        uint _index,
        bytes _headers
    ) public returns (bool) {
        bytes32 _auctionId = keccak256(_tx.slice(7, 36));
        Auction storage _auction = auctions[_auctionId];
        bytes32 _txid;
        address _bidder;
        uint64 _value;
        bytes32 _merkleRoot;
        uint256 _diff;

        // Require auction state to be ACTIVE
        require(_auction.state == AuctionStates.ACTIVE, 'Auction has closed or does not exist.');

        (_txid, _bidder, _value) = checkTx(_tx);
        _auction.bidder = _bidder;
        (_diff, _merkleRoot) = checkHeaders(_headers, _auction.reqDiff);
        checkProof(_txid, _merkleRoot, _proof, _index);

        // Get bidder eth address from OP_RETURN payload bytes
        require(checkWhitelist(_auction.seller, _auction.bidder), 'Bidder is not whitelisted.');

        // Update auction state to CLOSED
        _auction.state = AuctionStates.CLOSED;

        distributeEther(_auctionId);

        // Decrement Open positions
        openPositions[_auction.seller] = openPositions[_auction.seller].sub(1);

        // Emit AuctionClosed event
        emit AuctionClosed(
            _auctionId,
            _auction.bidder,
            _auction.seller,
            _value
        );

        return true;
    }

    function checkTx(
        bytes _tx
    ) public pure returns (bytes32 _txid, address _bidder, uint64 _value) {
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

    function checkHeaders(
        bytes _headers,
        uint256 _reqDiff
    ) public pure returns (uint256 _diff, bytes32 _merkleRoot) {
        // Require summation of submitted block headers difficulty >= reqDiff
        _diff = _headers.validateHeaderChain();
        _merkleRoot = _headers.extractMerkleRootLE().toBytes32();
        require(_diff != 1, 'Header bytes not multiple of 80.');
        require(_diff != 2, 'Header bytes not a valid chain.');
        require(_diff != 3, 'Header does not meet difficulty target.');
        require(_diff >= _reqDiff, 'Not enough difficulty in header chain.');
    }

    function checkProof(
        bytes32 _txid,
        bytes32 _merkleRoot,
        bytes _proof,
        uint256 _index
    ) public pure returns (bool) {
        require(_txid.prove(_merkleRoot, _proof, _index), 'Bad inclusion proof');
        return true;
    }


    function allocateEther(bytes32 _auctionId) public view returns (uint256, uint256) {
        Auction storage auction = auctions[_auctionId];
        // Fee share
        uint256 _feeShare = auction.ethValue.div(400);
        // Bidder share
        uint256 _bidderShare = auction.ethValue.sub(_feeShare);
        return (_feeShare, _bidderShare);
    }

    function distributeEther(bytes32 _auctionId) internal returns (bool) {
        // Distribute fee and bidder shares
        uint256 _feeShare;
        uint256 _bidderShare;
        (_feeShare, _bidderShare) = allocateEther(_auctionId);

        // Transfer fee
        address(manager).transfer(_feeShare);

        // Transfer eth to selected bidder
        address(auctions[_auctionId].bidder).transfer(_bidderShare);
    }
}
