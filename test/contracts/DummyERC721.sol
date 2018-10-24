pragma solidity 0.4.25;

import {IERC721} from "./IERC721.sol";


contract DummyERC721 is IERC721 {
    uint8 errorTimer;

    constructor() {
        errorTimer = 0;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
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

    function balanceOf(address owner) public view returns (uint256 balance) {return 0;}
    function ownerOf(uint256 tokenId) public view returns (address owner) {return address(0);}

    function approve(address to, uint256 tokenId) public {}
    function getApproved(uint256 tokenId)
      public view returns (address operator) {return address(0);}

    function setApprovalForAll(address operator, bool _approved) public {}
    function isApprovedForAll(address owner, address operator)
      public view returns (bool) {return true;}

    function safeTransferFrom(address from, address to, uint256 tokenId) {}

    function safeTransferFrom(
      address from,
      address to,
      uint256 tokenId,
      bytes data
    ) public {}
}
