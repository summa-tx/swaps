pragma solidity 0.4.25;

contract BringYourOwnWhitelist {

    event AddedWhitelistEntries(address indexed _sender);
    event RemovedWhitelistEntries(address indexed _sender);

    mapping(address => mapping(address => bool)) public whitelists;
    mapping(address => bool) public whitelistExists;
    mapping(address => uint) public openPositions;

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

        // Emit event notifying entries were added to the whitelist
        emit AddedWhitelistEntries(msg.sender);

        return true;
    }

    /// @notice             Removes parties from a whitelist
    /// @dev                Updates the whitelists mapping
    /// @param _entries     The entries to block
    /// @return             true if successfully updated, otherwise OOG error
    function removeWhitelistEntires(address[] _entries) public returns (bool) {
        // remove entries to the whitelists mapping
        require(openPositions[msg.sender] == 0, 'Must close all positions before removing entries.');

        // removes entries from the whitelists mapping
        for (uint i = 0; i < _entries.length; i++) {
            address _a = _entries[i];
            whitelists[msg.sender][_a] = false;

        }

        // Emit event notifying entries were removed from the whitelist
        emit RemovedWhitelistEntries(msg.sender);

        return true;
    }

    /// @notice         Checks a user's whitelist to see if a counterparty is approved
    /// @dev            Approves all users if no whitelist is set
    /// @param _list    The user whose list  we want to check
    /// @param _entry   The entry to check
    /// @return         true if approved, or no whitelist set, otherwise false
    function checkWhitelist(address _list, address _entry) public view returns (bool) {
        // check if the user has a whitelist
        // also check if the list and entry are the same
        if (!whitelistExists[_list] || _list == _entry) {
            return true;
        }
        // look for _entry in whitelists
        // false if _entry is not whitelisted, true if they are
        return whitelists[_list][_entry];
    }
}
