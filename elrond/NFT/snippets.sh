USERS="../PEM"
PROJECT="."
ALICE="${USERS}/alice.pem"
ADDRESS=$(erdpy data load --key=address)
DEPLOY_TRANSACTION=$(erdpy data load --key=deployTransaction)
ARGUMENTS=10000


checkDeployment() {
    erdpy tx get --hash=$DEPLOY_TRANSACTION --omit-fields="['data', 'signature']"
    erdpy account get --address=$ADDRESS --omit-fields="['code']"
}

configTestnet() {
  erdpy testnet prerequisites
  erdpy config set chainID local-testnet
  erdpy config set proxy http://localhost:7950
  rm testnet.toml
  echo "[networking]" >> testnet.toml
  echo "post_proxy = 7950" >> testnet.toml
  erdpy testnet config
}

testnet(){
  erdpy testnet start
}

deploy() {
    erdpy --verbose contract deploy --project=${PROJECT} --arguments ${ARGUMENTS} --recall-nonce --pem=${ALICE} --gas-limit=50000000 --send --outfile="deploy.json"

    TRANSACTION=$(erdpy data parse --file="deploy.json" --expression="data['result']['hash']")
    ADDRESS=$(erdpy data parse --file="deploy.json" --expression="data['emitted_tx']['address']")

    erdpy data store --key=address --value=${ADDRESS}
    erdpy data store --key=deployTransaction --value=${TRANSACTION}

    echo ""
    echo "Smart contract address: ${ADDRESS}"
    checkDeployment
}


build(){
  rm ./output/*
  erdpy --verbose contract build
  ls -l ./output
  deploy
}


checkDeployment() {
    erdpy tx get --hash=$DEPLOY_TRANSACTION --omit-fields="['data', 'signature']"
    erdpy account get --address=$ADDRESS --omit-fields="['code']"
}

info() {
  echo "Contrat ${ADDRESS}"
  erdpy contract query ${ADDRESS} --function="totalSupply"
}

transfer() {
  echo "Contrat ${ADDRESS}"
  erdpy --verbose contract call ${ADDRESS} --recall-nonce --pem=${ALICE} --arguments "erd1kyaqzaprcdnv4luvanah0gfxzzsnpaygsy6pytrexll2urtd05ts9vegu7" --gas-limit=5000000 --function="tranfer" --send
}

balance() {
  echo "Contrat ${ADDRESS}"
  erdpy --verbose contract query ${ADDRESS} --arguments "0x1e8a8b6b49de5b7be10aaa158a5a6a4abb4b56cc08f524bb5e6cd5f211ad3e13" --function="balanceOf"
}

