App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  accountType: 3,
  accountTypeArray: new Array('DEALER', 'SERVICE_CENTER', 'DRIVER'),
  loading: false,
  assetListArray: new Array(),
  calibrationListArray: new Array(),
  toast: Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000
  }),
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
    $.getJSON("./Subscription.json", function (assetManagementChain) {
      console.log(assetManagementChain);
      App.contracts.AssetsManagement = TruffleContract(assetManagementChain);
      App.contracts.AssetsManagement.setProvider(App.web3Provider);
      App.contracts.AssetsManagement.deployed().then(function (assetManagementChain, error) {
        console.log(error)
        console.log("Contract Address:", 'https://rinkeby.etherscan.io/address/' + assetManagementChain.address);
        $('#contractDetails').empty();
        $('#contractDetails').html(`<h5 class="text-center">Contract</h5>
          <span class="badge badge-light ml-3"> ${assetManagementChain.address.slice(0, 12)}...${assetManagementChain.address.slice(-8)}</span>
          <a class="dropdown-item" href="https://ropsten.etherscan.io/address/${assetManagementChain.address}" target="_blank">View On Etherscan</a>`)

      });
      //App.listenForEvents();
      return App.render();
    })
  },

  // Listen for events emitted from the contract
  listenForEvents: function () {
    
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
          //App.CheckSignInStatus();
        }

      }
    });

    App.LoadLandingPage();

    content.show();
    loader.hide();

  },

  CheckSignInStatus: function () {
    App.contracts.AssetsManagement.deployed().then(function (instance) {
      AM_Instance = instance;
      return AM_Instance.participants(App.account);
    }).then((status) => {
      //console.log("Account Status: ", status)
      //console.log(status[0])
      let statusString = status[0].toString();
      //console.log(statusString.indexOf("0x00"))
      if (statusString == "0x" || statusString.indexOf("0x00") == 0) {
        //console.log("Account Do not exist")
        $("#accountTypeModel").modal("show")
      } else {
        App.accountType = status[1].toNumber();
        $("#accountType").html(`Welcome, ${App.accountTypeArray[App.accountType]}`)
      }
    }).catch((error)=>{
      console.error("--Error--", error)
    })
  },

  SaveParticipants: function (type) {
    //console.log("Account Type", type)
    App.contracts.AssetsManagement.deployed().then(function (instance) {
      AM_Instance = instance;
      return AM_Instance.signup(type, { from: App.account });
    }).then((receipt) => {
      //console.log(receipt)
      if (receipt.tx) {
        $("#accountTypeModel").modal("hide");
        App.CheckSignInStatus();

        App.toast.fire({
          type: 'success',
          title: 'Signed in successfully.'
        })

      } else {
        console.log("Error while saving account details.")
      }
    })
  },

  LoadLandingPage: function () {
    $('#loader').hide();
    $('#content').show();
    $('#content').empty();
    $('#content').load('landing.html');
  },

  /**
   *  DELEAR PORTAIL
   */

  LoadDealerPage: function () {
    if (App.accountType != 0) {
      Swal.fire('You are not a Delear. Kindly login as a dealer.')
      App.LoadLandingPage();
      return;
    }

    $('#content').empty();
    $('#content').load('landing-dealer.html', function () {
      App.contracts.AssetsManagement.deployed().then(function (instance) {
        AM_Instance = instance;
        return AM_Instance.getAssetByCreator(App.account);
      }).then((assetsIndexList) => {
        //console.log("assetsIndexList", assetsIndexList[0].toNumber())
        let totalAssetItems = assetsIndexList.length;
        let loadCount = 0;
        //console.log("Length", totalAssetItems)
        if (totalAssetItems > 0) {
          for (let i = 0; i < totalAssetItems; i++) {
            //console.log(i, "Asset Array List Item :", assetsIndexList[i].toNumber())
            App.assetListArray = new Array();
            AM_Instance.assets(assetsIndexList[i].toNumber())
              .then((assetItem) => {
                //console.log(assetItem[3], assetItem[6].toNumber())
                App.assetListArray.push({
                  'item': assetItem[2],
                  'serialnumber': assetItem[3],
                  'date': assetItem[4],
                  'administrator': assetItem[5],
                })

                if (loadCount + 1 == totalAssetItems) {
                  //console.log("::: Asset List Loading Complete :::")
                  //console.log("Total Assets Items:", totalAssetItems)

                  if (App.assetListArray.length > 0) {
                    let bodyStr = `<table id="example" class="display"  style="width:100%">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item Name</th>
                            <th>Serial Number</th>
                            <th>Date</th>
                            <th>Administrator</th>
                        </tr>
                    </thead>
                    <tbody>
                        `

                    for (let each in App.assetListArray) {
                      (function (idx, arr) {
                        var date = new Date(parseInt(arr[idx].date));
                        //console.log("----", date, typeof (arr[idx].date))
                        bodyStr += `<tr>
                            <td>${parseInt(idx) + 1}</td>
                            <td>${arr[idx].item}</td>
                            <td>${arr[idx].serialnumber}</td>
                            <td>${date.toLocaleDateString()}</td>
                            <td><a href="https://ropsten.etherscan.io/address/${arr[idx].administrator}" target="_blank">${arr[idx].administrator.slice(0, 7)}...${arr[idx].administrator.slice(-7)}</a></td>
                            </tr>`
                      })(each, App.assetListArray);
                    }

                    bodyStr += `
                        </tbody>
                        <tfoot>
                            <tr>
                              <th>#</th>
                              <th>Item Name</th>
                              <th>Serial Number</th>
                              <th>Date</th>
                              <th>Administrator</th>
                            </tr>
                        </tfoot>
                    </table>`
                    $('#dealer-body').html(bodyStr);
                    $('#example').DataTable();

                  }
                } else {
                  loadCount++
                }


              })

          }
        } else {
          $('#dealer-body').html(`<div class="alert alert-info" role="alert">
          The Asset list is empty. Kindly add asset.
        </div>`);
        }
      })/*.then((assetCount) => {
        console.log("Total Asset Count: ", assetCount.toNumber())
        //return AM_Instance.assets();
        $('#dealer-body').empty();
        if (assetCount.toNumber() > 0) {
          //console.log("Getting complete list of assets.")

          App.assetListArray = new Array();
          for(let i = 1; i<=assetCount.toNumber(); i++){
            AM_Instance.assets(i)
            .then((assetItem) => {
              //console.log(assetItem)
              App.assetListArray.push({
                'item':assetItem[2],
                'serialnumber':assetItem[3],
                'date':assetItem[4],
                'administrator':assetItem[5],
              })

              if(i == assetCount.toNumber()){
                //console.log("assetListArray Lenght", App.assetListArray.length)
                if(App.assetListArray.length > 0){
                  let bodyStr = `<table id="example" class="display"  style="width:100%">
                  <thead>
                      <tr>
                          <th>#</th>
                          <th>Item Name</th>
                          <th>Serial Number</th>
                          <th>Date</th>
                          <th>Administrator</th>
                      </tr>
                  </thead>
                  <tbody>
                      `

                  for (let each in App.assetListArray) {
                    (function (idx, arr) {
                      var date = new Date(parseInt(arr[idx].date)); 
                      console.log("----",date, typeof(arr[idx].date))
                      bodyStr += `<tr>
                          <td>${parseInt(idx) + 1}</td>
                          <td>${arr[idx].item}</td>
                          <td>${arr[idx].serialnumber}</td>
                          <td>${date.toLocaleDateString()}</td>
                          <td>${arr[idx].administrator}</td>
                          </tr>`
                    })(each, App.assetListArray);
                  }

                  bodyStr += `
                  </tbody>
                  <tfoot>
                      <tr>
                        <th>#</th>
                        <th>Item Name</th>
                        <th>Serial Number</th>
                        <th>Date</th>
                        <th>Administrator</th>
                      </tr>
                  </tfoot>
              </table>`
                  $('#dealer-body').html(bodyStr);
                  $('#example').DataTable();
                  
                }
              }
            })
            .catch((error) => {
              console.error("--Error--", error)
            })
          }
          
        } 
      })*/.catch((error) => {
        console.error("--Error--", error)
      })
    });
  },

  AddNewAssetPage: function () {
    $('#content').empty();
    $('#content').load('add-new-assets.html', function () {
      App.contracts.AssetsManagement.deployed().then(function (instance) {
        AM_Instance = instance;
        return AM_Instance.getAllDrivers();
      }).then((allDrivers) => {
        let selectStr = "";
        for (let each in allDrivers) {
          (function (idx, arr) {
            selectStr += `<option value="${arr[idx]}">${arr[idx]}</option>`
          })(each, allDrivers)
        }
        $('#administrator').html(`${selectStr}`)
      })
    })
  },

  SaveNewAsset: function () {
    var d = new Date();

    const itemname = $('#itemname').val();
    const serialnumber = $('#serialnumber').val();
    const administrator = $('#administrator').find(':selected').val();
    const date = d.getTime().toString();

    if (itemname != '' && serialnumber != '' && administrator != '') {
      //console.log(itemname, serialnumber, administrator, date)

      $('#content').hide();
      $('#loader').show();

      App.contracts.AssetsManagement.deployed().then(function (instance) {
        AM_Instance = instance;
        return AM_Instance.addAsset(itemname, serialnumber, date, administrator);
      }).then((receipt) => {
        //console.log(receipt);
        if (receipt.tx) {
          $('#content').show();
          $('#loader').hide();
          App.LoadDealerPage();


          App.toast.fire({
            type: 'success',
            title: 'Asset added successfully.'
          })
        }
      }).catch((error) => {
        console.error("--Error--", error)
      })

    } else {
      $('#content').show();
      $('#loader').hide();
      $('#content').empty();
      $('#content').html(`<div class="alert alert-info">
      <strong>Error!</strong> Required field missing. Try again
    </div><br/><button class="btn btn-primary" onclick="App.LoadLandingPage(); return false;">Ok</button>`);
    }

  },

  /**
   * SERVICE CENTER
   * 
   */

  LoadServiceCenterPage: function () {
    if (App.accountType != 1) {
      Swal.fire('You are not a Service Center. Kindly login as a Service Center.')
      App.LoadLandingPage();
      return;
    }

    $('#content').empty();
    $('#content').load('landing-service-center.html', function () {
      App.contracts.AssetsManagement.deployed().then(function (instance) {
        AM_Instance = instance;
        return AM_Instance.getAssetByState(0);
      }).then((assetsIndexList) => {
        console.log("assetsIndexList", assetsIndexList)
        //console.log("assetsIndexList", assetsIndexList[0].toNumber())
        let totalAssetItems = assetsIndexList.length;
        let loadCountAsset = 0;
        //console.log("Ass----Length", totalAssetItems)
        if (totalAssetItems > 0) {
          console.log("Total Asset", totalAssetItems)
          for (let i = 0; i < totalAssetItems; i++) {
            console.log(i, "(i)/Asset Index", assetsIndexList[i].toNumber())
            App.assetListArray = new Array();

            let assetIndex = assetsIndexList[i].toNumber();
            if (assetIndex != 0) {
              AM_Instance.assets(assetIndex)
                .then((assetItem) => {
                  //console.log(">", assetItem)

                  App.assetListArray.push({
                    'id': assetItem[0],
                    'item': assetItem[2],
                    'serialnumber': assetItem[3],
                    'date': assetItem[4],
                    'administrator': assetItem[5],
                  })

                  if (loadCountAsset + 1 == totalAssetItems) {
                    if (App.assetListArray.length > 0) {
                      let bodyStr = `<table id="example" class="display"  style="width:100%">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Item Name</th>
                                <th>Serial Number</th>
                                <th>Date</th>
                                <th>Administrator</th>
                                <th>Calibrate</th>
                            </tr>
                        </thead>
                        <tbody>
                            `

                      for (let each in App.assetListArray) {
                        (function (idx, arr) {
                          var date = new Date(parseInt(arr[idx].date));
                          //console.log(arr[idx])
                          bodyStr += `<tr>
                            <td>${parseInt(idx) + 1}</td>
                            <td>${arr[idx].item}</td>
                            <td>${arr[idx].serialnumber}</td>
                            <td>${date.toLocaleDateString()}</td>
                            <td><a href="https://ropsten.etherscan.io/address/${arr[idx].administrator}" target="_blank">${arr[idx].administrator.slice(0, 7)}...${arr[idx].administrator.slice(-7)}</a></td>
                            <td>
                            <center><button class="btn btn-primary" onclick="App.LoadAddCalibrationPage(${arr[idx].id}, '${arr[idx].serialnumber}'); return false;"><i
                            class="fa fa-car" aria-hidden="true"></i> Calibrate</button></center>
                            </td>
                            </tr>`
                        })(each, App.assetListArray);
                      }

                      bodyStr += `
                            </tbody>
                            <tfoot>
                                <tr>
                                  <th>#</th>
                                  <th>Item Name</th>
                                  <th>Serial Number</th>
                                  <th>Date</th>
                                  <th>Administrator</th>
                                  <th>Calibrate</th>
                                </tr>
                            </tfoot>
                        </table>`
                      $('#service-center-asset-body').html(bodyStr);
                      $('#example').DataTable();

                    }
                  } else {
                    loadCountAsset++
                  }


                })
            } else {
              if (loadCountAsset + 1 == totalAssetItems) {
                if (App.assetListArray.length > 0) {
                  let bodyStr = `<table id="example" class="display"  style="width:100%">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item Name</th>
                            <th>Serial Number</th>
                            <th>Date</th>
                            <th>Administrator</th>
                            <th>Calibrate</th>
                        </tr>
                    </thead>
                    <tbody>
                        `

                  for (let each in App.assetListArray) {
                    (function (idx, arr) {
                      var date = new Date(parseInt(arr[idx].date));
                      //console.log(arr[idx])
                      bodyStr += `<tr>
                        <td>${parseInt(idx) + 1}</td>
                        <td>${arr[idx].item}</td>
                        <td>${arr[idx].serialnumber}</td>
                        <td>${date.toLocaleDateString()}</td>
                        <td>${arr[idx].administrator}</td>
                        <td>
                        <center><button class="btn btn-primary" onclick="App.LoadAddCalibrationPage(${arr[idx].id},'${arr[idx].serialnumber}'); return false;"><i
                        class="fa fa-car" aria-hidden="true"></i> Calibrate</button></center>
                        </td>
                        </tr>`
                    })(each, App.assetListArray);
                  }

                  bodyStr += `
                        </tbody>
                        <tfoot>
                            <tr>
                              <th>#</th>
                              <th>Item Name</th>
                              <th>Serial Number</th>
                              <th>Date</th>
                              <th>Administrator</th>
                              <th>Calibrate</th>
                            </tr>
                        </tfoot>
                    </table>`
                  $('#service-center-asset-body').html(bodyStr);
                  $('#example').DataTable();

                }
              } else {
                loadCountAsset++
              }
            }
          }
        } else {
          $('#service-center-asset-body').html(`<div class="alert alert-info" role="alert">
          There are no new asset added recently. Kinly check latter.
        </div>`);
        }

        return AM_Instance.getCalibrationsByCreator(App.account);
      }).then((calibrationsList) => {
        //console.log("calibrationsList", calibrationsList)

        let totalCalibrationsItems = calibrationsList.length;
        let countLoadCalibrations = 0;

        if (totalCalibrationsItems > 0) {
          console.log("Total Calibrations Item", totalCalibrationsItems)
          for (let i = 0; i < totalCalibrationsItems; i++) {
            console.log(i, "(i)/Calibration Index :", calibrationsList[i].toNumber())
            App.calibrationListArray = new Array();

            let calibrationIndex = calibrationsList[i].toNumber();

            AM_Instance.calibrations(calibrationIndex)
              .then((calibrationItem) => {
                //console.log(">", calibrationItem)

                App.calibrationListArray.push({
                  'calibrationsIndex': calibrationItem[0].toNumber(),
                  'assetIndex': calibrationItem[1].toNumber(),
                  'serialNumber': calibrationItem[3],
                  'date': calibrationItem[2],
                  'calibrationType1': calibrationItem[4],
                  'calibrationType2': calibrationItem[5],
                  'calibrationType3': calibrationItem[6],
                  'owner': calibrationItem[7]
                })

                if (countLoadCalibrations + 1 == totalCalibrationsItems) {
                  if (App.calibrationListArray.length > 0) {
                    let bodyStr = `<hr/>
                    <h3 class="font-weight-light">Calibration List</h3>
                    <p class="lead">Complete list of calibration done by you.</p>
                    <table id="calibrationTable" class="display"  style="width:100%">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Serial Number</th>
                            <th>Calibration Type 1</th>
                            <th>Calibration Type 2</th>
                            <th>Calibration Type 3</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        `

                    for (let each in App.calibrationListArray) {
                      (function (idx, arr) {
                        var date = new Date(parseInt(arr[idx].date));
                        //console.log(arr[idx])
                        bodyStr += `<tr>

                            <td>${date.toLocaleDateString()}</td>
                            <td>${arr[idx].serialNumber}</td>
                            <td>${arr[idx].calibrationType1}</td>
                            <td>${arr[idx].calibrationType2}</td>
                            <td>${arr[idx].calibrationType3}</td>
                            <td>
                              <center>
                                <button class="btn btn-primary" onclick="App.LoadAssetDetailPageForSC('LoadServiceCenterPage','${arr[idx].assetIndex}','${date.toLocaleDateString()}','${arr[idx].calibrationType1}','${arr[idx].calibrationType2}','${arr[idx].calibrationType3}', '${arr[idx].owner}'); return false;">
                                  <i class="fa fa-info-circle" aria-hidden="true"></i> View Asset
                                </button>
                              </center>
                            </td>
                            </tr>`
                      })(each, App.calibrationListArray);
                    }

                    bodyStr += `
                        </tbody>
                        <tfoot>
                            <tr>
                            <th>Date</th>
                            <th>Serial Number</th>
                            <th>Calibration Type 1</th>
                            <th>Calibration Type 2</th>
                            <th>Calibration Type 3</th>
                            <th>Action</th>
                            </tr>
                        </tfoot>
                    </table>`
                    $('#service-center-calibration-body').html(bodyStr);
                    $('#calibrationTable').DataTable();
                  }
                } else {
                  countLoadCalibrations++;
                }
              })

          }
        } else {
          $('#service-center-calibration-body').html(`<div class="alert alert-info" role="alert">
          Your calibration list is empty.
        </div>`);
        }
      })
    })
  },

  LoadAssetDetailPageForSC: function (backBtnStr, assetIndex, calDate, ct1, ct2, ct3, owner) {
    $('#content').empty();
    $('#content').load('detail-view.html', function () {
      $('#backBtnCont').html(`<button class="btn btn-primary" onclick="App.${backBtnStr}(); return false;"><i
      class="fa fa-arrow-left" aria-hidden="true"></i> Back</button>`);

      $('#calDate').html(`${calDate}`);
      $('#ct1').html(`${ct1}`)
      $('#ct2').html(`${ct2}`)
      $('#ct3').html(`${ct3}`)
      $('#owner').html(`${owner}`)

      App.contracts.AssetsManagement.deployed().then(function (instance) {
        AM_Instance = instance;
        return AM_Instance.assets(parseInt(assetIndex));
      }).then((receipt) => {

        var date = new Date(parseInt(receipt[4]));
        $('#item').html(`${receipt[2]}`)
        $('#serialnumber').html(`${receipt[3]}`)
        $('#dateCommissioned').html(`${date.toLocaleDateString()}`)
        $('#admin').html(`${receipt[5]}`)

        return AM_Instance.getCalibrationsByAssets(parseInt(assetIndex))
      }).then((calItems) => {

        let totalCalTime = calItems.length;
        let loadCalItem = 0;

        App.calibrationListArray = new Array();

        for (let i = 0; i < calItems.length; i++) {
          AM_Instance.calibrations(calItems[i].toNumber())
            .then((calibrationItem) => {

              App.calibrationListArray.push({
                'calibrationsIndex': calibrationItem[0].toNumber(),
                'assetIndex': calibrationItem[1].toNumber(),
                'serialNumber': calibrationItem[3],
                'date': calibrationItem[2],
                'calibrationType1': calibrationItem[4],
                'calibrationType2': calibrationItem[5],
                'calibrationType3': calibrationItem[6],
                'owner': calibrationItem[7]
              })

              if (loadCalItem + 1 == totalCalTime) {
                console.log("All Cal Item Loaded.")

                if (App.calibrationListArray.length > 0) {



                  let bodyStr = `<table id="calibration" class="display"  style="width:100%">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Serial Number</th>
                                <th>Calibration Type 1</th>
                                <th>Calibration Type 2</th>
                                <th>Calibration Type 3</th>
                                <th>Calibration By</th>
                            </tr>
                        </thead>
                        <tbody>
                            `

                  for (let each in App.calibrationListArray) {
                    (function (idx, arr) {
                      var date = new Date(parseInt(arr[idx].date));
                      //console.log(arr[idx])
                      bodyStr += `<tr>
                            <td>${date.toLocaleDateString()}</td>
                            <td>${arr[idx].serialNumber}</td>
                            <td>${arr[idx].calibrationType1}</td>
                            <td>${arr[idx].calibrationType2}</td>
                            <td>${arr[idx].calibrationType3}</td>
                            <td><a href="https://ropsten.etherscan.io/address/${arr[idx].owner}" target="_blank">${arr[idx].owner.slice(0, 7)}...${arr[idx].owner.slice(-7)}</a></td>
                            </tr>`
                    })(each, App.calibrationListArray);
                  }

                  bodyStr += `
                            </tbody>
                            <tfoot>
                                <tr>
                                <th>Date</th>
                                <th>Serial Number</th>
                                <th>Calibration Type 1</th>
                                <th>Calibration Type 2</th>
                                <th>Calibration Type 3</th>
                                <th>Calibration By</th>
                                </tr>
                            </tfoot>
                        </table>`
                  $('#calibratedList').html(bodyStr);
                  $('#calibration').DataTable();

                }

              } else {
                loadCalItem++
              }
            })
        }
      }).catch((error) => {
        console.error("--Error--", error)
      })
    })
  },

  LoadAddCalibrationPage: function (assetIndex, serialNumber) {
    //AM_Instance.addCalibration(1, "123456789"/date, "A", "B", "C", { from: service });
    $('#content').empty();
    $('#content').load('add-calibration.html', function () {
      $('#assetIndex').val(`${assetIndex}`);
      $('#serialNumber').val(`${serialNumber}`);
    })
  },

  SaveNewCalibration: function () {
    var d = new Date();

    const assetIndex = $('#assetIndex').val();
    const date = d.getTime().toString();
    const serialNumber = $('#serialNumber').val();
    const CalibrationType1 = $('#ct1').val();
    const CalibrationType2 = $('#ct2').val();
    const CalibrationType3 = $('#ct3').val();

    if (CalibrationType1 && CalibrationType2 && CalibrationType3) {
      console.log(assetIndex, date, CalibrationType1, CalibrationType2, CalibrationType3)

      $('#content').hide();
      $('#loader').show();

      App.contracts.AssetsManagement.deployed().then(function (instance) {
        AM_Instance = instance;
        return AM_Instance.addCalibration(parseInt(assetIndex), date, serialNumber, CalibrationType1, CalibrationType2, CalibrationType3, { from: App.account });
      }).then((receipt) => {
        //console.log(receipt);
        if (receipt.tx) {
          $('#content').show();
          $('#loader').hide();

          App.toast.fire({
            type: 'success',
            title: 'Calibration added successfully.'
          })

          App.LoadServiceCenterPage();
        }
      }).catch((error) => {
        console.error("--Error--", error)
      })

    } else {
      $('#content').show();
      $('#loader').hide();
      $('#content').empty();
      $('#content').html(`<div class="alert alert-info">
      <strong>Error!</strong> Required field missing. Try again
    </div><br/><button class="btn btn-primary" onclick="App.LoadLandingPage(); return false;">Ok</button>`);
    }
  },


  /**
   * DRIVER
   */

  LoadDriverPage: function () {
    if (App.accountType != 2) {
      Swal.fire('You are not a Driver. Kindly login as a driver.')
      App.LoadLandingPage();
      return;
    }

    $('#content').empty();
    $('#content').load('landing-driver.html', function () {
      App.contracts.AssetsManagement.deployed().then(function (instance) {
        AM_Instance = instance;
        return AM_Instance.getAssetByAdministrator(App.account);
      }).then((assetsIndexList) => {
        //console.log("assetsIndexList", assetsIndexList[0].toNumber())
        let totalAssetItems = assetsIndexList.length;
        let countLoad = 0;

        if (totalAssetItems > 0) {
          console.log("Total Asset Items: ", totalAssetItems)
          for (let i = 0; i < totalAssetItems; i++) {
            //console.log(i, "Asset Array List Item :", assetsIndexList[i].toNumber())
            App.assetListArray = new Array();
            AM_Instance.assets(assetsIndexList[i].toNumber())
              .then((assetItem) => {
                App.assetListArray.push({
                  'index': assetItem[0],
                  'creator': assetItem[1],
                  'item': assetItem[2],
                  'serialnumber': assetItem[3],
                  'date': assetItem[4],
                  'calibrated': assetItem[6].toNumber()
                })

                if (countLoad + 1 == totalAssetItems) {
                  if (App.assetListArray.length > 0) {
                    let bodyStr = `<table id="example" class="display"  style="width:100%">
                      <thead>
                          <tr>
                              <th>Calibrated</th>
                              <th>Item Name</th>
                              <th>Serial Number</th>
                              <th>Date</th>
                              <th>Creator</th>
                              <th>Action</th>
                          </tr>
                      </thead>
                      <tbody>
                          `

                    for (let each in App.assetListArray) {
                      (function (idx, arr) {
                        var date = new Date(parseInt(arr[idx].date));
                        //console.log("----", date, typeof (arr[idx].date))
                        bodyStr += `<tr>
                            <td><center>`

                        if (arr[idx].calibrated == 1) {
                          bodyStr += `<i class="fa fa-check-circle fa-2x" style="color:green" aria-hidden="true"></i>`
                        } else {
                          bodyStr += `<i class="fa fa-times-circle fa-2x" style="color:red" aria-hidden="true"></i>`
                        }
                        bodyStr += `</center></td>
                            <td>${arr[idx].item}</td>
                            <td>${arr[idx].serialnumber}</td>
                            <td>${date.toLocaleDateString()}</td>
                            <td><a href="https://ropsten.etherscan.io/address/${arr[idx].creator}" target="_blank">${arr[idx].creator.slice(0, 7)}...${arr[idx].creator.slice(-7)}</a></td>
                            <td><center>`
                        //if (arr[idx].calibrated == 1) {
                        bodyStr += `<button class="btn btn-primary" onclick="App.LoadAssetDetailPageForDriver('LoadDriverPage',${arr[idx].index},'${arr[idx].calibrated}'); return false;">
                                        <i class="fa fa-info-circle" aria-hidden="true"></i> View Asset
                                      </button>`
                        //} else {
                        //  bodyStr += `--`;
                        //}
                        bodyStr += `</center></td>
                            </tr>`
                      })(each, App.assetListArray);
                    }

                    bodyStr += `
                        </tbody>
                        <tfoot>
                            <tr>
                              <th>Calibrated</th>
                              <th>Item Name</th>
                              <th>Serial Number</th>
                              <th>Date</th>
                              <th>Creator</th>
                              <th>Action</th>
                            </tr>
                        </tfoot>
                    </table>`
                    $('#dealer-body').html(bodyStr);
                    $('#example').DataTable();

                  }
                } else {
                  countLoad++
                }
              })

          }
        } else {
          $('#dealer-body').html(`<div class="alert alert-info" role="alert">
          The Asset list is empty.
        </div>`);
        }
      }).catch((error) => {
        console.error("--Error--", error)
      })
    });
  },

  LoadAssetDetailPageForDriver: function (backBtnStr, assetIndex, calibrated) {
    $('#content').empty();
    $('#content').load('detail-view.html', function () {
      let btnStr = "";
      if (calibrated == 1) {
        btnStr += `<button class="btn btn-primary" onclick="App.UpdateForRecalibration(${assetIndex}); return false;"><i
      class="fa fa-car" aria-hidden="true"></i> Request For Recalibration</button>`
      }
      $('#backBtnCont').html(`${btnStr} <button class="btn btn-primary ml-1" onclick="App.${backBtnStr}(); return false;"><i
      class="fa fa-arrow-left" aria-hidden="true"></i> Back</button>`);



      App.contracts.AssetsManagement.deployed().then(function (instance) {
        AM_Instance = instance;
        return AM_Instance.assets(parseInt(assetIndex));
      }).then((receipt) => {
        //console.log(receipt);
        var date = new Date(parseInt(receipt[4]));
        $('#item').html(`${receipt[2]}`)
        $('#serialnumber').html(`${receipt[3]}`)
        $('#dateCommissioned').html(`${date.toLocaleDateString()}`)
        $('#admin').html(`${receipt[5]}`)

        return AM_Instance.getCalibrationsByAssets(parseInt(assetIndex))
      }).then((calItems) => {

        let totalCalTime = calItems.length;
        let loadCalItem = 0;

        App.calibrationListArray = new Array();

        for (let i = 0; i < calItems.length; i++) {
          AM_Instance.calibrations(calItems[i].toNumber())
            .then((calibrationItem) => {

              App.calibrationListArray.push({
                'calibrationsIndex': calibrationItem[0].toNumber(),
                'assetIndex': calibrationItem[1].toNumber(),
                'serialNumber': calibrationItem[3],
                'date': calibrationItem[2],
                'calibrationType1': calibrationItem[4],
                'calibrationType2': calibrationItem[5],
                'calibrationType3': calibrationItem[6],
                'owner': calibrationItem[7]
              })

              if (loadCalItem + 1 == totalCalTime) {
                console.log("All Cal Item Loaded.")

                if (App.calibrationListArray.length > 0) {



                  let bodyStr = `<table id="calibration" class="display"  style="width:100%">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Serial Number</th>
                                <th>Calibration Type 1</th>
                                <th>Calibration Type 2</th>
                                <th>Calibration Type 3</th>
                                <th>Calibration By</th>
                            </tr>
                        </thead>
                        <tbody>
                            `

                  for (let each in App.calibrationListArray) {
                    (function (idx, arr) {
                      var date = new Date(parseInt(arr[idx].date));
                      //console.log(arr[idx])
                      bodyStr += `<tr>
                            <td>${date.toLocaleDateString()}</td>
                            <td>${arr[idx].serialNumber}</td>
                            <td>${arr[idx].calibrationType1}</td>
                            <td>${arr[idx].calibrationType2}</td>
                            <td>${arr[idx].calibrationType3}</td>
                            <td><a href="https://ropsten.etherscan.io/address/${arr[idx].owner}" target="_blank">${arr[idx].owner.slice(0, 7)}...${arr[idx].owner.slice(-7)}</a></td>
                            </tr>`
                    })(each, App.calibrationListArray);
                  }

                  bodyStr += `
                            </tbody>
                            <tfoot>
                                <tr>
                                <th>Date</th>
                                <th>Serial Number</th>
                                <th>Calibration Type 1</th>
                                <th>Calibration Type 2</th>
                                <th>Calibration Type 3</th>
                                <th>Calibration By</th>
                                </tr>
                            </tfoot>
                        </table>`
                  $('#calibratedList').html(bodyStr);
                  $('#calibration').DataTable();

                }

              } else {
                loadCalItem++
              }
            })
        }
      }).catch((error) => {
        console.error("--Error--", error)
      })

    })
  },

  UpdateForRecalibration: function (assetIndex) {
    console.log(assetIndex)

    $('#content').hide();
    $('#loader').show();

    App.contracts.AssetsManagement.deployed().then(function (instance) {
      AM_Instance = instance;
      return AM_Instance.updateAssetForCalibration(parseInt(assetIndex), { from: App.account });
    }).then((receipt) => {

      if (receipt.tx) {
        $('#content').show();
        $('#loader').hide();
        App.LoadDriverPage();

        App.toast.fire({
          type: 'success',
          title: 'Recalibration added successfully.'
        })
      }

    }).catch((error) => {
      console.error("--Error--", error)
    })

  },


}

$(function () {
  $(window).load(function () {
    App.init();
  })
});
