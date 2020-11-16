USERNAME="reply@f80.fr"
PASSWORD="Hh42714280"
SMTP_SERVER="smtp.ionos.fr"
IMAP_SERVER="imap.ionos.fr"

APPNAME="CoinMaKer"

#DOMAIN_APPLI="http://localhost:4200"
DOMAIN_APPLI="https://coinmaker.f80.fr"
BYTECODE_PATH="./static/deploy.json"

ADMIN_SALT="hh4271"

#on alimente les nouveaux comptes en eGold pour leur permettre des transferts
XGLD_FOR_NEWACCOUNT="500000000000000000"


#Description de la monnaie par defaut
MAIN_UNITY="CMK"
MAIN_URL="https://coinmaker.f80.fr/assets/cmk.html"
DEFAULT_UNITY_CONTRACT="erd1qqqqqqqqqqqqqpgq6h5vwx3y77m2lf7p4hf5lev8twd9ml98a4sqk78hty"
TOTAL_DEFAULT_UNITY=1000000
CREDIT_FOR_NEWACCOUNT=75

TRANSACTION_EXPLORER="https://testnet-explorer.elrond.com/transactions/"

SIGNATURE="<br><br>CoinMaker<br><a href='https://t.me/coinmaker_forum'>Le forum des utilisateurs</a>"

DB_SERVERS=dict({
    "local":"mongodb://127.0.0.1:27017",
    "server":"mongodb://admin:hh4271@server.f80.fr:27017",
    "cloud":"mongodb+srv://admin:hh4271!!@kerberus-44xyy.gcp.mongodb.net/test"
})

MAIN_DEVISE="xEGld"
