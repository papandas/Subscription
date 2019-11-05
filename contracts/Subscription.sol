pragma solidity ^0.5.0;

import "./SafeMath.sol";

contract Subscription {

    enum SubscriptionState { INACTIVE, ACTIVE }

    struct subscriber {
        uint256 index;
        address creator;
        uint256 endDT;
    }

    uint256 public subscriptionIndex;

    mapping(uint256 => subscriber) public subscriptions;
    mapping(uint => uint256[]) public subscriptionByActive;
    mapping(address => uint256[]) public subscriptionByOwner;

    // EVENT
    event SubscriptionEvent(address indexed sender, uint256 _subscriptionIndex, uint _value);

    constructor() public {
    }

    function putSubscriptions(uint256 _closing) public payable {
        subscriptionIndex++;
        subscriptions[subscriptionIndex] = subscriber(subscriptionIndex, msg.sender, _closing);

        subscriptionByActive[uint(SubscriptionState.ACTIVE)].push(subscriptionIndex);

        subscriptionByOwner[msg.sender].push(subscriptionIndex);

        emit SubscriptionEvent(msg.sender, subscriptionIndex, msg.value);
    }

}