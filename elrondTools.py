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

from Tools import log, base_alphabet_to_10, str_to_hex, hex_to_str, nbr_to_hex
from definitions import TRANSACTION_EXPLORER, LIMIT_GAS, ESDT_CONTRACT, MAIN_DECIMALS


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


    def send_transaction(self,_sender:Account,_receiver:Account,_sign:Account,value:str,data:str):
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
        t.gasLimit = LIMIT_GAS
        t.value = value.replace("0x","")
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
            return None



    def getMoneys(self,_user:Account):
        url = self._proxy.url + '/accounts/' + _user.address.bech32() + "/tokens"
        log("Interrogation de la balance : " + url)
        try:
            with urllib.request.urlopen(url) as response:
                txt = response.read()
            lst=json.loads(txt)
        except:
            log("L'interrogation des tokens ne fonctionne pas")
            lst=[]

        lst.append({
            "tokenIdentifier":"egld",
            "tokenName":"eGold",
            "numDecimals":18,
            "balance": self._proxy.get_account_balance(_user.address)
        })

        #Transforme la liste en dict sur la base du tokenIdentifier
        rc=dict()
        for l in lst:
            rc[l["tokenIdentifier"]]=l
            rc[l["tokenIdentifier"]]["solde"]=float(l["balance"])/(10**l["numDecimals"])
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
        if os.path.exists("PEM/bank.pem"):
            log("On utilise le fichier bank.pem")
            self.bank=Account(pem_file="./PEM/bank.pem")
        else:
            self.bank,pem=self.create_account(name="bank")
            log("Vous devez transférer des fonds vers la banques "+self.bank.address.bech32())

        log("Initialisation de la banque à l'adresse "+self.getExplorer(self.bank.address.bech32(),"address"))
        return True




    def transferESDT(self,idx:str,user_from:Account,user_to:Account,amount:float):
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

        log("Transfert "+user_from.address.bech32()+" -> "+user_to.address.bech32()+" de "+str(amount)+" via ESDT")

        #Passage du montant en hex (attention il faut un nombre pair de caractères)
        amount_in_hex=str(hex(amount)).replace("0x","")
        if len(amount_in_hex) % 2 == 1: amount_in_hex="0"+amount_in_hex
        data="ESDTTransfer@"+str_to_hex(idx,False)+"@"+amount_in_hex

        try:
            tr=self.send_transaction(user_from,user_to,user_from,"0",data)
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
        user.sync_nonce(self._proxy)

        amount=amount*(10**(decimals))
        # exemple de data valable : issue@74657374546f6b656e@545443@d3c21bcecceda1000000@12@63616e55706772616465@66616c7365
        arguments=[str_to_hex(name),str_to_hex(unity),nbr_to_hex(amount),nbr_to_hex(decimals)]
        #for opt in ["canFreeze", "canWipe", "canPause", "canMint", "canBurn","canUpgrade","canChangeOwner"]:
        for opt in ["canUpgrade"]:
            arguments.append(str_to_hex(opt))
            arguments.append(str_to_hex("false"))

        #Voir documentation :
        t=self.execute(ESDT_CONTRACT,
                        user,"issue",
                        value=5000000000000000000,
                        arguments=arguments,
                        gas_limit=LIMIT_GAS*2,
                        timeout=timeout,
                        )

        if t is None:
            return {"error": 600, "message": "echec déploiement"}

        if t["status"]!="success":
            log("Echec de déploiement")
            message=t["status"]
            if "scResults" in t and "returnMessage" in t["scResults"][0]:message=t["scResults"][0]["returnMessage"]

            return {"error":600,
                    "message":message,
                    "cost": toFiat(gas_limit*config.DEFAULT_GAS_PRICE,1),
                    "addr": user.address.bech32()
                    }
        else:
            log("Déploiement du nouveau contrat réussi voir transaction "+self.getExplorer(t["txHash"]))
            id=""
            if "scResults" in t:
                for result in t["scResults"]:
                    id=str(base64.b64decode(result["data"]),"utf-8")
                    if id.startswith("ESDTTransfer"):
                        id=id.split("@")[1]
                        id=hex_to_str(int(id,16))
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
        return self.send_transaction(_from,_to,self.bank,value,"refund")




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
            gasUsed=0
            if "gasUsed" in rc:gasUsed=rc["gasUsed"]
            rc["cost"] = (rc["gasPrice"] * gasUsed) / 1e18
        else:
            rc["cost"]=rc["gasPrice"]*rc["gasLimit"]/1e18

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
            if tx["status"]!="Success":log("Le compte "+_u.address.bech32()+" n'a pas recu d'eGld pour les transactions")

        return _u,pem



    def execute(self,_contract,_user,function,arguments=[],value=None,gas_limit=LIMIT_GAS,timeout=60):
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
                                                   gas_limit=gas_limit,
                                                   value=value,
                                                   chain=self.chain_id,
                                                   version=config.get_tx_version()
                                                   )
        except Exception as inst:
            log("Impossible d'executer "+function+" "+str(inst.args))
            return None

        tr = self.wait_transaction(tx, "status", not_equal="pending",timeout=60)
        if not "txHash" in tr:tr["txHash"]=tx
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

        return d





    def owner_of(self, contract,token):
        lst = self.query(SmartContract(address=contract), "tokenOwner",arguments=[token])
        return lst




    def get_uris(self, contract,owner_filter,miner_filter):
        _contract=SmartContract(contract)
        rc = list()

        if owner_filter=="0x0":
            owner_filter = "0x0000000000000000000000000000000000000000000000000000000000000000"
        else:
            owner_filter="0x"+str(Account(address=owner_filter).address.hex())

        if miner_filter=="0x0":
            miner_filter = "0x0000000000000000000000000000000000000000000000000000000000000000"
        else:
            miner_filter="0x"+str(Account(address=miner_filter).address.hex())

        tokens = self.query(_contract, "tokens", arguments=[owner_filter,miner_filter],isnumber=True,n_try=1)

        if not tokens is None and len(tokens)>0:
            tokens=tokens[0].hex
            index=0

            while len(tokens)-index>112 :
                index=index+8
                log("Traitement à partir de "+tokens[index:])
                uri_len=int(tokens[index:index + 8], 16)*2

                index=index+8
                price = int(tokens[index:index+20], 16) / 1e18

                index=index+20
                _u = SmartContract(address=tokens[index:index+64])
                addr = _u.address.bech32()

                index=index+64
                state = int(tokens[index:index+2], 16)

                index = index + 2
                id=int(tokens[index:index+16], 16)

                index=index+16
                try:
                    uri:str = str(bytearray.fromhex(tokens[index:index+uri_len]), "utf-8")
                except:
                    log(tokens[index:index+uri_len]+" n'est pas une chaine de caractères")
                    uri=""

                index=index+uri_len

                obj=dict({"token_id": id, "uri": uri, "price": price, "state": state,"owner":addr})
                if miner_filter!="0x0000000000000000000000000000000000000000000000000000000000000000":
                    obj["miner"]=addr
                else:
                    obj["miner"] = ""

                obj["open"]=""
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

    def nft_transfer(self, contract, pem_file, token_id, dest):
        _dest=Account(address=dest)
        tr = self.execute(contract, pem_file,
                          function="transfer",
                          arguments=[token_id,"0x"+_dest.address.hex()],
                          value=0)
        return tr



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
    def validate(self, contract, owner, miner):
        _owner=Account(address=owner)
        _miner=Account(address=miner)
        rc=self.query(contract,"validate",["0x"+_owner.address.hex(),"0x"+_miner.address.hex()],isnumber=False)
        l=[]
        for i in range(0,len(rc),8):
            l.append(int.from_bytes(rc[i:i+8],"big"))
        return l



















