pragma solidity ^0.5.10;

import {StatelessSwap} from "../StatelessSwap.sol";

contract DummySwap is StatelessSwap {

    constructor (address _developer) public StatelessSwap(_developer) {}

    function ensureFunding(Listing storage _listing) internal {
        _listing;
    }

    function distribute(Listing storage _listing) internal {
        _listing;
    }
}
