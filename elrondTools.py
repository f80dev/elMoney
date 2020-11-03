import json
import logging
import os
import urllib
from time import sleep

from erdpy.proxy import ElrondProxy
from erdpy import config
from erdpy.accounts import Account,AccountsRepository
from erdpy.contracts import SmartContract
from erdpy.environments import TestnetEnvironment

from Tools import send_mail, open_html_file, base_alphabet_to_10, log
from definitions import DOMAIN_APPLI


class ElrondNet:
    contract=None
    environment=None
    proxy=None

    def __init__(self,proxy="https://api-testnet.elrond.com",pem="./PEM/alice.pem"):
        logging.basicConfig(level=logging.DEBUG)
        # Now, we create a environment which intermediates deployment and execution
        self.proxy=proxy
        self.environment = TestnetEnvironment(proxy)



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
        if "@" in _to:
            AccountsRepository("./PEM").generate_accounts(1)
            lst=os.listdir("./PEM/")
            filename="./PEM/"+lst[0]
            user_to=Account(pem_file=filename)
            send_mail(open_html_file("share",{
                "email":_to,
                "amount":str(amount),
                "from":"",
                "unity":"",
                "url_appli":DOMAIN_APPLI+"?addr="+self.contract.bech32()+"&user="+user_to.address,
                "public_key":user_to.address,
                "private_key":user_to.private_key_seed.encode("utf-8")
            }),_to=_to,subject="Transfert")
            os.remove("./PEM/" + lst[0])

        user_to=Account(address=_to)
        user_from=Account(pem_file=_from)
        user_from.sync_nonce(ElrondProxy(self.proxy))
        rc=self.environment.execute_contract(self.contract,user_from,
                                             function="transfer",
                                             arguments=["0x"+user_to.address.hex(),amount],
                                             gas_price=config.DEFAULT_GAS_PRICE,
                                             gas_limit=50000000,
                                             value=None,
                                             chain=config.get_chain_id(),
                                             version=config.get_tx_version())
        return {"from":user_from.address,"tx":rc}

    def set_contract(self, contract):
        self.contract= SmartContract(address=contract)


    def deploy(self,wasm_file,pem_file,unity="RVC",amount=1000):
        user=Account(pem_file=pem_file)
        user.sync_nonce(ElrondProxy(self.proxy))
        contract = SmartContract(bytecode=wasm_file)

        log("Déploiement du contrat "+unity+" via le compte "+user.address.bech32())
        try:
            tx, address = self.environment.deploy_contract(
                contract=contract,
                owner=user,
                arguments=[amount,base_alphabet_to_10(unity)],
                gas_price=config.DEFAULT_GAS_PRICE*1.4,
                gas_limit=5000000000,
                value=None,
                chain=config.get_chain_id(),
                version=config.get_tx_version()
            )
        except Exception as e:
            url = 'https://testnet-explorer.elrond.com/'+user.address.bech32()
            log("Echec de déploiement "+url)
            return {"error":500,"message":str(e.args),"link":url}

        #TODO: intégrer la temporisation pour événement
        url = 'https://api-testnet.elrond.com/transaction/' + tx + '/status'
        log("Attente du déploiement "+url)
        result={"data":{"status":"pending"}}
        timeout=240
        while result["data"]["status"]=="pending" and timeout>0:
            with urllib.request.urlopen(url) as response:
                result = json.loads(response.read())
            timeout=timeout-2
            sleep(2)

        if result["data"]["status"]=="pending":
            log("Echec de déploiement, timeout")
            return {"link": "https://testnet-explorer.elrond.com/transactions/" + tx, "addr": address.bech32()}
        else:
            self.contract=address
            url="https://testnet-explorer.elrond.com/transactions/"+tx
            log("Déploiement réussi "+url+" a l'adresse "+self.contract)
            return {"link":url,"addr":address.bech32()}

    def getName(self):
        lst=self.environment.query_contract(self.contract,"name")
        if len(lst)>0:
            obj=lst[0]
            return obj.number
        else:
            return None




