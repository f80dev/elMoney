import json
import logging

from erdpy.proxy import ElrondProxy
from erdpy.wallet import bech32
from erdpy import config
from erdpy.accounts import Account
from erdpy.contracts import SmartContract
from erdpy.environments import TestnetEnvironment
from psycopg2.extensions import JSON


class ElrondNet:
    contract=None
    environment=None
    proxy=None

    def __init__(self,contract_addr,proxy="https://api-testnet.elrond.com",pem="./PEM/alice.pem"):

        logging.basicConfig(level=logging.DEBUG)

        # Now, we create a environment which intermediates deployment and execution
        self.proxy=proxy
        self.environment = TestnetEnvironment(proxy)

        # We initialize the smart contract with an actual address if IF was previously deployed,
        # so that we can start to interact with it ("query_flow")
        self.contract = SmartContract(address=contract_addr)


    def getBalance(self,addr:str):
        user = Account(address=addr)
        rc=self.environment.query_contract(self.contract,
                                        function="balanceOf",
                                        arguments=["0x"+user.address.hex()])
        if rc[0] is None:return 0

        d=json.loads(str(rc[0]).replace("'","\""))
        if "number" in d:return d["number"]
        return None


    def transfer(self,_from:str,_to:str,amount:int):
        user_to=Account(address=_to)
        user_from=Account(pem_file=_from)
        user_from.sync_nonce(ElrondProxy(self.proxy))
        rc=self.environment.execute_contract(self.contract,user_from,
                                             function="transfer",
                                             arguments=["0x"+user_to.address.hex(),amount],
                                             gas_price=config.DEFAULT_GAS_PRICE,
                                             gas_limit=500000,
                                             value=None,
                                             chain=config.get_chain_id(),
                                             version=config.get_tx_version())
        return user_from.address


