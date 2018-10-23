pragma solidity 0.4.25;

import {IntegralAuction} from "./IntegralAuction.sol";

contract IntegralAuctionEth is IntegralAuction {

    constructor (address _manager) public IntegralAuction(_manager) {}

    function ensureFunding (address _asset, uint256 _value) internal {
        // Require Seller to fund tx
        require(msg.value > 0, "No asset received. Auction must be funded on initialization.");
        require(_asset == address(0), "asset must be zero address for ether auctions.");
        require(_value == msg.value, "value must equal msg.value");
    }

    function distribute(bytes32 _auctionId) internal {
        // Calculate fee and bidder shares
        uint256 _feeShare;
        uint256 _bidderShare;
        (_feeShare, _bidderShare) = allocate(_auctionId);

        // Transfer fee
        address(manager).transfer(_feeShare);

        // Transfer eth to selected bidder
        address(auctions[_auctionId].bidder).transfer(_bidderShare);
    }
}
