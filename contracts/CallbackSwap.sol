pragma solidity ^0.5.10;

import {BytesLib} from "bitcoin-spv/contracts/BytesLib.sol";
import {BTCUtils} from "bitcoin-spv/contracts/BTCUtils.sol";
import {SafeMath} from "bitcoin-spv/contracts/SafeMath.sol";

interface ISPVConsumer {
    function spv(
        bytes32 _txid,
        bytes calldata _vin,
        bytes calldata _vout,
        uint256 _requestID,
        uint16 _reqIndices
    ) external;
}

interface IOnDemandSPV {
    event NewProofRequest (
        address indexed _requester,
        uint256 indexed _requestID,
        uint64 _paysValue,
        bytes _spends,
        bytes _pays
    );
    event SubscriptionExpired(address indexed _owner);
    event RequestClosed(uint256 indexed _requestID);
    event RequestFilled(bytes32 indexed _txid, uint256 indexed _requestID);

    /// @notice                 Subscribe to a feed of Bitcoin txns matching a request
    /// @dev                    The request can be a spent utxo and/or a created utxo
    /// @param  _spends         An outpoint that must be spent in acceptable txns (optional)
    /// @param  _pays           A scripthash that must be paid in acceptable txns (optional)
    /// @param  _paysValue      A minimum value that must be paid to the scripthash (optional)
    /// @param  _consumer       The address of a ISPVConsumer exposing spv
    /// @return                 True if succesful, error otherwise
    function request(
        bytes calldata _spends,
        bytes calldata _pays,
        uint64 _paysValue,
        address _consumer
    ) external returns (uint256);

    /// @notice                 Cancel a subscription to a request, retrieve the deposit
    /// @dev                    10% of the deposit is withheld as fee for service
    /// @param  _requestID      The id of the request to cancel
    /// @return                 True if succesful, error otherwise
    function cancelSubscription(uint256 _requestID) external returns (bool);

    /// @notice                 Provide a proof of a tx that satisfies some request
    /// @dev                    The caller must specify which inputs, which outputs, and which request
    /// @param  _header         The header containing the merkleroot committing to the tx
    /// @param  _proof          The merkle proof intermediate nodes
    /// @param  _version        The tx version, always the first 4 bytes of the tx
    /// @param  _locktime       The tx locktime, always the last 4 bytes of the tx
    /// @param  _index          The index of the tx in the merkle tree's leaves
    /// @param  _reqIndices  The input and output index to check against the request, packed
    /// @param  _vin            The tx input vector
    /// @param  _vout           The tx output vector
    /// @param  _requestID       The id of the request that has been triggered
    /// @return                 True if succesful, error otherwise
    function provideProof(
        bytes calldata _header,
        bytes calldata _proof,
        bytes4 _version,
        bytes4 _locktime,
        uint256 _index,
        uint16 _reqIndices,
        bytes calldata _vin,
        bytes calldata _vout,
        uint256 _requestID
    ) external returns (bool);
}

interface ICallbackSwap {

    event ListingActive(
        bytes32 indexed _listingID,
        address indexed _seller,
        address indexed _asset,
        uint256 _value,
        bytes _partialTx
    );

    event ListingClosed(
        bytes32 indexed _listingID,
        address _seller,
        address indexed _bidder,
        address indexed _asset,
        uint256 _value
    );

    function open(
        bytes calldata _partialTx,
        address _asset,
        uint256 _value
    ) external payable returns (bytes32);
}

contract CallbackSwap is ICallbackSwap, ISPVConsumer {
    using BytesLib for bytes;
    using BTCUtils for bytes;
    using SafeMath for uint256;

    enum ListingStates { NONE, ACTIVE, CLOSED }

    struct Listing {
        ListingStates state;
        uint256 value;                      // Asset amount or 721 ID
        address asset;                      // Asset info
        address seller;                     // Seller address
        address wrapper;                    // The new NoFun (if applicable)

        // Filled Later
        address bidder;                     // Accepted bidder address
        bytes32 txid;                       // Accepted tx hash
    }

    address payable public developer;
    IOnDemandSPV internal proofProvider;
    mapping(bytes32 => Listing) public listings;

    constructor (address _developer, address _proofProvider) public {
        developer = address(uint160(_developer));
        proofProvider = IOnDemandSPV(_proofProvider);
    }

    // IMPLEMENT FOR SPECIFIC ASSET TYPES
    function ensureFunding(Listing storage _listing) internal;
    function distribute(Listing storage _listing) internal;

    function open(
        bytes calldata _partialTx,
        address _asset,
        uint256 _value
    ) external payable returns (bytes32) {
        // Listing identifier is keccak256 of Seller's partial transaction outpoint
        bytes memory _outpoint = _partialTx.slice(7, 36);
        bytes32 _listingID = keccak256(_outpoint);

        // Require unique listing identifier
        require(listings[_listingID].state == ListingStates.NONE, "Listing exists.");

        // Add to listings mapping
        listings[_listingID].state = ListingStates.ACTIVE;
        listings[_listingID].value = _value;
        if (_asset != address(0)) {
            listings[_listingID].asset = _asset;
        }
        listings[_listingID].seller = msg.sender;

        ensureFunding(listings[_listingID]);

        // Register a new request for the outpoint
        proofProvider.request(
            _outpoint,  // spends
            hex"",  // pays
            0,  // paysValue
            address(this));  // consumer

        // Emit ListingActive event
        emit ListingActive(
            _listingID,
            msg.sender,
            _asset,
            _value,
            _partialTx);

        return _listingID;
    }

    function spv(
        bytes32 _txid,
        bytes calldata _vin,
        bytes calldata _vout,
        uint256 _requestID,
        uint16 _reqIndices
    ) external {
        _requestID; _reqIndices; _txid; // silences compile warnings
        require(msg.sender == address(proofProvider), "Not the SPV provider");

        bytes32 _listingID = keccak256(_vin.slice(1, 36));

        Listing storage _listing = listings[_listingID];
        require(_listing.state == ListingStates.ACTIVE, "Listing has closed or does not exist.");

        address _bidder = _extractBidder(_vout);
        if (_bidder == address(0)) {
            _bidder = _listing.seller;
        }

        // Update listing state
        _listing.bidder = _bidder;
        _listing.state = ListingStates.CLOSED;

        distribute(_listing);

        // Emit ListingClosed event
        emit ListingClosed(
            _listingID,
            _listing.seller,
            _listing.bidder,
            _listing.asset,
            _listing.value
        );
    }

    /// @notice         Extracts the bidder address from the bid tx
    /// @dev            Returns 0 if the op_return is weird or there's only 1 output
    /// @param _vout    The length-prefixed transaction output vector
    /// @return         The 20 byte bidder address from the op_return, or address(0)
    function _extractBidder(bytes memory _vout) internal pure returns (address _bidder) {
        _bidder = address(0);
        if (uint8(_vout[0]) > 1) {
            bytes memory _data = _vout.extractOutputAtIndex(1).extractOpReturnData();
            _bidder = _data.length >= 20 ? _data.toAddress(0) : address(0);
        }
    }

    /// @notice             Calculates the developer's fee
    /// @dev                Looks up the listing and calculates a 25bps fee. Do not use for erc721.
    /// @param _value       The amount of value to split between bidder and developer
    /// @return             The fee share and the bidder's share
    function _allocate(uint256 _value) internal pure returns (uint256, uint256) {
        // developer share
        uint256 _feeShare = _value.div(400);
        // Bidder share
        uint256 _bidderShare = _value.sub(_feeShare);
        return (_feeShare, _bidderShare);
    }

    /// @notice             Calculates the developer's fee
    /// @dev                Looks up the listing and calculates a 25bps fee. Do not use for erc721.
    /// @param _value       The amount of value to split between bidder and developer
    /// @return             The fee share and the bidder's share
    function allocate(uint256 _value) external pure returns (uint256, uint256) {
        return _allocate(_value);
    }
}
