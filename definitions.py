from secret import MAIL_PASSWORD, APP_SECRET_KEY, MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD

USERNAME="reply@f80lab.com"
PASSWORD=MAIL_PASSWORD
SMTP_SERVER="smtp.ionos.fr"
IMAP_SERVER="imap.ionos.fr"

SECRET_KEY=APP_SECRET_KEY

APPNAME="TOKEN FORGE"

#DOMAIN_APPLI="http://localhost:4200"
DOMAIN_APPLI="https://tf.f80lab.com"
ERC20_BYTECODE_PATH="./static/deploy-erc20.json"
NFT_BYTECODE_PATH="./static/deploy-nft.json"

#on alimente les nouveaux comptes en eGold pour leur permettre des transferts

#Description de la monnaie par defaut
MAIN_UNITY="TFE"
MAIN_DECIMALS=18
MAIN_NAME="TokenForgeEuroCoin"
MAIN_URL="https://tf.f80lab.com/assets/cmk.html"
TOTAL_DEFAULT_UNITY=1000000
CREDIT_FOR_NEWACCOUNT=100

GIPHY_API_KEY="EL1SNvjG7dJNOC4r8Dwz7XKPf5I2uG5f"
UNSPLASH_API_KEY="jULgaq6gGPDmyKi24nJO1Ta5SgdVpT38PjGBiu4snu4"

#Analye du contrat : https://testnet-explorer.elrond.com/accounts/erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u
ESDT_CONTRACT="erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"
ESDT_PRICE=5e16

LIMIT_GAS=200000000

#IPFS_NODE="http://207.180.198.227:5001" Server main
#IPFS_NODE="http://161.97.75.165:5001"
IPFS_NODE_HOST="/ip4/161.97.75.165/tcp/5001/http"
#IPFS_NODE_HOST="161.97.75.165"
IPFS_NODE_PORT=5001

NETWORKS={
    "testnet":{
        "identifier":"TFE-43116d",
        "new_account":float(0.2*1e18),
        "bank":"bank",
        "unity":"xEgld",
        "faucet":"https://r3d4.fr/elrond/testnet/index.php",
        "proxy":"https://testnet-gateway.elrond.com",
        "explorer":"https://testnet-explorer.elrond.com",
        "wallet":"http://testnet-wallet.elrond.com",
        "nft":"",
        "shard":0
    },

    #erd1qqqqqqqqqqqqqpgqkwfvpkaf6vnn89508l0gdcx26vpu8eq5d8ssz3lhlf
    "devnet":{
        "new_account":float(0.2*1e18),
        "bank":"bank",
        "unity":"xEgld",
        "identifier":"TFE-116a67",
        "faucet":"https://r3d4.fr/elrond/devnet/index.php",
        "proxy":"https://devnet-api.elrond.com",
        "explorer":"https://devnet-explorer.elrond.com",
        "wallet":"https://devnet-wallet.elrond.com",
        "nft":"erd1qqqqqqqqqqqqqpgqqg3kxq0x4p3t68yszk5v7v7se6znfmcqqqes67tx40",
        "shard": 1
    },


    "server":{
        "new_account":float(300*1e18),
        "bank":"admin",
        "unity":"eGld",
        "faucet":"",
        "proxy":"http://161.97.75.165:7950",
        "explorer":"",
        "wallet":"",
        "nft":"erd1qqqqqqqqqqqqqpgqser2ympdp7frmpcs6eeyk852vm4qyakwd8ssjtzztk",
    }
}

ADMINS=[
    "",""
]

SIGNATURE="<br><br>L'équipe de TokenForge<br><a href='https://t.me/tokenforge'>Le forum des utilisateurs</a>"

DB_SERVERS=dict(
    {
        "local":"mongodb://127.0.0.1:27017",
        "server":"mongodb://"+MONGO_INITDB_ROOT_USERNAME+":"+MONGO_INITDB_ROOT_PASSWORD+"@server.f80lab.com:27017",
        "cloud":"mongodb+srv://"+MONGO_INITDB_ROOT_USERNAME+":"+MONGO_INITDB_ROOT_PASSWORD+"@kerberus-44xyy.gcp.mongodb.net/test"
    }
)

DEFAULT_VISUAL="/assets/img/anonymous.jpg"
DEFAULT_VISUAL_SHOP="/assets/img/shop.png"


IS_CLONE        = 0b00000001

ID_REQUIRED     = 0b1000000000000000
FOR_SALE        = 0b0100000000000000
ONE_WINNER      = 0b0010000000000000
MINER_CAN_BURN  = 0b0001000000000000
UNIK            = 0b0000100000000000
SECRET_VOTE     = 0b0000010000000000
VOTE            = 0b0000000100000000
RENT            = 0b0000000010000000
TRANSPARENT     = 0b0000000001000000
FORCE_OPEN      = 0b0000000000100000
FIND_SECRET     = 0b0000000000010000
SELF_DESTRUCTION= 0b0000000000001000
DIRECT_SELL     = 0b0000000000000100
CAN_RESELL      = 0b0000000000000010
CAN_TRANSFERT   = 0b0000000000000001

MAX_MINT_NFT=30
MAX_GAS_LIMIT=600000000
RESULT_SECTION="smartContractResults"

LONG_DELAY_TRANSACTION=34 #sec
SHORT_DELAY_TRANSACTION=9
MAX_U64=4294967296
ZERO_ADDR="0x"+"0"*64
