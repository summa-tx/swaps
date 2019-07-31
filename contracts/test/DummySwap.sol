pragma solidity ^0.5.10;

import {StatelessSwap} from "../StatelessSwap.sol";

contract DummySwap is StatelessSwap {

    constructor (address _developer) public StatelessSwap(_developer) {}

    function ensureFunding(address _asset, uint256 _value) internal {
        _asset; _value;
    }

    function distribute(Listing storage _listing) internal {
        _listing;
    }
}
