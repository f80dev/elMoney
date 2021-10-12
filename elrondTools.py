import base64
import json
import logging
import os
from datetime import datetime, timedelta
from hashlib import md5

from time import sleep

import requests
from AesEverywhere import aes256
from erdpy.proxy import ElrondProxy
from erdpy import config, wallet
from erdpy.accounts import Account, AccountsRepository, Address
from erdpy.contracts import SmartContract
from erdpy.environments import TestnetEnvironment
from erdpy.transactions import Transaction
from erdpy.wallet import derive_keys, pem
from erdpy.wallet.keyfile import load_from_key_file
from requests_cache import CachedSession

from Tools import log, base_alphabet_to_10, str_to_hex, hex_to_str, nbr_to_hex, translate, now
from definitions import LIMIT_GAS, ESDT_CONTRACT, NETWORKS, ESDT_PRICE, IPFS_NODE_PORT, IPFS_NODE_HOST, SECRET_KEY, \
    DEFAULT_VISUAL, DEFAULT_VISUAL_SHOP
from ipfs import IPFS


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
    network_name="devnet"
    ipfs=IPFS(IPFS_NODE_HOST,IPFS_NODE_PORT)
    cached_sess = CachedSession(expire_after=timedelta(hours=1))

    def __init__(self,network_name="devnet"):
        """
        Initialisation du proxy
        :param proxy:
        :param bank_pem:
        """
        self.network_name=network_name
        self.contract=NETWORKS[network_name]["nft"]
        proxy=NETWORKS[network_name]["proxy"]
        log("Initialisation de l'environnement "+proxy)
        logging.basicConfig(level=logging.DEBUG)

        log("Initialisation du proxy")
        self._proxy=ElrondProxy(proxy)
        self.chain_id=self._proxy.get_chain_id()

        log("Initialisation de l'environnement")
        self.environment = TestnetEnvironment(proxy)

        log("Initialisation de la bank")
        self.init_bank()

        log("Initialisation terminée")


    def get_elrond_user(self,data):
        """
        Fabrique ou recupere un pemfile
        :param data:
        :return:
        """
        rc=None
        if type(data) == dict and "pem" in data:data=data["pem"]
        if type(data)!=str: data=str(data, "utf8")

        if data.endswith(".pem"):
            return Account(pem_file="./PEM/"+data)

        if data.startswith("{"):
            data = json.loads(data)
        else:
            data={"file":data}

        if "seed_phrase" in data:
            private_key, public_key = derive_keys(data["seed_phrase"], 0)
            rc=Account(address=public_key)
            rc.private_key_seed=private_key.hex()

        if "file" in data:
            content=data["file"]

            if content.startswith("{"):
                content=json.loads(content)
                if "filename" in data and "password" in data:
                    filename="./temp/"+data["filename"]
                    with open(filename,"w") as f:
                        f.write(data["file"])

                    address_from_key_file, seed = load_from_key_file(filename, data["password"])
                    rc=Account(address=Address(address_from_key_file))
                    rc.private_key_seed = seed.hex()
            else:
                if not "BEGIN PRIVATE KEY" in content:
                    content=str(aes256.decrypt(base64.b64decode(content), SECRET_KEY), "utf8")

                contents=content.replace("\n","").replace("BEGIN PRIVATE KEY for ","").split("-----")
                res = bytes.fromhex(base64.b64decode(contents[2]).decode())
                seed=res[:32]
                pubkey=res[32:]

                rc = Account(address=Address(pubkey))
                rc.private_key_seed = seed.hex()

        # rc="./PEM/"+NETWORKS[bc.network_name]["bank"]+".pem"

        #filename = "./PEM/temp" + str(now() * 1000) + ".xpem"
        #log("Fabrication d'un fichier xPEM pour la signature et enregistrement sur " + filename)

        # if type(data)==bytes:
        #     content=str(data,"utf8")
        #     if content.endswith(".pem"):return Account(pem_file="./PEM/"+content)

        # with open(filename, "w") as file:
        #     file.write(private_key.hex())

        #os.remove(filename)

        return rc

    def check_contract(self,contrat_addr):
        _ctr=SmartContract(address=contrat_addr)
        _dt=_ctr.metadata
        if _dt is None:
            return False
        else:
            return True


    def getExplorer(self,tx,type="transactions"):
        url=NETWORKS[self.network_name]["explorer"]+"/"+type+"/"+tx
        if "elrond.com" in self._proxy.url:
            return url
        else:
            type=type.replace("transactions","transaction")
            return self._proxy.url+"/"+type+"/"+tx


    def send_transaction(self,_sender:Account,_receiver:Account,_sign:Account,value:str,data:str,gas_limit=LIMIT_GAS):
        """
        Envoi d'une transaction signée
        :param _sender:
        :param _receiver:
        :param _sign:
        :param value:
        :param data:
        :return:
        """
        _sender.sync_nonce(self._proxy)
        t = Transaction()
        t.nonce = _sender.nonce
        t.version = config.get_tx_version()
        t.data = data
        t.chainID = self._proxy.get_chain_id()
        t.gasLimit = gas_limit
        t.value = str(value)
        t.sender = _sender.address.bech32()
        t.receiver = _receiver.address.bech32()
        t.gasPrice = config.DEFAULT_GAS_PRICE

        log("On signe la transaction avec le compte "+_sign.address.bech32())
        t.sign(_sign)

        try:
            tx = t.send(self._proxy)
            log("Execution de la transaction "+self.getExplorer(tx))
            tr=self.wait_transaction(tx, not_equal="pending")
            return tr
        except Exception as inst:
            log("Exception d'execution de la requete "+str(inst.args))
            return None



    def getMoneys(self,_user:Account):
        url = self._proxy.url + '/address/' + _user.address.bech32() + "/esdt"
        log("Interrogation de la balance : " + url)
        lst = [{
            "tokenIdentifier": "EGLD",
            "balance": self._proxy.get_account_balance(_user.address)
        }]

        try:
            result=requests.get(url).json()["data"]["esdts"].values()
            for r in result:
                if not "royalties" in r:lst.append(r)
        except Exception as arg:
            log("L'interrogation des tokens ne fonctionne pas="+str(arg))

        #Transforme la liste en dict sur la base du tokenIdentifier
        rc=dict()
        for l in lst:
            if "tokenIdentifier" in l:
                rc[l["tokenIdentifier"]]=l
                rc[l["tokenIdentifier"]]["solde"]=float(l["balance"])/(10**18)
                rc[l["tokenIdentifier"]]["unity"]=l["tokenIdentifier"].split("-")[0]
                rc[l["tokenIdentifier"]]["url"]=""
                #TODO ajouter ici la documentation des monnaies via la base de données

        return rc






    # def getBalanceESDT(self, _user:Account,_money=None):
    #
    #     if not _money is None:
    #         decimals = _money["decimals"]
    #         idx = _money["idx"]
    #         for token in d:
    #             if token["tokenIdentifier"]==idx:
    #                 return {
    #                     "number":float(token["balance"])/(10**decimals),
    #                     "gas":self._proxy.get_account_balance(_user.address),
    #                     "token":token["tokenName"]
    #                 }
    #         return {"number":0,"gas":self._proxy.get_account_balance(_user.address)}
    #



    # def getBalance(self,contract,addr:str):
    #     if type(addr)==str:
    #         user = Account(address=addr)
    #     else:
    #         user=addr
    #
    #     log("Ouverture du compte " + user.address.bech32() + " ok. Récupération du gas")
    #     gas=self._proxy.get_account_balance(address=user.address)
    #
    #     log("Gas disponible "+str(gas))
    #     _contract=SmartContract(contract)
    #     try:
    #         rc=self.environment.query_contract(
    #             contract=_contract,
    #             function="balanceOf",
    #             arguments=["0x"+user.address.hex()]
    #         )
    #     except Exception as inst:
    #         log("Exception à l'interrogation du contrat : " + str(inst.args))
    #         return {"error": str(inst.args), "number": 0, "gas": gas}
    #
    #     if rc is None:
    #         log("Exception à l'interrogation du contrat")
    #         return {"error":"reponse de balance","number":0,"gas":gas}
    #
    #
    #     if len(rc)==0 or rc[0] is None or rc[0]=="":
    #         d={"number":0}
    #     else:
    #         d=json.loads(str(rc[0]).replace("'","\""))
    #
    #     if "number" in d:
    #         d["gas"] = gas
    #         return d
    #
    #     return rc
    #



    def init_bank(self):
        """
        La bank va distribuer des egold pour permettre aux utilisateurs de pouvoir faire
        les premiers transfert gratuitement
        c'est elle qui recevra également le cout de fabrication d'une monnaie

        L'objectif est d'initialiser la propriété bank
        :return:
        """
        log("Initialisation de la bank")
        pem_file="./PEM/"+NETWORKS[self.network_name]["bank"]+".pem"
        if os.path.exists(pem_file):
            log("On utilise le fichier bank.pem")
            self.bank=Account(pem_file=pem_file)
        else:
            self.bank,pem=self.create_account(name=NETWORKS[self.network_name]["bank"])
            log("Vous devez transférer des fonds vers la banques "+self.bank.address.bech32())

        log("Initialisation de la banque à l'adresse "+self.getExplorer(self.bank.address.bech32(),"address"))
        return True




    def transferESDT(self,idx:str,user_from:Account,user_to:str,amount:float):
        """
        Appel la fonction transfer du smart contrat, correpondant à un transfert de fond
        :param _contract:
        :param user_from:
        :param user_to:
        :param amount:
        :return:
        """
        if user_from.address.bech32==user_to:
            return {"error":"Impossible de s'envoyer des fonds à soi-même"}

        log("Transfert "+user_from.address.bech32()+" -> "+user_to+" de "+str(amount)+" via ESDT")

        #Passage du montant en hex (attention il faut un nombre pair de caractères)
        amount_in_hex=str(hex(int(amount))).replace("0x","")
        if len(amount_in_hex) % 2 == 1: amount_in_hex="0"+amount_in_hex

        data="ESDTTransfer@"+str_to_hex(idx,False)+"@"+amount_in_hex

        try:
            tr=self.send_transaction(user_from,Account(user_to),user_from,"0",data,500000)
            infos=self._proxy.get_account_balance(user_from.address)

            return {
                "from":user_from.address.bech32(),
                "price":toFiat(tr["gasLimit"]),
                "account":toFiat(infos),
                "cost":tr["cost"],
                "explorer":self.getExplorer(tr["blockHash"],"address"),
                "to":user_to
            }
        except Exception as inst:
            return {"error":str(inst.args)}




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
                "cost":tr["cost"],
                "explorer":self.getExplorer(tr["txHash"],"address"),
                "to":user_to.address.bech32()
            }
        except Exception as inst:
            return {"error":str(inst.args)}



    def deploy_contract(self,pem_file,bytecode):
        """
        Permet le déploiement du smartcontract
        :param pem_file:
        :param bytecode:
        :return:
        """
        _user=Account(pem_file=pem_file)
        contract = SmartContract(bytecode=bytecode)
        return self.en.deploy_contract(
            contract=contract,
            owner=_user,
            arguments=[],
            gas_price=config.DEFAULT_GAS_PRICE,
            gas_limit=5000000,
            value=None,
            chain=self.chain_id,
            version=config.get_tx_version()
        )




    def deploy(self,pem_file,name,unity,amount,decimals,gas_limit=LIMIT_GAS,timeout=60):
        """
        Déployer une nouvelle monnaie avec ESDT
        exemple de data valable: issue@74657374546f6b656e@545443@d3c21bcecceda1000000@12@63616e55706772616465@66616c7365
        :param pem_file: signature du propriétaire de la monnaie
        :param unity: nom court de la monnaie
        :param amount: montant de départ
        :return:
        """
        log("Préparation du owner du contrat")
        user = pem_file
        if type(pem_file)==str:
            user=Account(pem_file=pem_file)

        if self._proxy.get_account_balance(user.address)<ESDT_PRICE:
            return {"error": 600,
                    "message": "not enought money to create ESDT token",
                    "cost": ESDT_PRICE,
                    "addr": user.address.bech32()
                    }

        user.sync_nonce(self._proxy)

        amount=amount*(10**(decimals))
        # ok : issue@506c657368636f696e@504c534843@c350@02@63616e4368616e67654f776e6572@74727565@63616e55706772616465@74727565
        # ko : issue@54686546616D6F75735256436F696E@525643@021E19E0C9BAB2400000@12
        arguments=[str_to_hex(name),str_to_hex(unity),nbr_to_hex(amount),nbr_to_hex(decimals)]
        #for opt in ["canFreeze", "canWipe", "canPause", "canMint", "canBurn","canChangeOwner","canUpgrade"]:
        #for opt in ["canUpgrade"]:
        #    arguments.append(str_to_hex(opt))
        #    arguments.append(str_to_hex("false"))

        #Voir documentation : https://docs.elrond.com/developers/esdt-tokens/
        t=self.execute(ESDT_CONTRACT,
                        user,"issue",
                        value=str(int(ESDT_PRICE)),
                        arguments=arguments,
                        gas_limit=LIMIT_GAS,
                        timeout=timeout,
                        )

        if t is None:
            return {"error": 600, "message": "echec déploiement"}

        if t["status"]!="success":
            log("Echec de déploiement")
            message=t["status"]
            if "smartContractResults" in t and "returnMessage" in t["smartContractResults"][0]:message=t["smartContractResults"][0]["returnMessage"]

            return {"error":600,
                    "message":message,
                    "cost": toFiat(gas_limit*config.DEFAULT_GAS_PRICE,1),
                    "addr": user.address.bech32()
                    }
        else:
            log("Déploiement du nouveau contrat réussi voir transaction "+self.getExplorer(t["blockHash"]))
            id=""
            if "smartContractResults" in t:
                for result in t["smartContractResults"]:
                    id=result["data"]
                    if id.startswith("ESDTTransfer"):
                        id=id.split("@")[1]
                        id=hex_to_str(int(id,16))
                        log("Déploiement de la nouvelle monnaie standard "+id)
                        break
            else:
                log("On doit être sur le testnet qui ne retourne pas scResults")
                amount=0
                id=""


        return {
            "amount":amount,
            "cost": toFiat(gas_limit*config.DEFAULT_GAS_PRICE,1),
            "owner":user.address.bech32(),
            "id":id
        }





    def deploy_old(self,pem_file,unity,bytecode_file,amount,gas_limit=LIMIT_GAS):
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
            val=str(lst[0].balance)
            name=bytes.fromhex(val).decode("utf-8")
            return name
        else:
            return None




    def credit(self,_from:Account,_to:Account,value:str):
        """
        transfert des egold à un contrat
        :param _from:
        :param _to:
        :param amount:
        :return:
        """
        return self.send_transaction(_from,_to,self.bank,str(value),"refund")




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
        log("Attente jusqu'a "+str(timeout)+" secs synchrone de la transaction "+self.getExplorer(tx))
        rc=None
        while timeout>0:
            sleep(interval)
            rc=self._proxy.get_transaction(tx_hash=tx,with_results=True)

            if len(equal)>0 and rc[field]==equal:break
            if len(not_equal) > 0 and rc[field] != not_equal: break
            timeout=timeout-interval

        rc["cost"] = 0
        transaction_with_cost=self.getTransaction(tx)
        if "fee" in transaction_with_cost:
            rc["cost"]=float(transaction_with_cost["fee"])/1e18


        log("Transaction executé "+str(rc))
        if timeout<=0:log("Timeout de "+self.getExplorer(tx)+" "+field+" est a "+str(rc[field]))
        return rc




    def update_account(self,_sender,values:dict):
        """
        Ajoute l'objet values à l'adresse _sender
        :param _sender:
        :param values:
        :return:
        """
        if "pem" in values: del values["pem"]
        log("Enregistrement de l'utilisateur " + str(values))

        if "contacts" in values and type(values["contacts"])==str:
            values["contacts"]=",".join(list(set(values["contacts"].split(","))))
        if "shop_visual" in values and values["shop_visual"]==DEFAULT_VISUAL_SHOP:del values["shop_visual"]
        if "visual" in values and values["visual"]==DEFAULT_VISUAL:del values["visual"]

        rc=self.cached_sess.cache.delete_url(self._proxy.url + "/address/" + _sender.address.bech32() + "/keys")

        data = "SaveKeyValue"
        required_gas=250000+50000 #voir https://docs.elrond.com/developers/account-storage/
        persist_per_byte=10000
        store_per_byte=50000
        for k in values.keys():
            key=str_to_hex(k,False)
            value=str_to_hex(values[k],False)
            if len(value)>2 or key=="contacts":
                data=data+"@"+key+"@"+value
                required_gas=required_gas+persist_per_byte*(len(value)+len(key))+store_per_byte*len(value)

        log("Envoi de la transaction d'enregistrement "+data)
        t=self.send_transaction(_sender,_sender,_sender,0,data,gas_limit=required_gas)
        return t


    def get_account(self, addr,with_cache=True):
        """
        Récupération des informations du compte
        :see https://docs.elrond.com/sdk-and-tools/rest-api/addresses/
        :param addr:
        :return:
        """
        if addr is None or len(addr)<20:
            return {"error": 500, "message": "address incorrect"}

        _a=Account(address=addr)
        if not addr.startswith("erd"):
            addr=_a.address.bech32()

        url=self._proxy.url + "/address/" + addr + "/keys"
        log("Récupération de l'utilisateur " + addr + " via " + url)
        if with_cache:
            rc = self.cached_sess.get(url)
        else:
            rc = requests.get(url)

        if rc.status_code == 200:
            obj=dict()
            rc = dict(json.loads(rc.text)["data"]["pairs"])
            for k in rc.keys():
                obj[hex_to_str(k)]=hex_to_str(rc[k])
            obj["addr"]=addr
            obj["hex_addr"]=_a.address.hex()

            #Affectation des valeurs par defaut
            if not "visual" in obj:obj["visual"]=DEFAULT_VISUAL
            if not "shop_visual" in obj:obj["shop_visual"]=DEFAULT_VISUAL_SHOP

            log("Récupération terminée "+str(obj))
            rc=obj
        else:
            rc = {"error": rc.status_code, "message": rc.text}
        return rc


    def create_account(self,fund=0,name=None,email=None,seed_phrase=""):
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
                # if not email is None:
                #     name=email.split("@")[0].split(".")[0]

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

        if fund>0:
            log("On transfere un peu d'eGold pour assurer les premiers transferts"+str(fund))
            tx=self.credit(self.bank,_u,"%.0f" % fund)
            if tx is None or tx["status"]!="success":
                log("Le compte "+_u.address.bech32()+" n'a pas recu d'eGld pour les transactions")

        if not email is None:
            log("Enregistrement des infos le concernant")
            self.update_account(_u,{"email":email,"pseudo":email.split("@")[0]})

        return _u,pem


    def estimate(self):
        """
        TODO: implémenter l'estimation des couts
        :return: 
        """
        pass




    def execute(self,_contract,_user,function,arguments=[],value:int=None,gas_limit=LIMIT_GAS,timeout=60,gas_price_factor=1,tokenName="",simulate=False):
        if type(_contract) == str: _contract = SmartContract(_contract)
        if type(_user)==str:_user=Account(address=_user)
        _user.sync_nonce(self._proxy)
        if not value is None:value=int(value)
        try:
            tx = self.environment.execute_contract(_contract,_user,
                                                   function=function,
                                                   arguments=arguments,
                                                   gas_price=config.DEFAULT_GAS_PRICE*gas_price_factor,
                                                   gas_limit=gas_limit,
                                                   value=value,
                                                   chain=self.chain_id,
                                                   version=config.get_tx_version()
                                                   )
        except Exception as inst:
            log("Impossible d'executer "+function+" "+str(inst.args))
            return None

        tr = self.wait_transaction(tx, "status", not_equal="pending",timeout=timeout)
        return tr






    def query(self,function_name,arguments=None,isnumber=True,n_try=3):
        _contract=SmartContract(address=NETWORKS[self.network_name]["nft"])

        d = None
        for i in range(n_try):
            try:
                d=self.environment.query_contract(_contract, function_name,arguments)
                break
            except Exception as inst:
                sleep(3)
                log("Essai "+str(i)+" Impossible d'executer "+function_name+"("+str(arguments)+") -> ")
                log(str(inst.args))

        if len(d)==1 and d[0]=='':d=[]
        return d



    # def owner_of(self,token):
    #     lst = self.query("tokenOwner",arguments=[token])
    #     return lst


    #/nfts
    #récupération de l'ensemble des NFT issue du contrat
    def get_tokens(self,seller_filter,owner_filter,miner_filter):
        rc = list()
        max_id=0

        if owner_filter=="0x0":
            owner_filter = "0x0000000000000000000000000000000000000000000000000000000000000000"
        else:
            owner_filter="0x"+str(Account(address=owner_filter).address.hex())

        if seller_filter=="0x0":
            seller_filter = "0x0000000000000000000000000000000000000000000000000000000000000000"
        else:
            seller_filter="0x"+str(Account(address=seller_filter).address.hex())

        if miner_filter=="0x0":
            miner_filter = "0x0000000000000000000000000000000000000000000000000000000000000000"
        else:
            miner_filter="0x"+str(Account(address=miner_filter).address.hex())

        #On récupére les extended NFT
        tokens = self.query( "tokens", arguments=[seller_filter,owner_filter,miner_filter],isnumber=True,n_try=1)
        if not tokens is None and len(tokens)>0 and tokens[0]!="":
            tokens=tokens[0].hex
            index=0

            while len(tokens)-index>112 :
                index=index+8
                log("Traitement à partir de "+tokens[index:])
                title_len=int(tokens[index:index + 8], 16)*2
                index=index+8

                desc_len=int(tokens[index:index + 8], 16)*2
                index=index+8

                money_len=int(tokens[index:index + 8], 16)*2
                index=index+8

                price = int(tokens[index:index+8], 16) / 1e4
                index=index+8

                identifier=str(bytearray.fromhex(tokens[index:index+money_len]), "utf-8")
                index=index+money_len

                _u = SmartContract(address=tokens[index:index+64])
                owner_addr = _u.address.bech32()
                index=index+64

                has_secret = int(tokens[index:index + 2], 16)
                index = index + 2

                state = int(tokens[index:index+2], 16)
                index = index + 2

                properties = int(tokens[index:index + 2], 16)
                index = index + 2

                min_markup = int(tokens[index:index + 4], 16)
                index = index + 4

                max_markup = int(tokens[index:index + 4], 16)
                index = index + 4

                markup= int(tokens[index:index + 4], 16)
                index = index + 4

                miner_ratio = int(tokens[index:index + 4], 16)
                index = index + 4

                miner=Account(address=tokens[index:index+64]).address.bech32()
                index=index+64

                id=int(tokens[index:index+16], 16)
                index=index+16

                title = ""
                visual=""
                try:
                    title:str = str(bytearray.fromhex(tokens[index:index+title_len]), "utf-8")
                    index=index+title_len

                    desc:str=str(bytearray.fromhex(tokens[index:index+desc_len]), "utf-8")
                    index = index + desc_len

                    fullscreen=("!!" in desc)
                    desc=desc.replace("!!","%%")
                    if "%%" in desc:
                        if len(desc.split("%%")[1])==46:
                            visual = "https://ipfs.io/ipfs/" + desc.split("%%")[1]
                        else:
                            visual=desc.split("%%")[1]
                        desc=desc.split("%%")[0]
                except:
                    log(tokens[index:index+title_len]+" n'est pas une chaine de caractères")

                _d={
                    "owner":owner_addr,
                    "miner":miner_filter,
                    "price":str(price),
                    "token":str(id),
                }
                title=translate(title,_d)
                desc=translate(desc,_d)

                unity=identifier.split("-")[0]
                if money_len==0 or unity=="0":unity="EGLD"

                #extraction des tags
                tags=[]
                if "#" in desc:
                    i=0
                    for tag in desc.split("#"):
                        if i>0:
                            _t="#"+tag.split(" ")[0]
                            tags.append(_t)
                            desc=desc.replace(_t," ")
                        i=i+1

                desc=desc.strip()

                premium=(len(visual)>0 and len(desc)>10 and len(title)>5)
                if id>max_id:max_id=id
                obj=dict({"token_id": id,
                          "title": title,
                          "tags":" ".join(tags),
                          "description":desc,
                          "price": price,
                          "markup":markup/100,
                          "has_secret":has_secret,
                          "min_markup":min_markup/100,"max_markup":max_markup/100,
                          "miner_ratio":miner_ratio/100,
                          "state": state,
                          "miner":miner,
                          "owner":owner_addr,
                          "visual":visual,
                          "is_selled":state>0 and miner!=owner_addr,
                          "unity":unity,
                          "premium":premium,
                          "identifier":identifier,
                          "fullscreen":fullscreen,
                          "properties":properties
                          })


                obj["message"]=""

                rc.append(obj)


        #Tri de la liste
        rc=sorted(rc,key=lambda i: i["token_id"] if i["token_id"]==int else 0 ,reverse=True)
        return rc



    def get_tokens_standard(self,addrs):
        rc=[]
        for addr in addrs:
            # On récupère les NFT standards
            # voir https://docs.elrond.com/developers/nft-tokens/#get-nft-data-for-an-address

            # url=self._proxy.url+"/address/"+Account(address=owner_filter.replace("0x","")).address.bech32()+"/esdts-with-role/ESDTRoleNFTCreate"
            # r=requests.get(url)
            # if r.status_code==200:

            url = self._proxy.url + "/address/" + addr + "/esdt"
            r = requests.get(url)
            if r.status_code == 200:
                for nft in json.loads(r.text)["data"]["esdts"].values():
                    # url = self._proxy.url + "/vm-values/query"
                    # body={
                    #     "scAddress":"erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u",
                    #     "funcName": "getTokenProperties",
                    #     "args": [str_to_hex(x,False) for x in list(json.loads(r.text)["data"]["tokens"])]
                    # }
                    if "royalties" in nft:
                        prop = dict({
                            "visual": "",
                            "state": "0x0",
                            "properties": "0x0",
                            "tags":"",
                            "identifier":"EGLD",
                            "has_secret":False
                        })
                        for p in str(base64.b64decode(bytes(nft["attributes"], "utf8")), "utf8").split(","):
                            if ":" in p: prop[p.split(":")[0]] = p.split(":")[1]
                        if len(nft["uris"]) > 0: prop["visual"] = nft["uris"][0]
                        rc.append({
                            "token_id": nft["tokenIdentifier"],
                            "price": int(nft["royalties"]),
                            "miner": nft["creator"],
                            "owner": addr,
                            "description": prop["description"],
                            "visual": prop["visual"],
                            "title": nft["name"],
                            "state": int(prop["state"], 16),
                            "properties": int(prop["properties"], 16)
                        })
                        log("Ajout de " + str(rc))
            else:
                log("Problème de lecture de "+url)

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

        r=requests.post(self._proxy.url+"/transaction/cost",data=body)
        rc=json.loads(r.text)
        return rc



    def mint(self, contract, user_from,arguments,gas_limit=LIMIT_GAS,value=0,factor=1,simulate=False):
        """
        Fabriquer un NFT
        :param contract:
        :param user_from:
        :param arguments:
        :return:
        """
        log("Minage avec "+str(arguments))
        tx=self.execute(contract,user_from,"mint",arguments,gas_limit=gas_limit,gas_price_factor=factor,value=value)
        return tx



    def mint_standard_nft(self, user_from,title,properties:dict,price=0,quantity=1,visual=""):
        """
        Fabriquer un NFT au standard elrond
        https://docs.elrond.com/developers/nft-tokens/
        :param contract:
        :param user_from:
        :param arguments:
        :return:
        """

        tokenName=md5(bytes(title,"utf8")).hexdigest()[:19]
        tokenTicker="TFT"
        hash = hex(int(now() * 1000)).upper().replace("0X", "")

        data="issueSemiFungible@"+str_to_hex(tokenName,False)+"@"\
             +str_to_hex(tokenTicker,False)\
             +"@"+str_to_hex("canChangeOwner",False)+"@"+ str_to_hex("true",False)\
             +"@"+str_to_hex("canUpgrade",False)+"@"+str_to_hex("true",False)\
             +"@"+str_to_hex("canWipe",False)+"@"+ str_to_hex("true",False)
        t=self.send_transaction(user_from,Account(address="erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"),user_from,50000000000000000,data)

        if t["status"]=="success":
            token_id=t["smartContractResults"][0]["data"].split("@")[2]
            data="setSpecialRole@"+token_id+"@"+ user_from.address.hex()+"@45534454526f6c654e4654437265617465@45534454526f6c654e46544164645175616e74697479"
            t = self.send_transaction(user_from,
                                      Account(address="erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"),
                                      user_from, 0,
                                      data)

            if t["status"] == "success":
                data="ESDTNFTCreate@"+token_id+"@"+str_to_hex(quantity,False)+"@"+str_to_hex(title,False)
                data=data+"@"+str_to_hex(price,False)+"@"+str_to_hex(hash,False)+"@"
                for k in properties.keys():
                    if k!="title":
                        data=data+str_to_hex(k+":"+properties[k]+",",False)
                data=data+"@"+str_to_hex(visual,False)

                sleep(5)
                t=self.send_transaction(user_from,user_from,user_from,0,data)

                return t




    def nft_transfer(self, contract, _owner, token_id, _dest):
        if type(token_id)==int:
            tr = self.execute(contract, _owner,
                              function="transfer",
                              arguments=[token_id,"0x"+_dest.address.hex()],
                              value=0)
        else:
            #https://docs.elrond.com/developers/esdt-tokens/
            data="transferOwnership@"+str_to_hex(token_id, False)+"@"+_dest.address.hex().upper()
            tr = self.send_transaction(_owner,
                                       Account(address="erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"),
                                       _owner,0,data)
        return tr



    def nft_buy(self, contract, _user, token_id,price,seller):
        if type(token_id)==int:
            value=int(1e7*price)*1e11
            tr = self.execute(
                   contract,_user,
                   function="buy",
                   arguments=[token_id,seller],
                   value=value,
                gas_price_factor=2
            )
        else:
            tr = self.execute(
                SmartContract(address="erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"), seller,
                function="transferOwnership",
                arguments=[str_to_hex(token_id,False), _user.address.hex()],
                value=0,
                gas_price_factor=2
            )
        return tr



    def nft_open(self, contract, pem_file, token_id,response:str=""):
        tr = self.execute(contract,pem_file,
                            function="open",
                            arguments=[int(token_id),"0x"+response],
                            value=0
                          )
        return tr


    def burn(self, contract,sender,token_id):
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


    #http://localhost:6660/api/validate/erd1lzlf9clpzvetunqdtrmnr3dq0jpqxuf64lzxa0lerd86lmrutuqszvmk5w/erd19e6gkufmeav2u4q6ltagarxeqag4d62maey8vunnfs52fk75jd8s390nfn/
    def validate(self, owner, miner):
        _owner=Account(address=owner)
        _miner=Account(address=miner)
        rc=self.query("validate",["0x"+_owner.address.hex(),"0x"+_miner.address.hex()],isnumber=False)
        l=[]
        for i in range(0,len(rc),8):
            l.append(int.from_bytes(rc[i:i+8],"big"))
        return l




    def set_price(self, contract, pem_file, token_id, new_price):
        tx = self.execute(contract, pem_file,
                          function="price",
                          arguments=[int(token_id), int(new_price)],
                          )

        return tx


    def add_dealer(self, contract, pem_file, arguments):
        tx = self.execute(contract, pem_file,
                          function="add_dealer",
                          arguments=arguments,
                          )
        return tx



    def add_miner(self, contract, pem_file, arguments):
        tx = self.execute(contract, pem_file,
                          function="add_miner",
                          arguments=arguments,
                          )
        return tx



    def getTransactions(self, user):
        _user=Account(address=user)
        rc=self._proxy.get_account_transactions(_user.address)
        return rc


    def getTransaction(self, hash):
        url = self._proxy.url.replace("gateway","api") + "/transactions/" + hash
        resp = requests.get(url)
        #rc=self._proxy.get_transaction(hash,with_results=True)
        rc=json.loads(resp.text)
        rc["hash"]=hash
        return rc


    def getTransactionsByRest(self,addr):
        """
        retourne l'ensemble des transactions d'un contrats (https://docs.elrond.com/sdk-and-tools/rest-api/transactions/)
        :param addr:
        :return:
        """
        _c=SmartContract(address=addr)
        url=self._proxy.url+"/address/"+_c.address.bech32()+"/transactions"
        rc=requests.get(url)
        if rc.status_code==200:
            rc=json.loads(rc.text)["data"]["transactions"]
        else:
            rc={"error":rc.status_code,"message":rc.text}
        return rc


    def miners(self, seller):
        seller_addr=Account(seller).address.hex()
        tx = self.query("miners",["0x"+seller_addr])
        rc=[]
        if len(tx)>0 :
            s=tx[0].hex
            i=0
            while i<len(s):
                addr=s[i:i+64].upper()
                _acc=self.get_account(addr)
                rc.append(_acc)
                i=i+64
        return rc


    def dealers(self,miner_filter:str="0x0"):
        if miner_filter!="0x0":
            miner_filter="0x"+Account(address=miner_filter).address.hex()
        else:
            miner_filter="0x0000000000000000000000000000000000000000000000000000000000000000"

        tx = self.query("dealers",[miner_filter])
        rc = []
        if len(tx)>0 and tx[0]!='' and len(tx[0].hex)>0:
            i=0
            ss=str(tx[0].hex)
            while i<len(ss):

                address=ss[i:i+64]
                state=int("0x"+ss[i+64:i+66],16)

                content=self.get_account(address)
                #content=self.ipfs.get_dict(bytes.fromhex(dealer[66:]).decode("utf-8"))
                if type(content)!=dict:
                    content={"visual":base64.b64encode(content)}

                content["address"]=Account(address=address).address.bech32()
                content["state"]=state
                rc.append(content)

                i=i+66

        return rc


    def dealer_state(self,pem_file, state):
        """
        Permet de désactiver une boutique
        :param pem_file:
        :param state:
        :return:
        """
        tx = self.execute(self.contract, pem_file,
                          function="dealer_state",
                          arguments=[hex(state)],
                          )
        return tx

    def get_instant_access(self, _user:Account,delayInSec=60):
        private_key=_user.private_key_seed
        # TODO ajouter la durée limite et le cryptage
        return private_key

    def decrypt_json_keyfile(self, content):
        _content=json.loads(content)



























