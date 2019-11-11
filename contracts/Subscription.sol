pragma solidity ^0.5.0;

contract Subscription {

    enum SubscriptionState { INACTIVE, ACTIVE }

    struct subscriber {
        uint256 index;
        address creator;
        uint256 endDT;
        string dtOffset;
    }

    address payable public owner;
    uint256 public subscriptionIndex;

    mapping(uint256 => subscriber) public subscriptions;
    mapping(address => uint256[]) public subscriptionByOwner;

    // EVENT
    event SubscriptionEvent(address indexed sender, uint256 _subscriptionIndex, uint _value);

    constructor() public {
        owner = msg.sender;
    }

    function kill() external {
        require(msg.sender == owner, "Only the owner can kill this contract");

        selfdestruct(owner);
    }

    function contractWithdraw() internal {
        require(msg.sender == owner, "Only the owner can withdraw.");
        require(address(this).balance > 0, "Contract balance is zero.");

        owner.transfer(address(this).balance);
    }

    function putSubscriptions(uint256 _closing, string memory _dtOffset) public payable {
        require(_closing != 0, "Closing time will be non-zero.");
        require(address(msg.sender).balance >= msg.value, "Insufficient account balance.");

        subscriptionIndex++;
        subscriptions[subscriptionIndex] = subscriber(subscriptionIndex, msg.sender, _closing, _dtOffset);

        subscriptionByOwner[msg.sender].push(subscriptionIndex);

        emit SubscriptionEvent(msg.sender, subscriptionIndex, msg.value);
    }

}