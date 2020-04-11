pragma solidity ^0.5.10;

import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {BTCUtils} from "@summa-tx/bitcoin-spv-sol/contracts/BTCUtils.sol";
import {ISPVConsumer, ISPVRequestManager} from "@summa-tx/relay-sol/contracts/Interfaces.sol";

import {SafeMath} from "openzeppelin-solidity/contracts/math/SafeMath.sol";


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
    ISPVRequestManager internal proofProvider;
    mapping(bytes32 => Listing) public listings;

    constructor (address _developer, address _proofProvider) public {
        developer = address(uint160(_developer));
        proofProvider = ISPVRequestManager(_proofProvider);
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
            _outpoint,      // spends
            hex"",          // pays
            0,              // paysValue
            address(this),  // consumer
            8,              // numConfs
            0               // notBefore
        );

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
        bytes32,
        bytes calldata _vin,
        bytes calldata _vout,
        uint256,
        uint8,
        uint8
    ) external {
        require(msg.sender == address(proofProvider), "CallbackSwap/spv - Not the SPV provider");

        bytes32 _listingID = keccak256(_vin.slice(1, 36));

        Listing storage _listing = listings[_listingID];
        require(_listing.state == ListingStates.ACTIVE, "CallbackSwap/spv - Listing has closed or does not exist.");

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
