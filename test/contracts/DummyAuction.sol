pragma solidity 0.4.25;

import {IntegralAuction} from "./IntegralAuction.sol";

contract DummyAuction is IntegralAuction {

    constructor (address _manager) public IntegralAuction(_manager) {}

    function ensureFunding(address _asset, uint256 _value) internal {
        require(true);
    }

    function distribute(Auction storage _auction) internal {
        require(true);
    }

    function allocate(uint256 _value) external returns (uint256, uint256) {
        return _allocate(_value);
    }
}
