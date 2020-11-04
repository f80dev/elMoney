USERS="../PEM"
PROJECT="."
ALICE="${USERS}/alice.pem"
ADDRESS=$(erdpy data load --key=address)
DEPLOY_TRANSACTION=$(erdpy data load --key=deployTransaction)
ARGUMENTS="1000 1000"

deploy() {
    erdpy --verbose contract deploy --project=${PROJECT} --arguments ${ARGUMENTS} --recall-nonce --pem="alice.pem" --gas-limit=5000000 --send --outfile="deploy.json"

    TRANSACTION=$(erdpy data parse --file="deploy.json" --expression="data['result']['hash']")
    ADDRESS=$(erdpy data parse --file="deploy.json" --expression="data['emitted_tx']['address']")

    erdpy data store --key=address --value=${ADDRESS}
    erdpy data store --key=deployTransaction --value=${TRANSACTION}

    echo ""
    echo "Smart contract address: ${ADDRESS}"
}


build(){
  erdpy --verbose contract build
}


checkDeployment() {
    erdpy tx get --hash=$DEPLOY_TRANSACTION --omit-fields="['data', 'signature']"
    erdpy account get --address=$ADDRESS --omit-fields="['code']"
}

name() {
    erdpy --verbose contract call ${ADDRESS} --recall-nonce --pem=${ALICE} --gas-limit=5000000 --function="name" --send
}

