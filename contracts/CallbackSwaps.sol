pragma solidity ^0.5.10;

import {NoFun} from "./NoFun.sol";
import {Factory} from "./CloneFactory.sol";
import {CallbackSwap} from "./CallbackSwap.sol";

import {ERC20} from "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import {SafeERC20} from "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract CallbackSwapEth is CallbackSwap {

    constructor (
        address _developer,
        address _proofProvider
    ) public CallbackSwap(_developer, _proofProvider) {}

    /// @notice             Ensures that ether is paid in
    /// @dev                User must pass in address(0) and the amount of ether
    /// @param _listing    The listing object to   in msgthat we expect to be funded
    function ensureFunding (Listing storage _listing) internal {
        // Require Seller to fund tx
        require(msg.value > 0, "No asset received. Listing must be funded on initialization.");
        require(_listing.asset == address(0), "asset must be zero address for ether listings.");
        require(_listing.value == msg.value, "value must equal msg.value");
    }

    /// @notice             Transfers ETH to the bidder and developer
    /// @dev                Calls allocate to calculate shares
    /// @param _listing     A pointer to the listing
    function distribute(Listing storage _listing) internal {
        if (_listing.bidder == _listing.seller) {
            // No fee for cancellation
            address(uint160(_listing.seller)).transfer(_listing.value);
        } else {
            // Calculate fee and bidder shares
            uint256 _feeShare;
            uint256 _bidderShare;
            (_feeShare, _bidderShare) = _allocate(_listing.value);

            // Transfer fee
            address(developer).transfer(_feeShare);

            // Transfer eth to selected bidder
            address(uint160(_listing.bidder)).transfer(_bidderShare);
        }
    }
}


contract CallbackSwap20 is CallbackSwap {

    using SafeERC20 for ERC20;

    constructor (
        address _developer,
        address _proofProvider
    ) public CallbackSwap(_developer, _proofProvider) {}

    /// @notice             Ensures that the tokens are transferred
    /// @dev                Calls transferFrom on the erc20 contract, and checks that no ether is being burnt
    /// @param _listing     The listing that we expect to be funded
    function ensureFunding (Listing storage _listing) internal {
        require(msg.value == 0, "Do not burn ether here please");
        require(_listing.value > 0, "_value must be greater than 0");
        ERC20(_listing.asset).safeTransferFrom(msg.sender, address(this), _listing.value);
    }

    /// @notice             Transfers tokens to the bidder and developer
    /// @dev                Calls allocate to calculate shares
    /// @param _listing     A pointer to the listing
    function distribute(Listing storage _listing) internal {
        if (_listing.bidder == _listing.seller) {
            // No fee for cancellation
            ERC20(_listing.asset).safeTransfer(_listing.seller, _listing.value);
        } else {
            // Calculate fee and bidder shares
            uint256 _feeShare;
            uint256 _bidderShare;
            (_feeShare, _bidderShare) = _allocate(_listing.value);

            // send developer fee
            ERC20(_listing.asset).safeTransfer(developer, _feeShare);
            // send bidder proceeds
            ERC20(_listing.asset).safeTransfer(_listing.bidder, _bidderShare);
        }
    }
}


contract CallbackSwap721 is CallbackSwap {

    constructor (
        address _developer,
        address _proofProvider
    ) public CallbackSwap(_developer, _proofProvider) {}

    /// @notice             Ensures that the NFT is transferred
    /// @dev                Calls transferFrom on the erc721 contract, and checks that no ether is being burnt
    /// @param _listing     The listing that we expect to be funded
    function ensureFunding (Listing storage _listing) internal {
        require(msg.value == 0, "Do not burn ether here please");
        ERC721(_listing.asset).transferFrom(msg.sender, address(this), _listing.value);
    }

    /// @notice             Transfers the NFT to the bidder
    /// @dev                Calls transferFrom on the erc721 contract
    /// @param _listing     A pointer to the listing
    function distribute(Listing storage _listing) internal {
        // Transfer tokens to bidder
        ERC721(_listing.asset).transferFrom(
            address(this), _listing.bidder, _listing.value);
    }
}

contract CallbackSwapNoFun is CallbackSwap, Factory {

    using SafeERC20 for ERC20;

    address noFun;  // The NoFun implementation for cloning

    constructor (
        address _developer,
        address _proofProvider,
        address _noFun
    ) public CallbackSwap(_developer, _proofProvider) {
        noFun = _noFun;
    }

    /// @notice             Ensures that the Tokens are transferred to a new wrapper
    /// @dev                Calls transferFrom on the erc20 contract,
    /// @param _listing     The listing that we expect to be funded
    function ensureFunding (Listing storage _listing) internal {
        _listing.wrapper = createClone(noFun);
        NoFun(_listing.wrapper).init(developer, _listing.asset);
        ERC20(_listing.asset).safeTransferFrom(msg.sender, _listing.wrapper, _listing.value);
    }

    /// @notice             Transfers the NoFun wrapper to the bidder
    /// @dev                Calls transfer on the NoFun contract
    /// @param _listing     A pointer to the listing
    function distribute(Listing storage _listing) internal {
        NoFun(_listing.wrapper).transfer(_listing.bidder);
    }

}
