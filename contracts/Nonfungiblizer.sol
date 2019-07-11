pragma solidity 0.4.25;

import {IERC20} from "./IERC20.sol";


contract Nonfungiblizer {

    bool initDone;
    address owner;
    address asset;
    uint256 value;

    function init(address _asset, uint256 _value) {
        require(!initDone);
        require(_value > 0, '_value must be greater than 0');
        require(
            IERC20(_asset).transferFrom(msg.sender, address(this), _value),
            'transferFrom failed'
        );
        asset = _asset;
        initDone = true;
    }

    function withdraw(address _recipient) {
        require(msg.sender == owner);
        uint256 balance = IERC20(asset).balanceOf(address(this));
        IERC20(asset).transfer(_recipient, balance);
    }

    function withdrawToken(address _recipient, address _asset) {
        require(msg.sender == owner);
        uint256 balance = IERC20(asset).balanceOf(address(this));
        IERC20(asset).transfer(_recipient, balance);
    }

    function withdrawEth(address _recipient) {
        require(msg.sender == owner);
        _recipient.transfer(address(this).balance);
    }

    function selfdestruct() {
        require(msg.sender == owner);
        selfdestruct();
    }

    function transfer(address _newOwner) {
        require(msg.sender == owner);
        owner = _newOwner;
    }
}
