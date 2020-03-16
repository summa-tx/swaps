pragma solidity ^0.5.10;

contract DummyERC20 {
    uint8 errorTimer;

    mapping (address => uint256) public balances;

    constructor() public {
        errorTimer = 0;
    }

    function totalSupply() external pure returns (uint256) {return 0;}

    function balanceOf(address who) external view returns (uint256) {
        return balances[who];
    }

    function allowance(address owner, address)
      external pure returns (uint256) {return uint256(owner);}

    function approve(address, uint256)
      external pure returns (bool) {return true;}

    function transferFrom(
        address,
        address to,
        uint256 value
    ) external returns (bool) {
        balances[to] = value;
        return _do();
    }

    function transfer(
        address to,
        uint256 value
    ) external returns (bool) {
        balances[to] = value;
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
