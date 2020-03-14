pragma solidity ^0.5.10;


import {ERC20} from "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

import {SafeMath} from "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract NoFun {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    address developer;
    address owner;
    uint256 value;
    ERC20 asset;

    function init(address _developer, address _asset) public {
        require(developer == address(0), "NoFun/init - already init");
        require(_asset != address(0), "NoFun/init - no 0 asset");
        developer = _developer;
        asset = ERC20(_asset);
    }

    function withdrawERC20(address _recipient, address _asset) public  {
        require(msg.sender == owner, "NoFun/withdrawERC20 - only owner");
        uint256 _feeShare;
        uint256 _ownerShare;

        uint256 _balance = ERC20(_asset).balanceOf(address(this));
        (_feeShare, _ownerShare) = _allocate(_balance);

        ERC20(_asset).safeTransfer(_recipient, _ownerShare);
        ERC20(_asset).safeTransfer(developer, _feeShare);
    }

    function withdrawEth(address _recipient) public  {
        require(msg.sender == owner, "NoFun/withdrawEth - only owner");
        uint256 _feeShare;
        uint256 _ownerShare;

        uint256 _balance = address(this).balance;
        (_feeShare, _ownerShare) = _allocate(_balance);

        address(uint160(_recipient)).transfer(_ownerShare);
        address(uint160(developer)).transfer(_feeShare);
    }

    function shutdown() public  {
        require(msg.sender == owner, "NoFun/shutdown - only owner");
        uint256 _feeShare;
        uint256 _ownerShare;

        uint256 _balance = address(this).balance;
        (_feeShare, _ownerShare) = _allocate(_balance);

        address(uint160(developer)).transfer(_feeShare);
        selfdestruct(address(uint160(owner)));
    }

    function transfer(address _newOwner) public returns (bool) {
        require(msg.sender == owner, "NoFun/transfer - only owner");
        owner = _newOwner;
        return true;
    }

    /// @notice             Calculates the developer's fee
    /// @dev                Looks up the listing and calculates a 25bps fee. Do not use for erc721.
    /// @param _value       The amount of value to split between bidder and developer
    /// @return             The fee share and the bidder's share
    function _allocate(uint256 _value) internal pure returns (uint256, uint256) {
        // developer share
        uint256 _feeShare = _value.div(400);
        // Bidder share
        uint256 _bidderShare = _value.sub(_feeShare);
        return (_feeShare, _bidderShare);
    }

    /// @notice             Calculates the developer's fee
    /// @dev                Looks up the listing and calculates a 25bps fee. Do not use for erc721.
    /// @param _value       The amount of value to split between bidder and developer
    /// @return             The fee share and the bidder's share
    function allocate(uint256 _value) external pure returns (uint256, uint256) {
        return _allocate(_value);
    }
}
