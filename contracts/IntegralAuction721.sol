pragma solidity 0.4.25;

import {IERC721} from "./IERC721.sol";
import {IntegralAuction} from "./IntegralAuction.sol";

contract IntegralAuction721 is IntegralAuction {

    constructor (address _manager) public IntegralAuction(_manager) {}

    /// @notice             Ensures that the NFT is transferred
    /// @dev                Calls transferFrom on the erc721 contract, and checks that no ether is being burnt
    /// @param _asset       The address of the erc721 token contract
    /// @param _value       The ID number of the token to transfer
    function ensureFunding(address _asset, uint256 _value) internal {
        require(msg.value == 0, 'Do not burn ether here please');
        IERC721(_asset).transferFrom(msg.sender, address(this), _value);
    }

    /// @notice             Transfers the NFT to the bidder
    /// @dev                Calls transferFrom on the erc721 contract
    /// @param _auction     A pointer to the auction
    function distribute(Auction storage _auction) internal {
        // Transfer tokens to bidder
        IERC721(_auction.asset).transferFrom(
            address(this), _auction.bidder, _auction.value);
    }
}
