USERNAME="reply@f80.fr"
PASSWORD="Hh42714280"
SMTP_SERVER="smtp.ionos.fr"
IMAP_SERVER="imap.ionos.fr"

SECRET_KEY="hh4271"

APPNAME="TOKEN FORGE"

#DOMAIN_APPLI="http://localhost:4200"
DOMAIN_APPLI="https://tf.f80.fr"
ERC20_BYTECODE_PATH="./static/deploy-erc20.json"
NFT_BYTECODE_PATH="./static/deploy-nft.json"

ADMIN_SALT="hh4271"

#on alimente les nouveaux comptes en eGold pour leur permettre des transferts

#Description de la monnaie par defaut
MAIN_UNITY="TFC"
MAIN_DECIMALS=18
MAIN_NAME="TokenForgeCoin"
MAIN_URL="https://tf.f80.fr/assets/cmk.html"
TOTAL_DEFAULT_UNITY=1000000
CREDIT_FOR_NEWACCOUNT=200
ESDT_CONTRACT="erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"
LIMIT_GAS=60000000

IPFS_NODE="http://207.180.198.227:5001"

NETWORKS={
    "testnet":{
        "tokenIdentifier":"",
        "new_account":float(10*1e18),
        "bank":"bob",
        "faucet":"https://r3d4.fr/elrond/testnet/index.php",
        "proxy":"https://testnet-api.elrond.com",
        "explorer":"https://testnet-explorer.elrond.com",
        "wallet":"https://testnet-wallet.elrond.com",
        "nft":"erd1qqqqqqqqqqqqqpgq78cxruqwtywur74jae8euv03g75uz8jfd8ssqwdq5j"
    },

    "devnet":{
        "new_account":float(2*1e18),
        "bank":"alice",
        "tokenIdentifier":"TFC-57a49e",
        "faucet":"https://r3d4.fr/elrond/devnet/index.php",
        "proxy":"https://devnet-api.elrond.com",
        "explorer":"https://devnet-explorer.elrond.com",
        "wallet":"https://devnet-wallet.elrond.com",
        "nft":"erd1qqqqqqqqqqqqqpgq7zufaqwe09r9qu684apjr5l5rgd2wkcpd8ss0wn67n",
    },

    "server":{
        "new_account":float(300*1e18),
        "bank":"admin",
        "faucet":"",
        "proxy":"http://161.97.75.165:7950",
        "explorer":"",
        "wallet":"",
        "nft":"erd1qqqqqqqqqqqqqpgqrxxl3ayj7et2vlc3yp4pk5cpde7k6xdhd8ss3zjz5u",
    }
}

SIGNATURE="<br><br>L'équipe de TokenForge<br><a href='https://t.me/tokenforge'>Le forum des utilisateurs</a>"

DB_SERVERS=dict({
    "local":"mongodb://127.0.0.1:27017",
    "server":"mongodb://admin:hh4271@server.f80.fr:27017",
    "cloud":"mongodb+srv://admin:hh4271!!@kerberus-44xyy.gcp.mongodb.net/test"
})

MAIN_DEVISE="xEGld"