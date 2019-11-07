App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  subscriptionArray: new Array(),
  subscriptionTimeInMin: 20,
  subscriptionIndexCount: 0,
  toast: Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  }),
  IntervalInstance: {},
  init: function () {
    console.log("App initialized...")
    return App.initWeb3();
  },

  initWeb3: function () {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContracts();
  },

  initContracts: function () {
    $.getJSON("./Subscription.json", function (subscriptionChain) {
      //console.log(subscriptionChain);
      App.contracts.Subscription = TruffleContract(subscriptionChain);
      App.contracts.Subscription.setProvider(App.web3Provider);
      App.contracts.Subscription.deployed().then(function (subscriptionChain, error) {
        //console.log(error)
        if (error == null) {
          console.log("Contract Address:", 'https://rinkeby.etherscan.io/address/' + subscriptionChain.address);
          $('#contractDetails').empty();
          $('#contractDetails').html(`<h5 class="text-center">Contract</h5>
            <span class="badge badge-light ml-3"> ${subscriptionChain.address.slice(0, 12)}...${subscriptionChain.address.slice(-8)}</span>
            <a class="dropdown-item" href="https://ropsten.etherscan.io/address/${subscriptionChain.address}" target="_blank">View On Etherscan</a>`)
        } else {
          console.error("--Error With Conract Initialization--", error);
        }

      });
      App.listenForEvents();
      return App.render();
    })
  },

  // Listen for events emitted from the contract
  listenForEvents: function () {

    App.contracts.Subscription.deployed().then(function (instance) {
      // Restart Chrome if you are unable to receive this event
      // This is a known issue with Metamask
      // https://github.com/MetaMask/metamask-extension/issues/2393
      instance.SubscriptionEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function (error, event) {
        
        if (error === null) {
          console.log(App.subscriptionIndexCount, event.args._subscriptionIndex.toNumber())
          if(App.subscriptionIndexCount < event.args._subscriptionIndex.toNumber()){
            console.log("["+ event.event+"]","Previous:", App.subscriptionIndexCount,", Current:", event.args._subscriptionIndex.toNumber());
            App.GetAllSubscriptions();
          }
        }else {
          console.error("--Error--", error)
        }
      });
    })

  },
  render: function () {
    if (App.loading) {
      return;
    }
    App.loading = true;

    var loader = $('#loader');
    var content = $('#content');

    loader.show();
    content.hide();

    //console.log("Web3 Version:", web3.version.api)

    // Load account data
    $('#accountDetails').empty();
    web3.eth.getCoinbase(function (err, account) {
      if (err === null) {
        if (account === null) {
          App.LoadLandingPage();
        } else {
          App.account = account;
          console.log("Account Address:", account);
          web3.eth.getBalance(App.account, function (err, resp) {

            if (err === null) {

              let balance = web3.fromWei(resp.toNumber(), 'ether')

              $('#accountDetails').html(`<h5 class="text-center">Account</h5>
                <span class="badge badge-light ml-3"> ${App.account.slice(0, 12)}...${App.account.slice(-8)}</span>
                <a class="dropdown-item" href="#">Balance: ${balance.slice(0, 7)} ETH</a>
                <a class="dropdown-item" href="#" id="accountType"></a>
                <a class="dropdown-item" href="https://ropsten.etherscan.io/address/${account}" target="_blank">View On Etherscan</a>`)
            }
          });
        }

      }
    });

    App.LoadLandingPage();

    content.show();
    loader.hide();

  },

  LoadLandingPage: function () {
    $('#loader').hide();
    $('#content').show();
    $('#content').empty();
    $('#content').load('landing.html', function () {
      App.GetAllSubscriptions();
    });
  },

  /**
   * SUBSCRIPTION
   */

  SaveSubscription: function () {
    const value = $('#value').find(':selected').val();

    $('#loader').show();
    $('#content').hide();

    App.contracts.Subscription.deployed().then(function (instance) {
      subscriptionInstance = instance;
      let closingTime = App.ReturnUTCTime() + (1000 * 60 * App.subscriptionTimeInMin);
      return subscriptionInstance.putSubscriptions(closingTime, { from: App.account, value: web3.toWei(value, 'ether') });
    }).then((receipt) => {
      console.log(receipt);
      if (receipt.tx) {
        $('#loader').hide();
        $('#content').show();

        App.GetAllSubscriptions();
      }
    }).catch((error) => {
      console.error("--Error--", error)
    })


  },

  GetAllSubscriptions: function () {
    $('#loader').hide();
    $('#content').show();

    App.contracts.Subscription.deployed().then(function (instance) {
      subscriptionInstance = instance;
      return subscriptionInstance.subscriptionIndex();
    }).then((index) => {
      console.log("Subscriptions Index: ", index.toNumber());
      App.subscriptionIndexCount = index.toNumber();

      if (index.toNumber() > 0) {

        App.subscriptionArray = new Array();

        let i = index.toNumber();

        function QuerySubscription() {
          subscriptionInstance.subscriptions(i)
            .then((subscribe) => {
              //console.log(i, subscribe[1], "Subscription Time", App.FormatDateTime(subscribe[2].toNumber()));

              if (App.ReturnUTCTime() <= subscribe[2].toNumber()) {
                //console.log("Subscription On!")

                App.subscriptionArray.push({
                  'index': subscribe[0].toNumber(),
                  'creator': subscribe[1],
                  'endDT': subscribe[2].toNumber()
                })

                // User exist in the list of subscribers
                if(App.account === subscribe[1]){
                  $('#formContainer').hide();
                }

                if (i == 0) {
                  console.log("Complete list of indexed subscribers loaded.")
                } else {
                  i--;
                  QuerySubscription();
                }

              } else {
                //console.log("Subscription Over!")
                App.LoadAllSubscriptions();
              }

            })
        }

        QuerySubscription()
        

      } else {
        console.log("Subscription list empty.")
        App.toast.fire({
          type: 'error',
          title: 'Subscription list empty.'
        })
      }

    }).catch((error) => {
      console.error("--Error--", error)
    })
  },

  LoadAllSubscriptions: function () {
    // Load page.

    console.log("LOAD ALL SUBSCRIPTIONS")
    $('#subscriptionListHolder').empty();

    if (App.subscriptionArray.length > 0) {

      let bodyStr = `<ul class="list-group">`
      for (let each in App.subscriptionArray) {
        (function (idx, arr) {

          bodyStr += `<li id="liItem${idx}" class="list-group-item">
                      <div class="row">
                          <div class="col col-6">
                            <h4>Subscription Ends In!</h4>
                            <div class="timer">
                                <div>
                                  <span class="hours" id="IntervalItem${idx}hour"></span> 
                                  <div class="smalltext">Hours</div>
                                </div>
                                <div>
                                  <span class="minutes" id="IntervalItem${idx}minute"></span> 
                                  <div class="smalltext">Minutes</div>
                                </div>
                                <div>
                                  <span class="seconds" id="IntervalItem${idx}second"></span> 
                                  <div class="smalltext">Seconds</div>
                                </div>
                              </div>
                          </div>
                          <div class="col col-6">Account: <span class="badge badge-light ml-3"> 
                            <a class="dropdown-item" href="https://ropsten.etherscan.io/address/${arr[idx].creator}" target="_blank">
                              ${arr[idx].creator.slice(0, 12)}........${arr[idx].creator.slice(-8)}
                            </a></span>`
          if(App.account === arr[idx].creator){
            bodyStr += `<i class="fa fa-star" aria-hidden="true" style="color:yellow"></i>`
          }
          bodyStr += `</div>
                      </div>
                  </li>`

          App.IntervalInstance[`Item${idx}`] = setInterval(function () { App.IntervalFunction() }, 1000);
          //console.log("Interval Wala!", App.IntervalInstance[`Item${idx}`])

        })(each, App.subscriptionArray);
      }
      bodyStr += `</ul>`
      $('#subscriptionListHolder').html(`${bodyStr}`);
    }else{
      $('#subscriptionListHolder').html(`<div class="alert alert-info">
          <strong>Empty!</strong> No active subscribers available.
        </div>`);
    }

  },

  /**
   * UTILITYS 
   */



  /**
   * 
   * @param {number} date 
   */

  FormatDateTime: function (_date) {
    //console.log(_date, typeof(_date))
    let date = new Date(_date);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear() + "  " + strTime;
  },

  ReturnUTCTime: function () {
    var dt = Date.now();
    //console.log("[IN-LOCAL] Formate: ", App.FormatDateTime(dt), ", Milliseconds", dt);
    var dtUTC = new Date(dt).toLocaleString('en-US', { timeZone: 'UTC' })
    var results = new Date(dtUTC).getTime();
    //console.log("[IN-UTC] Formate: ", App.FormatDateTime(results), ", Milliseconds", results);
    return results;
  },

  IntervalFunction: function () {

    //console.log("IntervalFunction")

    for (let each in App.subscriptionArray) {
      (function (idx, arr) {

        // Get today's date and time
        var now = parseInt(App.ReturnUTCTime());

        // Find the distance between now and the count down date
        var distance = parseInt(arr[idx].endDT) - now;

        // Time calculations for days, hours, minutes and seconds
        var days = Math.floor(distance / (1000 * 60 * 60 * 24));
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if(document.getElementById(`IntervalItem${idx}hour`) != null){
          document.getElementById(`IntervalItem${idx}hour`).innerHTML = hours;
        }

        if(document.getElementById(`IntervalItem${idx}minute`) != null){
          document.getElementById(`IntervalItem${idx}minute`).innerHTML = minutes;
        }

        if(document.getElementById(`IntervalItem${idx}second`) != null){
          document.getElementById(`IntervalItem${idx}second`).innerHTML = seconds;
        }

        // If the count down is finished, write some text
        if (distance < 0) {
          //console.log("Remove Time ", "Item"+idx, App.IntervalInstance[`Item${idx}`])
          clearInterval(App.IntervalInstance[`Item${idx}`]);

          App.toast.fire({
            type: 'success',
            title: 'User remove from subscription list.'
          })
          

          if(document.getElementById(`IntervalItem${idx}hour`) != null){
            document.getElementById(`IntervalItem${idx}hour`).innerHTML = 0;
          }
  
          if(document.getElementById(`IntervalItem${idx}minute`) != null){
            document.getElementById(`IntervalItem${idx}minute`).innerHTML = 0;
          }
  
          if(document.getElementById(`IntervalItem${idx}second`) != null){
            document.getElementById(`IntervalItem${idx}second`).innerHTML = 0;
          }

          // Remove subscription item from the list when the time is over.
          $(`#liItem${idx}`).remove();

          // Show User Subscription form, reactivate after the time is over.
          if(App.account === arr[idx].creator){
            $('#formContainer').show();
          }

          // Remove the item from Array
          if(App.subscriptionArray.length > 0){
            App.subscriptionArray.splice(idx, 1); 
          }

        }

      })(each, App.subscriptionArray);
    }
  }
}

$(function () {
  $(window).load(function () {
    App.init();
  })
});
