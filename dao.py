"""
Interface avec la base de données
"""
from datetime import datetime

import pymongo
from definitions import DB_SERVERS


class DAO:
    db:any

    def __init__(self,domain:str="cloud"):
        self.db: pymongo.mongo_client = pymongo.MongoClient(DB_SERVERS[domain])["coinmaker"]


    def add_contact(self, email, addr=""):
        _contact={"email":email,"addr":addr}
        rc=self.db["contacts"].replace_one(filter={"email": email}, replacement=_contact, upsert=True)
        return rc


    def add_money(self,address:str,unity:str,owner:str,_public:bool,transferable:bool,url="",proxy=""):
        now=str(datetime.now().timestamp()*1000000)
        if not self.get_money_by_name(unity,proxy) is None:return None
        _money={
            "addr":address,
            "unity":unity,
            "owner":owner,
            "public":_public,
            "transferable":transferable,
            "url":url,
            "dtCreate":now,
            "proxy":proxy
        }
        return self.db["moneys"].replace_one(filter={"addr": address}, replacement=_money, upsert=True)



    def get_money_by_address(self, contract):
        return self.db["moneys"].find_one(filter={"addr":contract})

    def get_money_by_name(self, unity,proxy):
        return self.db["moneys"].find_one(filter={"unity":unity,"proxy":proxy})



    def get_moneys(self, addr,proxy):
        #TODO: ajouter l'owner
        rc=list(self.db["moneys"].find(filter={"public": True,"proxy":proxy}))
        return rc


    def raz(self,proxy):
        self.db["moneys"].remove({"proxy":proxy})
        self.db["contacts"].drop()
        return True

    def find_contact(self, email):
        return self.db["contacts"].find_one({"email":email})

    def del_contract(self, unity, proxy):
        self.db["moneys"].remove({"unity":unity,"proxy": proxy})


