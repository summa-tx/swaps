pragma solidity 0.4.25;

import {IERC20} from "./IERC20.sol";

contract ProxyFactory {
    event ProxyDeployed(address proxyAddress, address targetAddress);
    event ProxiesDeployed(address[] proxyAddresses, address targetAddress);

    function createManyProxies(uint256 _count, address _target, bytes _data)
        external
    {
        address[] memory proxyAddresses = new address[](_count);

        for (uint256 i = 0; i < _count; ++i) {
            proxyAddresses[i] = createProxyImpl(_target, _data);
        }

        ProxiesDeployed(proxyAddresses, _target);
    }

    function createProxy(address _target, bytes _data)
        external
        returns (address proxyContract)
    {
        proxyContract = createProxyImpl(_target, _data);

        ProxyDeployed(proxyContract, _target);
    }

    function createProxyImpl(address _target, bytes _data)
        internal
        returns (address proxyContract)
    {
        assembly {
            let contractCode := mload(0x40) // Find empty storage location using "free memory pointer"

            mstore(add(contractCode, 0x0b), _target) // Add target address, with a 11 bytes [i.e. 23 - (32 - 20)] offset to later accomodate first part of the bytecode
            mstore(sub(contractCode, 0x09), 0x000000000000000000603160008181600b9039f3600080808080368092803773) // First part of the bytecode, shifted left by 9 bytes, overwrites left padding of target address
            mstore(add(contractCode, 0x2b), 0x5af43d828181803e808314602f57f35bfd000000000000000000000000000000) // Final part of bytecode, offset by 43 bytes

            proxyContract := create(0, contractCode, 60) // total length 60 bytes
            if iszero(extcodesize(proxyContract)) {
                revert(0, 0)
            }

            // check if the _data.length > 0 and if it is forward it to the newly created contract
            let dataLength := mload(_data)
            if iszero(iszero(dataLength)) {
                if iszero(call(gas, proxyContract, 0, add(_data, 0x20), dataLength, 0, 0)) {
                    revert(0, 0)
                }
            }
        }
    }
}

contract Nonfungiblizer {

    bool initDone;
    address owner;
    address asset;
    uint256 value;

    constructor () {}

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
        IERC20(asset).transfer(_recipient), balance);
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
