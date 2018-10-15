pragma solidity 0.4.25;

contract BringYourOwnWhitelist {

    mapping(address => mapping(address => bool)) whitelists;
    mapping(address => bool) whitelistExists;
    mapping(address => uint) openPositions;

    function noOpenPositions(address user) return (bool) {
        return openPositions[user] == 0;
    };

    function addWhitelistEntries(address[] entries) returns (bool) {
        // set whitelistExists = true if false
        if (!whitelistExists[msg.sender]) {
            whitelistExists[msg.sender] = true;
        }

        // adds entries to the whitelists mapping
        for (uint i = 0; i < entries.length; i++) {
            whitelists[msg.sender][entres[i]] = true;
        }

        return true;
    }

    function removeWhitelistEntires(address[] entries) returns (bool) {
        // remove entries to the whitelists mapping
        require(noOpenPositions(msg.sender));

        // adds entries to the whitelists mapping
        for (uint i = 0; i < entries.length; i++) {
            whitelists[msg.sender][entres[i]] = false;
        }

        return true;
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
