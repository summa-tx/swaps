pragma solidity 0.4.25;

import {IntegralAuction} from "./IntegralAuction.sol";

contract AuctionDummy is IntegralAuction {

    constructor (address _manager) public IntegralAuction(_manager) {}

    function ensureFunding(address _asset, uint256 _value) internal {
        require(true);
    }

    function distribute(bytes32 _auctionId) internal {
        require(true);
    }
}
