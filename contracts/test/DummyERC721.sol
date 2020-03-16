pragma solidity ^0.5.10;


contract DummyERC721 {
    uint8 errorTimer;

    constructor() public {
        errorTimer = 0;
    }

    function transferFrom(
        address,
        address,
        uint256
    ) public {
        _do();
    }

    function setError(uint8 _timer) external {
        errorTimer = _timer;
    }

    function clearError() external {
        errorTimer = 0;
    }

    function _do() internal {
        if (errorTimer == 1) {
            require(false, 'Dummy revert');
        }
        errorTimer -= 1;
    }

    function balanceOf(address) public pure returns (uint256) {return 0;}
    function ownerOf(uint256) public pure returns (address) {return address(0);}

    function approve(address, uint256) public pure {}
    function getApproved(uint256)
      public pure returns (address) {return address(0);}

    function setApprovalForAll(address, bool) public {}
    function isApprovedForAll(address, address)
      public pure returns (bool) {return true;}

    function safeTransferFrom(address, address, uint256) public pure {}

    function safeTransferFrom(
      address,
      address,
      uint256,
      bytes memory
    ) public pure {}
}
