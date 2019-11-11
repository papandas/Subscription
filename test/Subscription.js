var Subscription = artifacts.require("./Subscription.sol");
var dateFormat = require('dateformat');
//var web3 = require('web3');


//var Web3 = require('web3');

contract('Subscription Ethereum Network', function (accounts) {
    const ac1 = accounts[0];
    const ac2 = accounts[1];
    const ac3 = accounts[2];
    const ac4 = accounts[3];
    const dt = Date.now();

    it("Sign-Up for subscription.", function () {
        return Subscription.deployed().then(function (instance) {
            subscriptionInstance = instance;
            //return subscriptionInstance.getBalance(ac1);
            return web3.eth.getBalance(ac1);
        }).then((AccountBalance)=>{     
            console.log("Before-:-AccountBalance", web3.utils.fromWei(AccountBalance, 'ether'));

            return web3.eth.getBalance(subscriptionInstance.address);
        }).then((ContractBalance)=>{     
            console.log("Before-:-ContractBalance", web3.utils.fromWei(ContractBalance, 'ether'));

            return subscriptionInstance.putSubscriptions(1, { from: ac1, value: web3.utils.toWei('1', 'ether') }); 
        }).then((receipt) => {
            assert.equal(receipt.receipt.status, true, "Transaction was not saved.");

            // Get the Subscription Detail by the index number.
            return subscriptionInstance.subscriptions(1);
        }).then((results)=>{
            
            var _dt = results[2].toNumber();

            //assert.equal(_dt, dt, "Datetime mismatch.");
            //console.log("DateTime in Milliseconds: ", dt)
            console.log("DateTime Formated: ", dateFormat(dt , "dddd, mmmm dS, yyyy, h:MM:ss TT"));
            console.log("DateTime Formated: ", dateFormat(_dt , "dddd, mmmm dS, yyyy, h:MM:ss TT"));

            return web3.eth.getBalance(ac1);
        }).then((AccountBalance)=>{     
            console.log("After-:-AccountBalance", web3.utils.fromWei(AccountBalance, 'ether'));

            return web3.eth.getBalance(subscriptionInstance.address);
        }).then((ContractBalance)=>{     
            console.log("After-:-ContractBalance", web3.utils.fromWei(ContractBalance, 'ether'));

            return subscriptionInstance.putSubscriptions((1000 * 60 * 5), { from: ac1, value: web3.utils.toWei('1', 'ether')});
        }).then((receipt)=>{
            assert.equal(receipt.receipt.status, true, "Transaction was not saved.");

            return subscriptionInstance.subscriptionIndex();
        }).then((subscriptionIndex)=>{
            assert.equal(subscriptionIndex, 2, "Subscription index mismatch.");

            return subscriptionInstance.subscriptions(2);
        }).then((results)=>{
            //console.log(results)

            var _dt = results[2].toNumber();
            
            console.log("DateTime Formated: ", dateFormat(dt , "dddd, mmmm dS, yyyy, h:MM:ss TT"));
            console.log("DateTime Formated: ", dateFormat(_dt , "dddd, mmmm dS, yyyy, h:MM:ss TT"));
        })
    });
})