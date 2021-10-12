"""
Interface avec la base de données
"""
import base64
from datetime import datetime
import pymongo
from AesEverywhere import aes256
from AesEverywhere.aes256 import encrypt

from Tools import log
from definitions import DB_SERVERS, SECRET_KEY


class DAO:
    db:any

    def __init__(self,domain:str="cloud",dbname="coinmaker"):
        self.db: pymongo.mongo_client = pymongo.MongoClient(DB_SERVERS[domain])[dbname]


    def add_contact(self, owner_addr, contact_addr):
        _user=self.get_user(owner_addr)
        if not _user is None:
            if not "contacts" in _user:_user["contacts"]=[]
            if contact_addr not in _user["contacts"]:
                _user["contacts"].append(contact_addr)
                self.db["users"].update_one(filter={"addr": _user["addr"]},update={"$set":{"contacts":_user["contacts"]}})

        return _user


    def add_money(self,idx:str,unity:str,nbDecimals:int,owner:str,_public:bool,transferable:bool,url="",proxy=""):
        now=str(datetime.now().timestamp()*1000000)
        if not self.get_money_by_name(unity,proxy) is None:return None
        _money={
            "idx":idx,
            "unity":unity,
            "owner":owner,
            "decimals":nbDecimals,
            "public":_public,
            "transferable":transferable,
            "url":url,
            "dtCreate":now,
            "proxy":proxy
        }
        return self.db["moneys"].replace_one(filter={"unity": unity}, replacement=_money, upsert=True)




    def get_money_by_idx(self,idx):
        return self.db["moneys"].find_one(filter={"idx":idx})



    def get_money_by_name(self, unity,proxy):
        """
        Récupération du contrat par le nom
        :param unity:
        :param proxy:
        :return:
        """
        return self.db["moneys"].find_one(filter={"unity":unity,"proxy":proxy})



    def get_moneys(self, addr,proxy):
        rc=list(self.db["moneys"].find(filter={"public": True,"proxy":proxy}))
        return rc


    def raz(self,proxy):
        self.db["moneys"].remove({"proxy":proxy})
        self.db["contacts"].drop()
        self.db["users"].drop()
        return True


    def del_contract(self, idx, proxy):
        rc=self.db["moneys"].remove({"idx":idx,"proxy": proxy})
        pass


    def add_nft(self, contract,owner):
        return self.db["nfts"].replace_one(filter={"contract": contract}, replacement={"contract":contract,"owner":owner}, upsert=True)

    def get_nfts(self):
        return self.db["nfts"].find()

    def get_nftcontract_by_owner(self,addr):
        return self.db["nfts"].find_one({"owner":addr})


    def save_user(self, email, addr,pem="",contacts=[]):
        #TODO: ajouter le cryptage de l'email
        if not pem.endswith(".pem"):
            pem=base64.b64encode(aes256.encrypt(pem,SECRET_KEY))
        body={'email':email.lower(),'addr':addr,"pem":pem,"contacts":contacts}
        rc = self.db["users"].replace_one(filter={"addr": addr}, replacement=body, upsert=True)
        return rc.modified_count>0 or (rc.upserted_id is not None),pem



    def get_user(self, email):
        field="email"
        if not "@" in email and email.startswith("erd"):field="addr"
        rc=self.db["users"].find_one(filter={field: email.lower()})
        return rc


    def del_user(self, addr):
        rc=self.db["users"].delete_one(filter={"addr": addr})
        return rc

    def get_all_users(self,field=None):
        if field:
            return [_u[field] for _u in self.db["users"].find()]
        else:
            return list(self.db["users"].find())




