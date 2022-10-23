// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@opengsn/contracts/src/ERC2771Recipient.sol";

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

contract DisperseGasless is ERC2771Recipient {
    constructor(address _trustedForwarder) {
        _setTrustedForwarder(_trustedForwarder);
    }

    function disperseEther(address[] memory recipients, uint256[] memory values)
        external
        payable
    {
        for (uint256 i = 0; i < recipients.length; i++)
            payable(recipients[i]).transfer(values[i]);
        uint256 balance = address(this).balance;
        if (balance > 0) payable(_msgSender()).transfer(balance);
    }

    function disperseToken(
        IERC20 token,
        address[] memory recipients,
        uint256[] memory values
    ) external {
        uint256 total = 0;
        for (uint256 i = 0; i < recipients.length; i++) total += values[i];
        require(token.transferFrom(_msgSender(), address(this), total));
        for (uint256 i = 0; i < recipients.length; i++)
            require(token.transfer(recipients[i], values[i]));
    }

    function disperseTokenSimple(
        IERC20 token,
        address[] memory recipients,
        uint256[] memory values
    ) external {
        for (uint256 i = 0; i < recipients.length; i++)
            require(token.transferFrom(_msgSender(), recipients[i], values[i]));
    }
}
