import json
import logging
import os
import urllib
from datetime import datetime

from time import sleep

from erdpy.proxy import ElrondProxy
from erdpy import config
from erdpy.accounts import Account, AccountsRepository, Address
from erdpy.contracts import SmartContract
from erdpy.environments import TestnetEnvironment
from erdpy.transactions import Transaction
from erdpy.wallet import generate_pair,derive_keys

from Tools import send_mail, open_html_file, base_alphabet_to_10, log
from definitions import DOMAIN_APPLI, BYTECODE_PATH, DEFAULT_UNITY_CONTRACT, MAIN_UNITY, TOTAL_DEFAULT_UNITY


class ElrondNet:
    contract=None
    environment=None
    _proxy:ElrondProxy=None
    bank=None
    _default_contract=None


    def __init__(self,proxy="https://api-testnet.elrond.com",bank_pem="./PEM/alice.pem"):
        logging.basicConfig(level=logging.DEBUG)
        # Now, we create a environment which intermediates deployment and execution
        self._proxy=ElrondProxy(proxy)
        self.environment = TestnetEnvironment(proxy)
        self.init_bank()
        self.init_default_money()

        #Récupération de la configuration : https://api-testnet.elrond.com/network/config


    def getBalance(self,contract,addr:str):
        user = Account(address=addr)

        gas=self._proxy.get_account_balance(address=user.address)
        rc=self.environment.query_contract(SmartContract(contract),
                                        function="balanceOf",
                                        arguments=["0x"+user.address.hex()])
        if rc[0] is None or rc[0]=='':return 0

        d=json.loads(str(rc[0]).replace("'","\""))

        if "number" in d:
            d["gas"] = gas
            return d

        return None




    def init_bank(self):
        log("Initialisation de la banque")
        if os.path.exists("./PEM/bank.pem"):
            self.bank=Account(pem_file="./PEM/bank.pem")
        else:
            self.bank,pem=self.create_account(name="bank")
            log("Vous devez transférer des fonds vers la banques "+self.bank.address.bech32())





    def init_default_money(self):
        rc=dict()
        if len(DEFAULT_UNITY_CONTRACT)==0:
            if self.bank is not None:
                rc=self.deploy(self.bank, MAIN_UNITY, TOTAL_DEFAULT_UNITY)
                if "error" in rc:
                    log("Impossible de déployer le contrat de la monnaie par defaut")
                    return False
            else:
                log("Vous devez initialiser la bank pour créer le contrat de monnaie par défaut")
                return False
        else:
            rc["contract"]=DEFAULT_UNITY_CONTRACT
            self._default_contract=SmartContract(address=DEFAULT_UNITY_CONTRACT)

        log("Contrat de la monnaie par defaut déployer à "+rc["contract"])
        return True

    def transfer(self,_contract,user_from:Account,user_to:Account,amount:int):
        if type(_contract)==str:_contract=SmartContract(_contract)

        user_from.sync_nonce(self._proxy)
        user_from.nonce=user_from.nonce+1
        rc=self.environment.execute_contract(_contract,
                                             user_from,
                                             function="transfer",
                                             arguments=["0x"+user_to.address.hex(),amount],
                                             gas_price=config.DEFAULT_GAS_PRICE,
                                             gas_limit=50000000,
                                             value=None,
                                             chain=self._proxy.get_chain_id(),
                                             version=config.get_tx_version())

        return {
            "from":user_from.address,
            "tx":rc,
            "explorer":"https://testnet-explorer.elrond.com/transactions/"+rc,
            "to":user_to.address.bech32()
        }



    def set_contract(self, contract):
        self.contract= SmartContract(address=contract)


    def deploy(self,pem_file,unity="RVC",amount=100000):
        if type(pem_file)==str:
            user=Account(pem_file=pem_file)
        else:
            user=pem_file

        user.sync_nonce(self._proxy)
        with open(BYTECODE_PATH,"r") as file:
            _json=file.read()
        json_bytecode=json.loads(_json)

        bytecode=json_bytecode["emitted_tx"]["data"]
        bytecode=bytecode.split("@0500")[0]

        #TODO: arguments=[hex(amount),hex(base_alphabet_to_10(unity))]
        arguments = [amount]
        log("Déploiement du contrat "+unity+" via le compte https://testnet-explorer.elrond.com/address/"+user.address.bech32())
        log("Passage des arguments "+str(arguments))
        try:
            tx, address = self.environment.deploy_contract(
                contract=SmartContract(bytecode=bytecode),
                owner=user,
                arguments=arguments,
                gas_price=config.DEFAULT_GAS_PRICE/1,
                gas_limit=50000000,
                value=0,
                chain=self._proxy.get_chain_id(),
                version=config.get_tx_version()
            )
        except Exception as e:
            url = 'https://testnet-explorer.elrond.com/'+user.address.bech32()
            log("Echec de déploiement "+url)
            return {"error":500,"message":str(e.args),"link":url}

        #TODO: intégrer la temporisation pour événement
        url = self._proxy.url+'/transaction/' + tx
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
            url=self._proxy.url+"/transactions/"+tx
            log("Déploiement du nouveau contrat réussi a l'adresse "+self.contract.bech32()+" voir transaction "+url)
            return {"link":url,"contract":address.bech32(),"owner":user.address.bech32()}


    def getName(self):
        lst=self.environment.query_contract(self.contract,"name")
        if len(lst)>0:
            obj=lst[0]
            return obj.number
        else:
            return None


    def credit(self,_from:Account,_to:Account,amount:str):
        _from.sync_nonce(self._proxy)
        t = Transaction()
        t.nonce = _from.nonce
        t.version = config.get_tx_version()
        t.data = "refund for transfert"
        t.chainID = self._proxy.get_chain_id()
        t.gasLimit = 50000000
        t.value = amount
        t.sender = _from.address.bech32()
        t.receiver = _to.address.bech32()
        t.gasPrice = config.DEFAULT_GAS_PRICE

        log("On signe la transaction avec le compte de la banque")
        t.sign(self.bank)

        log("On envoi les fonds")
        tx=t.send(self._proxy)
        log("Fond transférer, consulter la transaction https://testnet-explorer.elrond.com/transactions/"+tx)


    def create_account(self,fund="",name=None,seed_phrase=""):

        log("Création d'un nouveau compte")
        pem=""

        if len(seed_phrase)==0:
            if name is None:
                name = "User" + str(datetime.now().timestamp() * 1000).split(".")[0]

            AccountsRepository("./PEM").generate_account(name)
            for f in os.listdir("./PEM"):
                if f.startswith(name):
                    os.rename("./PEM/"+f,"./PEM/"+name+".pem")
                    filename="./PEM/"+name+".pem"

                    with open(filename, "r") as myfile: data = myfile.readlines()
                    pem="".join(data).replace(name+":","")
                    with open(filename, "w") as myfile:
                        myfile.write(pem)
                        myfile.close()

                    break
            _u=Account(pem_file=filename)
        else:
            seed, pubkey = derive_keys(seed_phrase)
            address = Address(pubkey).bech32()
            _u = Account(address=address)
            _u.private_key_seed = seed.hex()

        if len(fund)>0:
            log("On transfere un peu d'eGold pour assurer les premiers transferts"+str(fund))
            self.credit(self.bank,_u,fund)


        #if len(seed_phrase)==0 and name!="bank":os.remove(filename)

        return _u,pem







