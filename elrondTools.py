import base64
import json
import logging
import os
from datetime import datetime

from time import sleep

import requests
from erdpy.proxy import ElrondProxy
from erdpy import config
from erdpy.accounts import Account, AccountsRepository, Address
from erdpy.contracts import SmartContract
from erdpy.environments import TestnetEnvironment
from erdpy.transactions import Transaction
from erdpy.wallet import derive_keys

from Tools import log, base_alphabet_to_10, str_to_hex, hex_to_str, nbr_to_hex, translate
from definitions import LIMIT_GAS, ESDT_CONTRACT, NETWORKS, ESDT_PRICE, IPFS_NODE_PORT, IPFS_NODE_HOST
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
        lst = []
        try:
            result=requests.get(url).json()
            lst = list(result["data"]["esdts"].values())
        except Exception as arg:
            log("L'interrogation des tokens ne fonctionne pas="+str(arg))

        lst.append({
            "tokenIdentifier":"EGLD",
            "balance": self._proxy.get_account_balance(_user.address)
        })

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
            tr=self.send_transaction(user_from,Account(user_to),user_from,"0",data)
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

        gasUsed=0
        if "gasUsed" in rc:gasUsed=rc["gasUsed"]

        rc["cost"]=float(rc["gasLimit"]*rc["gasPrice"])/1e18

        log("Transaction executé "+str(rc))
        if timeout<=0:log("Timeout de "+self.getExplorer(tx)+" "+field+" est a "+str(rc[field]))
        return rc


    def update_account(self,pem_file,values:dict):
        if "addr" in values:del values["addr"]
        if "pem" in values:del values["pem"]
        data = "SaveKeyValue"
        required_gas=250000+50000
        for k in values.keys():
            key=str_to_hex(k,False)
            value=str_to_hex(values[k],False)
            if len(value)>0:
                data=data+"@"+key+"@"+value
                required_gas=required_gas+10000*(len(value)+len(key))

        _sender=Account(pem_file=pem_file)
        return self.send_transaction(_sender,_sender,_sender,0,data)


    def get_account(self, addr):
        """
        Récupération des informations du compte
        :see https://docs.elrond.com/sdk-and-tools/rest-api/addresses/
        :param addr:
        :return:
        """

        if not addr.startswith("erd"):
            addr=Account(address=addr).address.bech32()

        rc = requests.get(self._proxy.url + "/address/" + addr + "/keys")
        if rc.status_code == 200:
            obj=dict()
            rc = dict(json.loads(rc.text)["data"]["pairs"])
            for k in rc.keys():
                obj[hex_to_str(k)]=hex_to_str(rc[k])
            rc=obj
        else:
            rc = {"error": rc.status_code, "message": rc.text}
        return rc


    def create_account(self,fund="",name=None,email=None,seed_phrase=""):
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
                if email is None:
                    name = "User" + str(datetime.now().timestamp() * 1000).split(".")[0]
                else:
                    name=email.split("@")[0].split(".")[0]

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

        return _u,pem




    def execute(self,_contract,_user,function,arguments=[],value:int=None,gas_limit=LIMIT_GAS,timeout=60,gas_price_factor=1,tokenName=""):
        if type(_contract) == str: _contract = SmartContract(_contract)
        if type(_user)==str:
            if ".pem" in _user:
                _user=Account(pem_file=_user)
            else:
                _user=Account(address=_user)

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




    def get_tokens(self,seller_filter,owner_filter,miner_filter):
        rc = list()

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
                        visual = "https://ipfs.io/ipfs/" + desc.split("%%")[1]
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
                if money_len==0:unity="eGld"


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
                          "unity":unity,
                          "premium":premium,
                          "identifier":identifier,
                          "fullscreen":fullscreen,
                          "properties":properties
                          })

                obj["message"]=""

                rc.append(obj)


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



    def mint(self, contract, user_from,arguments,gas_limit=LIMIT_GAS,value=0,factor=1):
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





    def nft_transfer(self, contract, pem_file, token_id, _dest):
        tr = self.execute(contract, pem_file,
                          function="transfer",
                          arguments=[token_id,"0x"+_dest.address.hex()],
                          value=0)
        return tr



    def nft_buy(self, contract, pem_file, token_id,price,seller,identifier):
        value=int(1e7*price)*1e11
        tr = self.execute(
               contract,pem_file,
               function="buy",
               arguments=[token_id,seller],
               value=value,
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

    def getTransactionsByRest(self,addr):
        _c=SmartContract(address=addr)
        #rc=rq.get(self._proxy.url+"/transactions/"+addr).json()
        rc=requests.get(self._proxy.url+"/address/"+_c.address.bech32()+"/transactions")
        if rc.status_code==200:
            rc=json.loads(rc.text)["data"]["transactions"]
        else:
            rc={"error":rc.status_code,"message":rc.text}
        return rc


    def miners(self, seller):
        seller_addr=Account(seller).address.hex()
        tx = self.query("miners",["0x"+seller_addr])
        rc=[]
        if len(tx)>0 and len(tx[0].hex)>=64:
            for miner in tx[0].hex.split("000000"):
                if len(miner)>100:
                    addr=miner[0:64].upper()
                    ipfs=miner[64:]
                    _acc=Account(address=addr)
                    rc.append({"address":_acc.address.bech32(),"ipfs":ipfs})
        return rc


    def dealers(self,miner_filter:str):
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
        tx = self.execute(self.contract, pem_file,
                          function="dealer_state",
                          arguments=[hex(state)],
                          )
        return tx























