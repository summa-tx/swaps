pragma solidity ^0.5.10;

import {IERC721} from "../interfaces/IERC721.sol";


contract DummyERC721 is IERC721 {
    uint8 errorTimer;

    constructor() public {
        errorTimer = 0;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public {
        from; to; value;
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

    function balanceOf(address owner) public view returns (uint256 balance) {owner; return 0;}
    function ownerOf(uint256 tokenId) public view returns (address owner) {tokenId; return address(0);}

    function approve(address to, uint256 tokenId) public {to; tokenId;}
    function getApproved(uint256 tokenId)
      public view returns (address operator) {tokenId; return address(0);}

    function setApprovalForAll(address operator, bool _approved) public {operator; _approved;}
    function isApprovedForAll(address owner, address operator)
      public view returns (bool) {owner; operator; return true;}

    function safeTransferFrom(address from, address to, uint256 tokenId) public {from; to; tokenId;}

    function safeTransferFrom(
      address from,
      address to,
      uint256 tokenId,
      bytes memory data
    ) public {from; to; tokenId; data;}
}
