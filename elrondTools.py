import logging

from erdpy import cli_shared, wallet
from erdpy.accounts import Address
from erdpy.wallet import pem
from argparse import ArgumentParser

from erdpy import config
from erdpy.accounts import Account
from erdpy.contracts import SmartContract
from erdpy.environments import TestnetEnvironment
from erdpy.projects import ProjectClang
from erdpy.proxy import ElrondProxy

class ElrondNet:
    contract=None
    environment=None

    def __init__(self,contract_addr,proxy="https://api-testnet.elrond.com",pem="./rv.pem"):

        logging.basicConfig(level=logging.DEBUG)

        # Now, we create a environment which intermediates deployment and execution
        self.environment = TestnetEnvironment(proxy)
        user = Account(pem_file=pem)

        # We initialize the smart contract with an actual address if IF was previously deployed,
        # so that we can start to interact with it ("query_flow")
        self.contract = SmartContract(address=contract_addr)


    def getBalance(self,addr:str):
        rc=self.environment.query_contract(self.contract,
                                        function="getBalance",
                                        arguments=addr)
        return rc


