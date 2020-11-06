import json
import logging
import os
import urllib
from datetime import datetime

from time import sleep

from erdpy.proxy import ElrondProxy
from erdpy import config
from erdpy.accounts import Account,AccountsRepository
from erdpy.contracts import SmartContract
from erdpy.environments import TestnetEnvironment
import erdpy.wallet.signing as signing_tools
from erdpy.transactions import Transaction

from Tools import send_mail, open_html_file, base_alphabet_to_10, log
from definitions import DOMAIN_APPLI


class ElrondNet:
    contract=None
    environment=None
    proxy=None


    def __init__(self,proxy="https://api-testnet.elrond.com",bank_pem="./PEM/alice.pem"):
        logging.basicConfig(level=logging.DEBUG)
        # Now, we create a environment which intermediates deployment and execution
        self.proxy=proxy
        self.environment = TestnetEnvironment(proxy)
        self.bank=Account(pem_file=bank_pem)


        #Récupération de la configuration : https://api-testnet.elrond.com/network/config



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
        user_to=None
        if "@" in _to:
            _d=self.create_account()
            send_mail(open_html_file("share",{
                "email":_to,
                "amount":str(amount),
                "from":"",
                "unity":"",
                "url_appli":DOMAIN_APPLI+"?addr="+self.contract.bech32()+"&user="+user_to.address,
                "public_key":_d["addr"],
                "private_key":_d["private_key_seed"],
            }),_to=_to,subject="Transfert")
            os.remove("./PEM/" + _d["filename"])
            user_to=_d["account"]

        user_to:Account=Account(address=_to)
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
        return {"from":user_from.address,"tx":rc,"to":user_to.address}

    def set_contract(self, contract):
        self.contract= SmartContract(address=contract)


    def deploy(self,bytecode_file,pem_file,unity="RVC",amount=1000):
        user=Account(pem_file=pem_file)
        user.sync_nonce(ElrondProxy(self.proxy))
        with open(bytecode_file,"r") as file:
            _json=file.read()
        json_bytecode=json.loads(_json)

        bytecode=json_bytecode["emitted_tx"]["data"]
        bytecode=bytecode.split("@0500")[0]
        contract = SmartContract(bytecode=bytecode)

        #TODO: arguments=[hex(amount),hex(base_alphabet_to_10(unity))]
        arguments = [amount]
        log("Déploiement du contrat "+unity+" via le compte "+user.address.bech32())
        log("Passage des arguments "+str(arguments))
        address=""
        try:
            tx, address = self.environment.deploy_contract(
                contract=contract,
                owner=user,
                arguments=arguments,
                gas_price=config.DEFAULT_GAS_PRICE/1,
                gas_limit=50000000,
                value=0,
                chain=config.get_chain_id(),
                version=config.get_tx_version()
            )
        except Exception as e:
            url = 'https://testnet-explorer.elrond.com/'+user.address.bech32()
            log("Echec de déploiement "+url)
            return {"error":500,"message":str(e.args),"link":url}

        #TODO: intégrer la temporisation pour événement
        url = 'https://api-testnet.elrond.com/transaction/' + tx
        log("Attente du déploiement https://testnet-explorer.elrond.com/transactions/" + tx)
        result={"data":{"transaction":{"status":"pending"}}}
        timeout=240
        while result["data"]["transaction"]["status"]=="pending" and timeout>0:
            sleep(3)
            with urllib.request.urlopen(url) as response:
                result = json.loads(response.read())
            timeout=timeout-3


        if result["data"]["transaction"]["status"]=="pending":
            log("Echec de déploiement, timeout")
            return {"error":600,
                    "message":"timeout",
                    "link": "https://testnet-explorer.elrond.com/transactions/" + tx,
                    "addr": address.bech32()
                    }
        else:
            self.contract=address
            url="https://testnet-explorer.elrond.com/transactions/"+tx
            log("Déploiement du nouveau contrat réussi a l'adresse "+self.contract.bech32()+" voir transaction "+url)
            return {"link":url,"contract":address.bech32(),"owner":user.address.bech32()}


    def getName(self):
        lst=self.environment.query_contract(self.contract,"name")
        if len(lst)>0:
            obj=lst[0]
            return obj.number
        else:
            return None

    def create_account(self,fund):
        name=str(datetime.now().timestamp()*1000)

        AccountsRepository("./PEM").generate_account(name)
        for f in os.listdir("./PEM"):
            if f.startswith(name):
                filename="./PEM/"+f
                break

        _u=Account(pem_file=filename)

        if fund>0:
            log("On transfere un peu d'eGold pour assurer les premiers transferts")
            _proxy=ElrondProxy(self.proxy)
            self.bank.sync_nonce(_proxy)
            t=Transaction()
            t.nonce=self.bank.nonce
            t.version=config.get_tx_version()
            t.data="refund for transfert"
            t.chainID=_proxy.get_chain_id()
            t.gasLimit=50000000
            t.value=str(fund)
            t.sender=self.bank.address.bech32()
            t.receiver=_u.address.bech32()
            t.gasPrice=config.DEFAULT_GAS_PRICE
            t.sign(self.bank)
            t.send(ElrondProxy(self.proxy))

        with open(filename, "r") as myfile:data = myfile.readlines()
        return({
            "filename":filename,
            "addr":_u.address.bech32(),
            "private_key_seed":_u.private_key_seed,
            "pem":"".join(data),
            "account":_u
        })

    def find_events(self, contract):
        self.set_contract(contract)





