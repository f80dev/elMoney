USERNAME="reply@f80.fr"
PASSWORD="Hh42714280"
SMTP_SERVER="smtp.ionos.fr"
IMAP_SERVER="imap.ionos.fr"

APPNAME="CoinMaKer"

#DOMAIN_APPLI="http://localhost:4200"
DOMAIN_APPLI="https://coinmaker.f80.fr"
ERC20_BYTECODE_PATH="./static/deploy-erc20.json"
NFT_BYTECODE_PATH="./static/deploy-nft.json"

ADMIN_SALT="hh4271"

#on alimente les nouveaux comptes en eGold pour leur permettre des transferts
XGLD_FOR_NEWACCOUNT="500000000000000000"


#Description de la monnaie par defaut
MAIN_UNITY="CMK"
MAIN_URL="https://coinmaker.f80.fr/assets/cmk.html"
TOTAL_DEFAULT_UNITY=1000000
CREDIT_FOR_NEWACCOUNT=75
DEFAULT_CMK_CONTRACT="erd1qqqqqqqqqqqqqpgq50mdxq2fful0ylnm0qye54lml9n85hp0d8ssgqjved"



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

NFT_CONTRACT="erd1qqqqqqqqqqqqqpgq9j6hzapx7lxzqy9nklcyg0w2sfqdd76zd8sscwxfy8"
NFT_ADMIN="admin"