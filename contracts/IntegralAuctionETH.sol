pragma solidity 0.4.25;

import {IntegralAuction} from "./IntegralAuction.sol";

contract IntegralAuctionEth is IntegralAuction {

    constructor (address _manager) public IntegralAuction(_manager) {}

    /// @notice             Ensures that ether is paid in
    /// @dev                User must pass in address(0) and the amount of ether
    /// @param _asset       Must be address(0)
    /// @param _value       The amount of ether in msg.value
    function ensureFunding (address _asset, uint256 _value) internal {
        // Require Seller to fund tx
        require(msg.value > 0, "No asset received. Auction must be funded on initialization.");
        require(_asset == address(0), "asset must be zero address for ether auctions.");
        require(_value == msg.value, "value must equal msg.value");
    }

    /// @notice             Transfers ETH to the bidder and manager
    /// @dev                Calls allocate to calculate shares
    /// @param _auction     A pointer to the auction
    function distribute(Auction storage _auction) internal {
        // Calculate fee and bidder shares
        uint256 _feeShare;
        uint256 _bidderShare;
        (_feeShare, _bidderShare) = _allocate(_auction.value);

        // Transfer fee
        address(manager).transfer(_feeShare);

        // Transfer eth to selected bidder
        address(_auction.bidder).transfer(_bidderShare);
    }
}
