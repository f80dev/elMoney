import json
import logging
import os
from datetime import datetime

from time import sleep

from erdpy.proxy import ElrondProxy
from erdpy import config
from erdpy.accounts import Account, AccountsRepository, Address
from erdpy.contracts import SmartContract
from erdpy.environments import TestnetEnvironment
from erdpy.transactions import Transaction
from erdpy.wallet import generate_pair,derive_keys

from Tools import log
from definitions import BYTECODE_PATH, TRANSACTION_EXPLORER


def toFiat(crypto,fiat=8):
    """
    Conversion du gas en monnaie ou egld
    :param crypto:
    :param fiat:
    :return:
    """
    return (int(crypto)/1e18)*fiat



class ElrondNet:
    """
    classe symbolisant la blocchaine
    """
    contract=None
    environment=None
    _proxy:ElrondProxy=None
    bank=None


    def __init__(self,proxy="https://testnet-api.elrond.com"):
        """
        Initialisation du proxy
        :param proxy:
        :param bank_pem:
        """
        log("Initialisation de l'environnement "+proxy)
        logging.basicConfig(level=logging.DEBUG)

        self._proxy=ElrondProxy(proxy)

        log("On utilise le testnet, la production n'étant pas encore disponible")
        self.environment = TestnetEnvironment(proxy)

        self.init_bank()

        log("Initialisation terminée")



    def getExplorer(self,tx):
        url=TRANSACTION_EXPLORER+tx
        if "explorer" in self._proxy.url:
            return url
        else:
            return tx



    def getBalance(self,contract,addr:str):
        if type(addr)==str:
            user = Account(address=addr)
        else:
            user=addr

        log("Ouverture du compte " + user.address.bech32() + " ok. Récupération du gas")
        gas=self._proxy.get_account_balance(address=user.address)

        log("Gas disponible "+str(gas))
        _contract=SmartContract(contract)
        try:
            rc=self.environment.query_contract(
                _contract,
                function="balanceOf",
                arguments=["0x"+user.address.hex()]
            )
        except Exception as inst:
            log("Exception à l'interrogation du contrat : "+str(inst.args))
            return {"error":str(inst.args)}


        if rc[0] is None or rc[0]=="":
            d={"number":0}
        else:
            d=json.loads(str(rc[0]).replace("'","\""))

        if "number" in d:
            d["gas"] = gas
            return d

        return rc




    def init_bank(self):
        """
        La bank va distribuer des egold pour permettre aux utilisateurs de pouvoir faire
        les premiers transfert gratuitement
        c'est elle qui recevra également le cout de fabrication d'une monnaie

        L'objectif est d'initialiser la propriété bank
        :return:
        """
        log("Initialisation de la bank")
        if os.path.exists("PEM/bank.pem"):
            log("On utilise le fichier bank.pem")
            self.bank=Account(pem_file="./PEM/bank.pem")
        else:
            self.bank,pem=self.create_account(name="bank")
            log("Vous devez transférer des fonds vers la banques "+self.bank.address.bech32())

        log("Initialisation de la banque à l'adresse "+self.bank.address.bech32())
        return True







    def transfer(self,_contract,user_from:Account,user_to:Account,amount:int):
        """
        Appel la fonction transfer du smart contrat, correpondant à un transfert de fond
        :param _contract:
        :param user_from:
        :param user_to:
        :param amount:
        :return:
        """
        if user_from.address.bech32()==user_to.address.bech32():
            return {"error":"Impossible de s'envoyer des fonds à soi-même"}

        if type(_contract)==str:_contract=SmartContract(_contract)

        user_from.sync_nonce(self._proxy)
        log("Transfert "+user_from.address.hex()+" -> "+user_to.address.hex()+" de "+str(amount)+" via le contrat "+_contract.address.bech32())
        try:
            tx=self.environment.execute_contract(_contract,
                                             user_from,
                                             function="transfer",
                                             arguments=["0x"+user_to.address.hex(),amount],
                                             gas_price=config.DEFAULT_GAS_PRICE,
                                             gas_limit=50000000,
                                             value=None,
                                             chain=self._proxy.get_chain_id(),
                                             version=config.get_tx_version())

            tr=self.wait_transaction(tx,"status",not_equal="pending")
            infos=self._proxy.get_account_balance(user_from.address)

            return {
                "from":user_from.address.bech32(),
                "tx":tx,
                "price":toFiat(tr["gasLimit"]),
                "account":toFiat(infos),
                "explorer":self.getExplorer(tx),
                "to":user_to.address.bech32()
            }
        except Exception as inst:
            return {"error":str(inst.args)}



    def deploy(self,pem_file,unity="RVC",amount=100000,gas_limit=80000000):
        """
        Déployer une nouvelle monnaie, donc un conrat ERC20
        :param pem_file: signature du propriétaire de la monnaie
        :param unity: nom court de la monnaie
        :param amount: montant de départ
        :return:
        """
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
                gas_price=config.DEFAULT_GAS_PRICE,
                gas_limit=gas_limit,
                value=0,
                chain=self._proxy.get_chain_id(),
                version=config.get_tx_version()
            )
        except Exception as e:
            url = 'https://testnet-explorer.elrond.com/'+user.address.bech32()
            log("Echec de déploiement "+url)
            return {"error":500,"message":str(e.args),"link":url}

        #TODO: intégrer la temporisation pour événement
        t=self.wait_transaction(tx,not_equal="pending")

        if t["status"]=="pending":
            log("Echec de déploiement, timeout")
            return {"error":600,
                    "message":"timeout",
                    "cost": toFiat(gas_limit*config.DEFAULT_GAS_PRICE,1),
                    "link": self.getExplorer(tx),
                    "addr": address.bech32()
                    }
        else:
            log("Déploiement du nouveau contrat réussi voir transaction "+self.getExplorer(tx))
            return {
                "link":self.getExplorer(tx),
                "cost": toFiat(gas_limit*config.DEFAULT_GAS_PRICE,1),
                "contract":address.bech32(),
                "owner":user.address.bech32()
            }




    def getName(self,contract):
        """
        Pour l'instant cette fonction ne marche pas.
        A terme elle permet de récupérer le nom de la monnaie (et donc se passer d'une base de données)
        :param contract:
        :return:
        """
        lst=self.environment.query_contract(contract,"name")
        if len(lst)>0:
            obj=lst[0]
            return obj.number
        else:
            return None




    def credit(self,_from:Account,_to:Account,amount:str):
        """
        transfert des egold à un contrat
        :param _from:
        :param _to:
        :param amount:
        :return:
        """
        _from.sync_nonce(self._proxy)
        t = Transaction()
        t.nonce = _from.nonce
        t.version = config.get_tx_version()
        t.data = "refund"
        t.chainID = self._proxy.get_chain_id()
        t.gasLimit = 50000000
        t.value = amount
        t.sender = _from.address.bech32()
        t.receiver = _to.address.bech32()
        t.gasPrice = config.DEFAULT_GAS_PRICE

        log("On signe la transaction avec le compte de la banque")
        t.sign(self.bank)

        try:
            log("On envoi les fonds")
            tx=t.send(self._proxy)
            self.wait_transaction(tx,not_equal="pending")
            log("Fond transférer, consulter la transaction "+self.getExplorer(tx))
            return tx
        except:
            return None


    def wait_transaction(self, tx,field="status",equal="",not_equal="",timeout=30,interval=2):
        """
        Attent qu'une transaction prenne un certain statut
        :param tx:
        :param field:
        :param equal:
        :param not_equal:
        :param timeout:
        :param interval:
        :return:
        """
        rc=dict()
        log("Attente jusqu'a "+str(interval*timeout)+" secs synchrone de la transaction "+self.getExplorer(tx))
        while timeout>0:
            sleep(interval)
            rc=self._proxy.get_transaction(tx_hash=tx)
            if len(equal)>0 and rc[field]==equal:break
            if len(not_equal) > 0 and rc[field] != not_equal: break
            timeout=timeout-1

        if timeout<=0:log("Timeout de "+self.getExplorer(tx)+" "+field+" est a "+str(rc[field]))
        return rc




    def create_account(self,fund="",name=None,seed_phrase=""):
        """

        :param fund:
        :param name:
        :param seed_phrase:
        :return:
        """
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
            tx=self.credit(self.bank,_u,fund)
            if tx is None:log("Le compte "+_u.address.bech32()+" n'a pas recu d'eGld pour les transactions")

        #if len(seed_phrase)==0 and name!="bank":os.remove(filename)

        return _u,pem







