const { initeBinanceForEachClient } = require("./binanceInite");

const main = async() => {
    try {
        let clients = await initeBinanceForEachClient;
        clients.map((client) => {
                    
        })
    } catch(error) {
        console.log(error);
    }
    
}

main();