// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Contract to allow Tracer DAO to delegate funds to managers to spend as they see fit. 
 * Managers can request to withdraw funds assigned to them. The DAO may take back the funds at any time.
 */
contract FundManagement is Ownable {
    struct Fund {
        uint256 totalAmount; // Total amount of tokens assigned to the manager
        address asset;
        uint256 requestedWithdrawTime; // Timestamp which the manager may withdraw the pendingWithdrawAmount
        uint256 pendingWithdrawAmount; // Total amount of tokens the manager is pending to withdraw
    }

    using SafeERC20 for IERC20;

    uint256 public requestWindow = 2 days;
    mapping(address => mapping(uint256 => Fund)) public funds; // user -> fundId -> fund
    mapping(address => uint256) public numberOfFunds; // user -> number of funds owned
    mapping(address => uint256) public locked; // asset -> amount locked up

    constructor() {}

    /* ========== VIEWS ========== */

    /**
     * @notice Checks a users fund if they passed the withdraw window and amount they're able to claim.
     */
    function checkClaimableAmount(address account, uint256 fundNumber) external view returns (bool claimable, uint256 amount) {
        Fund memory fund = funds[account][fundNumber];
        return (block.timestamp >= fund.requestedWithdrawTime, fund.pendingWithdrawAmount);
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice User requests funds that are allocated to him. After the request window if no clawback, they may claim those requested  funds.
     */
    function requestFunds(uint256 fundNumber, uint256 amount) external {
        require(
            fundNumber >= 0 && fundNumber < numberOfFunds[msg.sender],
            "The input fund number does not exist"
        );
        Fund storage fund = funds[msg.sender][fundNumber];
        uint256 totalWithdrawableAmount = fund.pendingWithdrawAmount + amount;
        require(
            totalWithdrawableAmount <= fund.totalAmount, 
            "Requested amount plus withdrawable amount greater than total allocated funds"
        );
        
        fund.requestedWithdrawTime = block.timestamp + requestWindow;
        fund.pendingWithdrawAmount = totalWithdrawableAmount;

        emit RequestFunds(msg.sender, amount);
    }

    /**
     * @notice User claims the funds they requested. Only claimable after request window has passed with no clawbacks.
     */
    function claim(uint256 fundNumber) external {
        require(
            fundNumber >= 0 && fundNumber < numberOfFunds[msg.sender],
            "The input fund number does not exist"
        );
        Fund storage fund = funds[msg.sender][fundNumber];
        uint256 pendingAmount = fund.pendingWithdrawAmount;

        require(
            pendingAmount > 0,
            "No withdrawable funds"
        );
        require(
            pendingAmount <= fund.totalAmount, 
            "Withdrawable amount greater than total allocated funds"
        );
        require(
            block.timestamp >= fund.requestedWithdrawTime,
            "Your funds are not withdrawable yet"
        );

        locked[fund.asset] = locked[fund.asset] - pendingAmount;
        fund.totalAmount = fund.totalAmount - pendingAmount;
        fund.pendingWithdrawAmount = 0;

        IERC20(fund.asset).safeTransfer(msg.sender, pendingAmount);

        emit Claim(msg.sender, pendingAmount);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
     * @notice Owner of the contract may create a fund for a user/fundmanager. The fund will allow the user/fundmanager to request funds and claim it after the request window.
     */
    function createFund(address account, uint256 amount, address asset) external onlyOwner returns(uint256 fundNumber) {
        require(
            account != address(0) && asset != address(0),
            "Account or asset cannot be null"
        );
        require(
            amount > 0,
            "Invalid amount"
        );
        uint256 currentLocked = locked[asset];
        require(
            IERC20(asset).balanceOf(address(this)) >= currentLocked + amount,
            "Not enough tokens"
        );

        uint256 currentNumFunds = numberOfFunds[account];
        funds[account][currentNumFunds] = Fund(
            {
                totalAmount: amount,
                asset: asset,
                requestedWithdrawTime: 0,
                pendingWithdrawAmount: 0
            }
        );

        numberOfFunds[account] = currentNumFunds + 1;
        locked[asset] = currentLocked + amount;

        emit CreateFund(account, asset, amount);
        return currentNumFunds;
    }

    /**
     * @notice Stops a fund from being claimed by deallocating their amount to 0. Those deallocated funds are unlocked for the owner to withdraw or reallocate.
     */
    function clawbackFunds(address account, uint256 fundNumber) external onlyOwner {
        require(
            account != address(0),
            "Account cannot be null"
        );
        require(
            fundNumber >= 0 && fundNumber < numberOfFunds[account],
            "The input fund number does not exist"
        );
        Fund storage fund = funds[account][fundNumber];

        locked[fund.asset] = locked[fund.asset] - fund.totalAmount;
        fund.totalAmount = 0;
        fund.pendingWithdrawAmount = 0;

        emit Clawback(account, fundNumber);
    }

    /**
     * @notice Add more tokens to a fund.
     */
    function addToFund(address account, uint256 amount, uint256 fundNumber) external onlyOwner {
        require(
            account != address(0),
            "Account cannot be null"
        );
        require(
            fundNumber >= 0 && fundNumber < numberOfFunds[account],
            "The input fund number does not exist"
        );
        Fund storage fund = funds[account][fundNumber];

        uint256 currentLocked = locked[fund.asset];
        require(
            IERC20(fund.asset).balanceOf(address(this)) - currentLocked >= amount,
            "Not enough unlocked tokens to add"
        );

        fund.totalAmount = fund.totalAmount + amount;
        locked[fund.asset] = currentLocked + amount;

        emit AddToFund(account, amount, fundNumber);
    }

    /**
     * @notice Withdraws an asset only if its unlocked/deallocated. If you want to withdraw locked/allocated assets, clawback it first.
     */
    function withdrawUnlockedAssets(uint256 amount, address asset) external onlyOwner {
        IERC20 token = IERC20(asset);
        require(
            token.balanceOf(address(this)) - locked[asset] >= amount,
            "Not enough unlocked tokens to withdraw"
        );
        token.safeTransfer(owner(), amount);
    }

    /**
     * @notice Change the duration of time a fund manager needs to wait to withdraw funds they request.
     * @param duration of time in seconds.
     */
    function setRequestWindow(uint256 duration) external onlyOwner {
        requestWindow = duration;
        emit ChangeRequestWindow(duration);
    }

    /* ========== EVENTS ========== */

    event AddToFund(address indexed account, uint256 amount, uint256 fundNumber);
    event ChangeRequestWindow(uint256 duration);
    event Claim(address indexed to, uint256 amount);
    event Clawback(address indexed account, uint256 fundNumber);
    event CreateFund(address indexed manager, address indexed asset, uint256 amount);
    event RequestFunds(address indexed to, uint256 amount);
}