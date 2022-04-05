import base64
import json
import logging
import os
import textwrap
from datetime import datetime, timedelta
from enum import Enum
from hashlib import md5

from time import sleep

import requests
from AesEverywhere import aes256
from erdpy.proxy import ElrondProxy
from erdpy import config
from erdpy.accounts import Account, Address
from erdpy.contracts import SmartContract
from erdpy.proxy.messages import TransactionOnNetwork
from erdpy.transactions import Transaction
from erdpy.wallet import derive_keys, generate_pair
from erdpy.wallet.keyfile import load_from_key_file
from requests_cache import CachedSession

from Tools import log, base_alphabet_to_10, str_to_hex, hex_to_str, nbr_to_hex, translate, now, is_standard, \
    returnError, list_to_vec, extract_tags, find_url, str_to_int, api
from definitions import LIMIT_GAS, ESDT_CONTRACT, NETWORKS, ESDT_PRICE, IPFS_NODE_PORT, IPFS_NODE_HOST, SECRET_KEY, \
    DEFAULT_VISUAL, DEFAULT_VISUAL_SHOP, VOTE, FOR_SALE, SECRET_VOTE, UNIK, MINER_CAN_BURN, CAN_TRANSFERT, CAN_RESELL, \
    DIRECT_SELL, SELF_DESTRUCTION, RENT, FIND_SECRET, FORCE_OPEN, ONE_WINNER, TRANSPARENT, RESULT_SECTION, \
    MAX_GAS_LIMIT, MAX_MINT_NFT, ID_REQUIRED, ZERO_ADDR, PRICE_FOR_STANDARD_NFT
from ipfs import IPFS


def toFiat(crypto, fiat=8):
    """
    Conversion du gas en monnaie ou egld
    :param crypto:
    :param fiat:
    :return:
    """
    return (int(crypto) / 1e18) * fiat




class ElrondNet:
    """
    classe symbolisant la blocchaine
    """
    contract = None
    environment = None
    _proxy: ElrondProxy = None
    bank = None
    chain_id = None
    network_name = "devnet"
    ipfs = IPFS(IPFS_NODE_HOST, IPFS_NODE_PORT)
    cached_sess = CachedSession(expire_after=timedelta(hours=1))

    def __init__(self, network_name="devnet"):
        """
        Initialisation du proxy
        :param proxy:
        :param bank_pem:
        """
        self.network_name = network_name
        self.contract = NETWORKS[network_name]["nft"]
        proxy = NETWORKS[network_name]["proxy"]
        log("Initialisation de l'environnement " + proxy)
        logging.basicConfig(level=logging.DEBUG)

        log("Initialisation du proxy")
        self._proxy = ElrondProxy(proxy)
        self.chain_id = self._proxy.get_chain_id()
        self.tce = 0  #TransactionCostEstimator(self._proxy.url)

        log("Initialisation de la bank")
        self.init_bank()

        log("Initialisation terminée")


    def get_elrond_user(self, data,with_contact=False):
        """
        Fabrique ou recupere un pemfile
        :param data:
        :return:
        """
        rc = None
        if data=="anonymous": return None
        if type(data) == dict and "pem" in data: data = data["pem"]
        if type(data) != str: data = str(data, "utf8")

        if data.endswith(".pem"):
            return Account(pem_file="./PEM/" + data)

        if data.startswith("{"):
            data = json.loads(data)
        else:
            data = {"file": data}

        if "seed_phrase" in data:
            private_key, public_key = derive_keys(data["seed_phrase"], 0)
            rc = Account(address=public_key)
            rc.private_key_seed = private_key.hex()

        if "file" in data:
            content = data["file"]

            if content.endswith(".pem"):
                return Account(pem_file="./PEM/" + content)

            if content.startswith("{"):
                content = json.loads(content)
                if "filename" in data and "password" in data:
                    filename = "./temp/" + data["filename"]
                    with open(filename, "w") as f:
                        f.write(data["file"])

                    address_from_key_file, seed = load_from_key_file(filename, data["password"])
                    rc = Account(address=Address(address_from_key_file))
                    rc.private_key_seed = seed.hex()
                    rc.secret_key = seed.hex()
            else:
                if not "BEGIN PRIVATE KEY" in content:
                    content = str(aes256.decrypt(base64.b64decode(content), SECRET_KEY), "utf8")

                contents = content.replace("\n", "").replace("BEGIN PRIVATE KEY for ", "").split("-----")
                res = bytes.fromhex(base64.b64decode(contents[2]).decode())
                seed = res[:32]
                pubkey = res[32:]

                rc = Account(address=Address(pubkey))
                rc.secret_key = seed.hex()
                rc.private_key_seed = seed.hex()

        # rc="./PEM/"+NETWORKS[bc.network_name]["bank"]+".pem"

        # filename = "./PEM/temp" + str(now() * 1000) + ".xpem"
        # log("Fabrication d'un fichier xPEM pour la signature et enregistrement sur " + filename)

        # if type(data)==bytes:
        #     content=str(data,"utf8")
        #     if content.endswith(".pem"):return Account(pem_file="./PEM/"+content)

        # with open(filename, "w") as file:
        #     file.write(private_key.hex())

        # os.remove(filename)

        return rc

    def check_contract(self, contrat_addr):
        _ctr = SmartContract(address=contrat_addr)
        _dt = _ctr.metadata
        if _dt is None:
            return False
        else:
            return True

    def getExplorer(self, tx, type="transactions"):
        url = NETWORKS[self.network_name]["explorer"] + "/" + type + "/" + tx
        url=url.replace("api","explorer")
        if "elrond.com" in self._proxy.url:
            return url
        else:
            type = type.replace("transactions", "transaction")
            return self._proxy.url + "/" + type + "/" + tx

    def send_transaction(self, _sender: Account,
                         _receiver: Account,
                         _sign: Account,
                         value: str, data: str,
                         gas_limit=LIMIT_GAS,timeout=60):
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

        log("On signe la transaction avec le compte " + _sign.address.bech32())
        t.sign(_sign)

        try:
            tx = t.send_wait_result(self._proxy,timeout=timeout)
            log("Execution de la transaction " + data + " : " + self.getExplorer(tx.raw["sender"],"address"))

            #tr = self.wait_transaction(tx, not_equal="pending")
            return tx.raw
        except Exception as inst:
            log("Exception d'execution de la requete " + str(inst.args))
            return None

    def getMoneys(self, _user: Account):
        url = self._proxy.url + '/address/' + _user.address.bech32() + "/esdt"
        log("Interrogation de la balance : " + self.getExplorer(_user.address.bech32(),"address"))
        _infos = self._proxy.get_account(_user.address)
        lst = [{
            "tokenIdentifier": "EGLD",
            "balance": _infos["balance"],
            "nonce": _infos["nonce"]
        }]

        try:
            result = requests.get(url).json()["data"]["esdts"].values()
            for r in result:
                if not "royalties" in r: lst.append(r)
        except Exception as arg:
            log("L'interrogation des tokens ne fonctionne pas=" + str(arg))

        # Transforme la liste en dict sur la base du tokenIdentifier
        rc = dict()
        for l in lst:
            if "tokenIdentifier" in l:
                rc[l["tokenIdentifier"]] = l
                rc[l["tokenIdentifier"]]["solde"] = float(l["balance"]) / (10 ** 18)
                rc[l["tokenIdentifier"]]["unity"] = l["tokenIdentifier"].split("-")[0]
                rc[l["tokenIdentifier"]]["url"] = ""
                # TODO ajouter ici la documentation des monnaies via la base de données

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
        pem_file = "./PEM/" + NETWORKS[self.network_name]["bank"] + ".pem"
        if os.path.exists(pem_file):
            log("On utilise le fichier bank.pem")
            self.bank = Account(pem_file=pem_file)
        else:
            self.bank, pem = self.create_account(name=NETWORKS[self.network_name]["bank"])
            log("Vous devez transférer des fonds vers la banques " + self.bank.address.bech32())

        log("Initialisation de la banque à l'adresse " + self.getExplorer(self.bank.address.bech32(), "address"))
        return True

    def transferESDT(self, idx: str, user_from: Account, user_to: str, amount: float):
        """
        Appel la fonction transfer du smart contrat, correpondant à un transfert de fond
        :param _contract:
        :param user_from:
        :param user_to:
        :param amount:
        :return:
        """
        if user_from.address.bech32 == user_to:
            return {"error": "Impossible de s'envoyer des fonds à soi-même"}

        log("Transfert " + user_from.address.bech32() + " -> " + user_to + " de " + str(amount) + " via ESDT")

        # Passage du montant en hex (attention il faut un nombre pair de caractères)
        amount_in_hex = str(hex(int(amount))).replace("0x", "")
        if len(amount_in_hex) % 2 == 1: amount_in_hex = "0" + amount_in_hex

        data = "ESDTTransfer@" + str_to_hex(idx, False) + "@" + amount_in_hex

        try:
            tr = self.send_transaction(user_from, Account(user_to), user_from, "0", data, 500000)
            infos = self._proxy.get_account_balance(user_from.address)

            return {
                "from": user_from.address.bech32(),
                "price": toFiat(tr["gasLimit"]),
                "account": toFiat(infos),
                "cost": tr["cost"],
                "explorer": self.getExplorer(tr["blockHash"], "address"),
                "to": user_to
            }
        except Exception as inst:
            return {"error": str(inst.args)}

    def transfer(self, _contract, user_from: Account, user_to: Account, amount: int):
        """
        Appel la fonction transfer du smart contrat, correpondant à un transfert de fond
        :param _contract:
        :param user_from:
        :param user_to:
        :param amount:
        :return:
        """
        if user_from.address.bech32() == user_to.address.bech32():
            return {"error": "Impossible de s'envoyer des fonds à soi-même"}

        log("Transfert " + user_from.address.hex() + " -> " + user_to.address.hex() + " de " + str(
            amount) + " via le contrat " + _contract)
        try:
            tr = self.execute(_contract, user_from,
                              function="transfer",
                              arguments=["0x" + user_to.address.hex(), amount]
                              )

            infos = self._proxy.get_account_balance(user_from.address)

            return {
                "from": user_from.address.bech32(),
                "price": toFiat(tr["gasLimit"]),
                "account": toFiat(infos),
                "cost": tr["cost"],
                "explorer": self.getExplorer(tr["txHash"], "address"),
                "to": user_to.address.bech32()
            }
        except Exception as inst:
            return {"error": str(inst.args)}

    def deploy_contract(self, pem_file, bytecode):
        """
        Permet le déploiement du smartcontract
        :param pem_file:
        :param bytecode:
        :return:
        """
        _user = Account(pem_file=pem_file)
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

    def deploy_ESDT(self, pem_file, name, unity, amount, decimals, gas_limit=LIMIT_GAS, timeout=60):
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
        if type(pem_file) == str:
            user = Account(pem_file=pem_file)

        if self._proxy.get_account_balance(user.address) < ESDT_PRICE:
            return {"error": 600,
                    "message": "not enought money to create ESDT token",
                    "cost": ESDT_PRICE,
                    "addr": user.address.bech32()
                    }

        user.sync_nonce(self._proxy)

        amount = amount * (10 ** (decimals))
        # ok : issue@506c657368636f696e@504c534843@c350@02@63616e4368616e67654f776e6572@74727565@63616e55706772616465@74727565
        # ko : issue@54686546616D6F75735256436F696E@525643@021E19E0C9BAB2400000@12
        arguments = [str_to_int(name), str_to_int(unity), amount,decimals]
        # for opt in ["canFreeze", "canWipe", "canPause", "canMint", "canBurn","canChangeOwner","canUpgrade"]:
        # for opt in ["canUpgrade"]:
        #    arguments.append(str_to_hex(opt))
        #    arguments.append(str_to_hex("false"))

        # Voir documentation : https://docs.elrond.com/developers/esdt-tokens/
        t = self.execute(ESDT_CONTRACT,
                         user, "issue",
                         value=str(int(ESDT_PRICE)),
                         arguments=arguments,
                         gas_limit=LIMIT_GAS,
                         timeout=timeout,
                         )

        if t is None:
            return {"error": 600, "message": "echec déploiement"}

        if t["status"] != "success":
            log("Echec de déploiement")
            message = t["status"]
            if RESULT_SECTION in t and "returnMessage" in t[RESULT_SECTION][0]: message = \
                t[RESULT_SECTION][0]["returnMessage"]

            return {"error": 600,
                    "message": message,
                    "cost": toFiat(gas_limit * config.DEFAULT_GAS_PRICE, 1),
                    "addr": user.address.bech32()
                    }
        else:
            log("Déploiement du nouveau contrat réussi voir transaction " + self.getExplorer(t["blockHash"]))
            id = ""
            if RESULT_SECTION in t:
                for result in t[RESULT_SECTION]:
                    id = result["data"]
                    if id.startswith("ESDTTransfer"):
                        id = id.split("@")[1]
                        id = hex_to_str(int(id, 16))
                        log("Déploiement de la nouvelle monnaie standard " + id)
                        break
            else:
                log("On doit être sur le testnet qui ne retourne pas scResults")
                amount = 0
                id = ""

        return {
            "amount": amount,
            "cost": toFiat(gas_limit * config.DEFAULT_GAS_PRICE, 1),
            "owner": user.address.bech32(),
            "id": id
        }

    def deploy_old(self, pem_file, unity, bytecode_file, amount, gas_limit=LIMIT_GAS):
        """
        Déployer une nouvelle monnaie, donc un conrat ERC20
        :param pem_file: signature du propriétaire de la monnaie
        :param unity: nom court de la monnaie
        :param amount: montant de départ
        :return:
        """
        log("Préparation du owner du contrat")
        user = pem_file
        if type(pem_file) == str:
            user = Account(pem_file=pem_file)
        user.sync_nonce(self._proxy)

        with open(bytecode_file, "r") as file:
            _json = file.read()
        json_bytecode = json.loads(_json)

        bytecode = json_bytecode["emitted_tx"]["data"]
        bytecode = bytecode.split("@0500@0100")[0]

        arguments = [str(amount), hex(base_alphabet_to_10(unity))]

        log("Déploiement du contrat " + str(arguments) + " via le compte " + self.getExplorer(user.address.bech32(),
                                                                                              "address"))
        log("Passage des arguments " + str(arguments))
        try:
            tx, address = SmartContract(bytecode=bytecode).deploy(
                owner=user,
                arguments=arguments,
                gas_price=config.DEFAULT_GAS_PRICE,
                gas_limit=gas_limit,
                value=0,
                chain=self._proxy.get_chain_id(),
                version=config.get_tx_version()
            )
        except Exception as inst:
            url = self.getExplorer(user.address.bech32(), "address")
            log("Echec de déploiement " + url)
            return {"error": 500, "message": str(inst.args), "link": url}

        # TODO: intégrer la temporisation pour événement
        t = self.wait_transaction(tx, not_equal="pending")

        if t["status"] == "pending":
            log("Echec de déploiement, timeout")
            return {"error": 600,
                    "message": "timeout",
                    "cost": toFiat(gas_limit * config.DEFAULT_GAS_PRICE, 1),
                    "link": self.getExplorer(tx),
                    "addr": address.bech32()
                    }
        else:
            log("Déploiement du nouveau contrat réussi voir transaction " + self.getExplorer(tx))
            return {
                "link": self.getExplorer(tx),
                "cost": toFiat(gas_limit * config.DEFAULT_GAS_PRICE, 1),
                "contract": address.bech32(),
                "contract_hex": address.hex(),
                "owner": user.address.bech32()
            }

    def getName(self, contract):
        """
        Pour l'instant cette fonction ne marche pas.
        A terme elle permet de récupérer le nom de la monnaie (et donc se passer d'une base de données)
        :param contract:
        :return:
        """
        lst = self._proxy.query_contract(SmartContract(address=contract), "nameOf")
        if len(lst) > 0:
            val = str(lst[0].balance)
            name = bytes.fromhex(val).decode("utf-8")
            return name
        else:
            return None

    def credit(self, _from: Account, _to: Account, value: str):
        """
        transfert des egold à un contrat
        :param _from:
        :param _to:
        :param amount:
        :return:
        """
        tx = self.send_transaction(_from, _to, self.bank, str(value), "refund")
        return tx



    def wait_transaction(self, tx:Transaction, field="status", equal="", not_equal="", timeout=30, interval=4):
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

        log("Attente jusqu'a " + str(timeout) + " secs synchrone de la transaction " + self.getExplorer(tx.hash))
        while timeout > 0:
            sleep(interval)
            rc = self._proxy.get_transaction(tx_hash=tx.hash, with_results=True).raw

            if len(equal) > 0 and rc[field] == equal: break
            if len(not_equal) > 0 and rc[field] != not_equal: break
            timeout = timeout - interval

        rc = self.getTransaction(tx)
        rc["cost"] = 0
        if "txHash" in rc:rc["blockHash"]=rc["txHash"]
        if "fee" in rc:
            rc["cost"] = float(rc["fee"]) / 1e18
            rc["usd_cost"] = rc["cost"]*rc["price"]

        if RESULT_SECTION in rc:
            for t in rc[RESULT_SECTION]:
                if "data" in t:
                    t["data"]=str(base64.b64decode(t["data"]),"utf8")

        log("Transaction executé " + str(rc))
        if timeout <= 0: log("Timeout de " + self.getExplorer(tx) + " " + field + " est a " + str(rc[field]))
        return rc


    def update_account(self, _sender, values: dict):
        """
        Ajoute l'objet values à l'adresse _sender
        :param _sender:
        :param values:
        :return:
        """
        if "pem" in values: del values["pem"]
        log("Enregistrement de l'utilisateur " + str(values))

        if "contacts" in values:
            if type(values["contacts"]) == str:
                values["contacts"] = ",".join(list(set(values["contacts"].split(","))))
            else:
                values["contacts"] = ",".join(list(set(values["contacts"])))

        if "shop_visual" in values and values["shop_visual"] == DEFAULT_VISUAL_SHOP: del values["shop_visual"]
        if "visual" in values and values["visual"] == DEFAULT_VISUAL: del values["visual"]

        rc = self.cached_sess.cache.delete_url(self._proxy.url + "/address/" + _sender.address.bech32() + "/keys")

        data = "SaveKeyValue"
        persist_per_byte = 10000
        store_per_byte = 50000
        for k in values.keys():
            key = str_to_hex(k, False)
            value = str_to_hex(values[k], False)
            if len(value) > 1 or key == "contacts":
                data = data + "@" + key + "@" + value
                #required_gas = required_gas + persist_per_byte * (len(value) + len(key)) + store_per_byte * len(value)

        log("Envoi de la transaction d'enregistrement " + data)
        t = self.send_transaction(_sender, _sender, _sender, 0, data, gas_limit=LIMIT_GAS)
        return t

    def get_shard(self, addr):
        url = self._proxy.url + "/accounts/" + addr
        return api(url,"gateway=api")



    def get_account(self, addr, with_cache=True):
        """
        Récupération des informations du compte
        :see https://docs.elrond.com/sdk-and-tools/rest-api/addresses/
        :param addr:
        :return:
        """
        if addr is None or len(addr) < 20:
            return {"error": 500, "message": "address incorrect"}

        _a = Account(address=addr)
        if not addr.startswith("erd"):
            addr = _a.address.bech32()

        url = self._proxy.url + "/address/" + addr + "/keys"
        log("Récupération de l'utilisateur " + addr + " via " + url)
        if with_cache:
            req = api(url,cache=self.cached_sess,alternate_domain="api=gateway")
        else:
            req = api(url,"api=gateway")


        obj = dict({"addr": addr, "hex_addr": _a.address.hex(),"shard":1})

        if req:
            rc=req["data"]["pairs"]
            for k in rc.keys():
                obj[hex_to_str(k)] = hex_to_str(rc[k])

            # Affectation des valeurs par defaut
            if not "visual" in obj: obj["visual"] = DEFAULT_VISUAL
            if not "shop_visual" in obj: obj["shop_visual"] = DEFAULT_VISUAL_SHOP

            log("Récupération terminée " + str(obj))

        return obj


    def get_pem(self,secret_key: bytes, pubkey: bytes):
        name = pubkey.hex()

        header = f"-----BEGIN PRIVATE KEY for {name}-----"
        footer = f"-----END PRIVATE KEY for {name}-----"

        secret_key_hex = secret_key.hex()
        pubkey_hex = pubkey.hex()
        combined = secret_key_hex + pubkey_hex
        combined_bytes = combined.encode()
        key_base64 = base64.b64encode(combined_bytes).decode()

        payload_lines = textwrap.wrap(key_base64, 64)
        payload = "\n".join(payload_lines)
        content = "\n".join([header, payload, footer])
        return content



    def create_account(self, fund=0, name=None, email=None, seed_phrase=""):
        """
        :param fund:
        :param name:
        :param seed_phrase:
        :return:
        """
        log("Création d'un nouveau compte")


        if len(seed_phrase) == 0:
            secret_key, pubkey = generate_pair()
            address = Address(pubkey).bech32()
            _u=Account(address=address)
            _u.secret_key=secret_key.hex()
        else:
            secret_key, pubkey = derive_keys(seed_phrase)
            address = Address(pubkey).bech32()
            _u = Account(address=address)
            _u.secret_key=secret_key.hex()



        if fund > 0:
            log("On transfere un peu d'eGold pour assurer les premiers transferts" + str(fund))
            tx = self.credit(self.bank, _u, "%.0f" % fund)
            if tx is None or tx["status"] != "success":
                log("Le compte " + _u.address.bech32() + " n'a pas recu d'eGld pour les transactions")

        if not email is None:
            log("Enregistrement des infos le concernant")
            self.update_account(_u, {"email": email, "pseudo": email.split("@")[0]})

        return _u, self.get_pem(secret_key,pubkey)




    def estimate(self, contract_addr, function, arguments):
        result = self.tce._estimate_sc_call(contract_addr, function, arguments)
        return result



    def execute(self, _contract:SmartContract, _user, function, arguments=[], value: int = None, gas_limit=LIMIT_GAS, timeout=60,gas_price_factor=1) -> dict:
        if _user is None: return None
        if type(_contract) == str: _contract = SmartContract(_contract)
        if type(_user) == str: _user = Account(address=_user)
        _user.sync_nonce(self._proxy)
        if not value is None: value = int(value)
        try:
            tx = _contract.execute( _user,
                                                   function=function,
                                                   arguments=arguments,
                                                   gas_price=config.DEFAULT_GAS_PRICE * gas_price_factor,
                                                   gas_limit=gas_limit,
                                                   value=value,
                                                   chain=self.chain_id,
                                                   version=config.get_tx_version()
                                                   )
        except Exception as inst:
            log("Impossible d'executer " + function + " " + str(inst.args))
            return None

        t:TransactionOnNetwork=tx.send_wait_result(self._proxy,timeout=timeout)
        #tr = self.wait_transaction(tx, "status", not_equal="pending", timeout=timeout)
        return t.raw



    def query(self, function_name, arguments=None, n_try=3):
        _contract:SmartContract = SmartContract(address=NETWORKS[self.network_name]["nft"])

        d = None
        for i in range(n_try):
            try:
                d = _contract.query(self._proxy,function_name, arguments)
                break
            except Exception as inst:
                sleep(1)
                log("Essai " + str(i) + " Impossible d'executer " + function_name + "(" + str(arguments) + ") -> ")
                log(str(inst.args))

        if len(d) == 1 and d[0] == '': d = []
        return d


    def vec_to_token(self,tokens,index):
        index = index + 8 #justification ?
        #log("Traitement à partir de " + tokens[index:])

        collection_len = int(tokens[index:index + 4], 16) * 2
        index = index + 4

        desc_len = int(tokens[index:index + 4], 16) * 2
        index = index + 4

        money_len = int(tokens[index:index + 8], 16) * 2
        index = index + 8

        price = int(tokens[index:index + 8], 16) / 1e4
        index = index + 8

        identifier = str(bytearray.fromhex(tokens[index:index + money_len]), "utf-8")
        index = index + money_len

        owner = Account(address=tokens[index:index + 64]).address.bech32()
        index = index + 64

        has_secret = int(tokens[index:index + 2], 16)
        index = index + 2

        properties = int(tokens[index:index + 4], 16)
        index = index + 4

        status = int(tokens[index:index + 2], 16)
        index = index + 2

        resp = int(tokens[index:index + 2], 16)
        index = index + 2

        max_markup = int(tokens[index:index + 4], 16)
        index = index + 4

        markup = int(tokens[index:index + 4], 16)
        index = index + 4

        deadline = int(tokens[index:index + 16], 16)
        index = index + 16

        miner_ratio = int(tokens[index:index + 4], 16)
        index = index + 4

        miner = Account(address=tokens[index:index + 64]).address.bech32()
        index = index + 64

        creator = Account(address=tokens[index:index + 64]).address.bech32()
        index = index + 64

        id = int(tokens[index:index + 16], 16)
        index = index + 16

        # ref_token_id = int(tokens[index:index + 16], 16)
        # index = index + 16

        desc=""
        collection=""
        try:
            collection = str(bytearray.fromhex(tokens[index:index + collection_len]), "utf-8") if tokens[index:index + collection_len]!="00" else ""
            index = index + collection_len

            desc: str = str(bytearray.fromhex(tokens[index:index + desc_len]), "utf-8") if tokens[index:index + desc_len]!="00" else ""
            index = index + desc_len
        except:
            log(tokens[index:index+desc_len] + " n'est pas une chaine de caractères")

        obj = dict({
            "token_id": id,
            "title": "",
            "tags": "",
            "desc": "",
            "price": price,
            "markup": markup / 100,
            "has_secret": has_secret,
            "resp": resp,
            "deadline": int((deadline-datetime.now().timestamp())/(3600*24*1000)),
            "collection":collection,
            "secret_vote": properties & SECRET_VOTE > 0,
            "unik": properties & UNIK > 0,
            "id_required": properties & ID_REQUIRED > 0,
            "vote": properties & VOTE > 0,
            "miner_can_burn": properties & MINER_CAN_BURN > 0,
            "for_sale": properties & FOR_SALE > 0,
            "max_markup": max_markup / 100,
            "miner_ratio": miner_ratio / 100,
            "miner": miner,
            "owner": owner,
            "creator": creator,
            "visual": "",
            "unity": "EGLD" if money_len == 0 else identifier.split("-")[0],
            "identifier": identifier,
            "fullscreen": False,
            "properties": properties,
            "network": "elrond"
        })

        if desc.startswith("{"):
            props:dict = json.loads(desc)
            for k in props.keys():
                obj[k]=props[k]
        else:
            if "%%" in desc:
                obj["desc"]=desc.split("%%")[1]
                obj["title"]=desc.split("%%")[0]

        if "visual" in obj and len(obj["visual"])==46:
            obj["visual"]="https://ipfs.io/ipfs/"+obj["visual"]

        # extraction des tags
        obj["tags"], obj["desc"] = extract_tags(obj["desc"])
        obj["premium"] = (len(obj["visual"]) > 0 and len(obj["desc"]) > 10 and len(obj["title"]) > 5)

        obj["message"] = ""
        return obj,index



    # /nfts /get_nfts
    # récupération de l'ensemble des NFT issue du contrat
    def get_tokens(self, dealer_filter="0x0", owner_filter="0x0", miner_filter="0x0",limit=100,offset=0):
        log("Recherche des NFT pour seller="+dealer_filter+" owner="+owner_filter+" miner="+miner_filter)
        rc = list()
        url=""

        if owner_filter == "0x0":
            owner_filter = ZERO_ADDR
        else:
            url=self._proxy.url+"/address/"+owner_filter+"/esdts"
            owner_filter = "0x" + str(Account(address=owner_filter).address.hex())

        if dealer_filter == "0x0":
            dealer_filter = ZERO_ADDR
        else:
            dealer_filter = "0x" + str(Account(address=dealer_filter).address.hex())

        if miner_filter == "0x0":
            miner_filter = ZERO_ADDR
        else:
            url=self._proxy.url+"/address/"+miner_filter+"/registered-nfts"
            miner_filter = "0x" + str(Account(address=miner_filter).address.hex())


        #On récupere les NFT standard
        if len(url)>0:
            standard_tokens=api(url,"api=gateway")
            if standard_tokens and "data" in standard_tokens:
                for token in standard_tokens["data"]:
                    pass


        # On récupére les extended NFT
        tokens = self.query("tokens", arguments=[dealer_filter, owner_filter, miner_filter,int(limit)], n_try=1)
        if not tokens is None and len(tokens) > 0 and tokens[0] != "":
            log("Analyse de "+str(base64.b64decode(tokens[0].base64)))
            tokens = tokens[0].hex
            index = 0

            max_id = 0

            while len(tokens) - index > 112:
                obj,index=self.vec_to_token(tokens,index)

                #Remplacement des champs types
                _dictionnary = {
                    "owner": obj["owner"],
                    "miner": obj["miner"],
                    "price": str(obj["price"]),
                    "token": str(obj["token_id"]),
                }
                obj["title"] = translate(obj["title"], _dictionnary)
                obj["desc"] = translate(obj["desc"], _dictionnary)

                if obj["token_id"] > max_id: max_id = obj["token_id"]

                rc.append(obj)
        else:
            log("Aucun token récupéré")

        # Tri de la liste
        rc = sorted(rc, key=lambda i: i["token_id"] if i["token_id"] == int else 0, reverse=True)
        return rc


    def eval_properties(self, vm):
        properties = 0
        if "opt_miner_can_burn" in vm and vm["opt_miner_can_burn"] == 1: properties = properties + MINER_CAN_BURN
        if "opt_unik" in vm and vm["opt_unik"] == 1: properties = properties + UNIK
        if "secret_vote" in vm and vm["secret_vote"] == 1: properties = properties + SECRET_VOTE
        if "id_required" in vm and vm["id_required"] == 1: properties = properties + ID_REQUIRED
        if "one_winner" in vm and vm["one_winner"] == 1: properties = properties + ONE_WINNER
        if "transparent" in vm and vm["transparent"] == 1: properties = properties + TRANSPARENT
        if "vote" in vm and vm["vote"] == 1: properties = properties + VOTE
        if "instant_sell" in vm and vm["instant_sell"] == 1: properties = properties + FOR_SALE
        if "owner_can_transfer" in vm and vm["owner_can_transfer"] == 1: properties = properties + CAN_TRANSFERT
        if "owner_can_sell" in vm and vm["owner_can_sell"] == 1: properties = properties + CAN_RESELL
        if "direct_sell" in vm and vm["direct_sell"] == 1: properties = properties + DIRECT_SELL
        if "self_destruction" in vm and vm["self_destruction"] == 1: properties = properties + SELF_DESTRUCTION
        if "rent" in vm and vm["rent"] == 1: properties = properties + RENT
        if "find_secret" in vm and vm["find_secret"] == 1: properties = properties + FIND_SECRET
        if "opt_gift" in vm and vm["opt_gift"] == 1: properties = properties + FORCE_OPEN
        return properties

    def get_tokens_standard(self, addrs):
        rc = []
        for addr in addrs:
            # On récupère les NFT standards
            # voir https://docs.elrond.com/developers/nft-tokens/#get-nft-data-for-an-address

            # url=self._proxy.url+"/address/"+Account(address=owner_filter.replace("0x","")).address.bech32()+"/esdts-with-role/ESDTRoleNFTCreate"
            # r=requests.get(url)
            # if r.status_code==200:

            url = self._proxy.url + "/address/" + addr + "/esdt"
            r = api(url)
            if r:
                for nft in r["data"]["esdts"].values():
                    # url = self._proxy.url + "/vm-values/query"
                    # body={
                    #     "scAddress":"erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u",
                    #     "funcName": "getTokenProperties",
                    #     "args": [str_to_hex(x,False) for x in list(json.loads(r.text)["data"]["tokens"])]
                    # }
                    if "royalties" in nft:
                        prop = dict({
                            "picture": "",
                            "visual": "",
                            "properties": "0x0",
                            "tags": "",
                            "identifier": "EGLD",
                        })
                        p_s = str(base64.b64decode(bytes(nft["attributes"], "utf8")), "utf8").split(",")
                        for p in p_s:
                            if ":" in p: prop[p.split(":")[0]] = p.split(":")[1]

                        visual = ""
                        picture = ""
                        if len(nft["uris"]) > 0: visual = str(base64.b64decode(bytes(nft["uris"][0], "utf8")), "utf8")
                        if len(nft["uris"]) > 1: picture = str(base64.b64decode(bytes(nft["uris"][1], "utf8")), "utf8")

                        if len(nft["uris"]) > 0: prop["visual"] = nft["uris"][0]
                        rc.append({
                            "token_id": nft["tokenIdentifier"],
                            "price": int(nft["royalties"]),
                            "miner": nft["creator"],
                            "owner": addr,
                            "deadline": 0,
                            "tags": prop["tags"],
                            "description": prop["description"],
                            "visual": visual,
                            "picture": picture,
                            "has_secret": int("secret" in prop),
                            "title": nft["name"],
                            "unity": "EGLD",
                            "for_sale": int(prop["status"] & FOR_SALE) > 0,
                            "properties": int(prop["properties"], 16)
                        })
                        log("Ajout de " + str(rc))
            else:
                log("Problème de lecture de " + url)

        return rc


    def evalprice(self, sender_addr, receiver_addr, value=0, data="exemplededata"):
        body = {
            "version": config.get_tx_version(),
            "chainID": self._proxy.get_chain_id(),
            "value": value,
            "sender": sender_addr,
            "receiver": receiver_addr,
            "data": data
        }

        r = requests.post(self._proxy.url + "/transaction/cost", data=body)
        rc = json.loads(r.text)
        return rc


    def clone(self,miner,count:int,owner,ref_id:int):
        """
        Permet de cloner un NFT sur la base d'un NFT de reférence
        :param miner:
        :param count:
        :param owner:
        :param ref_id:
        :return:
        """
        tokenids=[]
        while count>0:
            size=MAX_MINT_NFT if count>MAX_MINT_NFT else count
            count=count-MAX_MINT_NFT
            tx = self.execute(
                NETWORKS[self.network_name]["nft"],
                miner, "clone", [ref_id,size,"0x"+owner.address.hex()],
                gas_limit=MAX_GAS_LIMIT,
                gas_price_factor=1, value=0,
                timeout=600
            )
            if not tx is None and RESULT_SECTION in tx and "data" in tx[RESULT_SECTION][0]:
                s=tx[RESULT_SECTION][0]["data"]
                if len(s.split("@")) > 2:
                    if s.endswith("@"): s = s + "0"
                    first_token_id = int(s.split("@")[2], 16)
                    tokenids = tokenids + list(range(first_token_id,first_token_id+size))
            else:
                log("Défaillance du clonage sur "+str(tx))

        return tokenids



    def mint(self, user_from, arguments, gas_limit=LIMIT_GAS, value=0, factor=1):
        """
        Fabriquer un NFT
        :param contract:
        :param user_from:
        :param arguments:
        :return:
        """
        log("Minage avec " + str(arguments))
        tx = self.execute(NETWORKS[self.network_name]["nft"],
                          user_from,
                          "mint", arguments,
                          gas_limit=gas_limit,
                          gas_price_factor=factor,
                          value=value,
                          timeout=600)

        if not tx is None and RESULT_SECTION in tx:
            for result in tx[RESULT_SECTION]:
                s = result["data"]
                log("Analyse de " + s)
                if len(s.split("@")) > 2:
                    if s.endswith("@"): s = s + "0"
                    tx["token_id"] = int(s.split("@")[2], 16)
                    break
        return tx


    def get_collections(self,creator:Account,fields=list("name")):
        if type(creator)==str:creator=Account(address=creator)
        url=self._proxy.url+"/collections?creator="+creator.address.bech32()
        rc=list()
        cols=api(url,"api=gateway")
        if len(fields)>0:
            for col in cols:
                rc.append(col[fields])
        else:
            rc=cols

        return rc


    def mint_standard_nft(self, user_from, title, collection,properties: dict, price=0, quantity=1, royalties=0,visual="",ipfs=None):
        """
        Fabriquer un NFT au standard elrond
        https://docs.elrond.com/developers/nft-tokens/
        :param contract:
        :param user_from:
        :param arguments:
        :return:
        """

        hash = hex(int(now() * 1000)).upper().replace("0X", "")

        # for col in self.get_collections(user_from,[]):
        #     if col["name"]==collection:
        #         collection_id=col["ticker"]
        #         break

        # if collection_id=="":
        #     token_id=self.add_collection(user_from,collection)

            #Voir https://docs.elrond.com/developers/nft-tokens/
                    #exemple de creation d'une collection de SFT
                    # Name=CalviOnTheRock collection=Calvi2022
                    # TransferCreateRole
                    #Résultat issueSemiFungible@43616c76694f6e546865526f636b32303232@43414c564932303232@63616e5472616e736665724e4654437265617465526f6c65@74727565
                    #Création de billet
                    #Exemple : issueSemiFungible@546f757245696666656c@544f555245494646454c@63616e467265657a65@74727565@63616e57697065@74727565@63616e5472616e736665724e4654437265617465526f6c65@74727565
                    #Transaction hash 3f002652038ba8aed2876809a9e019451770c740749c1047a5b4d354f5fb217a



        sleep(2)
        cid_metadata=ipfs.add(properties)

        data = "ESDTNFTCreate@" + collection \
                + "@" + hex(int(quantity)).replace("0x", "") \
                + "@" + str_to_hex(title, False) \
                + "@" + hex(int(royalties)*100).replace("0x", "") \
                + "@" + hash \
                + "@" + str_to_hex(visual) \
                + "@" + str_to_hex("tags:;metadata:"+cid_metadata)

            #Exemple : Pass5An a 10 exemplaire avec le fichier png chargé et description dans description et tag dans tags
            # resultat ESDTNFTCreate@43414c5649323032322d356364623263@0a@5061737331416e@09c4@516d50373347703135464461367976474474397765526d7035684d575041734c4c63724e5a686d506e79366d4134@746167733a3b6d657461646174613a516d54713845666d36416634616a35383847694d716b4d44524c475658794133773439315052464e413471546165@68747470733a2f2f697066732e696f2f697066732f516d50373347703135464461367976474474397765526d7035684d575041734c4c63724e5a686d506e79366d4134
            # exemple : ESDTNFTCreate@544f555245494646454c2d333535613733@0a@5669736974654c6534417672696c32303232@09c4@516d5531394736544c4b704b38436a504c5137726e4d4c4868553346784257317846696b44335a48665a476a6841@746167733a3b6d657461646174613a516d54713845666d36416634616a35383847694d716b4d44524c475658794133773439315052464e413471546165@68747470733a2f2f697066732e696f2f697066732f516d5531394736544c4b704b38436a504c5137726e4d4c4868553346784257317846696b44335a48665a476a6841
            # traduction : ESDTNFTCreate@TOUREIFFEL-355a73@@VisiteLe4Avril2022@2500@QmU19G6TLKpK8CjPLQ7rnMLHhU3FxBW1xFikD3ZHfZGjhA@tags:;metadata:QmTq8Efm6Af4aj588GiMqkMDRLGVXyA3w491PRFNA4qTae@https://ipfs.io/ipfs/QmU19G6TLKpK8CjPLQ7rnMLHhU3FxBW1xFikD3ZHfZGjhA
            # transaction : 0652f69168b908faeb497b9fdee8593e747ee759349083f55b2e4ad17de1e2c3

            # data = data +  "@" + str_to_hex(hash, False) + "@"
            # for k in properties.keys():
            #     if k != "title":
            #         data = data + str_to_hex(k + ":" + properties[k] + ",", False)
            # data = data + "@" + str_to_hex(visual, False)

        t = self.send_transaction(user_from, user_from, user_from, 0, data)

        return t


    def nft_transfer(self, contract, _owner, token_id, _dest):
        if not is_standard(token_id):
            tr = self.execute(contract, _owner,
                              function="transfer",
                              arguments=[token_id, "0x" + _dest.address.hex()],
                              value=0)
        else:
            # https://docs.elrond.com/developers/esdt-tokens/
            data = "transferOwnership@" + str_to_hex(token_id, False) + "@" + _dest.address.hex()
            tr = self.send_transaction(_owner,SmartContract(address="erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"),
                                       _owner, 0, data)
        return tr

    def nft_buy(self, contract, _user, token_id, price, seller):
        if not is_standard(token_id):
            value = int(1e7 * price) * 1e11
            tr = self.execute(
                contract, _user,
                function="buy",
                arguments=[token_id, seller],
                value=value,
                gas_price_factor=2
            )
        else:
            tr = self.nft_transfer(None, seller, token_id, _user)
        return tr

    def nft_open(self, contract, pem_file, token_id, response: str = ""):
        tr = self.execute(contract, pem_file,
                          function="open",
                          arguments=[int(token_id), "0x" + response],
                          value=0,
                          gas_limit=LIMIT_GAS / 2
                          )
        return tr


    def burn(self, sender, token_ids, quantity=1):

        if is_standard(token_ids):
            data = "ESDTNFTBurn@" + str_to_hex(token_ids[0], False) + "@1@" + hex(quantity).replace("0x", "")
            tr = self.send_transaction(sender, sender, sender, 0, data)
        else:
            ids=list_to_vec(token_ids)
            tr = self.execute(NETWORKS[self.network_name]["nft"], sender,
                              function="burn",
                              arguments=[ids],gas_limit=LIMIT_GAS*(1+len(token_ids)*0.2)
                              )
        return {"owner":tr["sender"]}



    def set_state(self, contract, pem_file, token_ids, state):
        """
        Mise en vente (to sale)
        :param contract:
        :param pem_file:
        :param token_id:
        :param state:
        :return:
        """
        if not is_standard(token_ids):
            for i in range(0,len(token_ids),MAX_MINT_NFT*2):
                ids=list_to_vec(token_ids[i:min(i+MAX_MINT_NFT*2,len(token_ids))])
                tx = self.execute(contract, pem_file,
                                  function="setstate",
                                  arguments=[ids, int(state)],
                                  gas_limit=MAX_GAS_LIMIT
                                  )
        else:
            tx = self.nft_transfer(None, pem_file, token_ids, self.bank)

        return tx



    # http://localhost:6660/api/validate/erd1lzlf9clpzvetunqdtrmnr3dq0jpqxuf64lzxa0lerd86lmrutuqszvmk5w/erd19e6gkufmeav2u4q6ltagarxeqag4d62maey8vunnfs52fk75jd8s390nfn/
    def validate(self, owner, miner):
        _owner = Account(address=owner)
        _miner = Account(address=miner)
        rc = self.query("validate", ["0x" + _owner.address.hex(), "0x" + _miner.address.hex()], isnumber=False)
        l = []
        for i in range(0, len(rc), 8):
            l.append(int.from_bytes(rc[i:i + 8], "big"))
        return l

    def set_price(self, contract, pem_file, token_id, new_price):
        tx = self.execute(contract, pem_file,
                          function="price",
                          arguments=[int(token_id), int(new_price)],
                          )

        return tx

    def add_dealer(self, contract, pem_file, arguments):
        tx = self.execute(contract, pem_file,
                          function="adddealer",
                          arguments=arguments,
                          )
        return tx

    def add_miner(self, contract, pem_file, arguments):
        tx = self.execute(contract, pem_file,
                          function="addminer",
                          arguments=arguments,
                          )
        return tx

    def getTransactions(self, user):
        _user = Account(address=user)
        rc = self._proxy.get_account_transactions(_user.address)
        return rc

    def getTransaction(self, hash):
        url = self._proxy.url.replace("gateway", "api") + "/transactions/" + hash
        resp = requests.get(url)
        rc = json.loads(resp.text)
        rc["hash"] = hash
        return rc



    def getTransactionsByRest(self, addr):
        """
        retourne l'ensemble des transactions d'un contrats (https://docs.elrond.com/sdk-and-tools/rest-api/transactions/)
        :param addr:
        :return:
        """
        _c = SmartContract(address=addr)
        url = self._proxy.url + "/address/" + _c.address.bech32() + "/transactions"
        result = requests.get(url)
        if result.status_code == 200:
            rc = []
            l_t = json.loads(result.text)["data"]["transactions"]
            for t in l_t:
                if "data" in t and not t["data"] is None:
                    t["data_dec"] = str(base64.b64decode(t["data"]), "utf8")
                    t["function"] = t["data_dec"].split("@")[0]
                rc.append(t)
        else:
            rc = {"error": result.status_code, "message": result.text}
        return rc



    def miners(self, seller):
        seller_addr = Account(seller).address.hex()
        tx = self.query("miners", ["0x" + seller_addr])
        rc = []
        if len(tx) > 0:
            s = tx[0].hex
            i = 0
            while i < len(s):
                addr = s[i:i + 64].upper()
                _acc = self.get_account(addr)
                rc.append(_acc)
                i = i + 64
        return rc



    def dealers(self, miner_filter: str = ZERO_ADDR):
        if miner_filter != ZERO_ADDR:
            miner_filter = "0x"+Account(address=miner_filter).address.hex()
        else:
            miner_filter = ZERO_ADDR

        tx = self.query("dealers", [miner_filter])
        rc = []
        if len(tx) > 0 and tx[0] != '' and len(tx[0].hex) > 0:
            i = 0
            ss = str(tx[0].hex)
            while i < len(ss):

                address = ss[i:i + 64]
                state = int("0x" + ss[i + 64:i + 66], 16)

                content = self.get_account(address)
                # content=self.ipfs.get_dict(bytes.fromhex(dealer[66:]).decode("utf-8"))
                if type(content) != dict:
                    content = {"visual": base64.b64encode(content)}

                if "0x"+address!=ZERO_ADDR:
                    content["address"] = Account(address=address).address.bech32()
                    content["state"] = state
                    rc.append(content)

                i = i + 66

        return rc



    def dealer_state(self, pem_file, state):
        """
        Permet de désactiver une boutique
        :param pem_file:
        :param state:
        :return:
        """
        tx = self.execute(self.contract, pem_file,
                          function="dealerstate",
                          arguments=[hex(state)],
                          )
        return tx

    def get_instant_access(self, _user: Account, delayInSec=60):
        private_key = _user.private_key_seed
        # TODO ajouter la durée limite et le cryptage
        return private_key

    def decrypt_json_keyfile(self, content):
        _content = json.loads(content)

    def eval_gas(self, nb_octet, extra=0, StorePerByte=50000):
        """
        Evaluation du gas nécéssaire
        voir https://docs.elrond.com/developers/account-storage/#transaction-format
        :param nb_address:
        :param nb_octet:
        :return:
        """
        return 3000000 + nb_octet * StorePerByte + extra * StorePerByte

    def get_result(self, transac):
        rc=self._proxy.get_transaction(transac["hash"],with_results=True)
        rc["function"]=transac["function"]
        return rc

    def to_string(self, vec:str,start=0):
        end=vec[start+1:].index("000000")
        rc=str(bytearray.fromhex(vec[start:end+1]), "utf-8")
        return {"text":rc,"offset":len(rc)*2}

    def add_contact(self, _u, addr_contact_to_add):
        _infos=self.get_account(_u.address.bech32())
        if not "contacts" in _infos or len(_infos["contacts"])==0:
            _infos["contacts"]=addr_contact_to_add
        else:
            _infos["contacts"]=_infos["contacts"]+","+addr_contact_to_add
        return self.update_account(_u,_infos)


    def add_collection(self, owner:Account, collection,collection_id=None,type="SemiFungible"):
        """
        gestion des collections sur Elrond
        voir
        :param owner:
        :param collection:
        :param collection_id:
        :param type:
        :return:
        """
        collection_id=collection[:8].upper() if collection_id is None else collection_id
        data = "issue"+type \
               + "@" + str_to_hex(collection, False) \
               + "@" + str_to_hex(collection_id, False) \
               + "@" + str_to_hex("canChangeOwner", False)+"@"+str_to_hex("true",False) \
               + "@" + str_to_hex("canUpgrade", False)+"@"+str_to_hex("true",False) \
               + "@" + str_to_hex("canWipe", False)+"@"+str_to_hex("true",False) \
                + "@" + str_to_hex("canAddSpecialRoles", False)+"@"+str_to_hex("true",False)

        t = self.send_transaction(owner,
                                  Account(address="erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"),
                                  owner,
                                  PRICE_FOR_STANDARD_NFT,
                                  data)


        if RESULT_SECTION in t and len(t[RESULT_SECTION][0]["data"].split("@")) > 1:
            token_id = t[RESULT_SECTION][0]["data"].split("@")[2]

            data = "setSpecialRole@" + token_id + "@" + owner.address.hex() \
                    + "@" + str_to_hex("ESDTRoleNFTCreate",False) \
                    + "@" + str_to_hex("ESDTRoleNFTBurn", False) \
                    + "@" + str_to_hex("ESDTRoleNFTUpdateAttributes",False) \
            #Exemple d'usage de setSpecialRole sur la collection présente
            #setSpecialRole@43414c5649323032322d356364623263@b13a017423c366caff8cecfb77a12610a130f4888134122c7937feae0d6d7d17@45534454526f6c654e4654437265617465@45534454526f6c654e46544164645175616e74697479

            t = self.send_transaction(owner,
                                      Account(address="erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"),
                                      owner, 0, data)

            return token_id

        return None

