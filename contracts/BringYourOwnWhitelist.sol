pragma solidity 0.4.25;

contract BringYourOwnWhitelist {

    mapping(address => mapping(address => bool)) whitelists;
    mapping(address => bool) whitelistExists;
    mapping(address => uint) openPositions;  

    function noOpenPositions(address user) return (bool);

    function addWhitelistEntries(address[] entries) returns (bool) {
        // adds entries to the whitelists mapping
        // set whitelistExists = true if false
    }   

    function removeWhitelistEntires(address[] entries) returns (bool) {
        // remove entries to the whitelists mapping
        require(noOpenPositions(msg.sender));    
    }   

    // only care about checking if someone is NOT on it
    function checkWhitelist(address _entry) return (bool) {
        // check if msg.sender is exists
        if (!whitelistExist[msg.sender]) {
            return true;
        };  
        // look for _entry in whitelists
        // false is _entry is not whitelisted, true if they are 
        return whitelist[msg.sender][_entry];
    }   
}
