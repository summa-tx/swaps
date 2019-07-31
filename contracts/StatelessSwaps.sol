pragma solidity ^0.5.10;

import {IERC20} from "./interfaces/IERC20.sol";
import {IERC721} from "./interfaces/IERC721.sol";
import {StatelessSwap} from "./StatelessSwap.sol";


contract StatelessSwapEth is StatelessSwap {

    /* solium-disable-next-line */
    constructor (address _developer) public StatelessSwap(_developer) {}

    /// @notice             Ensures that ether is paid in
    /// @dev                User must pass in address(0) and the amount of ether
    /// @param _asset       Must be address(0)
    /// @param _value       The amount of ether in msg.value
    function ensureFunding (address _asset, uint256 _value) internal {
        // Require Seller to fund tx
        require(msg.value > 0, "No asset received. Listing must be funded on initialization.");
        require(_asset == address(0), "asset must be zero address for ether listings.");
        require(_value == msg.value, "value must equal msg.value");
    }

    /// @notice             Transfers ETH to the bidder and developer
    /// @dev                Calls allocate to calculate shares
    /// @param _listing     A pointer to the listing
    function distribute(Listing storage _listing) internal {
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

contract StatelessSwap20 is StatelessSwap {

    /* solium-disable-next-line */
    constructor (address _developer) public StatelessSwap(_developer) {}

    /// @notice             Ensures that the tokens are transferred
    /// @dev                Calls transferFrom on the erc20 contract, and checks that no ether is being burnt
    /// @param _asset       The address of the erc20 token contract
    /// @param _value       The number of tokens to transfer
    function ensureFunding(address _asset, uint256 _value) internal {
        require(msg.value == 0, "Do not burn ether here please");
        require(_value > 0, "_value must be greater than 0");
        require(
            IERC20(_asset).transferFrom(msg.sender, address(this), _value),
            "transferFrom failed"
        );
    }


    /// @notice             Transfers tokens to the bidder and developer
    /// @dev                Calls allocate to calculate shares
    /// @param _listing     A pointer to the listing
    function distribute(Listing storage _listing) internal {
        // Calculate fee and bidder shares
        uint256 _feeShare;
        uint256 _bidderShare;
        (_feeShare, _bidderShare) = _allocate(_listing.value);

        // send developer fee
        require(
            IERC20(_listing.asset).transfer(
                developer, _feeShare),
            "Developer transfer failed."
        );

        // send bidder proceeds
        require(
            IERC20(_listing.asset).transfer(_listing.bidder, _bidderShare),
            "Bidder transfer failed."
        );
    }
}

contract StatelessSwap721 is StatelessSwap {

    /* solium-disable-next-line */
    constructor (address _developer) public StatelessSwap(_developer) {}

    /// @notice             Ensures that the NFT is transferred
    /// @dev                Calls transferFrom on the erc721 contract, and checks that no ether is being burnt
    /// @param _asset       The address of the erc721 token contract
    /// @param _value       The ID number of the token to transfer
    function ensureFunding(address _asset, uint256 _value) internal {
        require(msg.value == 0, "Do not burn ether here please");
        IERC721(_asset).transferFrom(msg.sender, address(this), _value);
    }

    /// @notice             Transfers the NFT to the bidder
    /// @dev                Calls transferFrom on the erc721 contract
    /// @param _listing     A pointer to the listing
    function distribute(Listing storage _listing) internal {
        // Transfer tokens to bidder
        IERC721(_listing.asset).transferFrom(
            address(this), _listing.bidder, _listing.value);
    }
}
