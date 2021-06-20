import base64
import json
from datetime import datetime

import ipfshttpclient
import requests

from Tools import log


class IPFS:
    client=None

    def __init__(self, addr:str):
        self.client=ipfshttpclient.connect(addr,session=True)
        log("Adresse du client IPFS: " + addr)


    def add(self,body:str):
        if type(body)==str:
            if body.startswith("data:"):
                body=base64.b64decode(body.split("base64,")[1])
            else:
                body=bytes(body,"utf8")

        cid=self.client.add_bytes(body)
        return cid


    def get_dict(self,token):
        if len(token)!=46: return token
        url="https://ipfs.io/ipfs/"+token
        r=requests.get(url).content
        try:
            return json.loads(str(r,"utf8").replace("'","\""))
        except:
            return r
