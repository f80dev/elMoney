"""
Interface avec la base de données
"""
from datetime import datetime
import pymongo

from Tools import log
from definitions import DB_SERVERS


class DAO:
    db:any

    def __init__(self,domain:str="cloud",dbname="coinmaker"):
        self.db: pymongo.mongo_client = pymongo.MongoClient(DB_SERVERS[domain])[dbname]


    def add_contact(self, email, addr=""):
        _contact={"email":email,"addr":addr}
        rc=self.db["contacts"].replace_one(filter={"email": email}, replacement=_contact, upsert=True)
        return rc


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


    def find_contact(self, email):
        return self.db["contacts"].find_one({"email":email})


    def del_contract(self, idx, proxy):
        rc=self.db["moneys"].remove({"idx":idx,"proxy": proxy})
        pass


    def add_nft(self, contract,owner):
        return self.db["nfts"].replace_one(filter={"contract": contract}, replacement={"contract":contract,"owner":owner}, upsert=True)

    def get_nfts(self):
        return self.db["nfts"].find()

    def get_nftcontract_by_owner(self,addr):
        return self.db["nfts"].find_one({"owner":addr})

    def save_user(self, email, addr):
        #TODO: ajouter le cryptage de l'email
        body={'email':email,'addr':addr}
        return self.db["users"].replace_one(filter={"email": email}, replacement=body, upsert=True)

    def get_user(self, email):
        field="email"
        if not "@" in email and email.startswith("erd"):field="addr"
        rc=self.db["users"].find_one(filter={field: email})
        return rc


    def del_user(self, email):
        rc=self.db["users"].delete_one(filter={"email": email})
        return rc




