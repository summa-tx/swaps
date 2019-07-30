pragma solidity ^0.5.10;

import {IntegralAuction} from "../IntegralAuction.sol";

contract DummyAuction is IntegralAuction {

    constructor (address _developer) public IntegralAuction(_developer) {}

    function ensureFunding(address _asset, uint256 _value) internal {
        _asset; _value;
    }

    function distribute(Auction storage _auction) internal {
        _auction;
    }
}
