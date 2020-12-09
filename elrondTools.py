import base64
import json
import logging
import os
import urllib
import requests as rq
from datetime import datetime

from time import sleep
from urllib import parse

from erdpy.proxy import ElrondProxy
from erdpy import config
from erdpy.accounts import Account, AccountsRepository, Address
from erdpy.contracts import SmartContract
from erdpy.environments import TestnetEnvironment
from erdpy.transactions import Transaction
from erdpy.wallet import generate_pair,derive_keys

from Tools import log, base_alphabet_to_10
from definitions import TRANSACTION_EXPLORER


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
    chain_id=None


    def __init__(self,proxy="https://testnet-api.elrond.com"):
        """
        Initialisation du proxy
        :param proxy:
        :param bank_pem:
        """
        log("Initialisation de l'environnement "+proxy)
        logging.basicConfig(level=logging.DEBUG)

        self._proxy=ElrondProxy(proxy)
        self.chain_id=self._proxy.get_chain_id()

        log("On utilise le testnet, la production n'étant pas encore disponible")
        self.environment = TestnetEnvironment(proxy)

        self.init_bank()

        log("Initialisation terminée")


    def check_contract(self,contrat_addr):
        _ctr=SmartContract(address=contrat_addr)
        _dt=_ctr.metadata
        if _dt is None:
            return False
        else:
            return True


    def getExplorer(self,tx,type="transactions"):
        url=TRANSACTION_EXPLORER+"/"+type+"/"+tx
        if "elrond.com" in self._proxy.url:
            return url
        else:
            type=type.replace("transactions","transaction")
            return self._proxy.url+"/"+type+"/"+tx



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
                contract=_contract,
                function="balanceOf",
                arguments=["0x"+user.address.hex()]
            )
        except Exception as inst:
            log("Exception à l'interrogation du contrat : "+str(inst.args))
            return {"error":str(inst.args),"number":0,"gas":gas}


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

        log("Initialisation de la banque à l'adresse "+self.getExplorer(self.bank.address.bech32(),"address"))
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

        log("Transfert "+user_from.address.hex()+" -> "+user_to.address.hex()+" de "+str(amount)+" via le contrat "+_contract)
        try:
            tr=self.execute(_contract,user_from,
                            function="transfer",
                            arguments=["0x"+user_to.address.hex(),amount]
                            )

            infos=self._proxy.get_account_balance(user_from.address)

            return {
                "from":user_from.address.bech32(),
                "price":toFiat(tr["gasLimit"]),
                "account":toFiat(infos),
                "explorer":self.getExplorer(tr["blockHash"],"address"),
                "to":user_to.address.bech32()
            }
        except Exception as inst:
            return {"error":str(inst.args)}






    def deploy(self,pem_file,unity,bytecode_file,amount,gas_limit=80000000):
        """
        Déployer une nouvelle monnaie, donc un conrat ERC20
        :param pem_file: signature du propriétaire de la monnaie
        :param unity: nom court de la monnaie
        :param amount: montant de départ
        :return:
        """
        log("Préparation du owner du contrat")
        user = pem_file
        if type(pem_file)==str:
            user=Account(pem_file=pem_file)
        user.sync_nonce(self._proxy)

        with open(bytecode_file,"r") as file: _json=file.read()
        json_bytecode=json.loads(_json)

        bytecode=json_bytecode["emitted_tx"]["data"]
        bytecode=bytecode.split("@0500@0100")[0]

        arguments=[str(amount),hex(base_alphabet_to_10(unity))]

        log("Déploiement du contrat "+str(arguments)+" via le compte "+self.getExplorer(user.address.bech32(),"address"))
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
        except Exception as inst:
            url = self.getExplorer(user.address.bech32(),"address")
            log("Echec de déploiement "+url)
            return {"error":500,"message":str(inst.args),"link":url}

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
                "contract_hex":address.hex(),
                "owner":user.address.bech32()
            }




    def getName(self,contract):
        """
        Pour l'instant cette fonction ne marche pas.
        A terme elle permet de récupérer le nom de la monnaie (et donc se passer d'une base de données)
        :param contract:
        :return:
        """
        lst=self.environment.query_contract(SmartContract(address=contract),"nameOf")
        if len(lst)>0:
            val=str(lst[0].number)
            name=bytes.fromhex(val).decode("utf-8")
            return name
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
        except Exception as inst:
            return None


    def wait_transaction(self, tx,field="status",equal="",not_equal="",timeout=30,interval=4):
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
        rc=None
        while timeout>0:
            sleep(interval)
            rc=self._proxy.get_transaction(tx_hash=tx)
            if len(equal)>0 and rc[field]==equal:break
            if len(not_equal) > 0 and rc[field] != not_equal: break
            timeout=timeout-1

        if "elrond.com" in self._proxy.url:
            with urllib.request.urlopen(self._proxy.url+'/transactions/'+tx) as response:
                txt = response.read()
            rc=json.loads(txt)
            rc["cost"] = (rc["gasPrice"] * rc["gasUsed"]) / 1e18
        else:
            rc["cost"]=0

        log("Transaction executé "+str(rc))
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



    def execute(self,_contract,_user,function,arguments=[],value=None):
        if type(_contract) == str: _contract = SmartContract(_contract)
        if type(_user)==str:
            if ".pem" in _user:
                _user=Account(pem_file=_user)
            else:
                _user=Account(address=_user)

        _user.sync_nonce(self._proxy)
        try:
            tx = self.environment.execute_contract(_contract,_user,
                                                   function=function,
                                                   arguments=arguments,
                                                   gas_price=config.DEFAULT_GAS_PRICE,
                                                   gas_limit=80000000,
                                                   value=value,
                                                   chain=self.chain_id,
                                                   version=config.get_tx_version()
                                                   )
        except Exception as inst:
            log("Impossible d'executer "+function+" "+str(inst.args))
            return None

        tr = self.wait_transaction(tx, "status", not_equal="pending")
        return tr




    def query(self,_contract,function_name,arguments=None,isnumber=True,n_try=3):
        if type(_contract)==str: _contract=SmartContract(_contract)

        d = None
        for i in range(n_try):
            try:
                d=self.environment.query_contract(_contract, function_name,arguments)
                break
            except Exception as inst:
                sleep(3)
                log("Essai "+str(i)+" Impossible d'executer "+function_name+"("+str(arguments)+") -> ")
                log(str(inst.args))

        if d is None: return None


        if len(d)>0:
            if isnumber:
                return d[0].number
            else:
                val = d[0].base64
                rc=base64.b64decode(val)
                return rc
        else:
            return None



    def owner_of(self, contract,token):
        lst = self.query(SmartContract(address=contract), "tokenOwner",arguments=[token])
        return lst



    def get_uris(self, contract):
        _contract=SmartContract(contract)
        rc = list()
        tokens = self.query(_contract, "tokens", arguments=[0xAA,0xFF],isnumber=False)

        if not tokens is None:
            tokens=tokens.hex()
            index=0
            for token in tokens.split("ffffffff"):
                if len(token)>10:
                    hexprice = token.split("aaaaaaaa")[0];
                    i = 0
                    while hexprice[i] == "0": i = i + 1
                    if len(hexprice)>i+2:
                        price = int(hexprice[i + 2:], 16)/1e18
                    else:
                        price=0

                    token = token.split("aaaaaaaa")[1]

                    _u=SmartContract(address=token[0:64])
                    addr =_u.address.bech32()

                    state = int(token[64:66], 16)
                    try:
                        uri = str(bytearray.fromhex(token[66:]), "utf-8")
                    except:
                        uri=""

                    rc.append({"token_id": index, "uri": uri, "price": price, "state": state,"owner":addr})
                    index=index+1

        rc=sorted(rc,key=lambda i: i["token_id"],reverse=True)
        return rc


    def evalprice(self,sender_addr,receiver_addr,value=0,data="exemplededata"):
        body={
            "version":config.get_tx_version(),
            "chainID":self._proxy.get_chain_id(),
            "value":value,
            "sender":sender_addr,
            "receiver":receiver_addr,
            "data":data
        }

        r=rq.post(self._proxy.url+"/transaction/cost",data=body)
        rc=json.loads(r.text)
        return rc



    def mint(self, contract, user_from,arguments):
        """
        Fabriquer un NFT
        :param contract:
        :param user_from:
        :param arguments:
        :return:
        """
        log("Minage avec "+str(arguments))
        tx=self.execute(contract,user_from,"mint",arguments)
        return tx


    def nft_buy(self, contract, pem_file, token_id,price):
        value=int(1e18*price)
        tr = self.execute(contract,pem_file,
                                               function="buy",
                                               arguments=[token_id],
                                               value=value)

        return tr


    def nft_open(self, contract, pem_file, token_id):
        tr = self.execute(contract,pem_file,
                            function="open",
                            arguments=[int(token_id)],
                            value=0
                          )
        return tr


    def burn(self, contract,sender, token_id):
        tr = self.execute(contract,sender,
                            function="burn",
                            arguments=[int(token_id)]
                          )
        return tr


    def set_state(self, contract, pem_file, token_id, state):
        tx = self.execute(contract,pem_file,
                            function="setstate",
                            arguments=[int(token_id),int(state)],
                          )

        return tx















