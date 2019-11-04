pragma solidity >=0.4.21 <0.6.0;

/**
 * @title SafeMath
 * @dev Math operations with safety checks that revert on error
 */
library SafeMath {
    /**
    * @dev Multiplies two numbers, reverts on overflow.
    */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b);

        return c;
    }

    /**
    * @dev Integer division of two numbers truncating the quotient, reverts on division by zero.
    */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
    * @dev Subtracts two numbers, reverts on overflow (i.e. if subtrahend is greater than minuend).
    */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a);
        uint256 c = a - b;

        return c;
    }

    /**
    * @dev Adds two numbers, reverts on overflow.
    */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a);

        return c;
    }

    /**
    * @dev Divides two numbers and returns the remainder (unsigned integer modulo),
    * reverts when dividing by zero.
    */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b != 0);
        return a % b;
    }
}

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    constructor () internal {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @return the address of the owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner());
        _;
    }

    /**
     * @return true if `msg.sender` is the owner of the contract.
     */
    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    /**
     * @dev Allows the current owner to relinquish control of the contract.
     * @notice Renouncing to ownership will leave the contract without an owner.
     * It will not be possible to call the functions with the `onlyOwner`
     * modifier anymore.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0));
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

contract Subscription is Ownable {
    using SafeMath for uint256;

    address private _wallet;
    uint256 private _periodDuration;
    uint256 private _price;

    mapping (address => subscriber) public subscribers;
    mapping (address => bool) public isExist;
    address[] public addresses;

    struct subscriber {
        bool _status;
        uint256 _endDate;
    }

    constructor (address wallet, uint256 periodDuration, uint256 price) public {
        require(wallet != address(0), "Wallet address can not be empty.");
        require(periodDuration > 0, "Duration should be non-zero.");
        require(price > 0, "Price should be non-zero.");
        _wallet = wallet;
        _periodDuration = periodDuration;
        _price = price;
    }

    function getSubscribersCount() public onlyOwner view returns (uint256) {
        return addresses.length;
    }

    function wallet() public view returns (address) {
        return _wallet;
    }

    function updateWallet(address newWallet) public onlyOwner {
        require(newWallet != address(0), "Wallet address can not be empty.");
        _wallet = newWallet;
    }

    function periodDuration() public view returns (uint256) {
        return _periodDuration;
    }

    function updatePeriodDuration(uint256 newPeriodDuration) public onlyOwner {
        require(newPeriodDuration > 0, "Duration should be non-zero.");
        _periodDuration = newPeriodDuration;
    }

    function price() public view returns (uint256) {
        return _price;
    }

    function updatePrice(uint256 newPrice) public onlyOwner {
        require(newPrice > 0, "Price should be non-zero.");
        _price = newPrice;
    }

    function subscribe() public payable {
        require(msg.value == _price);
        require(!isExist[msg.sender]);
        subscribers[msg.sender] = subscriber(true, block.timestamp.add(_periodDuration));
        isExist[msg.sender] = true;
        addresses.push(msg.sender);
    }

    function updateSubscription(address _address, bool _status, uint256 _endDate) public onlyOwner {
        require(isExist[_address]);
        require(_address != address(0));
        require(_endDate > 0);
        subscribers[_address] = subscriber(_status, _endDate);
    }
}