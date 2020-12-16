USERNAME="reply@f80.fr"
PASSWORD="Hh42714280"
SMTP_SERVER="smtp.ionos.fr"
IMAP_SERVER="imap.ionos.fr"

APPNAME="TokenForge"

#DOMAIN_APPLI="http://localhost:4200"
DOMAIN_APPLI="https://tf.f80.fr"
ERC20_BYTECODE_PATH="./static/deploy-erc20.json"
NFT_BYTECODE_PATH="./static/deploy-nft.json"

ADMIN_SALT="hh4271"

#on alimente les nouveaux comptes en eGold pour leur permettre des transferts
XGLD_FOR_NEWACCOUNT="500000000000000000"


#Description de la monnaie par defaut
MAIN_UNITY="TFC"
MAIN_URL="https://tf.f80.fr/assets/cmk.html"
TOTAL_DEFAULT_UNITY=1000000
CREDIT_FOR_NEWACCOUNT=75
DEFAULT_UNITY_CONTRACT="erd1qqqqqqqqqqqqqpgqvlqklu5hecwlann295ll05qktphsppudd8sswzmwqk"

LIMIT_GAS=60000000


TESTNET_EXPLORER="https://testnet-explorer.elrond.com"
TRANSACTION_EXPLORER=TESTNET_EXPLORER

SIGNATURE="<br><br>CoinMaker<br><a href='https://t.me/coinmaker_forum'>Le forum des utilisateurs</a>"

DB_SERVERS=dict({
    "local":"mongodb://127.0.0.1:27017",
    "server":"mongodb://admin:hh4271@server.f80.fr:27017",
    "cloud":"mongodb+srv://admin:hh4271!!@kerberus-44xyy.gcp.mongodb.net/test"
})

MAIN_DEVISE="xEGld"


#NFT pour le testnet officiel
#NFT_CONTRACT="erd1qqqqqqqqqqqqqpgqfx6ndl75schd9y4ulkhj2vq26j93kgued8ssd9pv42"

NFT_CONTRACT="erd1qqqqqqqqqqqqqpgqhf8qase6a8nw8phjwm2wd7uvkutexk67d8sszf9xuu"
NFT_ADMIN="admin"