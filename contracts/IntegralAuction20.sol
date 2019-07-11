pragma solidity 0.4.25;

import {IERC20} from "./IERC20.sol";
import {IntegralAuction} from "./IntegralAuction.sol";

contract IntegralAuction20 is IntegralAuction {

    constructor (address _manager) public IntegralAuction(_manager) {}

    /// @notice             Ensures that the tokens are transferred
    /// @dev                Calls transferFrom on the erc20 contract, and checks that no ether is being burnt
    /// @param _asset       The address of the erc20 token contract
    /// @param _value       The number of tokens to transfer
    function ensureFunding(address _asset, uint256 _value) internal {
        require(msg.value == 0, 'Do not burn ether here please');
        require(_value > 0, '_value must be greater than 0');
        require(
            IERC20(_asset).transferFrom(msg.sender, address(this), _value),
            'transferFrom failed'
        );
    }


    /// @notice             Transfers tokens to the bidder and manager
    /// @dev                Calls allocate to calculate shares
    /// @param _auction     A pointer to the auction
    function distribute(Auction storage _auction) internal {
        // Calculate fee and bidder shares
        uint256 _feeShare;
        uint256 _bidderShare;
        (_feeShare, _bidderShare) = _allocate(_auction.value);

        // send manager fee
        require(
            IERC20(_auction.asset).transfer(
                manager, _feeShare),
            'Manager transfer failed.'
        );

        // send bidder proceeds
        require(
            IERC20(_auction.asset).transfer(
                _auction.bidder, _bidderShare),
            'Bidder transfer failed.'
        );
    }
}
