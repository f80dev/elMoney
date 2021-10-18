from secret import MAIL_PASSWORD, APP_SECRET_KEY

USERNAME="reply@f80.fr"
PASSWORD=MAIL_PASSWORD
SMTP_SERVER="smtp.ionos.fr"
IMAP_SERVER="imap.ionos.fr"

#SECRET_KEY=APP_SECRET_KEY
SECRET_KEY="hh4271"

APPNAME="TOKEN FORGE"

#DOMAIN_APPLI="http://localhost:4200"
DOMAIN_APPLI="https://tf.f80.fr"
ERC20_BYTECODE_PATH="./static/deploy-erc20.json"
NFT_BYTECODE_PATH="./static/deploy-nft.json"

#on alimente les nouveaux comptes en eGold pour leur permettre des transferts

#Description de la monnaie par defaut
MAIN_UNITY="TFE"
MAIN_DECIMALS=18
MAIN_NAME="TokenForgeEuroCoin"
MAIN_URL="https://tf.f80.fr/assets/cmk.html"
TOTAL_DEFAULT_UNITY=1000000
CREDIT_FOR_NEWACCOUNT=100

GIPHY_API_KEY="EL1SNvjG7dJNOC4r8Dwz7XKPf5I2uG5f"
UNSPLASH_API_KEY="jULgaq6gGPDmyKi24nJO1Ta5SgdVpT38PjGBiu4snu4"

#Analye du contrat : https://testnet-explorer.elrond.com/accounts/erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u
ESDT_CONTRACT="erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"
ESDT_PRICE=5e16

LIMIT_GAS=60000000

#IPFS_NODE="http://207.180.198.227:5001" Server main
#IPFS_NODE="http://161.97.75.165:5001"
IPFS_NODE_HOST="/ip4/161.97.75.165/tcp/5001/http"
#IPFS_NODE_HOST="161.97.75.165"
IPFS_NODE_PORT=5001

NETWORKS={
    "testnet":{
        "identifier":"TFE-5b67ba",
        "new_account":float(0.2*1e18),
        "bank":"bank",
        "unity":"xEgld",
        "faucet":"https://r3d4.fr/elrond/testnet/index.php",
        "proxy":"https://testnet-gateway.elrond.com",
        "explorer":"https://testnet-explorer.elrond.com",
        "wallet":"https://testnet-wallet.elrond.com",
        "nft":"erd1qqqqqqqqqqqqqpgqu3y8wel4pt3dm92w954stlgrqvfxtmwsqqes5tan66"
    },

    #erd1qqqqqqqqqqqqqpgqkwfvpkaf6vnn89508l0gdcx26vpu8eq5d8ssz3lhlf
    "devnet":{
        "new_account":float(1*1e18),
        "bank":"bank",
        "unity":"xEgld",
        "identifier":"TFE-2785a2",
        "faucet":"https://r3d4.fr/elrond/devnet/index.php",
        "proxy":"https://devnet-gateway.elrond.com",
        "explorer":"https://devnet-explorer.elrond.com",
        "wallet":"https://devnet-wallet.elrond.com",
        "nft":"erd1qqqqqqqqqqqqqpgq6fy27mfjm42ev5anlqln72w4hn7ke5wwqqeskf70z6"
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
        "server":"mongodb://admin:hh4271@server.f80.fr:27017",
        "cloud":"mongodb+srv://admin:hh4271!!@kerberus-44xyy.gcp.mongodb.net/test"
    }
)

DEFAULT_VISUAL="/assets/img/anonymous.jpg"
DEFAULT_VISUAL_SHOP="/assets/img/shop.png"

ONE_WINNER      =0b00100000
FIND_SECRET     =0b00010000
SELF_DESTRUCTION=0b00001000
DIRECT_SELL     =0b00000100
CAN_RESELL      =0b00000010
CAN_TRANSFERT   =0b00000001

