pragma solidity 0.4.25;

import {IERC20} from "./IERC20.sol";
import {IntegralAuction} from "./IntegralAuction.sol";

contract IntegralAuction20 is IntegralAuction {

    constructor (address _manager) public IntegralAuction(_manager) {}

    function ensureFunding(address _asset, uint256 _value) internal {
        require(msg.value == 0, 'Do not burn ether here please');
        require(_value > 0, '_value must be greater than 0');
        require(
            IERC20(_asset).transferFrom(msg.sender, address(this), _value),
            'transferFrom failed'
        );
    }

    function distribute(bytes32 _auctionId) internal {
        // Calculate fee and bidder shares
        uint256 _feeShare;
        uint256 _bidderShare;
        (_feeShare, _bidderShare) = allocate(_auctionId);

        // send manager fee
        require(
            IERC20(auctions[_auctionId].asset).transfer(
                manager, _feeShare),
            'Manager transfer failed.'
        );

        // send bidder proceeds
        require(
            IERC20(auctions[_auctionId].asset).transfer(
                auctions[_auctionId].bidder, _bidderShare),
            'Bidder transfer failed.'
        );
    }
}
