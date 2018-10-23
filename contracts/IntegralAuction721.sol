pragma solidity 0.4.25;

import {IERC721} from "./IERC721.sol";
import {IntegralAuction} from "./IntegralAuction.sol";

contract IntegralAuction721 is IntegralAuction {

    constructor (address _manager) public IntegralAuction(_manager) {}

    function ensureFunding(address _asset, uint256 _value) internal {
        IERC721(_asset).transferFrom(msg.sender, address(this), _value);
    }

    function distribute(bytes32 _auctionId) internal {
        // Transfer tokens to bidder
        IERC721(auctions[_auctionId].asset).transferFrom(
            address(this), auctions[_auctionId].bidder, auctions[_auctionId].value);
    }
}
