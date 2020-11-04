USERS="../PEM"
PROJECT="."
ALICE="${USERS}/dan.pem"
ADDRESS=$(erdpy data load --key=address)
DEPLOY_TRANSACTION=$(erdpy data load --key=deployTransaction)
ARGUMENTS=1000

deploy() {
    erdpy --verbose contract deploy --project=${PROJECT} --arguments 0xFFFF --recall-nonce --pem=${ALICE} --gas-limit=50000000 --send --outfile="deploy.json"

    TRANSACTION=$(erdpy data parse --file="deploy.json" --expression="data['result']['hash']")
    ADDRESS=$(erdpy data parse --file="deploy.json" --expression="data['emitted_tx']['address']")

    erdpy data store --key=address --value=${ADDRESS}
    erdpy data store --key=deployTransaction --value=${TRANSACTION}

    echo ""
    echo "Smart contract address: ${ADDRESS}"
}



checkDeployment() {
    erdpy tx get --hash=$DEPLOY_TRANSACTION --omit-fields="['data', 'signature']"
    erdpy account get --address=$ADDRESS --omit-fields="['code']"
}


build(){
  erdpy --verbose contract build
}


checkDeployment() {
    erdpy tx get --hash=$DEPLOY_TRANSACTION --omit-fields="['data', 'signature']"
    erdpy account get --address=$ADDRESS --omit-fields="['code']"
}

name() {
  echo "Contrat ${ADDRESS}"
  erdpy --verbose contract query ${ADDRESS} --function="name"
}

transfer() {
  echo "Contrat ${ADDRESS}"
  erdpy --verbose contract call ${ADDRESS} --recall-nonce --pem=${ALICE} --arguments "" --gas-limit=5000000 --function="tranfer" --send
}

balance() {
  echo "Contrat ${ADDRESS}"
  erdpy --verbose contract query ${ADDRESS} --arguments "0x1e8a8b6b49de5b7be10aaa158a5a6a4abb4b56cc08f524bb5e6cd5f211ad3e13" --function="balanceOf"
}

