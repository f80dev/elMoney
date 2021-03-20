from secret import MAIL_PASSWORD, APP_SECRET_KEY

USERNAME="reply@f80.fr"
PASSWORD=MAIL_PASSWORD
SMTP_SERVER="smtp.ionos.fr"
IMAP_SERVER="imap.ionos.fr"

SECRET_KEY=APP_SECRET_KEY

APPNAME="TOKEN FORGE"

#DOMAIN_APPLI="http://localhost:4200"
DOMAIN_APPLI="https://tf.f80.fr"
ERC20_BYTECODE_PATH="./static/deploy-erc20.json"
NFT_BYTECODE_PATH="./static/deploy-nft.json"

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

#IPFS_NODE="http://207.180.198.227:5001" Server main
IPFS_NODE="http://161.97.75.165:5001"

NETWORKS={
    "testnet":{
        "tokenIdentifier":"",
        "new_account":float(10*1e18),
        "bank":"bob",
        "unity":"tEgld",
        "faucet":"https://r3d4.fr/elrond/testnet/index.php",
        "proxy":"https://testnet-api.elrond.com",
        "explorer":"https://testnet-explorer.elrond.com",
        "wallet":"https://testnet-wallet.elrond.com",
        "nft":"erd1qqqqqqqqqqqqqpgq2j4t5v0lu0cvrwapl9z5zr88zfcepvjsd8ssc6sfq6"
    },

    "devnet":{
        "new_account":float(2*1e18),
        "bank":"alice",
        "unity":"xEgld",
        "tokenIdentifier":"TFC-57a49e",
        "faucet":"https://r3d4.fr/elrond/devnet/index.php",
        "proxy":"https://devnet-api.elrond.com",
        "explorer":"https://devnet-explorer.elrond.com",
        "wallet":"https://devnet-wallet.elrond.com",
        "nft":"erd1qqqqqqqqqqqqqpgqv2r86rvsrd70r486tcjfu7urkudqxujrd8sspw2znd"
    },

    "server":{
        "new_account":float(300*1e18),
        "bank":"admin",
        "unity":"eGld",
        "faucet":"",
        "proxy":"http://161.97.75.165:7950",
        "explorer":"",
        "wallet":"",
        "nft":"erd1qqqqqqqqqqqqqpgqjcdsq4yum87fh4awf29vew56pfx6gynqd8ssak9vt2",
    }
}

SIGNATURE="<br><br>L'équipe de TokenForge<br><a href='https://t.me/tokenforge'>Le forum des utilisateurs</a>"

DB_SERVERS=dict({
    "local":"mongodb://127.0.0.1:27017",
    "server":"mongodb://admin:hh4271@server.f80.fr:27017",
    "cloud":"mongodb+srv://admin:hh4271!!@kerberus-44xyy.gcp.mongodb.net/test"
})

