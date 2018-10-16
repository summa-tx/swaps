pragma solidity 0.4.25;

contract BringYourOwnWhitelist {

    mapping(address => mapping(address => bool)) public whitelists;
    mapping(address => bool) public whitelistExists;
    mapping(address => uint) public openPositions;

    /// @notice         Checks that the user has no open contracts
    /// @dev            We record open positions in a mapping that must be updated
    /// @param _user    The user's address
    /// @return         false if they have active contracts, otherwise true
    function noOpenPositions(address _user) public view returns (bool) {
        return openPositions[_user] == 0;
    }

    /// @notice             Adds approved counterparties to a whitelist
    /// @dev                Updates the whitelists mapping
    /// @param _entries     The entries to approve
    /// @return             true if successfully updated, otherwise OOG error
    function addWhitelistEntries(address[] _entries) public returns (bool) {
        // set whitelistExists = true if false
        if (!whitelistExists[msg.sender]) {
            whitelistExists[msg.sender] = true;
        }

        // adds entries to the whitelists mapping
        for (uint i = 0; i < _entries.length; i++) {
            address _a = _entries[i];
            whitelists[msg.sender][_a] = true;
        }

        return true;
    }

    /// @notice             Removes parties from a whitelist
    /// @dev                Updates the whitelists mapping
    /// @param _entries     The entries to block
    /// @return             true if successfully updated, otherwise OOG error
    function removeWhitelistEntires(address[] _entries) public returns (bool) {
        // remove entries to the whitelists mapping
        require(noOpenPositions(msg.sender), 'Must close all positions before removing entries.');

        // removes entries from the whitelists mapping
        for (uint i = 0; i < _entries.length; i++) {
            address _a = _entries[i];
            whitelists[msg.sender][_a] = false;
        }

        return true;
    }

    /// @notice         Checks a user's whitelist to see if a counterparty is approved
    /// @dev            Approves all users if no whitelist is set
    /// @param _entry   The entry to check
    /// @return         true if approved, or no whitelist set, otherwise false
    function checkWhitelist(address _entry) public view returns (bool) {
        // check if msg.sender is exists
        if (!whitelistExists[msg.sender]) {
            return true;
        }
        // look for _entry in whitelists
        // false is _entry is not whitelisted, true if they are
        return whitelists[msg.sender][_entry];
    }
}
