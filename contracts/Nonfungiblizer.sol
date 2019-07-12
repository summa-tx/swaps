pragma solidity 0.4.25;

import {IERC20} from "./interfaces/IERC20.sol";


contract Nonfungiblizer {

    address owner;
    uint256 value;
    address asset = address(0);

    function init(address _asset, uint256 _value) public {
        require(_asset == address(0));
        require(_value > 0, '_value must be greater than 0');
        require(
            IERC20(_asset).transferFrom(msg.sender, address(this), _value),
            'transferFrom failed'
        );
        asset = _asset;
    }

    function withdraw(address _recipient) public  {
        require(msg.sender == owner);
        uint256 balance = IERC20(asset).balanceOf(address(this));
        IERC20(asset).transfer(_recipient, balance);
    }

    function withdrawToken(address _recipient) public  {
        require(msg.sender == owner);
        uint256 balance = IERC20(asset).balanceOf(address(this));
        IERC20(asset).transfer(_recipient, balance);
    }

    function withdrawToken(address _recipient, address _asset) public  {
        require(msg.sender == owner);
        uint256 balance = IERC20(_asset).balanceOf(address(this));
        IERC20(_asset).transfer(_recipient, balance);
    }

    function withdrawEth(address _recipient) public  {
        require(msg.sender == owner);
        _recipient.transfer(address(this).balance);
    }

    function shutdown() public  {
        require(msg.sender == owner);
        selfdestruct(owner);
    }

    function transfer(address _newOwner) public  {
        require(msg.sender == owner);
        owner = _newOwner;
    }
}
