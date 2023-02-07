const fs = require("fs");
const { parse } = require("csv-parse");
const { initeBinanceForEachClient } = require("./binanceInite");
const { bitcoinToFiat } = require('bitcoin-conversion');
const {SPOT, FUTURE, TRANSFERTYPE } = require('./constant')
// const {infos} = require('./mockupData');

const main = async() => {
    try {
        let clients = await initeBinanceForEachClient;
        clients.map((client) => moneyTransfer(client));
    } catch(error) {
        console.log(error);
    }
    ;
}

const moneyTransfer = async(client) => {
    try {
        let transferInfo = await getTransferInfo(client);  
        console.log("transfreInfo", transferInfo);
        if(transferInfo !== null) {
            let type = "";
            if(transferInfo.to === FUTURE) {
                type = TRANSFERTYPE.fromSpotToFuture;
            } else {
                type = TRANSFERTYPE.fromFutureToSpot;
            }

            console.log("final Data", {type: type, asset: 'USDT', amount: transferInfo.amount});
            client.universalTransfer({type: type, asset: 'USDT', amount: transferInfo.amount});
        } else {
            return;
        }
    } catch(error) {
        console.log(error);
    }
    
}

const getBlanceFromAccount = async(account, client) => {
    
    try{
        let balance = null;
        let result;
        switch(account) {
            case FUTURE:
                result = await client.futuresAccountBalance();
                console.log("result", result);
                if(result.length > 0) {
                    balance = result[0].balance;
                }
                break;
            case SPOT:
                result = await client.accountInfo();
                console.log("result", result.balances[0]);
                if(Object.keys(result).length > 0) {
                    balance = await convertBTCToUSDT(result.balances[0].free);
                    console.log("SPOT balance", balance);
                }
                break;
        }
        return balance;
    } catch(error) {
        console.log(error);
    }
    
}


const getTransferInfoFromCsvFile = new Promise((resolve) => {
    let infos = [];
    fs.createReadStream("./config_transfers.csv")
		.pipe(parse({ delimiter: ",", from_line: 2 }))
		.on("data", function (row) {
			let info = {};
            info.account = row[0];
            info.percentage = row[1];
            infos.push(info);

		})
		.on("end", function () {
			resolve(infos);		
		})
		.on("error", function (error) {
			console.log(error.message);
		});
})

const getTransferInfo = async(client) => {
    try{
        let infos = await getTransferInfoFromCsvFile;
        console.log("infos", infos);
        let spotBlance = await getBlanceFromAccount(SPOT, client);
        spotBlance = spotBlance || 0
        console.log("spotblance", spotBlance);
        // let spotBlance = 100;

        let futureBlance = await getBlanceFromAccount(FUTURE, client);
        futureBlance = futureBlance || 0
        console.log("futureBalance", futureBlance);
        // let futureBlance = 500;

        let clcRes = clcTransferAmountInfo(spotBlance, futureBlance, infos);
        
        return clcRes;
    } catch(error) {
        console.log(error);
    }
    
}

const convertBTCToUSDT = async(money) => {
    try{
        return await bitcoinToFiat(money, 'USD');
    } catch(error) {
        console.log(error);
    }
}
const clcTransferAmountInfo = (spot, future, infos) => {
    
    let result = {};

    let spotPero = parseFloat(getPrecentageFromInfos(SPOT, infos));

    let sum = parseFloat(spot) + parseFloat(future);
    if( sum  == 0 ) return null;

    let spotAmount = sum * spotPero / 100;

    if(spotAmount > spot) {
        result.to = SPOT;
        result.from = FUTURE;
        result.amount = spotAmount - spot;
    } else {
        result.to = FUTURE;
        result.from = SPOT;
        result.amount = spot - spotAmount;
    }

    return result;
}

const getPrecentageFromInfos = (account, infos) => {
    let percentage = null;
    infos.map((info) => {
        if(info.account === account) 
        percentage = info.percentage;
    });
    return percentage;
}

// clcTransferAmountInfo(500, 100, infos);
main();