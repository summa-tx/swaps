pragma solidity 0.4.25;

import {IERC20} from "./IERC20.sol";

contract DummyERC20 is IERC20 {
    uint8 errorTimer;

    constructor() {
        errorTimer = 0;
    }

    function totalSupply() external view returns (uint256) {return 0;}

    function balanceOf(address who) external view returns (uint256) {return 0;}

    function allowance(address owner, address spender)
      external view returns (uint256) {return 0;}

    function approve(address spender, uint256 value)
      external returns (bool) {return true;}

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool) {
        return _do();
    }

    function transfer(
        address to,
        uint256 value
    ) external returns (bool) {
        return _do();
    }

    function setError(uint8 _timer) external {
        errorTimer = _timer;
    }

    function clearError() external {
        errorTimer = 0;
    }

    function _do() internal returns (bool) {
        if (errorTimer == 1) {
            errorTimer = 0;
            return false;
        }
        if (errorTimer > 1){
            errorTimer -= 1;
        }
        return true;
    }
}
